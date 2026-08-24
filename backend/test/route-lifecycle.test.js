const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertAssignable,
  assertAssignmentVersion,
  normalizeRouteState,
  transitionRoute,
} = require('../api/src/services/routeLifecycleService');

test('legacy route states normalize to the enterprise state machine', () => {
  assert.equal(normalizeRouteState('in transit'), 'in_progress');
  assert.equal(normalizeRouteState('Pnding'), 'draft');
  assert.equal(normalizeRouteState('done'), 'completed');
});

test('route transitions allow the expected assignment execution path', () => {
  assert.deepEqual(transitionRoute({ currentState: 'assigned', action: 'accept' }), {
    from: 'assigned', to: 'accepted', idempotent: false,
  });
  assert.equal(transitionRoute({ currentState: 'accepted', action: 'start' }).to, 'in_progress');
  assert.equal(transitionRoute({ currentState: 'in_progress', action: 'complete' }).to, 'completed');
});

test('start and completion are idempotent, while invalid transitions are rejected', () => {
  assert.equal(transitionRoute({ currentState: 'in_progress', action: 'start' }).idempotent, true);
  assert.equal(transitionRoute({ currentState: 'completed', action: 'complete' }).idempotent, true);
  assert.throws(
    () => transitionRoute({ currentState: 'draft', action: 'complete' }),
    (error) => error.statusCode === 409 && error.code === 'INVALID_ROUTE_TRANSITION',
  );
  assert.throws(() => assertAssignable('in_progress'), (error) => error.code === 'ROUTE_NOT_ASSIGNABLE');
});

test('assignment versions reject stale concurrent writes', () => {
  assert.doesNotThrow(() => assertAssignmentVersion(4, 4));
  assert.doesNotThrow(() => assertAssignmentVersion(undefined, 4));
  assert.throws(
    () => assertAssignmentVersion(3, 4),
    (error) => error.statusCode === 409 && error.code === 'ASSIGNMENT_VERSION_CONFLICT' && error.details.currentVersion === 4,
  );
  assert.throws(() => assertAssignmentVersion(-1, 4), (error) => error.code === 'INVALID_ASSIGNMENT_VERSION');
});
