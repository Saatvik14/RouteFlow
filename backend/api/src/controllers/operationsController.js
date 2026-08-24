const multer = require('multer');
const { runQuery, withTransaction } = require('../config/db');
const {
  FAILURE_REASONS,
  DEFAULT_DRIVER_PERMISSIONS,
} = require('../constants/enterprise');
const {
  LOCATION_MIN_UPDATE_SECONDS,
  MAX_PROOF_FILE_BYTES,
} = require('../config/env');
const { assertRouteReadable } = require('../services/accessControlService');
const {
  assertAssignmentVersion,
  assertAssignable,
  transitionRoute,
} = require('../services/routeLifecycleService');
const {
  deleteStoredFiles,
  readStoredFile,
  storeFile,
} = require('../services/proofStorageService');
const { HttpError } = require('../utils/httpError');
const {
  optionalCoordinate,
  optionalIsoDate,
  positiveInteger,
  requireString,
} = require('../utils/validation');

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROOF_FILE_BYTES, files: 2, fields: 20 },
  fileFilter(_req, file, callback) {
    const validSignatureSvg = file.fieldname === 'signature' && file.mimetype === 'image/svg+xml';
    if (!imageMimeTypes.has(file.mimetype) && !validSignatureSvg) {
      const error = new HttpError(415, 'UNSUPPORTED_PROOF_TYPE', 'Proof files must be JPEG, PNG or WebP images.');
      return callback(error);
    }
    return callback(null, true);
  },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]);

const insertAudit = (client, {
  organizationId,
  routeId,
  orderId = null,
  actorUserId,
  eventType,
  fromState = null,
  toState = null,
  metadata = {},
}) => client.query(
  `INSERT INTO route_audit_events (
     organization_id, route_id, order_id, actor_user_id,
     event_type, from_state, to_state, metadata
   ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [organizationId, routeId, orderId, actorUserId, eventType, fromState, toState, metadata]
);

const serializeAssignmentRoute = (row) => ({
  routeId: Number(row.route_id),
  name: row.name,
  status: row.status,
  assignmentVersion: Number(row.assignment_version || 0),
  plannedStart: row.start_datetime,
  plannedEnd: row.end_datetime,
  acceptedAt: row.accepted_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  startAddress: row.start_full_address,
  endAddress: row.end_full_address,
  distance: row.distance === null ? null : Number(row.distance),
  estimatedDurationSeconds: row.planned_duration_seconds ?? (row.duration ? Number(row.duration) : null),
  totalStops: Number(row.total_stops || 0),
  completedStops: Number(row.completed_stops || 0),
  failedStops: Number(row.failed_stops || 0),
  permissions: {
    ...DEFAULT_DRIVER_PERMISSIONS,
    ...(row.driver_permissions || {}),
    routePolicy: row.route_policy || {},
  },
});

const listMyAssignments = async (req, res) => {
  const result = await runQuery(
    `
      SELECT
        r.*,
        d.permissions AS driver_permissions,
        COUNT(o.order_id)::integer AS total_stops,
        COUNT(o.order_id) FILTER (WHERE o.status IN ('delivered', 'skipped', 'reschedule_required'))::integer AS completed_stops,
        COUNT(o.order_id) FILTER (WHERE o.status = 'failed')::integer AS failed_stops
      FROM routes r
      JOIN drivers d ON d.driver_id = r.driver_id
      LEFT JOIN orders o ON o.route_id = r.route_id
      WHERE r.organization_id = $1
        AND d.account_user_id = $2
        AND d.is_active = TRUE
        AND d.removed_at IS NULL
        AND r.status <> 'draft'
      GROUP BY r.route_id, d.permissions
      ORDER BY
        CASE r.status
          WHEN 'in_progress' THEN 1
          WHEN 'accepted' THEN 2
          WHEN 'assigned' THEN 3
          ELSE 4
        END,
        r.start_datetime ASC
    `,
    [req.organization.id, req.user.user_id]
  );
  return res.json({ success: true, routes: result.rows.map(serializeAssignmentRoute) });
};

const assignRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const driverId = positiveInteger(req.body.driverId, 'driverId');
  const expectedVersion = req.body.expectedVersion === undefined
    ? null
    : Number(req.body.expectedVersion);

  const route = await withTransaction(async (client) => {
    const routeResult = await client.query(
      `SELECT * FROM routes
       WHERE route_id = $1 AND organization_id = $2
       FOR UPDATE`,
      [routeId, req.organization.id]
    );
    if (routeResult.rows.length === 0) throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
    const current = routeResult.rows[0];
    assertAssignable(current.status);

    assertAssignmentVersion(expectedVersion, current.assignment_version);

    const driverResult = await client.query(
      `SELECT d.*, om.status AS membership_status
       FROM drivers d
       LEFT JOIN organization_memberships om ON om.membership_id = d.membership_id
       WHERE d.driver_id = $1 AND d.organization_id = $2 AND d.removed_at IS NULL
       FOR UPDATE OF d`,
      [driverId, req.organization.id]
    );
    const driver = driverResult.rows[0];
    if (!driver) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');
    if (!driver.is_active || driver.membership_status === 'inactive' || driver.membership_status === 'removed' || !driver.account_user_id) {
      throw new HttpError(409, 'DRIVER_NOT_AVAILABLE', 'This driver is inactive or has not accepted their invitation.');
    }

    if (Number(current.driver_id) === driverId && ['assigned', 'accepted'].includes(current.status)) {
      return { ...current, idempotent: true };
    }

    if (current.driver_id) {
      await client.query(
        `UPDATE route_assignments
         SET status = 'reassigned', ended_at = NOW()
         WHERE route_id = $1 AND assignment_version = $2 AND status IN ('assigned', 'accepted')`,
        [routeId, current.assignment_version]
      );
    }

    const nextVersion = Number(current.assignment_version || 0) + 1;
    const updatedResult = await client.query(
      `UPDATE routes
       SET driver_id = $1, status = 'assigned', assignment_version = $2,
           assigned_at = NOW(), accepted_at = NULL, rejected_at = NULL,
           updated_at = NOW()
       WHERE route_id = $3
       RETURNING *`,
      [driverId, nextVersion, routeId]
    );
    await client.query(
      `INSERT INTO route_assignments (
         route_id, organization_id, driver_id, assigned_by_user_id,
         assignment_version, status, assigned_at
       ) VALUES ($1, $2, $3, $4, $5, 'assigned', NOW())`,
      [routeId, req.organization.id, driverId, req.user.user_id, nextVersion]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: current.driver_id ? 'route_reassigned' : 'route_assigned',
      fromState: current.status,
      toState: 'assigned',
      metadata: { previousDriverId: current.driver_id, driverId, assignmentVersion: nextVersion },
    });
    return updatedResult.rows[0];
  });

  return res.status(route.idempotent ? 200 : 201).json({
    success: true,
    route: serializeAssignmentRoute(route),
    idempotent: Boolean(route.idempotent),
    message: route.idempotent ? 'This driver is already assigned.' : 'Driver assigned.',
  });
};

const getLockedDriverRoute = async (client, routeId, req) => {
  const result = await client.query(
    `SELECT r.*, d.account_user_id, d.is_active AS driver_active, d.removed_at AS driver_removed_at
     FROM routes r
     JOIN drivers d ON d.driver_id = r.driver_id
     WHERE r.route_id = $1 AND r.organization_id = $2
     FOR UPDATE OF r, d`,
    [routeId, req.organization.id]
  );
  const route = result.rows[0];
  if (!route || Number(route.account_user_id) !== Number(req.user.user_id)) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }
  if (!route.driver_active || route.driver_removed_at) {
    throw new HttpError(403, 'DRIVER_INACTIVE', 'Your driver profile is inactive.');
  }
  return route;
};

const acceptAssignment = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const updated = await withTransaction(async (client) => {
    const route = await getLockedDriverRoute(client, routeId, req);
    const transition = transitionRoute({ currentState: route.status, action: 'accept' });
    if (transition.idempotent) return { ...route, idempotent: true };
    const result = await client.query(
      `UPDATE routes SET status = 'accepted', accepted_at = NOW(), rejected_at = NULL, updated_at = NOW()
       WHERE route_id = $1 RETURNING *`,
      [routeId]
    );
    await client.query(
      `UPDATE route_assignments SET status = 'accepted', responded_at = NOW()
       WHERE route_id = $1 AND assignment_version = $2`,
      [routeId, route.assignment_version]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: 'assignment_accepted',
      fromState: transition.from,
      toState: transition.to,
    });
    return result.rows[0];
  });
  return res.json({ success: true, route: serializeAssignmentRoute(updated), idempotent: Boolean(updated.idempotent), message: 'Assignment accepted.' });
};

const rejectAssignment = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const reason = req.body.reason ? requireString(req.body.reason, 'Reason', { min: 3, max: 500 }) : null;
  const updated = await withTransaction(async (client) => {
    const route = await getLockedDriverRoute(client, routeId, req);
    const transition = transitionRoute({ currentState: route.status, action: 'reject' });
    const result = await client.query(
      `UPDATE routes SET status = 'draft', driver_id = NULL, rejected_at = NOW(), updated_at = NOW()
       WHERE route_id = $1 RETURNING *`,
      [routeId]
    );
    await client.query(
      `UPDATE route_assignments
       SET status = 'rejected', responded_at = NOW(), ended_at = NOW(), rejection_reason = $1
       WHERE route_id = $2 AND assignment_version = $3`,
      [reason, routeId, route.assignment_version]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: 'assignment_rejected',
      fromState: transition.from,
      toState: transition.to,
      metadata: reason ? { reason } : {},
    });
    return result.rows[0];
  });
  return res.json({ success: true, route: serializeAssignmentRoute(updated), message: 'Assignment rejected.' });
};

const startRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const updated = await withTransaction(async (client) => {
    const route = await getLockedDriverRoute(client, routeId, req);
    const transition = transitionRoute({ currentState: route.status, action: 'start' });
    if (transition.idempotent) return { ...route, idempotent: true };
    const result = await client.query(
      `UPDATE routes SET status = 'in_progress', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE route_id = $1 RETURNING *`,
      [routeId]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: 'route_started',
      fromState: transition.from,
      toState: transition.to,
    });
    return result.rows[0];
  });
  return res.json({ success: true, route: serializeAssignmentRoute(updated), idempotent: Boolean(updated.idempotent), message: 'Route started.' });
};

const completeRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const updated = await withTransaction(async (client) => {
    const route = await getLockedDriverRoute(client, routeId, req);
    const transition = transitionRoute({ currentState: route.status, action: 'complete' });
    if (transition.idempotent) return { ...route, idempotent: true };

    const unresolved = await client.query(
      `SELECT COUNT(*)::integer AS count FROM orders
       WHERE route_id = $1 AND status IN ('pending', 'arrived')`,
      [routeId]
    );
    if (Number(unresolved.rows[0].count) > 0) {
      throw new HttpError(409, 'UNRESOLVED_STOPS', 'Resolve every stop before finishing the route.', { count: Number(unresolved.rows[0].count) });
    }

    const result = await client.query(
      `UPDATE routes
       SET status = 'completed', completed_at = COALESCE(completed_at, NOW()),
           actual_duration_seconds = CASE
             WHEN started_at IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::integer)
             ELSE actual_duration_seconds
           END,
           updated_at = NOW()
       WHERE route_id = $1 RETURNING *`,
      [routeId]
    );
    await client.query(
      `UPDATE route_assignments SET status = 'completed', ended_at = NOW()
       WHERE route_id = $1 AND assignment_version = $2`,
      [routeId, route.assignment_version]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: 'route_completed',
      fromState: transition.from,
      toState: transition.to,
    });
    return result.rows[0];
  });
  return res.json({ success: true, route: serializeAssignmentRoute(updated), idempotent: Boolean(updated.idempotent), message: 'Route completed.' });
};

const cancelRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const reason = req.body.reason ? requireString(req.body.reason, 'Reason', { min: 3, max: 500 }) : null;
  const updated = await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM routes WHERE route_id = $1 AND organization_id = $2 FOR UPDATE`,
      [routeId, req.organization.id]
    );
    if (result.rows.length === 0) throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
    const route = result.rows[0];
    const transition = transitionRoute({ currentState: route.status, action: 'cancel' });
    if (transition.idempotent) return { ...route, idempotent: true };
    const updatedResult = await client.query(
      `UPDATE routes SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE route_id = $1 RETURNING *`,
      [routeId]
    );
    await client.query(
      `UPDATE orders SET status = 'skipped', skipped_at = NOW(), updated_at = NOW()
       WHERE route_id = $1 AND status IN ('pending', 'arrived')`,
      [routeId]
    );
    await client.query(
      `UPDATE route_assignments SET status = 'cancelled', ended_at = NOW()
       WHERE route_id = $1 AND assignment_version = $2 AND status IN ('assigned', 'accepted')`,
      [routeId, route.assignment_version]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId,
      actorUserId: req.user.user_id,
      eventType: 'route_cancelled',
      fromState: transition.from,
      toState: transition.to,
      metadata: reason ? { reason } : {},
    });
    return updatedResult.rows[0];
  });
  return res.json({ success: true, route: serializeAssignmentRoute(updated), idempotent: Boolean(updated.idempotent), message: 'Route cancelled.' });
};

const getLockedExecutableStop = async (client, orderId, req) => {
  const result = await client.query(
    `
      SELECT
        o.*,
        r.organization_id,
        r.user_id AS route_owner_user_id,
        r.status AS route_status,
        r.route_policy,
        r.driver_id,
        d.account_user_id,
        d.is_active AS driver_active,
        d.removed_at AS driver_removed_at,
        d.permissions AS driver_permissions
      FROM orders o
      JOIN routes r ON r.route_id = o.route_id
      LEFT JOIN drivers d ON d.driver_id = r.driver_id
      WHERE o.order_id = $1 AND r.organization_id = $2
      FOR UPDATE OF o, r
    `,
    [orderId, req.organization.id]
  );
  const stop = result.rows[0];
  const fleetDriver = stop && Number(stop.account_user_id) === Number(req.user.user_id);
  const independentOwner = stop && Number(stop.route_owner_user_id) === Number(req.user.user_id)
    && String(req.user.role || '').toUpperCase() === 'INDEPENDENT_DRIVER';
  if (!stop || (!fleetDriver && !independentOwner)) {
    throw new HttpError(404, 'STOP_NOT_FOUND', 'Stop not found.');
  }
  if (fleetDriver && (!stop.driver_active || stop.driver_removed_at)) {
    throw new HttpError(403, 'DRIVER_INACTIVE', 'Your driver profile is inactive.');
  }
  if (stop.route_status !== 'in_progress') {
    throw new HttpError(409, 'ROUTE_NOT_IN_PROGRESS', 'Start the route before updating its stops.');
  }
  return stop;
};

const markStopArrived = async (req, res) => {
  const orderId = positiveInteger(req.params.orderId, 'orderId');
  const stop = await withTransaction(async (client) => {
    const current = await getLockedExecutableStop(client, orderId, req);
    if (current.status === 'arrived') return { ...current, idempotent: true };
    if (current.status !== 'pending') {
      throw new HttpError(409, 'STOP_ALREADY_RESOLVED', 'This stop has already been resolved.');
    }
    const result = await client.query(
      `UPDATE orders SET status = 'arrived', arrived_at = NOW(), updated_at = NOW()
       WHERE order_id = $1 RETURNING *`,
      [orderId]
    );
    await insertAudit(client, {
      organizationId: req.organization.id,
      routeId: current.route_id,
      orderId,
      actorUserId: req.user.user_id,
      eventType: 'stop_arrived',
      fromState: current.status,
      toState: 'arrived',
    });
    return result.rows[0];
  });
  return res.json({ success: true, stop, idempotent: Boolean(stop.idempotent), message: 'Arrival recorded.' });
};

const completeStop = async (req, res) => {
  const orderId = positiveInteger(req.params.orderId, 'orderId');
  const status = String(req.body.status || '').trim().toLowerCase();
  if (!['delivered', 'failed', 'skipped', 'reschedule_required'].includes(status)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Choose delivered, failed, skipped or reschedule required.', { field: 'status' });
  }
  const submissionKey = requireString(req.body.submissionKey, 'Submission key', { min: 8, max: 96 });
  const recipientName = req.body.recipientName ? requireString(req.body.recipientName, 'Recipient name', { min: 2, max: 160 }) : null;
  const notes = req.body.notes ? requireString(req.body.notes, 'Notes', { min: 1, max: 2000 }) : null;
  const failureReason = req.body.failureReason ? String(req.body.failureReason).trim().toLowerCase() : null;
  const latitude = optionalCoordinate(req.body.latitude, 'latitude', -90, 90);
  const longitude = optionalCoordinate(req.body.longitude, 'longitude', -180, 180);
  const deviceCompletedAt = optionalIsoDate(req.body.deviceCompletedAt, 'deviceCompletedAt');
  const photo = req.files?.photo?.[0];
  const signature = req.files?.signature?.[0];

  if (status === 'delivered') {
    if (!recipientName) throw new HttpError(400, 'RECIPIENT_REQUIRED', 'Enter the recipient’s name.', { field: 'recipientName' });
    if (!photo && !signature) throw new HttpError(400, 'PROOF_REQUIRED', 'Add a delivery photo or signature.');
  }
  if (['failed', 'reschedule_required'].includes(status) && !FAILURE_REASONS.includes(failureReason)) {
    throw new HttpError(400, 'FAILURE_REASON_REQUIRED', 'Select a valid delivery failure reason.', { field: 'failureReason' });
  }

  const storedFiles = [];
  try {
    const result = await withTransaction(async (client) => {
      const current = await getLockedExecutableStop(client, orderId, req);

      if (['delivered', 'failed', 'skipped', 'reschedule_required'].includes(current.status)) {
        if (current.delivery_submission_key === submissionKey) {
          const proofs = await client.query(
            `SELECT proof_id, proof_type, original_name, mime_type, byte_size, created_at
             FROM proof_of_delivery_files WHERE order_id = $1 ORDER BY created_at`,
            [orderId]
          );
          return { stop: current, proofs: proofs.rows, idempotent: true };
        }
        throw new HttpError(409, 'STOP_ALREADY_RESOLVED', 'This stop has already been submitted. Refresh the route before trying again.');
      }

      if (status === 'skipped') {
        const permission = {
          ...DEFAULT_DRIVER_PERMISSIONS,
          ...(current.driver_permissions || {}),
        };
        if (!permission.skipStops || current.route_policy?.driverCanSkipStops !== true) {
          throw new HttpError(403, 'DRIVER_PERMISSION_DENIED', 'Your dispatcher has not enabled stop skipping.');
        }
      }

      for (const [proofType, file] of [
        [status === 'delivered' ? 'photo' : 'failure_photo', photo],
        ['signature', signature],
      ]) {
        if (!file) continue;
        storedFiles.push(await storeFile({
          organizationId: req.organization.id,
          routeId: current.route_id,
          orderId,
          proofType,
          file,
        }));
      }

      const timestampColumn = {
        delivered: 'delivered_at',
        failed: 'failed_at',
        skipped: 'skipped_at',
        reschedule_required: 'reschedule_required_at',
      }[status];
      const updated = await client.query(
        `UPDATE orders
         SET status = $1,
             ${timestampColumn} = NOW(),
             server_completed_at = NOW(),
             recipient_name = $2,
             driver_notes = $3,
             failure_reason = $4,
             completion_latitude = $5,
             completion_longitude = $6,
             delivery_submission_key = $7,
             completion_metadata = $8,
             updated_at = NOW()
         WHERE order_id = $9
         RETURNING *`,
        [
          status,
          recipientName,
          notes,
          failureReason,
          latitude,
          longitude,
          submissionKey,
          { deviceCompletedAt: deviceCompletedAt?.toISOString() || null },
          orderId,
        ]
      );

      const proofRows = [];
      for (let index = 0; index < storedFiles.length; index += 1) {
        const file = storedFiles[index];
        const proofType = index === 0 && photo
          ? (status === 'delivered' ? 'photo' : 'failure_photo')
          : 'signature';
        const inserted = await client.query(
          `INSERT INTO proof_of_delivery_files (
             organization_id, route_id, order_id, uploaded_by_user_id,
             proof_type, storage_provider, storage_key, original_name,
             mime_type, byte_size, sha256, file_content
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING proof_id, proof_type, original_name, mime_type, byte_size, created_at`,
          [
            req.organization.id,
            current.route_id,
            orderId,
            req.user.user_id,
            proofType,
            file.provider,
            file.storageKey,
            file.originalName,
            file.mimeType,
            file.byteSize,
            file.sha256,
            file.content,
          ]
        );
        proofRows.push(inserted.rows[0]);
      }

      await insertAudit(client, {
        organizationId: req.organization.id,
        routeId: current.route_id,
        orderId,
        actorUserId: req.user.user_id,
        eventType: `stop_${status}`,
        fromState: current.status,
        toState: status,
        metadata: {
          failureReason,
          hasPhoto: Boolean(photo),
          hasSignature: Boolean(signature),
          locationCaptured: latitude !== null && longitude !== null,
        },
      });
      return { stop: updated.rows[0], proofs: proofRows, idempotent: false };
    });

    return res.json({ success: true, ...result, message: status === 'delivered' ? 'Delivery completed.' : 'Stop outcome recorded.' });
  } catch (error) {
    await deleteStoredFiles(storedFiles).catch(() => undefined);
    throw error;
  }
};

const downloadProof = async (req, res) => {
  const proofId = positiveInteger(req.params.proofId, 'proofId');
  const result = await runQuery(
    `SELECT * FROM proof_of_delivery_files WHERE proof_id = $1 LIMIT 1`,
    [proofId]
  );
  const proof = result.rows[0];
  if (!proof) throw new HttpError(404, 'PROOF_NOT_FOUND', 'Proof file not found.');
  await assertRouteReadable({ routeId: proof.route_id, user: req.user });
  const data = await readStoredFile(proof);
  const safeName = String(proof.original_name || 'proof').replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', proof.mime_type);
  res.setHeader('Content-Length', String(data.length));
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, max-age=60');
  if (proof.mime_type === 'image/svg+xml') {
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
  }
  return res.send(data);
};

const updateLocation = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const latitude = optionalCoordinate(req.body.latitude, 'latitude', -90, 90);
  const longitude = optionalCoordinate(req.body.longitude, 'longitude', -180, 180);
  if (latitude === null || longitude === null) {
    throw new HttpError(400, 'LOCATION_REQUIRED', 'Latitude and longitude are required.');
  }
  const accuracy = req.body.accuracy === undefined ? null : Number(req.body.accuracy);
  const heading = req.body.heading === undefined || req.body.heading === null ? null : Number(req.body.heading);
  const speed = req.body.speed === undefined || req.body.speed === null ? null : Number(req.body.speed);
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Location accuracy is invalid.');
  }
  const deviceRecordedAt = optionalIsoDate(req.body.recordedAt, 'recordedAt');
  if (deviceRecordedAt && deviceRecordedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new HttpError(400, 'INVALID_LOCATION_TIME', 'Location time cannot be in the future.');
  }

  const routeResult = await runQuery(
    `SELECT r.route_id, r.status, r.driver_id, d.account_user_id, d.is_active, d.removed_at
     FROM routes r JOIN drivers d ON d.driver_id = r.driver_id
     WHERE r.route_id = $1 AND r.organization_id = $2`,
    [routeId, req.organization.id]
  );
  const route = routeResult.rows[0];
  if (!route || Number(route.account_user_id) !== Number(req.user.user_id)) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }
  if (!route.is_active || route.removed_at) throw new HttpError(403, 'DRIVER_INACTIVE', 'Your driver profile is inactive.');
  if (route.status !== 'in_progress') throw new HttpError(409, 'ROUTE_NOT_IN_PROGRESS', 'Location is accepted only while the route is active.');

  const minimumSeconds = Math.max(5, Number(LOCATION_MIN_UPDATE_SECONDS) || 10);
  const inserted = await runQuery(
    `INSERT INTO route_locations (
       organization_id, route_id, driver_id, recorded_by_user_id,
       latitude, longitude, accuracy_meters, heading_degrees, speed_mps, device_recorded_at
     )
     SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
     WHERE NOT EXISTS (
       SELECT 1 FROM route_locations
       WHERE route_id = $2 AND received_at > NOW() - ($11 || ' seconds')::interval
     )
     RETURNING location_update_id, latitude, longitude, accuracy_meters,
               heading_degrees, speed_mps, device_recorded_at, received_at`,
    [
      req.organization.id,
      routeId,
      route.driver_id,
      req.user.user_id,
      latitude,
      longitude,
      Number.isFinite(accuracy) ? accuracy : null,
      Number.isFinite(heading) ? heading : null,
      Number.isFinite(speed) ? speed : null,
      deviceRecordedAt?.toISOString() || null,
      String(minimumSeconds),
    ]
  );
  if (inserted.rows.length === 0) {
    return res.status(202).json({ success: true, accepted: false, throttled: true, message: 'Location update throttled.' });
  }
  return res.status(201).json({ success: true, accepted: true, location: inserted.rows[0] });
};

module.exports = {
  acceptAssignment,
  assignRoute,
  cancelRoute,
  completeRoute,
  completeStop,
  downloadProof,
  listMyAssignments,
  markStopArrived,
  proofUpload,
  rejectAssignment,
  startRoute,
  updateLocation,
};
