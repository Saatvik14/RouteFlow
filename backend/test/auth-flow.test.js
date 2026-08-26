const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { generateAccessCode } = require('../api/src/controllers/fleetAccessController');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('fleet access codes are unambiguous, formatted and random', () => {
  const codes = new Set(Array.from({ length: 100 }, generateAccessCode));
  assert.equal(codes.size, 100);
  for (const code of codes) {
    assert.match(code, /^RF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  }
});

test('role-aware authentication stores only hashed fleet access codes', () => {
  const migration = read('database/migrations/20260826_009_add_role_aware_authentication.sql');
  const controller = read('api/src/controllers/fleetAccessController.js');
  const auth = read('api/src/controllers/authController.js');

  assert.match(migration, /fleet_access_code_hash TEXT/);
  assert.doesNotMatch(migration, /\bfleet_access_code\s+(?:TEXT|VARCHAR|CHAR)/i);
  assert.match(controller, /bcrypt\.hash\(accessCode\.replace/);
  assert.match(auth, /bcrypt\.compare\(accessCode, user\.fleet_access_code_hash\)/);
});

test('public signup cannot create fleet-driver authority', () => {
  const auth = read('api/src/controllers/authController.js');
  assert.match(auth, /PUBLIC_SIGNUP_ROLES = new Set\(\['INDEPENDENT_DRIVER', 'BUSINESS_OWNER'\]\)/);
  assert.match(auth, /Choose Independent Driver or Business Admin/);
});

test('fleet authentication requires an active driver membership', () => {
  const auth = read('api/src/controllers/authController.js');
  const middleware = read('api/src/middleware/authMiddleware.js');

  assert.match(auth, /role === 'FLEET_DRIVER' && !user\.has_active_fleet_access/);
  assert.match(middleware, /user\.role \|\| ''\)\.toUpperCase\(\) === 'FLEET_DRIVER' && !user\.has_active_fleet_access/);
  assert.match(middleware, /d\.removed_at IS NULL/);
});
