const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('enterprise migration stores only invitation token hashes and preserves proof/history records', () => {
  const invitationMigration = read('database/migrations/20260823_002_create_driver_invitations.sql');
  const proofMigration = read('database/migrations/20260823_004_extend_orders_and_create_proof_of_delivery_files.sql');
  assert.match(invitationMigration, /token_hash CHAR\(64\) NOT NULL UNIQUE/);
  assert.doesNotMatch(invitationMigration, /\btoken\s+(?:TEXT|VARCHAR|CHAR)\b/i);
  assert.match(proofMigration, /proof_of_delivery_files/);
  assert.match(proofMigration, /ON DELETE RESTRICT/);
});

test('independent drivers retain an owner workspace for legacy operations', () => {
  const organizationMigration = read('database/migrations/20260823_001_create_organizations_and_organization_memberships.sql');
  const compatibilityMigration = read('database/migrations/20260823_006_backfill_independent_driver_workspaces.sql');
  const signupController = read('api/src/controllers/authController.js');

  assert.match(organizationMigration, /'BUSINESS_OWNER', 'INDEPENDENT_DRIVER'/);
  assert.match(organizationMigration, /organization_memberships\.role = 'owner'/);
  assert.match(compatibilityMigration, /INDEPENDENT_DRIVER/);
  assert.match(compatibilityMigration, /SET role = 'owner'/);
  assert.match(signupController, /\['BUSINESS_OWNER', 'INDEPENDENT_DRIVER'\]\.includes\(userRole\)/);
});

test('legacy route, order, driver and manifest routers are authentication protected', () => {
  for (const file of [
    'api/src/routes/routeRoutes.js',
    'api/src/routes/orderRoutes.js',
    'api/src/routes/driverRoutes.js',
    'api/src/routes/routeManifestRoutes.js',
  ]) {
    assert.match(read(file), /router\.use\(protect/);
  }
});

test('proof and location operations are available only behind enterprise authentication context', () => {
  const routes = read('api/src/routes/enterpriseRoutes.js');
  const protectIndex = routes.indexOf('router.use(protect, loadOrganizationContext)');
  assert.ok(protectIndex > -1);
  assert.ok(routes.indexOf("router.get('/proofs/:proofId/content'") > protectIndex);
  assert.ok(routes.indexOf("router.post('/routes/:routeId/location'") > protectIndex);
});

test('multi-business accounts default to their most recently joined organization', () => {
  const middleware = read('api/src/middleware/rbacMiddleware.js');
  assert.match(middleware, /ORDER BY om\.joined_at DESC NULLS LAST, om\.created_at DESC/);
  assert.doesNotMatch(middleware, /CASE om\.role/);
});

test('marketplace listings expose route summaries through a dedicated protected router', () => {
  const migration = read('database/migrations/20260901_010_create_driver_marketplace.sql');
  const routes = read('api/src/routes/marketplaceRoutes.js');
  const controller = read('api/src/controllers/marketplaceController.js');

  assert.match(migration, /CONSTRAINT route_bids_one_per_driver UNIQUE/);
  assert.match(migration, /routes_open_marketplace_idx/);
  assert.match(routes, /router\.use\(protect\)/);
  assert.doesNotMatch(routes, /loadOrganizationContext/);
  assert.match(controller, /INDEPENDENT_DRIVER_REQUIRED/);
  assert.doesNotMatch(controller, /INSERT INTO organization_memberships/);
  assert.match(controller, /DRIVER_TIME_CONFLICT/);
  assert.match(controller, /r\.start_datetime < \$4::timestamptz/);
  assert.match(controller, /r\.end_datetime > \$3::timestamptz/);
});
