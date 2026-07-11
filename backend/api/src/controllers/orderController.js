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

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const badRequest = message => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const firstDefined = (...values) =>
  values.find(value => value !== undefined);

const normalizeOrderPreference = value => {
  const normalized = String(value ?? 'auto')
    .trim()
    .toLowerCase();

  if (!['early', 'auto', 'last'].includes(normalized)) {
    throw badRequest(
      'order_preference must be early, auto, or last'
    );
  }

  return normalized;
};

const normalizeStopType = value => {
  const normalized = String(value ?? 'delivery')
    .trim()
    .toLowerCase();

  if (!['delivery', 'pickup'].includes(normalized)) {
    throw badRequest(
      'stop_type must be delivery or pickup'
    );
  }

  return normalized;
};

const normalizeArrivalTime = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim();

  const isValid =
    /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
      normalized
    );

  if (!isValid) {
    throw badRequest(
      'arrival_time must use HH:mm or HH:mm:ss format'
    );
  }

  return normalized;
};

const normalizePositiveInteger = (
  value,
  fieldName,
  defaultValue = 1
) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw badRequest(
      `${fieldName} must be an integer greater than or equal to 1`
    );
  }

  return parsed;
};

const normalizeNullableNumber = (
  value,
  fieldName
) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw badRequest(
      `${fieldName} must be a valid number`
    );
  }

  return parsed;
};

const normalizeCoordinate = (
  value,
  currentValue,
  fieldName
) => {
  const effectiveValue =
    value !== undefined ? value : currentValue;

  if (
    effectiveValue === undefined ||
    effectiveValue === null ||
    effectiveValue === ''
  ) {
    return null;
  }

  const parsed = Number(effectiveValue);

  if (!Number.isFinite(parsed)) {
    throw badRequest(
      `${fieldName} must be a valid number`
    );
  }

  return parsed;
};

const hasLocationPatch = body => {
  const directFields = [
    'name',
    'title',
    'housenumber',
    'street',
    'city',
    'postcode',
    'country',
    'address',
    'latitude',
    'longitude',
  ];

  if (directFields.some(field => hasOwn(body, field))) {
    return true;
  }

  const location = body.location;
  const details = location?.details;

  return Boolean(
    location &&
      (
        hasOwn(location, 'address') ||
        hasOwn(location, 'full_address') ||
        hasOwn(location, 'fullAddress') ||
        (details && Object.keys(details).length > 0)
      )
  );
};

const buildLocationData = (
  body,
  currentLocation = {}
) => {
  const location = body.location || {};
  const details = location.details || {};

  const name = firstDefined(
    body.name,
    body.title,
    details.name,
    currentLocation.name
  );

  const housenumber = firstDefined(
    body.housenumber,
    details.housenumber,
    details.houseNumber,
    currentLocation.housenumber
  );

  const street = firstDefined(
    body.street,
    details.street,
    details.addressLine1,
    currentLocation.street
  );

  const city = firstDefined(
    body.city,
    details.city,
    details.town,
    currentLocation.city
  );

  const postcode = firstDefined(
    body.postcode,
    details.postcode,
    details.postalCode,
    currentLocation.postcode
  );

  const country = firstDefined(
    body.country,
    details.country,
    details.country_name,
    currentLocation.country
  );

  const suppliedFullAddress = firstDefined(
    body.address,
    location.address,
    location.full_address,
    location.fullAddress
  );

  const generatedFullAddress = [
    housenumber,
    street,
    city,
    postcode,
    country,
  ]
    .filter(
      value =>
        value !== undefined &&
        value !== null &&
        value !== ''
    )
    .join(' ')
    .trim();

  const fullAddress =
    suppliedFullAddress !== undefined &&
    suppliedFullAddress !== null &&
    String(suppliedFullAddress).trim() !== ''
      ? String(suppliedFullAddress).trim()
      : generatedFullAddress ||
        currentLocation.full_address ||
        null;

  return {
    name: name ?? null,
    housenumber: housenumber ?? null,
    street: street ?? null,
    city: city ?? null,
    postcode: postcode ?? null,
    country: country ?? null,

    latitude: normalizeCoordinate(
      body.latitude,
      currentLocation.latitude,
      'latitude'
    ),

    longitude: normalizeCoordinate(
      body.longitude,
      currentLocation.longitude,
      'longitude'
    ),

    full_address: fullAddress,

    countryCode:
      details.countryCode ||
      details.country_code ||
      details.isoCountryCode ||
      '',
  };
};

const validateUkLocation = location => {
  if (
    !isUkAddress({
      countryCode: location.countryCode,
      country: location.country,
      full_address: location.full_address,
    })
  ) {
    throw badRequest(
      'Only stops within the United Kingdom are supported.'
    );
  }
};

const insertLocation = async body => {
  const location = buildLocationData(body);

  validateUkLocation(location);

  const result = await runQuery(
    `
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
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )
      RETURNING location_id
    `,
    [
      location.name,
      location.housenumber,
      location.street,
      location.city,
      location.postcode,
      location.country,
      location.latitude,
      location.longitude,
      location.full_address,
    ]
  );

  return {
    locationId: result.rows[0].location_id,
    location,
  };
};

const updateLocationIfRequired = async (
  body,
  currentLocation
) => {
  if (!hasLocationPatch(body)) {
    return false;
  }

  const location = buildLocationData(
    body,
    currentLocation
  );

  validateUkLocation(location);

  await runQuery(
    `
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
    `,
    [
      location.name,
      location.housenumber,
      location.street,
      location.city,
      location.postcode,
      location.country,
      location.latitude,
      location.longitude,
      location.full_address,
      currentLocation.location_id,
    ]
  );

  return true;
};

const getOrderWithLocation = async orderId => {
  const result = await runQuery(
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
        l.full_address,
        l.full_address AS address
      FROM orders o
      JOIN locations l
        ON o.location_id = l.location_id
      WHERE o.order_id = $1
    `,
    [orderId]
  );

  return result.rows[0] || null;
};


const createOrderFromInput = async body => {
  const {
    route_id,
    status,
    sequence,
    sequence_no,
    phone,
    notes,
    packages,
    stop_type,
    priority,

    // Exact frontend field names
    order_preference,
    time_at_stop,
    arrival_time,

    source,
    raw_manifest_row,
  } = body;

  if (!route_id) {
    throw badRequest('route_id is required');
  }

  if (!body.address) {
    throw badRequest('address is required');
  }

  if (
    body.latitude === undefined ||
    body.longitude === undefined
  ) {
    throw badRequest(
      'latitude and longitude are required'
    );
  }

  const { locationId, location } =
    await insertLocation(body);

  const orderDetails =
    getOrderDetailsFromBody(body);

  const orderDetailsValue =
    orderDetails.provided &&
    orderDetails.value !== null
      ? serializeJsonField(orderDetails.value)
      : null;

  const result = await runQuery(
    `
      INSERT INTO orders (
        location_id,
        status,
        route_id,
        sequence_no,
        phone,
        notes,
        packages,
        stop_type,
        priority,
        order_preference,
        time_at_stop,
        arrival_time,
        source,
        raw_manifest_row,
        order_details
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING *
    `,
    [
      locationId,
      status || ROUTE_STATUS.PENDING,
      route_id,
      sequence_no ?? sequence ?? null,
      phone || null,
      notes ?? null,

      normalizePositiveInteger(
        packages,
        'packages',
        1
      ),

      normalizeStopType(stop_type),

      normalizeNullableNumber(
        priority,
        'priority'
      ) ?? null,

      normalizeOrderPreference(
        order_preference
      ),

      // FE: time_at_stop
      // DB: time_at_stop_minutes
      normalizePositiveInteger(
        time_at_stop,
        'time_at_stop',
        1
      ),

      normalizeArrivalTime(arrival_time),

      source || 'manual',

      raw_manifest_row
        ? serializeJsonField(raw_manifest_row)
        : null,

      orderDetailsValue,
    ]
  );

  return {
    ...result.rows[0],
    ...location,
    address: location.full_address,
  };
};



// @desc    Add new order and create its location
// @route   POST /order/add
// @access  Private
const addOrder = async (req, res) => {
  try {
    const order = await createOrderFromInput(
      req.body
    );

    return res.status(201).json(order);
  } catch (error) {
    console.error('Add Order Error:', error);

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.statusCode === 400
            ? error.message
            : 'Server error during order creation',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined,
      });
  }
};

const buildOrderUpdate = (
  body,
  locationUpdated
) => {
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    values.push(value);
    fields.push(
      `${column} = $${values.length}`
    );
  };

  if (hasOwn(body, 'status')) {
    addField('status', body.status);

    const normalizedStatus = String(
      body.status || ''
    )
      .trim()
      .toLowerCase();

    if (normalizedStatus === 'arrived') {
      fields.push(
        'arrive_at = CURRENT_TIMESTAMP'
      );
    }

    if (normalizedStatus === 'failed') {
      fields.push(
        'failed_at = CURRENT_TIMESTAMP'
      );
    }
  }

  if (locationUpdated) {
    fields.push('sequence_no = NULL');
  } else if (hasOwn(body, 'sequence_no')) {
    addField(
      'sequence_no',
      body.sequence_no
    );
  }

  if (hasOwn(body, 'notes')) {
    addField('notes', body.notes);
  }

  if (hasOwn(body, 'packages')) {
    addField(
      'packages',
      normalizePositiveInteger(
        body.packages,
        'packages',
        1
      )
    );
  }

  if (hasOwn(body, 'stop_type')) {
    addField(
      'stop_type',
      normalizeStopType(body.stop_type)
    );
  }

  if (hasOwn(body, 'priority')) {
    addField(
      'priority',
      normalizeNullableNumber(
        body.priority,
        'priority'
      )
    );
  }

  if (hasOwn(body, 'order_preference')) {
    addField(
      'order_preference',
      normalizeOrderPreference(
        body.order_preference
      )
    );
  }

  /*
   * Frontend sends time_at_stop.
   * Database stores time_at_stop_minutes.
   */
  if (hasOwn(body, 'time_at_stop')) {
    addField(
      'time_at_stop',
      normalizePositiveInteger(
        body.time_at_stop,
        'time_at_stop',
        1
      )
    );
  }

  if (hasOwn(body, 'arrival_time')) {
    addField(
      'arrival_time',
      normalizeArrivalTime(
        body.arrival_time
      )
    );
  }

  const orderDetails =
    getOrderDetailsFromBody(body);

  if (orderDetails.provided) {
    addField(
      'order_details',
      orderDetails.value === null ||
      orderDetails.value === undefined
        ? null
        : serializeJsonField(
            orderDetails.value
          )
    );
  }

  return {
    fields,
    values,
  };
};



// @desc    Edit order and its location details
// @route   PUT /order/edit
// @access  Private
const editOrder = async (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({
      message: 'order_id is required',
    });
  }

  try {
    const existingOrder =
      await getOrderWithLocation(order_id);

    if (!existingOrder) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    const locationUpdated =
      await updateLocationIfRequired(
        req.body,
        existingOrder
      );

    const { fields, values } =
      buildOrderUpdate(
        req.body,
        locationUpdated
      );

    // console,log(fields)
    // console.log(values)

    if (fields.length > 0) {
      fields.push(
        'updated_at = CURRENT_TIMESTAMP'
      );

      const orderIdParameter =
        values.length + 1;

      await runQuery(
        `
          UPDATE orders
          SET ${fields.join(', ')}
          WHERE order_id = $${orderIdParameter}
        `,
        [...values, order_id]
      );
    }

    const updatedOrder =
      await getOrderWithLocation(order_id);

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Edit Order Error:', error);

    return res
      .status(error.statusCode || 500)
      .json({
        message:
          error.statusCode === 400
            ? error.message
            : 'Server error while updating order',

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
const insertOrderStop = async stop =>
  createOrderFromInput(stop);

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