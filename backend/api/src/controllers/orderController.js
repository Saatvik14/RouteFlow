const { runQuery } = require('../config/db');
const { ROUTE_STATUS } = require('../constants/statusConstants');
const { PORT } = require('../config/env');

// Dynamic import for node-fetch as it is an ESM-only package (v3+)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// @desc    Add new order and create its location
// @route   POST /order/add
// @access  Private
const addOrder = async (req, res) => {
  const { 
    route_id, 
    status, 
    title, 
    address, 
    latitude, 
    longitude, 
    sequence, 
    location,
    notes,
    packages,
    stop_type
  } = req.body;

  if (!route_id || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ 
      message: 'Missing required fields. route_id, address, latitude, and longitude are required.' 
    });
  }

  const details = location?.details || {};

  try {
    // 1. Create entry in locations table
    const locationQuery = `
      INSERT INTO locations (name, housenumber, street, city, postcode, country, latitude, longitude, full_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING location_id
    `;
    const locRes = await runQuery(locationQuery, [
      title || null, 
      details.housenumber || null, 
      details.street || details.addressLine1 || null,
      details.city || null, 
      details.postalCode || null, 
      details.country || null, 
      latitude, 
      longitude, 
      address
    ]);
    const location_id = locRes.rows[0].location_id;

    // 2. Create entry in orders table
    const orderQuery = `
      INSERT INTO orders (location_id, status, route_id, sequence_no)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const orderRes = await runQuery(orderQuery, [
      location_id, 
      status || ROUTE_STATUS.PENDING, 
      route_id, 
      sequence || null
    ]);

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
  const { order_id, status, sequence_no, name, housenumber, street, city, postcode, country, latitude, longitude } = req.body;

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

    let locationUpdated = false;
    let newLatitude = currentLoc.latitude;
    let newLongitude = currentLoc.longitude;

    // Check if any address components or coordinates are provided for update
    if (
      name !== undefined || housenumber !== undefined || street !== undefined ||
      city !== undefined || postcode !== undefined || country !== undefined ||
      latitude !== undefined || longitude !== undefined
    ) {
      locationUpdated = true;

      // Use provided lat/lon if available, otherwise keep existing
      if (latitude !== undefined) newLatitude = latitude;
      if (longitude !== undefined) newLongitude = longitude;

      // Update Location details
      const locUpdateQuery = `
        UPDATE locations
        SET name = COALESCE($1, name), housenumber = COALESCE($2, housenumber), street = COALESCE($3, street),
            city = COALESCE($4, city), postcode = COALESCE($5, postcode), country = COALESCE($6, country),
            latitude = $7, longitude = $8, updated_at = CURRENT_TIMESTAMP
        WHERE location_id = $9
      `;
      await runQuery(locUpdateQuery, [
        name, housenumber, street, city, postcode, country,
        newLatitude, newLongitude,
        location_id
      ]);
    }

    // Prepare order update fields
    const orderUpdateFields = [];
    const orderUpdateValues = [];
    let paramCounter = 1;

    if (status !== undefined) {
      orderUpdateFields.push(`status = $${paramCounter++}`);
      orderUpdateValues.push(status);
    }

    if (locationUpdated) {
      orderUpdateFields.push(`sequence_no = NULL`); // Set to NULL if location was updated
    } else if (sequence_no !== undefined) {
      orderUpdateFields.push(`sequence_no = $${paramCounter++}`);
      orderUpdateValues.push(sequence_no);
    }

    // If no order-specific fields or location was updated, return existing order data
    if (orderUpdateFields.length === 0) {
      // Fetch the order again to return the most current state, including location updates
      const updatedOrder = await runQuery(
        'SELECT o.*, l.name, l.housenumber, l.street, l.city, l.postcode, l.country, l.latitude, l.longitude FROM orders o JOIN locations l ON o.location_id = l.location_id WHERE o.order_id = $1',
        [order_id]
      );
      return res.status(200).json(updatedOrder.rows[0]);
    }

    orderUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    orderUpdateValues.push(order_id); // Last parameter is order_id for WHERE clause

    const orderUpdateQuery = `
      UPDATE orders 
      SET ${orderUpdateFields.join(', ')}
      WHERE order_id = $${paramCounter}
      RETURNING *
    `;
    const result = await runQuery(orderUpdateQuery, orderUpdateValues);

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
      SELECT o.*, l.name, l.housenumber, l.street, l.city, l.postcode, l.country, l.latitude, l.longitude,
             op.longitudinal, op.side, op.vertical
      FROM orders o
      JOIN locations l ON o.location_id = l.location_id
      LEFT JOIN order_placements op ON o.order_id = op.order_id
      ORDER BY o.created_at DESC
    `;
    const result = await runQuery(query);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
};


const fetchOrdersByRoute = async (req, res) => {
  try {
    const { routeId } = req.query;

    if (!routeId) {
      return res.status(400).json({
        message: "routeId is required",
      });
    }

    const query = `
      SELECT 
        o.*,

        l.name AS location_name,
        l.housenumber,
        l.street,
        l.city,
        l.postcode,
        l.country,
        l.latitude,
        l.longitude,

        op.longitudinal,
        op.side,
        op.vertical

      FROM orders o
      JOIN locations l 
        ON o.location_id = l.location_id
      LEFT JOIN order_placements op 
        ON o.order_id = op.order_id

      WHERE o.route_id = $1

      ORDER BY 
        o.sequence_no ASC NULLS LAST,
        o.created_at ASC
    `;

    const result = await runQuery(query, [routeId]);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching route orders:", error);

    return res.status(500).json({
      message: "Server error while fetching orders for route",
    });
  }
};

// @desc    Get vehicle placement for a specific order
// @route   GET /order/vehicleplace?order_id=...
// @access  Private
const getVehiclePlacementByOrderId = async (req, res) => {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({ message: 'order_id is required as a query parameter' });
  }

  try {
    const result = await runQuery('SELECT * FROM order_placements WHERE order_id = $1', [order_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle placement not found for this order' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Fetch Vehicle Placement Error:', error);
    res.status(500).json({ message: 'Server error while fetching vehicle placement' });
  }
};

// @desc    Set or update the vehicle placement for an order
// @route   POST /order/vehicleplace
// @access  Private
const setVehiclePlacement = async (req, res) => {
  const { order_id, longitudinal, side, vertical } = req.body;

  if (!order_id) {
    return res.status(400).json({ message: 'order_id is required' });
  }

  try {
    // Verify if the order exists before attempting to set placement
    const orderCheck = await runQuery('SELECT order_id FROM orders WHERE order_id = $1', [order_id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Upsert logic: Update if order_id already exists, otherwise Insert
    const upsertQuery = `
      INSERT INTO order_placements (order_id, longitudinal, side, vertical)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id) 
      DO UPDATE SET 
        longitudinal = EXCLUDED.longitudinal,
        side = EXCLUDED.side,
        vertical = EXCLUDED.vertical,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await runQuery(upsertQuery, [order_id, longitudinal, side, vertical]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Set Vehicle Placement Error:', error);
    res.status(500).json({ message: 'Server error while setting vehicle placement' });
  }
};


const insertOrderStop = async stop => {
  const {
    route_id,
    status,
    title,
    customer_name,
    phone,
    address,
    latitude,
    longitude,
    sequence,
    location,
    notes,
    packages,
    stop_type,
    source,
    raw_manifest_row,
  } = stop;

  const details = location?.details || {};

  if (!route_id || !address || latitude === undefined || longitude === undefined) {
    throw new Error('route_id, address, latitude, and longitude are required');
  }

  const locationQuery = `
    INSERT INTO locations
      (name, housenumber, street, city, postcode, country, latitude, longitude, full_address)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING location_id
  `;

  const locRes = await runQuery(locationQuery, [
    title || customer_name || null,
    details.housenumber || null,
    details.street || details.addressLine1 || null,
    details.city || null,
    details.postalCode || details.postcode || null,
    details.country || null,
    latitude,
    longitude,
    address,
  ]);

  const location_id = locRes.rows[0].location_id;

  const orderQuery = `
    INSERT INTO orders
      (
        location_id,
        status,
        route_id,
        sequence_no,
        customer_name,
        phone,
        notes,
        packages,
        stop_type,
        source,
        raw_manifest_row
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const orderRes = await runQuery(orderQuery, [
    location_id,
    status || ROUTE_STATUS.PENDING,
    route_id,
    sequence || null,
    customer_name || null,
    phone || null,
    notes || null,
    packages || 1,
    stop_type || 'delivery',
    source || 'manual',
    raw_manifest_row ? JSON.stringify(raw_manifest_row) : null,
  ]);

  return orderRes.rows[0];
};

// @desc    Add many orders/stops at once
// @route   POST /order/add/bulk
// @access  Private
const addBulkOrders = async (req, res) => {
  const { route_id, stops } = req.body;

  if (!route_id) {
    return res.status(400).json({ message: 'route_id is required' });
  }

  if (!Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({ message: 'stops array is required' });
  }

  const created = [];
  const failed = [];

  for (let index = 0; index < stops.length; index++) {
    try {
      const createdOrder = await insertOrderStop({
        ...stops[index],
        route_id,
        sequence: stops[index].sequence || null,
      });

      created.push(createdOrder);
    } catch (error) {
      failed.push({
        index,
        stop: stops[index],
        error: error.message,
      });
    }
  }

  res.status(201).json({
    message: 'Bulk stop import completed',
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed,
  });
};

module.exports = { 
  addOrder, 
  editOrder, 
  deleteAllOrders, 
  deleteOrderById, 
  fetchOrders, 
  addBulkOrders,
  insertOrderStop,
  setVehiclePlacement,
  getVehiclePlacementByOrderId ,
  fetchOrdersByRoute
};