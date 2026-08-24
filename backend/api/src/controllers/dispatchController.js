const { runQuery } = require('../config/db');
const { LOCATION_STALE_AFTER_SECONDS } = require('../config/env');
const { assertRouteReadable } = require('../services/accessControlService');
const { buildReport, reportToCsv } = require('../services/reportService');
const { HttpError } = require('../utils/httpError');
const { optionalIsoDate, positiveInteger } = require('../utils/validation');

const staleAfterSeconds = () => Math.max(30, Number(LOCATION_STALE_AFTER_SECONDS) || 120);

const dashboardRoute = (row) => {
  const lastUpdate = row.location_received_at ? new Date(row.location_received_at) : null;
  const stale = !lastUpdate || (Date.now() - lastUpdate.getTime()) / 1000 > staleAfterSeconds();
  const plannedEnd = row.end_datetime ? new Date(row.end_datetime) : null;
  const delayed = ['assigned', 'accepted', 'in_progress'].includes(row.status)
    && plannedEnd && plannedEnd.getTime() < Date.now();
  return {
    routeId: Number(row.route_id),
    name: row.name,
    status: row.status,
    assignmentVersion: Number(row.assignment_version || 0),
    driver: row.driver_id ? {
      id: Number(row.driver_id),
      name: row.driver_name,
      active: Boolean(row.driver_active),
    } : null,
    totalStops: Number(row.total_stops || 0),
    completedStops: Number(row.delivered_stops || 0) + Number(row.skipped_stops || 0) + Number(row.reschedule_stops || 0),
    deliveredStops: Number(row.delivered_stops || 0),
    failedStops: Number(row.failed_stops || 0),
    remainingStops: Number(row.remaining_stops || 0),
    currentStop: row.current_order_id ? {
      orderId: Number(row.current_order_id),
      sequence: row.current_sequence,
      name: row.current_stop_name,
      address: row.current_stop_address,
      status: row.current_stop_status,
    } : null,
    plannedStart: row.start_datetime,
    plannedEnd: row.end_datetime,
    actualStart: row.started_at,
    actualEnd: row.completed_at,
    estimatedCompletion: row.status === 'in_progress' && row.started_at && row.planned_duration_seconds
      ? new Date(new Date(row.started_at).getTime() + Number(row.planned_duration_seconds) * 1000).toISOString()
      : row.end_datetime,
    delayed: Boolean(delayed),
    lastLocation: row.location_received_at ? {
      latitude: Number(row.location_latitude),
      longitude: Number(row.location_longitude),
      accuracy: row.location_accuracy === null ? null : Number(row.location_accuracy),
      deviceRecordedAt: row.location_device_recorded_at,
      receivedAt: row.location_received_at,
      stale,
    } : null,
    locationState: !row.location_received_at ? 'unavailable' : stale ? 'stale' : 'current',
  };
};

const buildDashboardFilters = (req) => {
  const values = [req.organization.id];
  const filters = [];
  const add = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (req.query.status) {
    const statuses = String(req.query.status).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (statuses.length > 0) filters.push(`r.status = ANY(${add(statuses)}::text[])`);
  }
  if (req.query.driverId) filters.push(`r.driver_id = ${add(positiveInteger(req.query.driverId, 'driverId'))}`);
  if (req.query.search) filters.push(`(r.name ILIKE ${add(`%${String(req.query.search).trim()}%`)} OR r.route_id::text ILIKE ${add(`%${String(req.query.search).trim()}%`)})`);
  if (req.query.date) {
    const date = String(req.query.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'VALIDATION_ERROR', 'date must use YYYY-MM-DD.');
    filters.push(`r.start_datetime >= ${add(`${date}T00:00:00.000Z`)}::timestamptz`);
    filters.push(`r.start_datetime < (${add(`${date}T00:00:00.000Z`)}::timestamptz + INTERVAL '1 day')`);
  }
  return { values, where: filters.length ? `AND ${filters.join(' AND ')}` : '' };
};

const dashboardQuery = (where) => `
  SELECT
    r.*,
    d.name AS driver_name,
    d.is_active AS driver_active,
    counts.total_stops,
    counts.delivered_stops,
    counts.failed_stops,
    counts.skipped_stops,
    counts.reschedule_stops,
    counts.remaining_stops,
    current_stop.order_id AS current_order_id,
    current_stop.sequence_no AS current_sequence,
    current_stop.name AS current_stop_name,
    current_stop.full_address AS current_stop_address,
    current_stop.status AS current_stop_status,
    latest_location.latitude AS location_latitude,
    latest_location.longitude AS location_longitude,
    latest_location.accuracy_meters AS location_accuracy,
    latest_location.device_recorded_at AS location_device_recorded_at,
    latest_location.received_at AS location_received_at
  FROM routes r
  LEFT JOIN drivers d ON d.driver_id = r.driver_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::integer AS total_stops,
      COUNT(*) FILTER (WHERE status = 'delivered')::integer AS delivered_stops,
      COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_stops,
      COUNT(*) FILTER (WHERE status = 'skipped')::integer AS skipped_stops,
      COUNT(*) FILTER (WHERE status = 'reschedule_required')::integer AS reschedule_stops,
      COUNT(*) FILTER (WHERE status IN ('pending', 'arrived'))::integer AS remaining_stops
    FROM orders WHERE route_id = r.route_id
  ) counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT o.order_id, o.sequence_no, o.status, l.name, l.full_address
    FROM orders o JOIN locations l ON l.location_id = o.location_id
    WHERE o.route_id = r.route_id AND o.status IN ('pending', 'arrived')
    ORDER BY o.sequence_no ASC NULLS LAST, o.created_at ASC
    LIMIT 1
  ) current_stop ON TRUE
  LEFT JOIN LATERAL (
    SELECT latitude, longitude, accuracy_meters, device_recorded_at, received_at
    FROM route_locations WHERE route_id = r.route_id
    ORDER BY received_at DESC LIMIT 1
  ) latest_location ON TRUE
  WHERE r.organization_id = $1 ${where}
  ORDER BY
    CASE r.status WHEN 'in_progress' THEN 1 WHEN 'accepted' THEN 2 WHEN 'assigned' THEN 3 WHEN 'draft' THEN 4 ELSE 5 END,
    r.start_datetime ASC
  LIMIT 500
`;

const getDashboard = async (req, res) => {
  const { values, where } = buildDashboardFilters(req);
  const result = await runQuery(dashboardQuery(where), values);
  const routes = result.rows.map(dashboardRoute);
  const summary = {
    activeRoutes: routes.filter((route) => route.status === 'in_progress').length,
    unassignedRoutes: routes.filter((route) => route.status === 'draft' && !route.driver).length,
    delayedRoutes: routes.filter((route) => route.delayed).length,
    completedToday: routes.filter((route) => route.status === 'completed').length,
    failedStops: routes.reduce((sum, route) => sum + route.failedStops, 0),
  };
  const alerts = [
    ...(summary.unassignedRoutes ? [{ type: 'unassigned_routes', severity: 'warning', count: summary.unassignedRoutes, message: `${summary.unassignedRoutes} route${summary.unassignedRoutes === 1 ? '' : 's'} need a driver.` }] : []),
    ...(summary.delayedRoutes ? [{ type: 'delayed_routes', severity: 'critical', count: summary.delayedRoutes, message: `${summary.delayedRoutes} active route${summary.delayedRoutes === 1 ? '' : 's'} are past their planned finish.` }] : []),
  ];
  return res.json({ success: true, summary, alerts, routes, generatedAt: new Date().toISOString() });
};

const getRouteDetail = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const access = await assertRouteReadable({ routeId, user: req.user });
  if (Number(access.organization_id) !== Number(req.organization.id)) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }

  const [routeResult, stopsResult, assignmentsResult, auditResult, endpointLocationsResult] = await Promise.all([
    runQuery(dashboardQuery('AND r.route_id = $2'), [req.organization.id, routeId]),
    runQuery(
      `SELECT
         o.*, l.name AS customer_name, l.full_address, l.latitude, l.longitude,
         COALESCE(proofs.items, '[]'::json) AS proofs
       FROM orders o
       JOIN locations l ON l.location_id = o.location_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'proofId', p.proof_id,
           'type', p.proof_type,
           'fileName', p.original_name,
           'mimeType', p.mime_type,
           'byteSize', p.byte_size,
           'createdAt', p.created_at
         ) ORDER BY p.created_at) AS items
         FROM proof_of_delivery_files p WHERE p.order_id = o.order_id
       ) proofs ON TRUE
       WHERE o.route_id = $1
       ORDER BY o.sequence_no ASC NULLS LAST, o.created_at ASC`,
      [routeId]
    ),
    runQuery(
      `SELECT ra.*, d.name AS driver_name, u.name AS assigned_by_name
       FROM route_assignments ra
       LEFT JOIN drivers d ON d.driver_id = ra.driver_id
       LEFT JOIN users u ON u.user_id = ra.assigned_by_user_id
       WHERE ra.route_id = $1 AND ra.organization_id = $2
       ORDER BY ra.assignment_version DESC`,
      [routeId, req.organization.id]
    ),
    runQuery(
      `SELECT e.*, u.name AS actor_name
       FROM route_audit_events e LEFT JOIN users u ON u.user_id = e.actor_user_id
       WHERE e.route_id = $1 AND e.organization_id = $2
       ORDER BY e.created_at DESC LIMIT 250`,
      [routeId, req.organization.id]
    ),
    runQuery(
      `SELECT
         start_location.latitude AS start_latitude,
         start_location.longitude AS start_longitude,
         end_location.latitude AS end_latitude,
         end_location.longitude AS end_longitude
       FROM routes r
       LEFT JOIN LATERAL (
         SELECT latitude, longitude FROM locations
         WHERE full_address = r.start_full_address ORDER BY created_at DESC LIMIT 1
       ) start_location ON TRUE
       LEFT JOIN LATERAL (
         SELECT latitude, longitude FROM locations
         WHERE full_address = r.end_full_address ORDER BY created_at DESC LIMIT 1
       ) end_location ON TRUE
       WHERE r.route_id = $1 AND r.organization_id = $2`,
      [routeId, req.organization.id]
    ),
  ]);
  if (routeResult.rows.length === 0) throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');

  return res.json({
    success: true,
    route: dashboardRoute(routeResult.rows[0]),
    routeInfo: {
      startAddress: routeResult.rows[0].start_full_address,
      endAddress: routeResult.rows[0].end_full_address,
      distance: routeResult.rows[0].distance === null ? null : Number(routeResult.rows[0].distance),
      plannedDurationSeconds: routeResult.rows[0].planned_duration_seconds,
      actualDurationSeconds: routeResult.rows[0].actual_duration_seconds,
      policy: routeResult.rows[0].route_policy || {},
      startLocation: {
        address: routeResult.rows[0].start_full_address,
        latitude: endpointLocationsResult.rows[0]?.start_latitude === null ? null : Number(endpointLocationsResult.rows[0]?.start_latitude),
        longitude: endpointLocationsResult.rows[0]?.start_longitude === null ? null : Number(endpointLocationsResult.rows[0]?.start_longitude),
      },
      endLocation: {
        address: routeResult.rows[0].end_full_address,
        latitude: endpointLocationsResult.rows[0]?.end_latitude === null ? null : Number(endpointLocationsResult.rows[0]?.end_latitude),
        longitude: endpointLocationsResult.rows[0]?.end_longitude === null ? null : Number(endpointLocationsResult.rows[0]?.end_longitude),
      },
    },
    stops: stopsResult.rows.map((stop) => ({
      ...stop,
      orderId: Number(stop.order_id),
      latitude: stop.latitude === null ? null : Number(stop.latitude),
      longitude: stop.longitude === null ? null : Number(stop.longitude),
      proofs: (stop.proofs || []).map((proof) => ({
        ...proof,
        downloadPath: `/api/enterprise/proofs/${proof.proofId}/content`,
      })),
    })),
    assignments: assignmentsResult.rows,
    activity: auditResult.rows,
  });
};

const getLiveProgress = async (req, res) => getRouteDetail(req, res);

const reportRows = async (req) => {
  const values = [req.organization.id];
  const filters = [];
  const add = (value) => { values.push(value); return `$${values.length}`; };
  const from = req.query.from ? optionalIsoDate(`${req.query.from}T00:00:00.000Z`, 'from') : new Date(new Date().toISOString().slice(0, 10));
  const to = req.query.to ? optionalIsoDate(`${req.query.to}T00:00:00.000Z`, 'to') : from;
  if ((to.getTime() - from.getTime()) / 86400000 > 366) {
    throw new HttpError(400, 'DATE_RANGE_TOO_LARGE', 'Reports are limited to 366 days.');
  }
  filters.push(`r.start_datetime >= ${add(from.toISOString())}`);
  filters.push(`r.start_datetime < (${add(to.toISOString())}::timestamptz + INTERVAL '1 day')`);
  if (req.query.driverId) filters.push(`r.driver_id = ${add(positiveInteger(req.query.driverId, 'driverId'))}`);
  if (req.query.routeId) filters.push(`r.route_id = ${add(positiveInteger(req.query.routeId, 'routeId'))}`);

  const result = await runQuery(
    `SELECT
       r.route_id, r.name, r.status, r.driver_id, r.start_datetime, r.end_datetime,
       r.started_at, r.completed_at, r.planned_duration_seconds, r.actual_duration_seconds,
       r.distance, d.name AS driver_name,
       COUNT(o.order_id)::integer AS total_stops,
       COUNT(o.order_id) FILTER (WHERE o.status = 'delivered')::integer AS delivered_stops,
       COUNT(o.order_id) FILTER (WHERE o.status = 'failed')::integer AS failed_stops,
       COUNT(o.order_id) FILTER (WHERE o.status = 'skipped')::integer AS skipped_stops,
       COUNT(o.order_id) FILTER (WHERE o.status = 'reschedule_required')::integer AS reschedule_stops
     FROM routes r
     LEFT JOIN drivers d ON d.driver_id = r.driver_id
     LEFT JOIN orders o ON o.route_id = r.route_id
     WHERE r.organization_id = $1 AND ${filters.join(' AND ')}
     GROUP BY r.route_id, d.name
     ORDER BY r.start_datetime DESC`,
    values
  );
  return { rows: result.rows, from: from.toISOString(), to: to.toISOString() };
};

const getReport = async (req, res) => {
  const result = await reportRows(req);
  return res.json({ success: true, range: { from: result.from, to: result.to }, ...buildReport(result.rows) });
};

const exportReportCsv = async (req, res) => {
  const result = await reportRows(req);
  const csv = reportToCsv(buildReport(result.rows));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="routefloww-report-${result.from.slice(0, 10)}-to-${result.to.slice(0, 10)}.csv"`);
  return res.send(csv);
};

module.exports = {
  exportReportCsv,
  getDashboard,
  getLiveProgress,
  getReport,
  getRouteDetail,
};
