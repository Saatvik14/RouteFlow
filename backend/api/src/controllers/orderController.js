const { runQuery } = require('../config/db');
const { ROUTE_STATUS } = require('../constants/statusConstants');
const { PORT } = require('../config/env');

// Dynamic import for node-fetch as it is an ESM-only package (v3+)
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Convert a JavaScript value into a valid JSON/JSONB database value.
 *
 * undefined:
 *   Should normally not be passed to this function.
 *
 * null:
 *   Stores SQL NULL.
 *
 * object/array:
 *   Converts to a JSON string.
 *
 * valid JSON string:
 *   Keeps the string unchanged.
 *
 * normal string:
 *   Converts it into a valid JSON string.
 */
const serializeJsonField = value => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
};

/**
 * Get order details from either:
 *
 * order_details
 * orderDetails
 *
 * Returns:
 * {
 *   provided: boolean,
 *   value: any
 * }
 */
const getOrderDetailsFromBody = body => {
  const hasSnakeCase = Object.prototype.hasOwnProperty.call(
    body,
    'order_details'
  );

  const hasCamelCase = Object.prototype.hasOwnProperty.call(
    body,
    'orderDetails'
  );

  if (hasSnakeCase) {
    return {
      provided: true,
      value: body.order_details,
    };
  }

  if (hasCamelCase) {
    return {
      provided: true,
      value: body.orderDetails,
    };
  }

  return {
    provided: false,
    value: undefined,
  };
};

const isUkAddress = loc => {
  if (!loc) return true;

  const countryCode = (
    loc.countryCode ||
    loc.country_code ||
    loc.isoCountryCode ||
    ''
  ).toLowerCase();

  const countryName = (loc.country || '').toLowerCase();

  const fullAddress = (
    loc.full_address ||
    loc.address ||
    ''
  ).toLowerCase();

  return (
    countryCode === 'gb' ||
    countryName.includes('united kingdom') ||
    countryName === 'uk' ||
    countryName === 'great britain' ||
    fullAddress.includes('united kingdom') ||
    fullAddress.includes('great britain') ||
    fullAddress.includes(', uk') ||
    fullAddress.includes(', gb')
  );
};

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

  if (
    !route_id ||
    !address ||
    latitude === undefined ||
    longitude === undefined
  ) {
    return res.status(400).json({
      message:
        'Missing required fields. route_id, address, latitude, and longitude are required.',
    });
  }

  const details = location?.details || {};

  const stopLocation = {
    countryCode:
      details.countryCode ||
      details.country_code ||
      details.isoCountryCode,
    country: details.country || details.country_name,
    full_address: address,
  };

  if (!isUkAddress(stopLocation)) {
    return res.status(400).json({
      message: 'Only stops within the United Kingdom are supported.',
    });
  }

  const orderDetails = getOrderDetailsFromBody(req.body);

  try {
    // Create location.
    const locationQuery = `
      INSERT INTO locations (
        name,
        housenumber,
        street,
        city,
        postcode,
        country,
        latitude,
        longitude,
        full_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING location_id
    `;

    const locationResult = await runQuery(locationQuery, [
      title || null,
      details.housenumber || null,
      details.street || details.addressLine1 || null,
      details.city || null,
      details.postalCode || details.postcode || null,
      details.country || details.country_name || null,
      latitude,
      longitude,
      address,
    ]);

    const locationId = locationResult.rows[0].location_id;

    const effectiveSequence = sequence;

    const effectiveStopType = stop_type

    /*
     * order_details behavior:
     *
     * Field not sent:
     *   Stores NULL for a newly-created order.
     *
     * Field sent as null:
     *   Stores NULL.
     *
     * Object or array sent:
     *   Stores JSON in the JSONB column.
     */
    const orderDetailsValue =
      orderDetails.provided && orderDetails.value !== null
        ? serializeJsonField(orderDetails.value)
        : null;

    // Create order.
    const orderQuery = `
      INSERT INTO orders (
        location_id,
        status,
        route_id,
        sequence_no,
        notes,
        packages,
        stop_type,
        order_details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const orderResult = await runQuery(orderQuery, [
      locationId,
      status || ROUTE_STATUS.PENDING,
      route_id,
      effectiveSequence ?? null,
      notes ?? null,
      packages === undefined || packages === null || packages === ''
        ? 1
        : Number(packages),
      effectiveStopType || 'delivery',
      orderDetailsValue,
    ]);

    return res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    console.error('Add Order Error:', error);

    return res.status(500).json({
      message: 'Server error during order creation',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// @desc    Edit order and its location details
// @route   PUT /order/edit
// @access  Private
const editOrder = async (req, res) => {
  const {
    order_id,
    status,
    sequence_no,
    name,
    housenumber,
    street,
    city,
    postcode,
    country,
    latitude,
    longitude,
    notes,
    packages,
    stopType,
    stop_type,
    priority,
  } = req.body;

  if (!order_id) {
    return res.status(400).json({
      message: 'order_id is required',
    });
  }

  const orderDetails = getOrderDetailsFromBody(req.body);

  try {
    // Find the order and its current location details.
    const orderLocationResult = await runQuery(
      `
        SELECT
          o.location_id,
          l.name,
          l.housenumber,
          l.street,
          l.city,
          l.postcode,
          l.country,
          l.latitude,
          l.longitude,
          l.full_address
        FROM orders o
        JOIN locations l
          ON o.location_id = l.location_id
        WHERE o.order_id = $1
      `,
      [order_id]
    );

    if (orderLocationResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    const currentLocation = orderLocationResult.rows[0];
    const locationId = currentLocation.location_id;

    const hasLocationUpdate =
      name !== undefined ||
      housenumber !== undefined ||
      street !== undefined ||
      city !== undefined ||
      postcode !== undefined ||
      country !== undefined ||
      latitude !== undefined ||
      longitude !== undefined;

    let locationUpdated = false;

    if (hasLocationUpdate) {
      const updatedName =
        name !== undefined ? name : currentLocation.name;

      const updatedHouseNumber =
        housenumber !== undefined
          ? housenumber
          : currentLocation.housenumber;

      const updatedStreet =
        street !== undefined ? street : currentLocation.street;

      const updatedCity =
        city !== undefined ? city : currentLocation.city;

      const updatedPostcode =
        postcode !== undefined
          ? postcode
          : currentLocation.postcode;

      const updatedCountry =
        country !== undefined
          ? country
          : currentLocation.country;

      const updatedLatitude =
        latitude !== undefined
          ? latitude
          : currentLocation.latitude;

      const updatedLongitude =
        longitude !== undefined
          ? longitude
          : currentLocation.longitude;

      const updatedFullAddress = [
        updatedHouseNumber,
        updatedStreet,
        updatedCity,
        updatedPostcode,
        updatedCountry,
      ]
        .filter(value => value !== null && value !== undefined && value !== '')
        .join(' ')
        .trim();

      const stopLocation = {
        country: updatedCountry,
        full_address:
          updatedFullAddress || currentLocation.full_address || '',
      };

      if (!isUkAddress(stopLocation)) {
        return res.status(400).json({
          message: 'Only stops within the United Kingdom are supported.',
        });
      }

      const locationUpdateQuery = `
        UPDATE locations
        SET
          name = $1,
          housenumber = $2,
          street = $3,
          city = $4,
          postcode = $5,
          country = $6,
          latitude = $7,
          longitude = $8,
          full_address = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE location_id = $10
      `;

      await runQuery(locationUpdateQuery, [
        updatedName,
        updatedHouseNumber,
        updatedStreet,
        updatedCity,
        updatedPostcode,
        updatedCountry,
        updatedLatitude,
        updatedLongitude,
        updatedFullAddress || currentLocation.full_address,
        locationId,
      ]);

      locationUpdated = true;
    }

    const orderUpdateFields = [];
    const orderUpdateValues = [];
    let parameterCounter = 1;

    if (status !== undefined) {
      orderUpdateFields.push(`status = $${parameterCounter}`);
      orderUpdateValues.push(status);
      parameterCounter += 1;

      const normalizedStatus = String(status)
        .trim()
        .toLowerCase();

      /*
       * Automatically save arrival time.
       *
       * Example:
       * {
       *   "order_id": "123",
       *   "status": "arrived"
       * }
       */
      if (normalizedStatus === 'arrived') {
        orderUpdateFields.push(
          'arrive_at = CURRENT_TIMESTAMP'
        );
      }

      /*
       * Automatically save failure time.
       *
       * Example:
       * {
       *   "order_id": "123",
       *   "status": "failed"
       * }
       */
      if (normalizedStatus === 'failed') {
        orderUpdateFields.push(
          'failed_at = CURRENT_TIMESTAMP'
        );
      }
    }

    if (locationUpdated) {
      // Changing the location invalidates the optimized sequence.
      orderUpdateFields.push('sequence_no = NULL');
    } else if (sequence_no !== undefined) {
      orderUpdateFields.push(
        `sequence_no = $${parameterCounter}`
      );

      orderUpdateValues.push(sequence_no);
      parameterCounter += 1;
    }

    if (notes !== undefined) {
      orderUpdateFields.push(`notes = $${parameterCounter}`);
      orderUpdateValues.push(notes);
      parameterCounter += 1;
    }

    if (packages !== undefined) {
      orderUpdateFields.push(
        `packages = $${parameterCounter}`
      );

      orderUpdateValues.push(
        packages === null || packages === ''
          ? null
          : Number(packages)
      );

      parameterCounter += 1;
    }

    const effectiveStopType =
      stop_type !== undefined ? stop_type : stopType;

    if (effectiveStopType !== undefined) {
      orderUpdateFields.push(
        `stop_type = $${parameterCounter}`
      );

      orderUpdateValues.push(effectiveStopType);
      parameterCounter += 1;
    }

    if (priority !== undefined) {
      orderUpdateFields.push(
        `priority = $${parameterCounter}`
      );

      orderUpdateValues.push(
        priority === null || priority === ''
          ? null
          : Number(priority)
      );

      parameterCounter += 1;
    }

    /*
     * order_details behavior during edit:
     *
     * Neither field sent:
     *   Existing order_details remains unchanged.
     *
     * order_details: null
     *   Existing value is cleared.
     *
     * orderDetails: null
     *   Existing value is cleared.
     *
     * Object/array sent:
     *   Existing value is replaced.
     */
    if (orderDetails.provided) {
      orderUpdateFields.push(
        `order_details = $${parameterCounter}`
      );

      orderUpdateValues.push(
        orderDetails.value === null ||
          orderDetails.value === undefined
          ? null
          : serializeJsonField(orderDetails.value)
      );

      parameterCounter += 1;
    }

    /*
     * There may be no order-specific fields when only the location
     * has been updated. In that case, sequence_no has already been
     * added above.
     */
    if (orderUpdateFields.length === 0) {
      const currentOrderResult = await runQuery(
        `
          SELECT
            o.*,
            l.name,
            l.housenumber,
            l.street,
            l.city,
            l.postcode,
            l.country,
            l.latitude,
            l.longitude,
            l.full_address
          FROM orders o
          JOIN locations l
            ON o.location_id = l.location_id
          WHERE o.order_id = $1
        `,
        [order_id]
      );

      return res.status(200).json(
        currentOrderResult.rows[0]
      );
    }

    orderUpdateFields.push(
      'updated_at = CURRENT_TIMESTAMP'
    );

    orderUpdateValues.push(order_id);

    const orderIdParameter = parameterCounter;

    const orderUpdateQuery = `
      UPDATE orders
      SET ${orderUpdateFields.join(', ')}
      WHERE order_id = $${orderIdParameter}
      RETURNING *
    `;

    const result = await runQuery(
      orderUpdateQuery,
      orderUpdateValues
    );

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Edit Order Error:', error);

    return res.status(500).json({
      message: 'Server error while updating order',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// @desc    Delete all orders
// @route   DELETE /order/delete/all
// @access  Private
const deleteAllOrders = async (req, res) => {
  try {
    await runQuery(
      'DELETE FROM locations WHERE location_id IN (SELECT location_id FROM orders)'
    );

    await runQuery('DELETE FROM orders');

    return res.status(200).json({
      message:
        'All orders and their associated locations deleted successfully',
    });
  } catch (error) {
    console.error('Delete All Orders Error:', error);

    return res.status(500).json({
      message: 'Server error while deleting all orders',
    });
  }
};

// @desc    Delete specific order
// @route   DELETE /order/delete?id=...
// @access  Private
const deleteOrderById = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      message: 'Order ID is required',
    });
  }

  try {
    const result = await runQuery(
      `
        DELETE FROM orders
        WHERE order_id = $1
        RETURNING location_id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    const locationId = result.rows[0].location_id;

    if (locationId) {
      await runQuery(
        `
          DELETE FROM locations
          WHERE location_id = $1
        `,
        [locationId]
      );
    }

    return res.status(200).json({
      message:
        'Order and associated location deleted successfully',
    });
  } catch (error) {
    console.error('Delete Order Error:', error);

    return res.status(500).json({
      message: 'Server error while deleting order',
    });
  }
};

// @desc    Fetch all orders with location details
// @route   GET /order/fetch
// @access  Private
const fetchOrders = async (req, res) => {
  try {
    const query = `
      SELECT
        o.*,
        l.name,
        l.housenumber,
        l.street,
        l.city,
        l.postcode,
        l.country,
        l.latitude,
        l.longitude,
        l.full_address,
        op.longitudinal,
        op.side,
        op.vertical
      FROM orders o
      JOIN locations l
        ON o.location_id = l.location_id
      LEFT JOIN order_placements op
        ON o.order_id = op.order_id
      ORDER BY o.created_at DESC
    `;

    const result = await runQuery(query);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch Orders Error:', error);

    return res.status(500).json({
      message: 'Server error while fetching orders',
    });
  }
};

// @desc    Fetch orders for a particular route
// @route   GET /order/fetch/route?routeId=...
// @access  Private
const fetchOrdersByRoute = async (req, res) => {
  try {
    const { routeId } = req.query;

    if (!routeId) {
      return res.status(400).json({
        message: 'routeId is required',
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
        l.full_address,

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
    console.error('Error fetching route orders:', error);

    return res.status(500).json({
      message:
        'Server error while fetching orders for route',
    });
  }
};

// @desc    Get vehicle placement for a specific order
// @route   GET /order/vehicleplace?order_id=...
// @access  Private
const getVehiclePlacementByOrderId = async (
  req,
  res
) => {
  const { order_id } = req.query;

  if (!order_id) {
    return res.status(400).json({
      message:
        'order_id is required as a query parameter',
    });
  }

  try {
    const result = await runQuery(
      `
        SELECT *
        FROM order_placements
        WHERE order_id = $1
      `,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          'Vehicle placement not found for this order',
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(
      'Fetch Vehicle Placement Error:',
      error
    );

    return res.status(500).json({
      message:
        'Server error while fetching vehicle placement',
    });
  }
};

// @desc    Set or update vehicle placement for an order
// @route   POST /order/vehicleplace
// @access  Private
const setVehiclePlacement = async (req, res) => {
  const {
    order_id,
    longitudinal,
    side,
    vertical,
  } = req.body;

  if (!order_id) {
    return res.status(400).json({
      message: 'order_id is required',
    });
  }

  try {
    const orderCheck = await runQuery(
      `
        SELECT order_id
        FROM orders
        WHERE order_id = $1
      `,
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    const upsertQuery = `
      INSERT INTO order_placements (
        order_id,
        longitudinal,
        side,
        vertical
      )
      VALUES ($1, $2, $3, $4)

      ON CONFLICT (order_id)
      DO UPDATE SET
        longitudinal = EXCLUDED.longitudinal,
        side = EXCLUDED.side,
        vertical = EXCLUDED.vertical,
        updated_at = CURRENT_TIMESTAMP

      RETURNING *
    `;

    const result = await runQuery(upsertQuery, [
      order_id,
      longitudinal,
      side,
      vertical,
    ]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Set Vehicle Placement Error:', error);

    return res.status(500).json({
      message:
        'Server error while setting vehicle placement',
    });
  }
};

/**
 * Internal helper for adding an order during bulk import.
 */
const insertOrderStop = async stop => {
  const {
    route_id,
    status,
    title,
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

  if (
    !route_id ||
    !address ||
    latitude === undefined ||
    longitude === undefined
  ) {
    throw new Error(
      'route_id, address, latitude, and longitude are required'
    );
  }

  const locationQuery = `
    INSERT INTO locations (
      name,
      housenumber,
      street,
      city,
      postcode,
      country,
      latitude,
      longitude,
      full_address
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING location_id
  `;

  const locationResult = await runQuery(locationQuery, [
    title || null,
    details.housenumber || null,
    details.street || details.addressLine1 || null,
    details.city || null,
    details.postalCode || details.postcode || null,
    details.country || null,
    latitude,
    longitude,
    address,
  ]);

  const locationId =
    locationResult.rows[0].location_id;

  const orderQuery = `
    INSERT INTO orders (
      location_id,
      status,
      route_id,
      sequence_no,
      phone,
      notes,
      packages,
      stop_type,
      source,
      raw_manifest_row
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const orderResult = await runQuery(orderQuery, [
    locationId,
    status || ROUTE_STATUS.PENDING,
    route_id,
    sequence ?? null,
    phone || null,
    notes || null,
    packages === undefined ||
    packages === null ||
    packages === ''
      ? 1
      : Number(packages),
    stop_type || 'delivery',
    source || 'manual',
    raw_manifest_row
      ? JSON.stringify(raw_manifest_row)
      : null,
  ]);

  return orderResult.rows[0];
};

// @desc    Add many orders/stops at once
// @route   POST /order/add/bulk
// @access  Private
const addBulkOrders = async (req, res) => {
  const { route_id, stops } = req.body;

  if (!route_id) {
    return res.status(400).json({
      message: 'route_id is required',
    });
  }

  if (!Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({
      message: 'stops array is required',
    });
  }

  const created = [];
  const failed = [];

  for (let index = 0; index < stops.length; index += 1) {
    try {
      const createdOrder = await insertOrderStop({
        ...stops[index],
        route_id,
        sequence: stops[index].sequence ?? null,
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

  return res.status(201).json({
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
  fetchOrdersByRoute,
  addBulkOrders,
  insertOrderStop,
  setVehiclePlacement,
  getVehiclePlacementByOrderId,
};