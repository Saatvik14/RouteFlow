const ORGANIZATION_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  DISPATCHER: 'dispatcher',
  DRIVER: 'driver',
  VIEWER: 'viewer',
});

const BUSINESS_ROLES = Object.freeze([
  ORGANIZATION_ROLES.OWNER,
  ORGANIZATION_ROLES.ADMIN,
  ORGANIZATION_ROLES.DISPATCHER,
]);

const ROUTE_STATES = Object.freeze([
  'draft',
  'assigned',
  'accepted',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);

const STOP_STATES = Object.freeze([
  'pending',
  'arrived',
  'delivered',
  'failed',
  'skipped',
  'reschedule_required',
]);

const FAILURE_REASONS = Object.freeze([
  'customer_unavailable',
  'incorrect_address',
  'access_problem',
  'customer_refused',
  'damaged_item',
  'reschedule_required',
  'other',
]);

const DEFAULT_DRIVER_PERMISSIONS = Object.freeze({
  reorderStops: false,
  skipStops: false,
  addStops: false,
  editStopDetails: false,
  requestRouteChange: true,
});

module.exports = {
  BUSINESS_ROLES,
  DEFAULT_DRIVER_PERMISSIONS,
  FAILURE_REASONS,
  ORGANIZATION_ROLES,
  ROUTE_STATES,
  STOP_STATES,
};
