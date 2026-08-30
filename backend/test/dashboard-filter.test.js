const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDashboardFilters } = require('../api/src/controllers/dispatchController');

test('delivery operations filters routes across an inclusive date range', () => {
  const result = buildDashboardFilters({
    organization: { id: 42 },
    query: { from: '2026-08-01', to: '2026-08-31' },
  });

  assert.deepEqual(result.values, [
    42,
    '2026-08-01T00:00:00.000Z',
    '2026-08-31T00:00:00.000Z',
  ]);
  assert.match(result.where, /r\.start_datetime >= \$2::timestamptz/);
  assert.match(result.where, /r\.start_datetime < \(\$3::timestamptz \+ INTERVAL '1 day'\)/);
});

test('delivery operations rejects reversed and oversized ranges', () => {
  assert.throws(
    () => buildDashboardFilters({ organization: { id: 42 }, query: { from: '2026-08-31', to: '2026-08-01' } }),
    (error) => error.code === 'INVALID_DATE_RANGE',
  );
  assert.throws(
    () => buildDashboardFilters({ organization: { id: 42 }, query: { from: '2025-01-01', to: '2026-08-31' } }),
    (error) => error.code === 'DATE_RANGE_TOO_LARGE',
  );
});

test('legacy single-date dashboard requests remain supported', () => {
  const result = buildDashboardFilters({ organization: { id: 42 }, query: { date: '2026-08-30' } });
  assert.equal(result.values[1], '2026-08-30T00:00:00.000Z');
  assert.equal(result.values[2], '2026-08-30T00:00:00.000Z');
});
