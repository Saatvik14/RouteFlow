const { runQuery } = require('../config/db');
const { PORT } = require('../config/env');

// Dynamic import for node-fetch as it is an ESM-only package (v3+)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// @desc    Add new order and create its location
// @route   POST /order/add
// @access  Private
const addOrder = async (req, res) => {
  const { route_id, status, name, housenumber, street, city, postcode, country } = req.body;

  if (!route_id || !housenumber || !street || !city || !postcode || !country) {
    return res.status(400).json({ message: 'Missing required fields. route_id, housenumber, street, city, postcode, and country are required.' });
  }

  try {
    // 0. Fetch coordinates automatically via Geoapify API call to /route/geocode
    const geocodeResponse = await fetch(`http://localhost:${PORT}/route/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({ name, housenumber, street, city, postcode, country })
    });

    const geocodeResult = await geocodeResponse.json();
    const latitude = geocodeResult?.lat;
    const longitude = geocodeResult?.lon;
    // console.log('Geocoding Result for Add Order:', geocodeResult);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Unable to geocode the provided address. Please check your address details.' });
    }

    // 1. Create entry in locations table
    const locationQuery = `
      INSERT INTO locations (name, housenumber, street, city, postcode, country, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING location_id
    `;
    const locRes = await runQuery(locationQuery, [name, housenumber, street, city, postcode, country, latitude, longitude]);
    const location_id = locRes.rows[0].location_id;

    // 2. Create entry in orders table (sequence_no is null at first)
    const orderQuery = `
      INSERT INTO orders (location_id, status, route_id, sequence_no)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const orderRes = await runQuery(orderQuery, [location_id, status || 'pending', route_id, null]);

    res.status(201).json(orderRes.rows[0]);
  } catch (error) {
    console.error('Add Order Error:', error);
    res.status(500).json({ message: 'Server error during order creation' });
  }
};

// @desc    Edit order and its location details
// @route   PUT /order/edit
// @access  Private
const editOrder = async (req, res) => {
  const { order_id, status, sequence_no, name, housenumber, street, city, postcode, country } = req.body;

  if (!order_id) return res.status(400).json({ message: 'order_id is required' });

  try {
    // 1. Identify the location associated with the order
    const orderLocCheck = await runQuery(
      'SELECT o.location_id, l.* FROM orders o JOIN locations l ON o.location_id = l.location_id WHERE o.order_id = $1', 
      [order_id]
    );
    if (orderLocCheck.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    
    const location_id = orderLocCheck.rows[0].location_id;
    const currentLoc = orderLocCheck.rows[0];

    let latitude = null;
    let longitude = null;

    // 2. If any address components are updated, re-geocode
    if (name || housenumber || street || city || postcode || country) {
      const updatedAddress = {
        name: name !== undefined ? name : currentLoc.name,
        housenumber: housenumber !== undefined ? housenumber : currentLoc.housenumber,
        street: street !== undefined ? street : currentLoc.street,
        city: city !== undefined ? city : currentLoc.city,
        postcode: postcode !== undefined ? postcode : currentLoc.postcode,
        country: country !== undefined ? country : currentLoc.country
      };

      const geocodeResponse = await fetch(`http://localhost:${PORT}/route/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify(updatedAddress)
      });

      const geocodeResult = await geocodeResponse.json();
      latitude = geocodeResult?.lat;
      longitude = geocodeResult?.lon;
    }

    // 3. Update Location details
    const locUpdateQuery = `
      UPDATE locations 
      SET name = COALESCE($1, name), housenumber = COALESCE($2, housenumber), street = COALESCE($3, street), 
          city = COALESCE($4, city), postcode = COALESCE($5, postcode), country = COALESCE($6, country), 
          latitude = COALESCE($7, latitude), longitude = COALESCE($8, longitude), updated_at = CURRENT_TIMESTAMP
      WHERE location_id = $9
    `;
    await runQuery(locUpdateQuery, [name, housenumber, street, city, postcode, country, latitude, longitude, location_id]);

    // 4. Update Order details
    const orderUpdateQuery = `
      UPDATE orders 
      SET status = COALESCE($1, status), sequence_no = COALESCE($2, sequence_no), updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $3
      RETURNING *
    `;
    const result = await runQuery(orderUpdateQuery, [status, sequence_no, order_id]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Edit Order Error:', error);
    res.status(500).json({ message: 'Server error while updating order' });
  }
};

// @desc    Delete all orders
// @route   DELETE /order/delete/all
// @access  Private
const deleteAllOrders = async (req, res) => {
  try {
    // Delete locations associated with existing orders first
    await runQuery('DELETE FROM locations WHERE location_id IN (SELECT location_id FROM orders)');
    // Then clear orders table
    await runQuery('DELETE FROM orders');

    res.status(200).json({ message: 'All orders and their associated locations deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting all orders' });
  }
};

// @desc    Delete specific order
// @route   DELETE /order/delete?id=...
// @access  Private
const deleteOrderById = async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Order ID is required' });

  try {
    // Delete the order and return the location_id to clean up the locations table
    const result = await runQuery('DELETE FROM orders WHERE order_id = $1 RETURNING location_id', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

    const location_id = result.rows[0].location_id;
    if (location_id) {
      await runQuery('DELETE FROM locations WHERE location_id = $1', [location_id]);
    }

    res.status(200).json({ message: 'Order and associated location deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting order' });
  }
};

// @desc    Fetch all orders with location details
// @route   GET /order/fetch
// @access  Private
const fetchOrders = async (req, res) => {
  try {
    const query = `
      SELECT o.*, l.name, l.housenumber, l.street, l.city, l.postcode, l.country, l.latitude, l.longitude
      FROM orders o
      JOIN locations l ON o.location_id = l.location_id
      ORDER BY o.created_at DESC
    `;
    const result = await runQuery(query);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
};

module.exports = { addOrder, editOrder, deleteAllOrders, deleteOrderById, fetchOrders };