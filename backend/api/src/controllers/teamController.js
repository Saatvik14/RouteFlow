const { runQuery, withTransaction } = require('../config/db');
const { DEFAULT_DRIVER_PERMISSIONS } = require('../constants/enterprise');
const { HttpError } = require('../utils/httpError');
const { positiveInteger, requireString } = require('../utils/validation');

const serializeDriver = (row) => ({
  driverId: Number(row.driver_id),
  membershipId: row.membership_id ? Number(row.membership_id) : null,
  accountUserId: row.account_user_id ? Number(row.account_user_id) : null,
  name: row.name,
  email: row.email,
  phone: row.phone,
  active: Boolean(row.is_active) && row.membership_status !== 'inactive' && row.membership_status !== 'removed',
  membershipStatus: row.membership_status || (row.is_active ? 'active' : 'inactive'),
  permissions: { ...DEFAULT_DRIVER_PERMISSIONS, ...(row.permissions || {}) },
  currentAssignment: row.current_route_id
    ? {
        routeId: Number(row.current_route_id),
        name: row.current_route_name,
        status: row.current_route_status,
        plannedStart: row.current_route_start,
      }
    : null,
  routeHistoryCount: Number(row.route_history_count || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getOrganizationContext = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: Number(req.user.user_id),
      name: req.user.name,
      email: req.user.email,
      platformRole: req.user.role,
    },
    organization: req.organization,
    membership: {
      id: Number(req.membership.membership_id),
      role: req.membership.role,
      permissions: req.membership.permissions || {},
    },
  });
};

const listTeam = async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim().toLowerCase();
  const values = [req.organization.id];
  const filters = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(d.name ILIKE $${values.length} OR d.email ILIKE $${values.length} OR d.phone ILIKE $${values.length})`);
  }
  if (status === 'active') filters.push(`d.is_active = TRUE AND COALESCE(om.status, 'active') = 'active'`);
  if (status === 'inactive') filters.push(`(d.is_active = FALSE OR om.status = 'inactive')`);

  const result = await runQuery(
    `
      SELECT
        d.*,
        om.status AS membership_status,
        current_route.route_id AS current_route_id,
        current_route.name AS current_route_name,
        current_route.status AS current_route_status,
        current_route.start_datetime AS current_route_start,
        history.route_history_count
      FROM drivers d
      LEFT JOIN organization_memberships om ON om.membership_id = d.membership_id
      LEFT JOIN LATERAL (
        SELECT r.route_id, r.name, r.status, r.start_datetime
        FROM routes r
        WHERE r.organization_id = d.organization_id
          AND r.driver_id = d.driver_id
          AND r.status IN ('assigned', 'accepted', 'in_progress')
        ORDER BY
          CASE r.status WHEN 'in_progress' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END,
          r.start_datetime ASC
        LIMIT 1
      ) current_route ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS route_history_count
        FROM routes r
        WHERE r.organization_id = d.organization_id
          AND r.driver_id = d.driver_id
          AND r.status IN ('completed', 'failed', 'cancelled')
      ) history ON TRUE
      WHERE d.organization_id = $1
        AND d.removed_at IS NULL
        ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      ORDER BY d.is_active DESC, d.name ASC
    `,
    values
  );

  const membersResult = await runQuery(
    `SELECT om.membership_id, om.role, om.status, om.permissions, om.joined_at,
            u.user_id, u.name, u.email, u.phone_no
     FROM organization_memberships om
     JOIN users u ON u.user_id = om.user_id
     WHERE om.organization_id = $1 AND om.role <> 'driver' AND om.status <> 'removed'
     ORDER BY CASE om.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'dispatcher' THEN 3 ELSE 4 END, u.name`,
    [req.organization.id]
  );

  return res.json({
    success: true,
    drivers: result.rows.map(serializeDriver),
    members: membersResult.rows.map((member) => ({
      membershipId: Number(member.membership_id),
      userId: Number(member.user_id),
      name: member.name,
      email: member.email,
      phone: member.phone_no,
      role: member.role,
      status: member.status,
      permissions: member.permissions || {},
      joinedAt: member.joined_at,
    })),
  });
};

const getDriverHistory = async (req, res) => {
  const driverId = positiveInteger(req.params.driverId, 'driverId');
  const driverResult = await runQuery(
    `SELECT * FROM drivers WHERE driver_id = $1 AND organization_id = $2 AND removed_at IS NULL`,
    [driverId, req.organization.id]
  );
  if (driverResult.rows.length === 0) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');

  const routesResult = await runQuery(
    `
      SELECT
        r.route_id, r.name, r.status, r.start_datetime, r.end_datetime,
        r.started_at, r.completed_at, r.distance, r.duration, r.actual_duration_seconds,
        COUNT(o.order_id)::integer AS total_stops,
        COUNT(o.order_id) FILTER (WHERE o.status = 'delivered')::integer AS delivered_stops,
        COUNT(o.order_id) FILTER (WHERE o.status = 'failed')::integer AS failed_stops
      FROM routes r
      LEFT JOIN orders o ON o.route_id = r.route_id
      WHERE r.organization_id = $1 AND r.driver_id = $2
      GROUP BY r.route_id
      ORDER BY r.start_datetime DESC
      LIMIT 100
    `,
    [req.organization.id, driverId]
  );

  return res.json({
    success: true,
    driver: serializeDriver({ ...driverResult.rows[0], membership_status: driverResult.rows[0].is_active ? 'active' : 'inactive' }),
    routes: routesResult.rows,
  });
};

const updateDriver = async (req, res) => {
  const driverId = positiveInteger(req.params.driverId, 'driverId');
  const allowedPermissions = new Set(Object.keys(DEFAULT_DRIVER_PERMISSIONS));
  const permissionPatch = req.body.permissions;
  const hasActivePatch = typeof req.body.active === 'boolean';
  const name = req.body.name === undefined ? undefined : requireString(req.body.name, 'Name', { min: 2, max: 160 });
  const phone = req.body.phone === undefined ? undefined : String(req.body.phone || '').trim().slice(0, 50);

  if (permissionPatch !== undefined) {
    if (!permissionPatch || typeof permissionPatch !== 'object' || Array.isArray(permissionPatch)) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'permissions must be an object.');
    }
    for (const [key, value] of Object.entries(permissionPatch)) {
      if (!allowedPermissions.has(key) || typeof value !== 'boolean') {
        throw new HttpError(400, 'VALIDATION_ERROR', `Invalid driver permission: ${key}.`);
      }
    }
  }
  if (!hasActivePatch && permissionPatch === undefined && name === undefined && phone === undefined) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Provide a driver field to update.');
  }

  const driver = await withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT d.*, om.status AS membership_status
       FROM drivers d
       LEFT JOIN organization_memberships om ON om.membership_id = d.membership_id
       WHERE d.driver_id = $1 AND d.organization_id = $2 AND d.removed_at IS NULL
       FOR UPDATE OF d`,
      [driverId, req.organization.id]
    );
    if (existingResult.rows.length === 0) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');
    const existing = existingResult.rows[0];

    if (hasActivePatch && req.body.active === false && existing.is_active) {
      const activeAssignments = await client.query(
        `SELECT route_id, name, status FROM routes
         WHERE organization_id = $1 AND driver_id = $2
           AND status IN ('assigned', 'accepted', 'in_progress')
         ORDER BY start_datetime ASC`,
        [req.organization.id, driverId]
      );
      if (activeAssignments.rows.length > 0) {
        throw new HttpError(
          409,
          'DRIVER_HAS_ACTIVE_ASSIGNMENTS',
          'Reassign or cancel the driver’s active routes before deactivating them.',
          { routes: activeAssignments.rows }
        );
      }
    }

    const nextPermissions = permissionPatch
      ? { ...DEFAULT_DRIVER_PERMISSIONS, ...(existing.permissions || {}), ...permissionPatch }
      : existing.permissions;
    const updated = await client.query(
      `UPDATE drivers
       SET
         name = COALESCE($1, name),
         phone = CASE WHEN $2::boolean THEN $3 ELSE phone END,
         permissions = $4,
         is_active = CASE WHEN $5::boolean THEN $6 ELSE is_active END,
         deactivated_at = CASE
           WHEN $5::boolean AND $6 = FALSE THEN NOW()
           WHEN $5::boolean AND $6 = TRUE THEN NULL
           ELSE deactivated_at
         END,
         updated_at = NOW()
       WHERE driver_id = $7
       RETURNING *`,
      [name || null, phone !== undefined, phone || null, nextPermissions, hasActivePatch, hasActivePatch ? req.body.active : existing.is_active, driverId]
    );

    if (existing.membership_id && hasActivePatch) {
      await client.query(
        `UPDATE organization_memberships
         SET status = $1,
             deactivated_at = CASE WHEN $1 = 'inactive' THEN NOW() ELSE NULL END,
             updated_at = NOW()
         WHERE membership_id = $2 AND organization_id = $3`,
        [req.body.active ? 'active' : 'inactive', existing.membership_id, req.organization.id]
      );
    }

    return { ...updated.rows[0], membership_status: hasActivePatch ? (req.body.active ? 'active' : 'inactive') : existing.membership_status };
  });

  return res.json({ success: true, driver: serializeDriver(driver), message: 'Driver updated.' });
};

const removeDriver = async (req, res) => {
  const driverId = positiveInteger(req.params.driverId, 'driverId');
  await withTransaction(async (client) => {
    const driverResult = await client.query(
      `SELECT * FROM drivers
       WHERE driver_id = $1 AND organization_id = $2 AND removed_at IS NULL
       FOR UPDATE`,
      [driverId, req.organization.id]
    );
    if (driverResult.rows.length === 0) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');

    const activeAssignments = await client.query(
      `SELECT route_id, name, status FROM routes
       WHERE organization_id = $1 AND driver_id = $2
         AND status IN ('assigned', 'accepted', 'in_progress')`,
      [req.organization.id, driverId]
    );
    if (activeAssignments.rows.length > 0) {
      throw new HttpError(409, 'DRIVER_HAS_ACTIVE_ASSIGNMENTS', 'Reassign or cancel active routes before removing this driver.', { routes: activeAssignments.rows });
    }

    const driver = driverResult.rows[0];
    await client.query(
      `UPDATE drivers SET is_active = FALSE, removed_at = NOW(), deactivated_at = NOW(), updated_at = NOW()
       WHERE driver_id = $1`,
      [driverId]
    );
    if (driver.membership_id) {
      await client.query(
        `UPDATE organization_memberships
         SET status = 'removed', removed_at = NOW(), updated_at = NOW()
         WHERE membership_id = $1 AND organization_id = $2`,
        [driver.membership_id, req.organization.id]
      );
    }
  });

  return res.json({ success: true, message: 'Driver removed. Completed routes and delivery proofs were preserved.' });
};

const requestRouteChange = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const requestType = requireString(req.body.requestType, 'Request type', { min: 3, max: 48 }).toLowerCase().replace(/\s+/g, '_');
  const details = requireString(req.body.details, 'Details', { min: 5, max: 2000 });

  const routeResult = await runQuery(
    `SELECT r.route_id, r.organization_id, r.driver_id, d.account_user_id, d.permissions
     FROM routes r JOIN drivers d ON d.driver_id = r.driver_id
     WHERE r.route_id = $1 AND r.organization_id = $2`,
    [routeId, req.organization.id]
  );
  const route = routeResult.rows[0];
  if (!route || Number(route.account_user_id) !== Number(req.user.user_id)) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }
  if (route.permissions?.requestRouteChange === false) {
    throw new HttpError(403, 'DRIVER_PERMISSION_DENIED', 'Route-change requests are disabled for your profile.');
  }
  const result = await runQuery(
    `INSERT INTO route_change_requests (
       organization_id, route_id, requested_by_user_id, request_type, details
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.organization.id, routeId, req.user.user_id, requestType, details]
  );
  return res.status(201).json({ success: true, request: result.rows[0], message: 'Request sent to dispatch.' });
};

module.exports = {
  getDriverHistory,
  getOrganizationContext,
  listTeam,
  removeDriver,
  requestRouteChange,
  updateDriver,
};
