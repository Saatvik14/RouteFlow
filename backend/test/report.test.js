const test = require('node:test');
const assert = require('node:assert/strict');

const { buildReport, csvCell, reportToCsv } = require('../api/src/services/reportService');

const rows = [
  {
    route_id: 1, name: 'Morning run', driver_id: 3, driver_name: 'Alex Driver', status: 'completed',
    planned_duration_seconds: 3600, actual_duration_seconds: 3900, distance: '21.4', total_stops: 10,
    delivered_stops: 8, failed_stops: 1, skipped_stops: 1, reschedule_stops: 0,
  },
  {
    route_id: 2, name: 'Second run', driver_id: 3, driver_name: 'Alex Driver', status: 'in_progress',
    planned_duration_seconds: 1800, actual_duration_seconds: null, distance: '9.2', total_stops: 4,
    delivered_stops: 2, failed_stops: 0, skipped_stops: 0, reschedule_stops: 0,
  },
];

test('reports calculate delivery totals and group performance by driver', () => {
  const report = buildReport(rows);
  assert.equal(report.summary.routesAssigned, 2);
  assert.equal(report.summary.routesCompleted, 1);
  assert.equal(report.summary.totalStops, 14);
  assert.equal(report.summary.successfulDeliveries, 10);
  assert.equal(report.summary.successRate, 83.3);
  assert.equal(report.byDriver.length, 1);
  assert.equal(report.byDriver[0].routes, 2);
  assert.equal(report.byDriver[0].successRate, 83.3);
  assert.equal(report.routes[0].actualDistance, null);
});

test('CSV output labels estimated and actual fields and prevents spreadsheet formula injection', () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  const report = buildReport([{ ...rows[0], name: '=1+1' }]);
  const csv = reportToCsv(report);
  assert.match(csv, /Planned distance/);
  assert.match(csv, /Actual distance/);
  assert.match(csv, /'\=1\+1/);
});
