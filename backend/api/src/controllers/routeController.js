const { runQuery } = require('../config/db');

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
    status          // New: route status (optional)
  } = req.body;
  const user_id = req.user?.user_id; // Assuming user_id is available from authentication middleware

  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!name || !start_location?.full_address || !end_location?.full_address || !start_datetime || !end_datetime) {
    return res.status(400).json({ 
      message: 'Missing required fields. name, start_location (with full_address), end_location (with full_address), start_datetime, and end_datetime are required.' 
    });
  }

  try {
    // 1. Geocode Start and End Locations directly via helper
    // This is more efficient and reliable than making an internal HTTP request to yourself
    const [startGeocodeResult, endGeocodeResult] = await Promise.all([
      getGeocodingData(start_location),
      getGeocodingData(end_location)
    ]);

    if (!startGeocodeResult || !endGeocodeResult) {
      return res.status(400).json({ message: 'Unable to geocode one or both addresses.' });
    }

    const insertQuery = `
      INSERT INTO locations (name, housenumber, street, city, postcode, country, latitude, longitude, full_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING location_id
    `;

    // 3. Save Start Location
    const startLocRes = await runQuery(insertQuery, [
      start_location.name, start_location.housenumber, start_location.street,
      start_location.city, start_location.postcode, start_location.country,
      startGeocodeResult.lat, startGeocodeResult.lon, start_location.full_address
    ]);

    // 4. Save End Location
    await runQuery(insertQuery, [
      end_location.name, end_location.housenumber, end_location.street,
      end_location.city, end_location.postcode, end_location.country,
      endGeocodeResult.lat, endGeocodeResult.lon, end_location.full_address
    ]);

    // 5. Create entry in routes table
    const insertRouteQuery = `
      INSERT INTO routes (user_id, name, start_full_address, end_full_address, start_datetime, end_datetime, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING route_id, name, start_full_address, end_full_address, start_datetime, end_datetime, status
    `;
    const routeRes = await runQuery(insertRouteQuery, [
      user_id,
      name,
      start_location.full_address,
      end_location.full_address,
      start_datetime,
      end_datetime,
      status || 'active' // Default status if not provided
    ]);

    res.status(201).json({
      message: 'Route created successfully',
      route: routeRes.rows[0],
      start_coords: { lat: startGeocodeResult.lat, lon: startGeocodeResult.lon },
      end_coords: { lat: endGeocodeResult.lat, lon: endGeocodeResult.lon }
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
    const result = await runQuery('SELECT * FROM routes WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
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
    const result = await runQuery('SELECT * FROM routes WHERE route_id = $1 AND user_id = $2', [id, user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found or unauthorized' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching route' });
  }
};

// @desc    Edit route
// @route   PUT /route/edit
// @access  Private
const editRoute = async (req, res) => {
  const { route_id, name, start_location, end_location, start_datetime, end_datetime, status } = req.body;
  const user_id = req.user?.user_id;

  if (!user_id) {
    return res.status(401).json({ message: 'User authentication failed' });
  }

  if (!route_id) return res.status(400).json({ message: 'Route ID is required' });

  try {
    const updateQuery = `
      UPDATE routes 
      SET name = COALESCE($1, name),
          start_datetime = COALESCE($2, start_datetime), 
          end_datetime = COALESCE($3, end_datetime),
          status = COALESCE($4, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE route_id = $5 AND user_id = $6
      RETURNING *
    `;
    
    // Note: The original editRoute had start_location and end_location as string fields.
    // With the new schema, these would be location_ids.
    // For simplicity and to avoid breaking existing API contract for editRoute,
    // we are temporarily removing start_location and end_location from the update query for routes table.
    // A more robust solution would involve updating the locations table and then the location_ids in routes.
    const result = await runQuery(updateQuery, [name, start_datetime, end_datetime, status, route_id, user_id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Route not found or unauthorized' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
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

module.exports = { createRoute, fetchAllRoutes, fetchRouteById, editRoute, geocodeAddress, getGeocodingData, autocompleteAddress };