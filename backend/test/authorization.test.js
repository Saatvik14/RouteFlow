const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertRouteMutable,
  assertRouteReadable,
  getEffectiveDriverPermissions,
} = require('../api/src/services/accessControlService');

const routeQuery = (route) => ({
  query: async () => ({ rows: route ? [route] : [] }),
});

test('tenant route reads are denied when the user has no active membership', async () => {
  await assert.rejects(
    assertRouteReadable({
      queryable: routeQuery({ route_id: 7, user_id: 44, membership_status: null }),
      routeId: 7,
      user: { user_id: 99 },
    }),
    (error) => error.statusCode === 404 && error.code === 'ROUTE_NOT_FOUND',
  );
});

test('a driver can read only a route assigned to their active driver account', async () => {
  const assigned = {
    route_id: 7,
    user_id: 44,
    membership_status: 'active',
    organization_role: 'driver',
    assigned_account_user_id: 99,
    assigned_driver_active: true,
  };
  assert.equal((await assertRouteReadable({ queryable: routeQuery(assigned), routeId: 7, user: { user_id: 99 } })).route_id, 7);
  await assert.rejects(
    assertRouteReadable({ queryable: routeQuery({ ...assigned, assigned_account_user_id: 100 }), routeId: 7, user: { user_id: 99 } }),
    (error) => error.code === 'ROUTE_NOT_FOUND',
  );
});

test('driver change permissions require both team and route policy approval', async () => {
  const route = {
    route_id: 7,
    user_id: 44,
    membership_status: 'active',
    organization_role: 'driver',
    assigned_account_user_id: 99,
    assigned_driver_active: true,
    driver_permissions: { reorderStops: true, skipStops: true, requestRouteChange: true },
    route_policy: { driverCanReorderStops: false, driverCanSkipStops: true, driverCanRequestChange: true },
  };
  const permissions = getEffectiveDriverPermissions(route);
  assert.equal(permissions.reorderStops, false);
  assert.equal(permissions.skipStops, true);
  await assert.rejects(
    assertRouteMutable({ queryable: routeQuery(route), routeId: 7, user: { user_id: 99 }, permission: 'reorderStops' }),
    (error) => error.statusCode === 403 && error.code === 'DRIVER_PERMISSION_DENIED',
  );
  await assert.doesNotReject(
    assertRouteMutable({ queryable: routeQuery(route), routeId: 7, user: { user_id: 99 }, permission: 'skipStops' }),
  );
});
