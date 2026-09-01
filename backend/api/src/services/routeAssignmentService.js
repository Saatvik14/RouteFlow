const { HttpError } = require('../utils/httpError');
const {
  assertAssignmentVersion,
  assertAssignable,
} = require('./routeLifecycleService');

const insertAssignmentAudit = (client, {
  organizationId,
  routeId,
  actorUserId,
  eventType,
  fromState,
  toState,
  metadata = {},
}) => client.query(
  `INSERT INTO route_audit_events (
     organization_id, route_id, actor_user_id, event_type,
     from_state, to_state, metadata
   ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [organizationId, routeId, actorUserId, eventType, fromState, toState, metadata]
);

const assignRouteWithClient = async (client, {
  organizationId,
  routeId,
  driverId,
  actorUserId,
  expectedVersion = null,
  auditMetadata = {},
  marketplaceBidId = null,
}) => {
  const routeResult = await client.query(
    `SELECT * FROM routes
     WHERE route_id = $1 AND organization_id = $2
     FOR UPDATE`,
    [routeId, organizationId]
  );
  if (routeResult.rows.length === 0) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }

  const current = routeResult.rows[0];
  if (current.marketplace_status === 'open' && !marketplaceBidId) {
    throw new HttpError(
      409,
      'MARKETPLACE_ROUTE_REQUIRES_BID',
      'Select a driver from the marketplace bids or close the public listing first.'
    );
  }
  assertAssignable(current.status);
  assertAssignmentVersion(expectedVersion, current.assignment_version);

  const driverResult = await client.query(
    `SELECT d.*, om.status AS membership_status
     FROM drivers d
     LEFT JOIN organization_memberships om ON om.membership_id = d.membership_id
     WHERE d.driver_id = $1 AND d.organization_id = $2 AND d.removed_at IS NULL
     FOR UPDATE OF d`,
    [driverId, organizationId]
  );
  const driver = driverResult.rows[0];
  if (!driver) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');
  if (
    !driver.is_active ||
    driver.membership_status === 'inactive' ||
    driver.membership_status === 'removed' ||
    !driver.account_user_id
  ) {
    throw new HttpError(
      409,
      'DRIVER_NOT_AVAILABLE',
      'This driver is inactive or has not accepted their invitation.'
    );
  }

  if (Number(current.driver_id) === Number(driverId) && ['assigned', 'accepted'].includes(current.status)) {
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
    [routeId, organizationId, driverId, actorUserId, nextVersion]
  );
  await insertAssignmentAudit(client, {
    organizationId,
    routeId,
    actorUserId,
    eventType: current.driver_id ? 'route_reassigned' : 'route_assigned',
    fromState: current.status,
    toState: 'assigned',
    metadata: {
      previousDriverId: current.driver_id,
      driverId,
      assignmentVersion: nextVersion,
      ...auditMetadata,
    },
  });

  return updatedResult.rows[0];
};

module.exports = { assignRouteWithClient };
