const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeCriteria,
  recommendAssignments,
  scoreCandidate,
} = require('../api/src/services/assignmentRecommendationEngine');
const { validateRouteIds } = require('../api/src/controllers/assignmentRecommendationController');

const route = (overrides = {}) => ({
  routeId: 10,
  name: 'Morning delivery',
  start: '2026-08-25T08:00:00.000Z',
  end: '2026-08-25T10:00:00.000Z',
  startAddress: 'Warehouse A',
  endAddress: 'Town Centre',
  startLocation: { latitude: 51.5074, longitude: -0.1278 },
  assignmentVersion: 2,
  ...overrides,
});

const driver = (overrides = {}) => ({
  driverId: 4,
  name: 'Alex Driver',
  assignmentProfile: {
    skills: ['refrigerated'],
    licenseCategories: ['c'],
    maxHoursPerDay: 10,
    homeBase: { latitude: 51.51, longitude: -0.13 },
  },
  lastLocation: { latitude: 51.51, longitude: -0.13 },
  completedRoutes: 12,
  completedStops: 80,
  performancePercent: 95,
  weeklyAssignedHours: 8,
  existingAssignments: [],
  historicalRoutes: [{ startAddress: 'Warehouse A', endAddress: 'Another stop' }],
  ...overrides,
});

test('criteria normalization constrains values and normalizes weights', () => {
  const criteria = normalizeCriteria({
    requiredSkills: [' Refrigerated ', 'REFRIGERATED'],
    maximumHoursPerDay: 99,
    routeBufferMinutes: -5,
    weights: { proximity: 80, experience: 20, performance: 0, balancedWorkload: 0 },
  });
  assert.deepEqual(criteria.requiredSkills, ['refrigerated']);
  assert.equal(criteria.maximumHoursPerDay, 24);
  assert.equal(criteria.routeBufferMinutes, 0);
  assert.deepEqual(criteria.weights, {
    proximity: 80,
    experience: 20,
    performance: 0,
    balancedWorkload: 0,
  });
});

test('hard constraints reject schedule conflicts and missing qualifications', () => {
  const result = scoreCandidate({
    route: route(),
    driver: driver({
      assignmentProfile: { skills: [], licenseCategories: [], maxHoursPerDay: 10 },
      existingAssignments: [{
        routeId: 99,
        routeName: 'Existing run',
        start: '2026-08-25T09:00:00.000Z',
        end: '2026-08-25T11:00:00.000Z',
      }],
    }),
    criteria: normalizeCriteria({ requiredSkills: ['refrigerated'], licenseCategory: 'c' }),
  });
  assert.equal(result.eligible, false);
  assert.ok(result.disqualifications.some((reason) => reason.includes('Missing required skill')));
  assert.ok(result.disqualifications.some((reason) => reason.includes('licence category')));
  assert.ok(result.disqualifications.some((reason) => reason.includes('Overlaps route')));
});

test('multi-route recommendations do not double-book the selected driver', () => {
  const plan = recommendAssignments({
    routes: [
      route({ routeId: 10, name: 'Route A' }),
      route({ routeId: 11, name: 'Route B', start: '2026-08-25T09:00:00.000Z', end: '2026-08-25T11:00:00.000Z' }),
    ],
    drivers: [
      driver({ driverId: 4, name: 'Alex Driver' }),
      driver({ driverId: 5, name: 'Blair Driver', lastLocation: { latitude: 51.6, longitude: -0.2 } }),
    ],
    criteria: {},
  });
  assert.equal(plan.recommendations.length, 2);
  assert.ok(plan.recommendations.every((item) => item.selected));
  assert.notEqual(
    plan.recommendations[0].selected.driverId,
    plan.recommendations[1].selected.driverId,
  );
});

test('recommendation requests require unique positive route IDs', () => {
  assert.deepEqual(validateRouteIds([3, 7]), [3, 7]);
  assert.throws(() => validateRouteIds([]), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => validateRouteIds([3, 3]), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => validateRouteIds([0]), (error) => error.code === 'VALIDATION_ERROR');
});
