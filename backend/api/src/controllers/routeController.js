const { runQuery } = require('../config/db');
const { ROUTE_STATUS } = require('../constants/statusConstants');

// Dynamic import for node-fetch as it is an ESM-only package (v3+)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Shared helper to fetch geocoding data from Geoapify.
 * Used by both Route and Order controllers.
 */
const getGeocodingData = async (address) => {
  const { name, street, housenumber, postcode, city, country } = address;
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) return null;

  // 1. Search in our database locations table first to avoid unnecessary API calls
  try {
    const dbLookupQuery = `
      SELECT latitude as lat, longitude as lon 
      FROM locations 
      WHERE (name IS NOT DISTINCT FROM $1)
        AND (housenumber IS NOT DISTINCT FROM $2)
        AND (street IS NOT DISTINCT FROM $3)
        AND (city IS NOT DISTINCT FROM $4)
        AND (postcode IS NOT DISTINCT FROM $5)
        AND (country IS NOT DISTINCT FROM $6)
      LIMIT 1
    `;
    const result = await runQuery(dbLookupQuery, [name || null, housenumber || null, street || null, city || null, postcode || null, country || null]);
    if (result.rows.length > 0) return result.rows[0];
  } catch (error) {
    console.error('Database Geocoding Lookup Error:', error);
  }

  // 2. If not found in database, proceed with Geoapify API call
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.append('housenumber', housenumber || '');
  url.searchParams.append('street', street || '');
  url.searchParams.append('name', name || '');
  url.searchParams.append('postcode', postcode || '');
  url.searchParams.append('city', city || '');
  url.searchParams.append('country', country || '');
  url.searchParams.append('format', 'json');
  url.searchParams.append('apiKey', apiKey);

  try {
    // console.log('Geocoding Request URL:', url.toString());
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    return data.results.reduce((prev, current) => {
      return (current.rank?.confidence || 0) > (prev.rank?.confidence || 0) ? current : prev;
    }, data.results[0]);
  } catch (error) {
    console.error('Shared Geocoding Helper Error:', error);
    return null;
  }
};

// @desc    Create new route
// @route   POST /route/create
// @access  Private
const createRoute = async (req, res) => {
  const { 
    name, // New: route name
    start_location, 
    end_location, 
    start_datetime, // New: route start datetime
    end_datetime,   // New: route end datetime
    status, // New: route status (optional)
    saveAddressDefault
  } = req.body;
  const user_id = req.user?.user_id; // Assuming user_id is available from authentication middleware
  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (
    !name || 
    !start_location?.full_address || start_location.latitude === undefined || start_location.longitude === undefined ||
    !end_location?.full_address || end_location.latitude === undefined || end_location.longitude === undefined ||
    !start_datetime || !end_datetime
  ) {
    return res.status(400).json({ 
      message: 'Missing required fields. name, start_location (with full_address, latitude, longitude), end_location (with full_address, latitude, longitude), start_datetime, and end_datetime are required.' 
    });
  }

  try {
    const insertQuery = `
      INSERT INTO locations (name, housenumber, street, city, postcode, country, latitude, longitude, full_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING location_id
    `;

    // 3. Save Start Location
    const startLocRes = await runQuery(insertQuery, [
      start_location.name, start_location.housenumber, start_location.street,
      start_location.city, start_location.postcode, start_location.country,
      start_location.latitude, start_location.longitude, start_location.full_address
    ]);

    // 4. Save End Location
    const endLocRes = await runQuery(insertQuery, [
      end_location.name, end_location.housenumber, end_location.street,
      end_location.city, end_location.postcode, end_location.country,
      end_location.latitude, end_location.longitude, end_location.full_address
    ]);

    // 5. Create entry in routes table
    const insertRouteQuery = `
      INSERT INTO routes (user_id, name, start_full_address, end_full_address, start_datetime, end_datetime, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const routeRes = await runQuery(insertRouteQuery, [
      user_id,
      name,
      start_location.full_address,
      end_location.full_address,
      start_datetime,
      end_datetime,
      status || ROUTE_STATUS.PENDING // Default status
    ]);
    // If saveAddressDefault is true, update the user's default addresses in config_model
    if (saveAddressDefault) {
      await runQuery(
        `
        UPDATE config_model
        SET default_start_address = $1, default_end_address = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
        `,
        [startLocRes.rows[0].location_id, endLocRes.rows[0].location_id, user_id]
      );
    }


    res.status(201).json({
      message: 'Route created successfully',
      ...routeRes.rows[0],
      start_location: {
        ...start_location,
        location_id: startLocRes.rows[0].location_id
      },
      end_location: {
        ...end_location,
        location_id: endLocRes.rows[0].location_id
      }
    });

  } catch (error) {
    console.error('Create Route Error:', error);
    res.status(500).json({ message: 'Server error during route creation' });
  }
};

// @desc    Fetch all routes for current user
// @route   GET /route/fetch/all
// @access  Private
const fetchAllRoutes = async (req, res) => {
  const user_id = req.user?.user_id;

  try {
    const result = await runQuery('SELECT * FROM routes WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC', [user_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching routes' });
  }
};

// @desc    Fetch specific route by ID
// @route   GET /route/fetch?id=...
// @access  Private
const fetchRouteById = async (req, res) => {
  const { id } = req.query;
  const user_id = req.user?.user_id;

  if (!id) return res.status(400).json({ message: 'Route ID is required in query parameters' });

  try {
    // 1. Fetch the route main data
    const routeResult = await runQuery('SELECT * FROM routes WHERE route_id = $1 AND user_id = $2', [id, user_id]);
    
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found or unauthorized' });
    }
    const route = routeResult.rows[0];

    // 2. Fetch Start and End Location details from locations table
    // We use full_address and order by created_at to get the most relevant record
    const startLocRes = await runQuery('SELECT * FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.start_full_address]);
    const endLocRes = await runQuery('SELECT * FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.end_full_address]);

    const startLoc = startLocRes.rows[0] || {};
    const endLoc = endLocRes.rows[0] || {};

    // 3. Fetch all stops (orders) associated with this route
    const stopsRes = await runQuery(`
      SELECT o.*, l.name, l.housenumber, l.street, l.city, l.postcode, l.country, l.latitude, l.longitude, l.full_address
      FROM orders o
      JOIN locations l ON o.location_id = l.location_id
      WHERE o.route_id = $1
      ORDER BY o.sequence_no ASC NULLS LAST, o.created_at ASC
    `, [id]);

    // 4. Construct the response object in the exact requested format
    const response = {
      route_id: route.route_id,
      name: route.name,
      start_datetime: route.start_datetime,
      end_datetime: route.end_datetime,
      status: route.status,
      user_id: route.user_id,
      end_mode: route.end_mode || "round_trip",
      distance: parseFloat(route.distance || 0),
      duration: parseFloat(route.duration || 0),
      created_at: route.created_at,
      updated_at: route.updated_at,

      start_location: {
        mode: "manual_address",
        full_address: startLoc.full_address || route.start_full_address,
        latitude: parseFloat(startLoc.latitude || 0),
        longitude: parseFloat(startLoc.longitude || 0),
        title: startLoc.name || startLoc.full_address || route.start_full_address,
        details: {
          place_id: "geoapify-place-id-start",
          address_line1: startLoc.street ? `${startLoc.housenumber || ''} ${startLoc.street}`.trim() : startLoc.name,
          address_line2: "",
          city: startLoc.city || "",
          district: "",
          state: "",
          country: startLoc.country || "",
          country_code: "",
          postal_code: startLoc.postcode || "",
          latitude: parseFloat(startLoc.latitude || 0),
          longitude: parseFloat(startLoc.longitude || 0)
        }
      },

      end_location: {
        mode: "manual_address",
        full_address: endLoc.full_address || route.end_full_address,
        latitude: parseFloat(endLoc.latitude || 0),
        longitude: parseFloat(endLoc.longitude || 0),
        title: endLoc.name || endLoc.full_address || route.end_full_address,
        details: {
          place_id: "geoapify-place-id-end",
          address_line1: endLoc.street ? `${endLoc.housenumber || ''} ${endLoc.street}`.trim() : endLoc.name,
          address_line2: "",
          city: endLoc.city || "",
          district: "",
          state: "",
          country: endLoc.country || "",
          country_code: "",
          postal_code: endLoc.postcode || "",
          latitude: parseFloat(endLoc.latitude || 0),
          longitude: parseFloat(endLoc.longitude || 0)
        }
      },

      stops: stopsRes.rows.map(stop => ({
        ...stop,
        latitude: parseFloat(stop.latitude),
        longitude: parseFloat(stop.longitude)
      })),

      coordinates: [
        {
          latitude: parseFloat(startLoc.latitude || 0),
          longitude: parseFloat(startLoc.longitude || 0)
        },
        {
          latitude: parseFloat(endLoc.latitude || 0),
          longitude: parseFloat(endLoc.longitude || 0)
        }
      ]
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Fetch Route Details Error:', error);
    res.status(500).json({ message: 'Server error while fetching route' });
  }
};

// @desc    Edit route
// @route   PUT /route/edit
// @access  Private
const editRoute = async (req, res) => {
  const { 
    route_id, 
    name, 
    start_location, 
    end_location, 
    start_datetime, 
    end_datetime, 
    status,
    distance,
    duration,
    end_mode,
    is_active
  } = req.body;

  const user_id = req.user?.user_id;

  if (!user_id) return res.status(401).json({ message: 'User authentication failed' });
  if (!route_id) return res.status(400).json({ message: 'Route ID is required' });

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIdx = 1;

    // Helper to add fields to dynamic query
    const addField = (col, val) => {
      if (val !== undefined) {
        updateFields.push(`${col} = $${paramIdx++}`);
        updateValues.push(val);
      }
    };

    addField('name', name);
    addField('start_datetime', start_datetime);
    addField('end_datetime', end_datetime);
    addField('status', status);
    addField('distance', distance);
    addField('duration', duration);
    addField('end_mode', end_mode);
    addField('is_active', is_active);

    const insertLocQuery = `
      INSERT INTO locations (name, housenumber, street, city, postcode, country, latitude, longitude, full_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING location_id
    `;

    // Handle Start Location update
    if (start_location && typeof start_location === 'object') {
      const details = start_location.details || {};
      await runQuery(insertLocQuery, [
        start_location.name || details.name || null,
        start_location.housenumber || details.housenumber || null,
        start_location.street || details.street || details.addressLine1 || null,
        start_location.city || details.city || null,
        start_location.postcode || details.postalCode || null,
        start_location.country || details.country || null,
        start_location.latitude,
        start_location.longitude,
        start_location.full_address || start_location.address
      ]);
      addField('start_full_address', start_location.full_address || start_location.address);
    }

    // Handle End Location update
    if (end_location && typeof end_location === 'object') {
      const details = end_location.details || {};
      await runQuery(insertLocQuery, [
        end_location.name || details.name || null,
        end_location.housenumber || details.housenumber || null,
        end_location.street || details.street || details.addressLine1 || null,
        end_location.city || details.city || null,
        end_location.postcode || details.postalCode || null,
        end_location.country || details.country || null,
        end_location.latitude,
        end_location.longitude,
        end_location.full_address || end_location.address
      ]);
      addField('end_full_address', end_location.full_address || end_location.address);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(route_id, user_id);
    
    const query = `
      UPDATE routes 
      SET ${updateFields.join(', ')}
      WHERE route_id = $${paramIdx++} AND user_id = $${paramIdx}
      RETURNING *
    `;

    const result = await runQuery(query, updateValues);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Route not found or unauthorized' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Edit Route Error:', error);
    res.status(500).json({ message: 'Server error while updating route' });
  }
};

// @desc    Geocode address components
// @route   POST /route/geocode
// @access  Private
const geocodeAddress = async (req, res) => {
  try {
    const { street, housenumber, postcode, city, country } = req.body;
    if (!street || !housenumber || !postcode || !city || !country) {
      return res.status(400).json({ message: 'Missing required fields: street, housenumber, postcode, city, and country are required.' });
    }

    const bestMatch = await getGeocodingData(req.body);
    if (!bestMatch) {
      return res.status(404).json({ message: 'No geocoding results found' });
    }
    res.status(200).json(bestMatch);
  } catch (error) {
    console.error('Geocode Route Error:', error);
    res.status(500).json({ message: 'Server error during geocoding process' });
  }
};

// @desc    Autocomplete address
// @route   GET /route/autocomplete
// @access  Private
const autocompleteAddress = async (req, res) => {
  const { text, limit, lang } = req.query;
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!text) {
    return res.status(400).json({ message: 'Text query parameter is required for autocomplete' });
  }

  if (!apiKey) {
    return res.status(500).json({ message: 'Geoapify API key is missing' });
  }

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.append('text', text);
    url.searchParams.append('limit', limit || '3');
    url.searchParams.append('lang', lang || 'en');
    url.searchParams.append('format', 'json');
    url.searchParams.append('apiKey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.status(500).json({ message: 'Server error during autocomplete' });
  }
};

// @desc    Optimize route using Pharmdel API
// @route   POST /route/optimize
// @access  Private
const optimizeRoute = async (req, res) => {
  const { route_id } = req.body;

  if (!route_id) {
    return res.status(400).json({ message: 'route_id is required' });
  }

  try {
    // 1. Fetch Route details
    const routeRes = await runQuery('SELECT * FROM routes WHERE route_id = $1', [route_id]);
    if (routeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }
    const route = routeRes.rows[0];

    // 2. Fetch coordinates for the route's start and end addresses from locations table
    const startLocRes = await runQuery('SELECT latitude, longitude FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.start_full_address]);
    const endLocRes = await runQuery('SELECT latitude, longitude FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.end_full_address]);

    if (startLocRes.rows.length === 0 || endLocRes.rows.length === 0) {
      return res.status(400).json({ message: 'Start or end location coordinates not found. Please ensure the route was created correctly.' });
    }

    const startCoords = [parseFloat(startLocRes.rows[0].longitude), parseFloat(startLocRes.rows[0].latitude)];
    const endCoords = [parseFloat(endLocRes.rows[0].longitude), parseFloat(endLocRes.rows[0].latitude)];

    // 3. Fetch all orders for this route with their coordinates
    const ordersQuery = `
      SELECT o.order_id, l.latitude, l.longitude 
      FROM orders o 
      JOIN locations l ON o.location_id = l.location_id 
      WHERE o.route_id = $1
    `;
    const ordersRes = await runQuery(ordersQuery, [route_id]);
    
    if (ordersRes.rows.length === 0) {
      return res.status(400).json({ message: 'No orders found for this route to optimize.' });
    }

    const jobs = ordersRes.rows.map(order => ({
      id: order.order_id,
      location: [parseFloat(order.longitude), parseFloat(order.latitude)]
    }));

    // 4. Construct Pharmdel API payload
    const payload = {
      jobs: jobs,
      vehicles: [{
        id: 0,
        profile: 'bike',
        start: startCoords,
        end: endCoords
      }]
    };

    const pharmdelResponse = await fetch('https://routes.pharmdel.com/maps', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.PHARMDEL_API_KEY,
        'Authorization': `Bearer ${process.env.PHARMDEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await pharmdelResponse.json();

    if (data.code !== 0 || !data.routes || data.routes.length === 0) {
      return res.status(502).json({ message: 'Optimization service error', details: data });
    }

    // 6. Process sequence updates and clean response fields
    const steps = data.routes[0].steps;
    let sequenceCounter = 1;

    for (let step of steps) {
      if (step.type === 'job') {
        // Update sequence_no in the orders table based on optimized order
        await runQuery('UPDATE orders SET sequence_no = $1 WHERE order_id = $2', [sequenceCounter, step.id]);
        step.sequence_no = sequenceCounter; // Add sequence_no to the response
        sequenceCounter++;
      }

      // Remove unwanted fields from the response
      delete step.arrival;
      delete step.distance;
      delete step.duration;
      delete step.service;
      delete step.setup;
      delete step.violations;
      delete step.waiting_time;
      delete step.job;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Optimize Route Error:', error);
    res.status(500).json({ message: 'Server error during route optimization' });
  }
};

module.exports = { createRoute, fetchAllRoutes, fetchRouteById, editRoute, geocodeAddress, getGeocodingData, autocompleteAddress, optimizeRoute };