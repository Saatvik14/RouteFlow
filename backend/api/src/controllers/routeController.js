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
  url.searchParams.append('filter', 'countrycode:gb');
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

  const isUkAddress = (loc) => {
    if (!loc) return true;
    const cc = (loc.countryCode || loc.country_code || '').toLowerCase();
    const name = (loc.country || '').toLowerCase();
    const addr = (loc.full_address || loc.address || '').toLowerCase();
    return cc === 'gb' || name.includes('united kingdom') || name === 'uk' || addr.includes('united kingdom') || addr.includes(', uk');
  };

  if (!isUkAddress(start_location) || (end_location && !isUkAddress(end_location))) {
    return res.status(400).json({ message: 'Only locations within the United Kingdom are supported.' });
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
    const autocompleteUrl = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    autocompleteUrl.searchParams.append('text', text);
    autocompleteUrl.searchParams.append('limit', limit || '3');
    autocompleteUrl.searchParams.append('lang', lang || 'en');
    autocompleteUrl.searchParams.append('format', 'json');
    autocompleteUrl.searchParams.append('filter', 'countrycode:gb');
    autocompleteUrl.searchParams.append('apiKey', apiKey);

    const autocompleteResponse = await fetch(autocompleteUrl.toString());
    const autocompleteData = await autocompleteResponse.json();

    if (!autocompleteData?.results || autocompleteData.results.length === 0) {
      const geocodeUrl = new URL('https://api.geoapify.com/v1/geocode/search');
      // console.log('No autocomplete results found, falling back to geocode search');
      geocodeUrl.searchParams.append('text', text);
      geocodeUrl.searchParams.append('limit', limit || '3');
      geocodeUrl.searchParams.append('lang', lang || 'en');
      geocodeUrl.searchParams.append('format', 'json');
      geocodeUrl.searchParams.append('filter', 'countrycode:gb');
      geocodeUrl.searchParams.append('apiKey', apiKey);

      const geocodeResponse = await fetch(geocodeUrl.toString());
      const geocodeData = await geocodeResponse.json();

      if (geocodeData?.results?.length > 0) {
        const bestResult = geocodeData.results.reduce((prev, current) => {
          const prevConfidence = prev?.rank?.confidence || 0;
          const currentConfidence = current?.rank?.confidence || 0;
          return currentConfidence > prevConfidence ? current : prev;
        }, geocodeData.results[0]);

        return res.status(200).json({ results: [bestResult] });
      }
    }

    return res.status(200).json(autocompleteData);
  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.status(500).json({ message: 'Server error during autocomplete' });
  }
};

// @desc    Reverse geocode latitude and longitude
// @route   GET /route/reverse-geocode
// @access  Private
const reverseGeocode = async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'lat and lon query parameters are required' });
  }

  if (!apiKey) {
    return res.status(500).json({ message: 'Geoapify API key is missing' });
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geoapify responded with status: ${response.status}`);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Reverse Geocode Error:', error);
    return res.status(500).json({ message: 'Server error during reverse geocoding', error: error.message });
  }
};

// @desc    Optimize route using Pharmdel API
// @route   POST /route/optimize
// @access  Private

// const optimizeRoute = async (req, res) => {
//   const { route_id } = req.body;

//   if (!route_id) {
//     return res.status(400).json({ message: 'route_id is required' });
//   }

//   try {
//     // 1. Fetch Route details
//     const routeRes = await runQuery('SELECT * FROM routes WHERE route_id = $1', [route_id]);
//     if (routeRes.rows.length === 0) {
//       return res.status(404).json({ message: 'Route not found' });
//     }
//     const route = routeRes.rows[0];

//     // 2. Fetch coordinates for the route's start and end addresses from locations table
//     const startLocRes = await runQuery('SELECT latitude, longitude FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.start_full_address]);
//     const endLocRes = await runQuery('SELECT latitude, longitude FROM locations WHERE full_address = $1 ORDER BY created_at DESC LIMIT 1', [route.end_full_address]);

//     if (startLocRes.rows.length === 0 || endLocRes.rows.length === 0) {
//       return res.status(400).json({ message: 'Start or end location coordinates not found. Please ensure the route was created correctly.' });
//     }

//     const startCoords = [parseFloat(startLocRes.rows[0].longitude), parseFloat(startLocRes.rows[0].latitude)];
//     const endCoords = [parseFloat(endLocRes.rows[0].longitude), parseFloat(endLocRes.rows[0].latitude)];

//     // 3. Fetch all orders for this route with their coordinates and priority
//     const ordersQuery = `
//       SELECT o.order_id, l.latitude, l.longitude 
//       FROM orders o 
//       JOIN locations l ON o.location_id = l.location_id 
//       WHERE o.route_id = $1
//     `;
//     const ordersRes = await runQuery(ordersQuery, [route_id]);
    
//     if (ordersRes.rows.length === 0) {
//       return res.status(400).json({ message: 'No orders found for this route to optimize.' });
//     }

//     const allOrders = ordersRes.rows;
//     // Filter orders for optimization: only those WITHOUT priority
//     const ordersToOptimize = allOrders
//     const prioritizedOrders = allOrders

//     let data;
//     if (ordersToOptimize.length === 0) {
//       // Sort all by priority
//       const sorted = [...prioritizedOrders].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
//       // Update database sequence
//       for (let i = 0; i < sorted.length; i++) {
//         await runQuery('UPDATE orders SET sequence_no = $1 WHERE order_id = $2', [i + 1, sorted[i].order_id]);
//       }
      
//       const finalSteps = [
//         { type: 'start' },
//         ...sorted.map((order, index) => ({
//           type: 'job',
//           id: order.order_id,
//           sequence_no: index + 1
//         })),
//         { type: 'end' }
//       ];

//       return res.status(200).json({
//         code: 0,
//         routes: [{
//           steps: finalSteps,
//           summary: {
//             distance: 0,
//             duration: 0
//           }
//         }]
//       });
//     }

//     const jobs = ordersToOptimize.map(order => ({
//       id: order.order_id,
//       location: [parseFloat(order.longitude), parseFloat(order.latitude)]
//     }));

//     // 4. Construct Pharmdel API payload
//     const payload = {
//       jobs: jobs,
//       vehicles: [{
//         id: 0,
//         profile: 'bike',
//         start: startCoords,
//         end: endCoords
//       }]
//     };

//     const pharmdelResponse = await fetch('https://routes.pharmdel.com/maps', {
//       method: 'POST',
//       headers: {
//         'X-API-KEY': process.env.PHARMDEL_API_KEY,
//         'Authorization': `Bearer ${process.env.PHARMDEL_TOKEN}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(payload)
//     });

//     data = await pharmdelResponse.json();

//     if (data.code !== 0 || !data.routes || data.routes.length === 0) {
//       return res.status(502).json({ message: 'Optimization service error', details: data });
//     }

//     // 6. Process sequence updates and clean response fields
//     const steps = data.routes[0].steps;
//     const optimizedJobs = steps.filter((step) => step.type === 'job');

//     // Create final array of size N
//     const N = allOrders.length;
//     const finalSequence = new Array(N).fill(null);

//     // First, place prioritized orders
//     prioritizedOrders.forEach(order => {
//       const targetIdx = Math.min(Math.max(1, Number(order.priority)), N) - 1;
//       let idx = targetIdx;
//       while (idx < N && finalSequence[idx] !== null) {
//         idx++;
//       }
//       if (idx >= N) {
//         idx = 0;
//         while (idx < N && finalSequence[idx] !== null) {
//           idx++;
//         }
//       }
//       if (idx < N) {
//         finalSequence[idx] = { order_id: order.order_id, source: 'priority' };
//       }
//     });

//     // Next, fill in optimized jobs in order
//     let optIdx = 0;
//     for (let i = 0; i < N; i++) {
//       if (finalSequence[i] === null && optIdx < optimizedJobs.length) {
//         finalSequence[i] = { order_id: optimizedJobs[optIdx].id, source: 'optimized', step: optimizedJobs[optIdx] };
//         optIdx++;
//       }
//     }

//     // Any remaining null slots fallback
//     for (let i = 0; i < N; i++) {
//       if (finalSequence[i] === null) {
//         const unplaced = allOrders.find(o => !finalSequence.some(f => f && f.order_id === o.order_id));
//         if (unplaced) {
//           finalSequence[i] = { order_id: unplaced.order_id, source: 'fallback' };
//         }
//       }
//     }

//     // Now update database and construct final steps response list
//     const finalSteps = [];
//     const startStep = steps.find(s => s.type === 'start') || { type: 'start' };
//     finalSteps.push(startStep);

//     let sequenceCounter = 1;
//     for (let i = 0; i < N; i++) {
//       const item = finalSequence[i];
//       if (item) {
//         await runQuery('UPDATE orders SET sequence_no = $1 WHERE order_id = $2', [sequenceCounter, item.order_id]);
        
//         let stepObj;
//         if (item.source === 'optimized' && item.step) {
//           stepObj = item.step;
//         } else {
//           stepObj = {
//             type: 'job',
//             id: item.order_id
//           };
//         }
//         stepObj.sequence_no = sequenceCounter;
//         finalSteps.push(stepObj);
//         sequenceCounter++;
//       }
//     }

//     const endStep = steps.find(s => s.type === 'end') || { type: 'end' };
//     finalSteps.push(endStep);

//     // Remove unwanted fields from all steps
//     for (let step of finalSteps) {
//       delete step.arrival;
//       delete step.distance;
//       delete step.duration;
//       delete step.service;
//       delete step.setup;
//       delete step.violations;
//       delete step.waiting_time;
//       delete step.job;
//     }

//     data.routes[0].steps = finalSteps;
//     res.status(200).json(data);
//   } catch (error) {
//     console.error('Optimize Route Error:', error);
//     res.status(500).json({ message: 'Server error during route optimization' });
//   }
// };

const optimizeRoute = async (req, res) => {
  const { route_id } = req.body;

  if (!route_id) {
    return res.status(400).json({
      message: 'route_id is required',
    });
  }

  const normalizeOrderPreference = (preference) => {
    const normalizedPreference = String(preference || '')
      .trim()
      .toLowerCase();

    if (
      normalizedPreference === 'early' ||
      normalizedPreference === 'last'
    ) {
      return normalizedPreference;
    }

    return 'auto';
  };

  const parseCoordinates = (longitude, latitude) => {
    const parsedLongitude = Number(longitude);
    const parsedLatitude = Number(latitude);

    if (
      !Number.isFinite(parsedLongitude) ||
      !Number.isFinite(parsedLatitude)
    ) {
      return null;
    }

    return [parsedLongitude, parsedLatitude];
  };

  const createApiError = (message, statusCode = 502, details = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
  };

  try {
    /*
     * 1. Fetch route
     */
    const routeResult = await runQuery(
      `
        SELECT *
        FROM routes
        WHERE route_id = $1
        LIMIT 1
      `,
      [route_id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Route not found',
      });
    }

    const route = routeResult.rows[0];

    /*
     * 2. Fetch start and end coordinates
     */
    const [startLocationResult, endLocationResult] = await Promise.all([
      runQuery(
        `
          SELECT latitude, longitude
          FROM locations
          WHERE full_address = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [route.start_full_address]
      ),
      runQuery(
        `
          SELECT latitude, longitude
          FROM locations
          WHERE full_address = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [route.end_full_address]
      ),
    ]);

    if (
      startLocationResult.rows.length === 0 ||
      endLocationResult.rows.length === 0
    ) {
      return res.status(400).json({
        message:
          'Start or end coordinates were not found. Please verify the route locations.',
      });
    }

    const startCoordinates = parseCoordinates(
      startLocationResult.rows[0].longitude,
      startLocationResult.rows[0].latitude
    );

    const endCoordinates = parseCoordinates(
      endLocationResult.rows[0].longitude,
      endLocationResult.rows[0].latitude
    );

    if (!startCoordinates || !endCoordinates) {
      return res.status(400).json({
        message: 'Start or end location contains invalid coordinates.',
      });
    }

    /*
     * 3. Fetch route orders
     */
    const ordersResult = await runQuery(
      `
        SELECT
          o.order_id,
          o.order_preference,
          l.latitude,
          l.longitude
        FROM orders o
        INNER JOIN locations l
          ON l.location_id = o.location_id
        WHERE o.route_id = $1
      `,
      [route_id]
    );

    if (ordersResult.rows.length === 0) {
      return res.status(400).json({
        message: 'No orders found for this route.',
      });
    }

    /*
     * Normalize and validate every order.
     */
    const allOrders = ordersResult.rows.map((order) => {
      const coordinates = parseCoordinates(
        order.longitude,
        order.latitude
      );

      if (!coordinates) {
        throw createApiError(
          `Invalid coordinates found for order ${order.order_id}.`,
          400
        );
      }

      return {
        ...order,
        order_preference: normalizeOrderPreference(
          order.order_preference
        ),
        coordinates,
      };
    });

    const orderById = new Map(
      allOrders.map((order) => [
        String(order.order_id),
        order,
      ])
    );

    /*
     * 4. Divide orders into preference groups.
     *
     * The group order is fixed:
     * early -> auto -> last
     *
     * The order inside each group is optimized by Pharmdel.
     */
    const preferenceGroups = [
      {
        preference: 'early',
        orders: allOrders.filter(
          (order) => order.order_preference === 'early'
        ),
      },
      {
        preference: 'auto',
        orders: allOrders.filter(
          (order) => order.order_preference === 'auto'
        ),
      },
      {
        preference: 'last',
        orders: allOrders.filter(
          (order) => order.order_preference === 'last'
        ),
      },
    ].filter((group) => group.orders.length > 0);

    /*
     * Calls Pharmdel for one preference group.
     *
     * Intermediate groups do not receive an end coordinate.
     * This creates an open route ending at the final optimized stop.
     *
     * The final group receives the actual route destination.
     */
    const optimizePreferenceGroup = async ({
      group,
      groupStartCoordinates,
      includeRouteEnd,
    }) => {
      const jobs = group.orders.map((order) => ({
        id: order.order_id,
        location: order.coordinates,
      }));

      const vehicle = {
        id: 0,
        profile: 'bike',
        start: groupStartCoordinates,
      };

      if (includeRouteEnd) {
        vehicle.end = endCoordinates;
      }

      const payload = {
        jobs,
        vehicles: [vehicle],
      };

      const pharmdelResponse = await fetch(
        process.env.PHARMDEL_MAPS_API_URL || 'https://routes.pharmdel.com/maps',
        {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.PHARMDEL_API_KEY,
            Authorization: `Bearer ${process.env.PHARMDEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await pharmdelResponse.text();

      let optimizationData;

      try {
        optimizationData = JSON.parse(responseText);
      } catch {
        throw createApiError(
          'Optimization service returned an invalid response.',
          502,
          responseText
        );
      }

      if (!pharmdelResponse.ok) {
        throw createApiError(
          'Optimization service request failed.',
          502,
          optimizationData
        );
      }

      if (
        optimizationData.code !== 0 ||
        !Array.isArray(optimizationData.routes) ||
        optimizationData.routes.length === 0
      ) {
        throw createApiError(
          `Unable to optimize ${group.preference} orders.`,
          502,
          optimizationData
        );
      }

      const optimizedRoute = optimizationData.routes[0];

      const optimizedJobSteps = optimizedRoute.steps.filter(
        (step) => step.type === 'job'
      );

      /*
       * Do not silently create a partial route.
       */
      const returnedOrderIds = new Set(
        optimizedJobSteps.map((step) => String(step.id))
      );

      const missingOrderIds = group.orders
        .filter(
          (order) =>
            !returnedOrderIds.has(String(order.order_id))
        )
        .map((order) => order.order_id);

      if (missingOrderIds.length > 0) {
        throw createApiError(
          `Some ${group.preference} orders could not be optimized.`,
          422,
          {
            missing_order_ids: missingOrderIds,
            unassigned: optimizationData.unassigned || [],
          }
        );
      }

      return {
        route: optimizedRoute,
        jobSteps: optimizedJobSteps,
      };
    };

    /*
     * 5. Optimize groups sequentially.
     */
    let currentStartCoordinates = startCoordinates;

    const optimizedOrders = [];

    let totalDistance = 0;
    let totalDuration = 0;
    let totalCost = 0;

    let firstStartStep = null;
    let finalEndStep = null;

    for (
      let groupIndex = 0;
      groupIndex < preferenceGroups.length;
      groupIndex++
    ) {
      const group = preferenceGroups[groupIndex];

      const isFinalGroup =
        groupIndex === preferenceGroups.length - 1;

      const groupResult = await optimizePreferenceGroup({
        group,
        groupStartCoordinates: currentStartCoordinates,
        includeRouteEnd: isFinalGroup,
      });

      const groupRoute = groupResult.route;

      if (!firstStartStep) {
        firstStartStep =
          groupRoute.steps.find(
            (step) => step.type === 'start'
          ) || null;
      }

      if (isFinalGroup) {
        finalEndStep =
          groupRoute.steps.find(
            (step) => step.type === 'end'
          ) || null;
      }

      totalDistance += Number(
        groupRoute.summary?.distance || 0
      );

      totalDuration += Number(
        groupRoute.summary?.duration || 0
      );

      totalCost += Number(groupRoute.cost || 0);

      for (const step of groupResult.jobSteps) {
        const order = orderById.get(String(step.id));

        if (!order) {
          throw createApiError(
            `Optimizer returned unknown order ${step.id}.`,
            502
          );
        }

        optimizedOrders.push({
          order,
          optimizerStep: step,
        });
      }

      /*
       * The next preference group starts from the final order
       * of the currently optimized group.
       */
      const lastOptimizedStep =
        groupResult.jobSteps[
          groupResult.jobSteps.length - 1
        ];

      if (lastOptimizedStep) {
        const lastOrder = orderById.get(
          String(lastOptimizedStep.id)
        );

        currentStartCoordinates = lastOrder.coordinates;
      }
    }

    if (optimizedOrders.length !== allOrders.length) {
      throw createApiError(
        'The optimized route does not contain every order.',
        422,
        {
          expected_orders: allOrders.length,
          optimized_orders: optimizedOrders.length,
        }
      );
    }

    /*
     * 6. Update every order sequence in one query.
     */
    const orderIds = optimizedOrders.map(({ order }) =>
      Number(order.order_id)
    );

    const sequenceNumbers = optimizedOrders.map(
      (_, index) => index + 1
    );

    await runQuery(
      `
        UPDATE orders AS o
        SET sequence_no = updated.sequence_no
        FROM unnest(
          $1::bigint[],
          $2::integer[]
        ) AS updated(order_id, sequence_no)
        WHERE o.order_id = updated.order_id
          AND o.route_id = $3
      `,
      [orderIds, sequenceNumbers, route_id]
    );

    /*
     * 7. Construct frontend response.
     */
    const finalSteps = [
      {
        type: 'start',
        ...(firstStartStep?.location
          ? { location: firstStartStep.location }
          : { location: startCoordinates }),
      },
      ...optimizedOrders.map(
        ({ order, optimizerStep }, index) => ({
          type: 'job',
          id: order.order_id,
          sequence_no: index + 1,
          order_preference: order.order_preference,
          ...(optimizerStep.location
            ? { location: optimizerStep.location }
            : { location: order.coordinates }),
        })
      ),
      {
        type: 'end',
        ...(finalEndStep?.location
          ? { location: finalEndStep.location }
          : { location: endCoordinates }),
      },
    ];

    return res.status(200).json({
      code: 0,
      routes: [
        {
          vehicle: 0,
          cost: totalCost,
          steps: finalSteps,
          summary: {
            distance: totalDistance,
            duration: totalDuration,
          },
        },
      ],
      unassigned: [],
    });
  } catch (error) {
    console.error('Optimize Route Error:', error);

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.message ||
          'Server error during route optimization',
        ...(error.details
          ? { details: error.details }
          : {}),
      });
  }
};



// controllers/routeController.js
const cancelRoute = async (req, res) => {
  try {
    const routeId = req.query.route_id;

    if (!routeId) {
      return res.status(400).json({
        success: false,
        message: "route_id is required",
      });
    }

    const query = `
      WITH updated_route AS (
        UPDATE routes
        SET 
          status = 'cancelled',
          updated_at = NOW()
        WHERE route_id = $1
        RETURNING *
      ),
      updated_orders AS (
        UPDATE orders
        SET 
          status = 'cancelled',
          updated_at = NOW()
        WHERE route_id = $1
          AND LOWER(status) IN ('pending', 'pnding')
        RETURNING order_id, status
      )
      SELECT 
        (SELECT row_to_json(updated_route) FROM updated_route) AS route,
        (SELECT COUNT(*) FROM updated_orders) AS cancelled_orders_count;
    `;

    const result = await runQuery(query, [routeId]);

    const data = result.rows?.[0];

    if (!data?.route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Route cancelled successfully",
      route: data.route,
      cancelledOrdersCount: Number(data.cancelled_orders_count || 0),
    });
  } catch (error) {
    console.error("Error cancelling route:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel route",
      error: error.message,
    });
  }
};



module.exports = { createRoute, fetchAllRoutes, fetchRouteById, editRoute, geocodeAddress, getGeocodingData, autocompleteAddress, optimizeRoute, cancelRoute, reverseGeocode };