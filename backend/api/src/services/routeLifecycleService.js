const { HttpError } = require('../utils/httpError');

const TERMINAL_ROUTE_STATES = new Set(['completed', 'failed', 'cancelled']);

const transitions = Object.freeze({
  accept: { from: ['assigned'], to: 'accepted' },
  reject: { from: ['assigned'], to: 'draft' },
  start: { from: ['accepted'], to: 'in_progress' },
  complete: { from: ['in_progress'], to: 'completed' },
  fail: { from: ['in_progress'], to: 'failed' },
  cancel: { from: ['draft', 'assigned', 'accepted', 'in_progress'], to: 'cancelled' },
});

const normalizeRouteState = (state) => {
  const normalized = String(state || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (['pending', 'pnding', 'new', 'scheduled', 'optimized', 'ready'].includes(normalized)) return 'draft';
  if (['active', 'in_transit', 'started', 'running', 'in_progress'].includes(normalized)) return 'in_progress';
  if (['complete', 'done', 'delivered', 'closed', 'archived'].includes(normalized)) return 'completed';
  if (normalized === 'canceled') return 'cancelled';
  return normalized || 'draft';
};

const transitionRoute = ({ currentState, action }) => {
  const current = normalizeRouteState(currentState);
  const transition = transitions[action];
  if (!transition) {
    throw new HttpError(400, 'UNKNOWN_ROUTE_ACTION', 'Unknown route action.');
  }
  if (current === transition.to) {
    return { from: current, to: current, idempotent: true };
  }
  if (!transition.from.includes(current)) {
    throw new HttpError(
      409,
      'INVALID_ROUTE_TRANSITION',
      `A route cannot ${action} while it is ${current.replace(/_/g, ' ')}.`,
      { currentState: current, action, allowedFrom: transition.from }
    );
  }
  return { from: current, to: transition.to, idempotent: false };
};

const assertAssignable = (currentState) => {
  const current = normalizeRouteState(currentState);
  if (!['draft', 'assigned', 'accepted'].includes(current)) {
    throw new HttpError(
      409,
      'ROUTE_NOT_ASSIGNABLE',
      `A route cannot be assigned while it is ${current.replace(/_/g, ' ')}.`,
      { currentState: current }
    );
  }
  return current;
};

const assertAssignmentVersion = (expectedVersion, currentVersion) => {
  if (expectedVersion === null || expectedVersion === undefined) return;
  const expected = Number(expectedVersion);
  const current = Number(currentVersion || 0);
  if (!Number.isInteger(expected) || expected < 0) {
    throw new HttpError(400, 'INVALID_ASSIGNMENT_VERSION', 'Assignment version must be a non-negative integer.');
  }
  if (expected !== current) {
    throw new HttpError(
      409,
      'ASSIGNMENT_VERSION_CONFLICT',
      'This route assignment changed. Refresh and try again.',
      { expectedVersion: expected, currentVersion: current }
    );
  }
};

module.exports = {
  TERMINAL_ROUTE_STATES,
  assertAssignmentVersion,
  assertAssignable,
  normalizeRouteState,
  transitionRoute,
};
