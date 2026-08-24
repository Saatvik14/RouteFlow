const { runQuery } = require('../config/db');
const { BUSINESS_ROLES, DEFAULT_DRIVER_PERMISSIONS } = require('../constants/enterprise');
const { HttpError } = require('../utils/httpError');

const queryWith = (queryable, text, values) =>
  (queryable?.query ? queryable.query(text, values) : runQuery(text, values));

const getRouteAccess = async ({ queryable, routeId, userId }) => {
  const result = await queryWith(
    queryable,
    `
      SELECT
        r.*,
        om.membership_id,
        om.role AS organization_role,
        om.status AS membership_status,
        om.permissions AS membership_permissions,
        d.account_user_id AS assigned_account_user_id,
        d.is_active AS assigned_driver_active,
        d.permissions AS driver_permissions
      FROM routes r
      LEFT JOIN organization_memberships om
        ON om.organization_id = r.organization_id
       AND om.user_id = $2
      LEFT JOIN drivers d ON d.driver_id = r.driver_id
      WHERE r.route_id = $1
      LIMIT 1
    `,
    [routeId, userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }

  return result.rows[0];
};

const isLegacyOwner = (route, userId) => Number(route.user_id) === Number(userId);
const isBusinessMember = (route) =>
  route.membership_status === 'active' && BUSINESS_ROLES.includes(route.organization_role);
const isViewer = (route) =>
  route.membership_status === 'active' && route.organization_role === 'viewer';
const isAssignedDriver = (route, userId) =>
  route.membership_status === 'active' &&
  route.organization_role === 'driver' &&
  Number(route.assigned_account_user_id) === Number(userId) &&
  route.assigned_driver_active !== false;

const assertRouteReadable = async ({ queryable, routeId, user }) => {
  const route = await getRouteAccess({ queryable, routeId, userId: user.user_id });

  if (
    isLegacyOwner(route, user.user_id) ||
    isBusinessMember(route) ||
    isViewer(route) ||
    isAssignedDriver(route, user.user_id)
  ) {
    return route;
  }

  throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
};

const getEffectiveDriverPermissions = (route) => ({
  ...DEFAULT_DRIVER_PERMISSIONS,
  ...(route.driver_permissions || {}),
  reorderStops:
    Boolean(route.driver_permissions?.reorderStops) &&
    Boolean(route.route_policy?.driverCanReorderStops),
  skipStops:
    Boolean(route.driver_permissions?.skipStops) &&
    Boolean(route.route_policy?.driverCanSkipStops),
  addStops:
    Boolean(route.driver_permissions?.addStops) &&
    Boolean(route.route_policy?.driverCanAddStops),
  editStopDetails:
    Boolean(route.driver_permissions?.editStopDetails) &&
    Boolean(route.route_policy?.driverCanEditStopDetails),
  requestRouteChange:
    route.driver_permissions?.requestRouteChange !== false &&
    route.route_policy?.driverCanRequestChange !== false,
});

const assertRouteMutable = async ({ queryable, routeId, user, permission }) => {
  const route = await getRouteAccess({ queryable, routeId, userId: user.user_id });

  if (isBusinessMember(route) || isLegacyOwner(route, user.user_id)) {
    return route;
  }

  if (!isAssignedDriver(route, user.user_id)) {
    throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }

  const permissions = getEffectiveDriverPermissions(route);
  if (!permission || permissions[permission] !== true) {
    throw new HttpError(403, 'DRIVER_PERMISSION_DENIED', 'Your dispatcher has not enabled this route change.');
  }

  return route;
};

const getOrderAccess = async ({ queryable, orderId, user }) => {
  const result = await queryWith(
    queryable,
    'SELECT route_id FROM orders WHERE order_id = $1 LIMIT 1',
    [orderId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'STOP_NOT_FOUND', 'Stop not found.');
  }

  return assertRouteReadable({ queryable, routeId: result.rows[0].route_id, user });
};

module.exports = {
  assertRouteMutable,
  assertRouteReadable,
  getEffectiveDriverPermissions,
  getOrderAccess,
  getRouteAccess,
  isAssignedDriver,
  isBusinessMember,
  isLegacyOwner,
};
