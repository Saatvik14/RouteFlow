const asNumber = (value) => Number(value || 0);

const buildReport = (rows) => {
  const routes = rows.map((row) => ({
    routeId: Number(row.route_id),
    routeName: row.name,
    driverId: row.driver_id ? Number(row.driver_id) : null,
    driverName: row.driver_name || 'Unassigned',
    status: row.status,
    plannedStart: row.start_datetime,
    plannedEnd: row.end_datetime,
    actualStart: row.started_at,
    actualEnd: row.completed_at,
    plannedDurationSeconds: row.planned_duration_seconds === null ? null : asNumber(row.planned_duration_seconds),
    actualDurationSeconds: row.actual_duration_seconds === null ? null : asNumber(row.actual_duration_seconds),
    plannedDistance: row.distance === null ? null : asNumber(row.distance),
    actualDistance: null,
    totalStops: asNumber(row.total_stops),
    deliveredStops: asNumber(row.delivered_stops),
    failedStops: asNumber(row.failed_stops),
    skippedStops: asNumber(row.skipped_stops),
    rescheduleStops: asNumber(row.reschedule_stops),
  }));

  const summary = routes.reduce((total, route) => {
    total.routesAssigned += route.driverId ? 1 : 0;
    total.routesCompleted += route.status === 'completed' ? 1 : 0;
    total.totalStops += route.totalStops;
    total.successfulDeliveries += route.deliveredStops;
    total.failedDeliveries += route.failedStops;
    total.skippedStops += route.skippedStops;
    total.rescheduleRequired += route.rescheduleStops;
    if (route.plannedDurationSeconds !== null) total.plannedDurationSeconds += route.plannedDurationSeconds;
    if (route.actualDurationSeconds !== null) total.actualDurationSeconds += route.actualDurationSeconds;
    return total;
  }, {
    routesAssigned: 0,
    routesCompleted: 0,
    totalStops: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    skippedStops: 0,
    rescheduleRequired: 0,
    plannedDurationSeconds: 0,
    actualDurationSeconds: 0,
    successRate: null,
    actualDistance: null,
  });
  const attempted = summary.successfulDeliveries + summary.failedDeliveries + summary.skippedStops + summary.rescheduleRequired;
  summary.successRate = attempted > 0
    ? Number(((summary.successfulDeliveries / attempted) * 100).toFixed(1))
    : null;

  const driverMap = new Map();
  for (const route of routes) {
    const key = route.driverId === null ? 'unassigned' : String(route.driverId);
    const current = driverMap.get(key) || {
      driverId: route.driverId,
      driverName: route.driverName,
      routes: 0,
      completedRoutes: 0,
      totalStops: 0,
      deliveredStops: 0,
      failedStops: 0,
      skippedStops: 0,
      successRate: null,
    };
    current.routes += 1;
    current.completedRoutes += route.status === 'completed' ? 1 : 0;
    current.totalStops += route.totalStops;
    current.deliveredStops += route.deliveredStops;
    current.failedStops += route.failedStops;
    current.skippedStops += route.skippedStops + route.rescheduleStops;
    driverMap.set(key, current);
  }
  const byDriver = [...driverMap.values()].map((driver) => {
    const attempts = driver.deliveredStops + driver.failedStops + driver.skippedStops;
    return {
      ...driver,
      successRate: attempts > 0 ? Number(((driver.deliveredStops / attempts) * 100).toFixed(1)) : null,
    };
  }).sort((left, right) => left.driverName.localeCompare(right.driverName));

  return { summary, byDriver, routes };
};

const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const reportToCsv = (report) => {
  const headers = [
    'Route ID', 'Route', 'Driver', 'Status', 'Planned start', 'Actual start',
    'Planned duration (minutes)', 'Actual duration (minutes)', 'Total stops',
    'Delivered', 'Failed', 'Skipped', 'Reschedule required', 'Planned distance',
    'Actual distance',
  ];
  const lines = [headers.map(csvCell).join(',')];
  for (const route of report.routes) {
    lines.push([
      route.routeId,
      route.routeName,
      route.driverName,
      route.status,
      route.plannedStart,
      route.actualStart,
      route.plannedDurationSeconds === null ? null : Math.round(route.plannedDurationSeconds / 60),
      route.actualDurationSeconds === null ? null : Math.round(route.actualDurationSeconds / 60),
      route.totalStops,
      route.deliveredStops,
      route.failedStops,
      route.skippedStops,
      route.rescheduleStops,
      route.plannedDistance,
      route.actualDistance,
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
};

module.exports = { buildReport, csvCell, reportToCsv };
