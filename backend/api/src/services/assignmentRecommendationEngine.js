const DEFAULT_CRITERIA = Object.freeze({
  requiredSkills: [],
  licenseCategory: null,
  maximumDistanceKm: null,
  maximumHoursPerDay: 10,
  routeBufferMinutes: 30,
  weights: Object.freeze({
    proximity: 30,
    experience: 20,
    performance: 20,
    balancedWorkload: 30,
  }),
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const asNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const normalizeToken = (value) => String(value || '').trim().toLowerCase();

const uniqueStrings = (values, maximum = 12) => [
  ...new Set((Array.isArray(values) ? values : []).map(normalizeToken).filter(Boolean)),
].slice(0, maximum);

const normalizeWeights = (input = {}) => {
  const raw = {
    proximity: clamp(asNumber(input.proximity, DEFAULT_CRITERIA.weights.proximity), 0, 100),
    experience: clamp(asNumber(input.experience, DEFAULT_CRITERIA.weights.experience), 0, 100),
    performance: clamp(asNumber(input.performance, DEFAULT_CRITERIA.weights.performance), 0, 100),
    balancedWorkload: clamp(asNumber(input.balancedWorkload, DEFAULT_CRITERIA.weights.balancedWorkload), 0, 100),
  };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Number(((value / total) * 100).toFixed(2))])
  );
};

const normalizeCriteria = (input = {}) => ({
  requiredSkills: uniqueStrings(input.requiredSkills),
  licenseCategory: input.licenseCategory ? normalizeToken(input.licenseCategory) : null,
  maximumDistanceKm: input.maximumDistanceKm === null || input.maximumDistanceKm === undefined
    ? null
    : clamp(asNumber(input.maximumDistanceKm, 100), 1, 1000),
  maximumHoursPerDay: clamp(asNumber(input.maximumHoursPerDay, DEFAULT_CRITERIA.maximumHoursPerDay), 1, 24),
  routeBufferMinutes: clamp(asNumber(input.routeBufferMinutes, DEFAULT_CRITERIA.routeBufferMinutes), 0, 240),
  weights: normalizeWeights(input.weights),
});

const haversineKm = (left, right) => {
  if (!left || !right) return null;
  const values = [left.latitude, left.longitude, right.latitude, right.longitude].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [lat1, lon1, lat2, lon2] = values.map((value) => value * Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const overlaps = (left, right, bufferMinutes = 0) => {
  const bufferMs = bufferMinutes * 60_000;
  const leftStart = new Date(left.start).getTime() - bufferMs;
  const leftEnd = new Date(left.end).getTime() + bufferMs;
  const rightStart = new Date(right.start).getTime();
  const rightEnd = new Date(right.end).getTime();
  return leftStart < rightEnd && rightStart < leftEnd;
};

const durationHours = (route) => Math.max(
  0,
  (new Date(route.end).getTime() - new Date(route.start).getTime()) / 3_600_000
);

const sameUtcDay = (left, right) => new Date(left).toISOString().slice(0, 10) === new Date(right).toISOString().slice(0, 10);

const scoreCandidate = ({ route, driver, criteria, plannedAssignments = [] }) => {
  const reasons = [];
  const warnings = [];
  const disqualifications = [];
  const profile = driver.assignmentProfile || {};
  const skills = uniqueStrings(profile.skills);
  const licenses = uniqueStrings(profile.licenseCategories);

  const missingSkills = criteria.requiredSkills.filter((skill) => !skills.includes(skill));
  if (missingSkills.length) disqualifications.push(`Missing required skill${missingSkills.length === 1 ? '' : 's'}: ${missingSkills.join(', ')}`);
  if (criteria.licenseCategory && !licenses.includes(criteria.licenseCategory)) {
    disqualifications.push(`Missing ${criteria.licenseCategory} licence category`);
  }

  const schedule = [
    ...(driver.existingAssignments || []),
    ...plannedAssignments.filter((assignment) => Number(assignment.driverId) === Number(driver.driverId)),
  ];
  const conflicting = schedule.find((assignment) => overlaps(route, assignment, criteria.routeBufferMinutes));
  if (conflicting) disqualifications.push(`Overlaps route ${conflicting.routeName || `#${conflicting.routeId}`}`);

  const dayHours = schedule
    .filter((assignment) => sameUtcDay(assignment.start, route.start))
    .reduce((sum, assignment) => sum + durationHours(assignment), 0) + durationHours(route);
  const driverDailyLimit = clamp(asNumber(profile.maxHoursPerDay, criteria.maximumHoursPerDay), 1, 24);
  const effectiveDailyLimit = Math.min(criteria.maximumHoursPerDay, driverDailyLimit);
  if (dayHours > effectiveDailyLimit + 0.001) {
    disqualifications.push(`Would reach ${dayHours.toFixed(1)} hours against a ${effectiveDailyLimit}-hour daily limit`);
  }

  const driverLocation = driver.lastLocation || profile.homeBase || null;
  const distanceKm = haversineKm(driverLocation, route.startLocation);
  if (criteria.maximumDistanceKm !== null && distanceKm !== null && distanceKm > criteria.maximumDistanceKm) {
    disqualifications.push(`${distanceKm.toFixed(1)} km from route start exceeds the distance limit`);
  }

  if (disqualifications.length) {
    return {
      eligible: false,
      driverId: Number(driver.driverId),
      driverName: driver.name,
      score: 0,
      reasons: [],
      warnings,
      disqualifications,
      metrics: { distanceKm, dayHours: Number(dayHours.toFixed(2)) },
    };
  }

  let proximityScore = 50;
  if (distanceKm === null) {
    warnings.push('No recent or home-base location; proximity is estimated neutrally');
  } else {
    const distanceScale = criteria.maximumDistanceKm || 100;
    proximityScore = clamp(100 - (distanceKm / distanceScale) * 100, 0, 100);
    reasons.push(`${distanceKm.toFixed(1)} km from the route start`);
  }

  const matchingHistory = (driver.historicalRoutes || []).filter((history) =>
    normalizeToken(history.startAddress) === normalizeToken(route.startAddress) ||
    normalizeToken(history.endAddress) === normalizeToken(route.endAddress)
  ).length;
  const experienceScore = clamp(matchingHistory * 25 + Math.min(asNumber(driver.completedRoutes, 0), 20) * 2.5, 0, 100);
  if (matchingHistory > 0) reasons.push(`${matchingHistory} similar completed route${matchingHistory === 1 ? '' : 's'}`);

  const performanceScore = clamp(asNumber(driver.performancePercent, 70), 0, 100);
  if (asNumber(driver.completedStops, 0) > 0) reasons.push(`${Math.round(performanceScore)}% successful-stop history`);
  else warnings.push('Limited completed-stop history');

  const weeklyHours = asNumber(driver.weeklyAssignedHours, 0) + plannedAssignments
    .filter((assignment) => Number(assignment.driverId) === Number(driver.driverId))
    .reduce((sum, assignment) => sum + durationHours(assignment), 0);
  const workloadScore = clamp(100 - (weeklyHours / 40) * 100, 0, 100);
  reasons.push(`${weeklyHours.toFixed(1)} hours already planned this week`);

  const weightedScore = (
    proximityScore * criteria.weights.proximity +
    experienceScore * criteria.weights.experience +
    performanceScore * criteria.weights.performance +
    workloadScore * criteria.weights.balancedWorkload
  ) / 100;

  return {
    eligible: true,
    driverId: Number(driver.driverId),
    driverName: driver.name,
    score: Number(weightedScore.toFixed(1)),
    reasons: reasons.slice(0, 4),
    warnings: warnings.slice(0, 3),
    disqualifications: [],
    metrics: {
      distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
      dayHours: Number(dayHours.toFixed(2)),
      weeklyHours: Number(weeklyHours.toFixed(2)),
      matchingHistory,
      performancePercent: Number(performanceScore.toFixed(1)),
    },
  };
};

const recommendAssignments = ({ routes, drivers, criteria: inputCriteria }) => {
  const criteria = normalizeCriteria(inputCriteria);
  const plannedAssignments = [];
  const recommendations = [];
  const orderedRoutes = [...routes].sort((left, right) =>
    new Date(left.start).getTime() - new Date(right.start).getTime()
  );

  for (const route of orderedRoutes) {
    const ranked = drivers
      .map((driver) => scoreCandidate({ route, driver, criteria, plannedAssignments }))
      .filter((candidate) => candidate.eligible)
      .sort((left, right) => right.score - left.score || left.driverName.localeCompare(right.driverName));
    const selected = ranked[0] || null;

    if (selected) {
      plannedAssignments.push({
        routeId: route.routeId,
        routeName: route.name,
        driverId: selected.driverId,
        start: route.start,
        end: route.end,
      });
    }

    recommendations.push({
      routeId: Number(route.routeId),
      routeName: route.name,
      assignmentVersion: Number(route.assignmentVersion || 0),
      selected,
      alternatives: ranked.slice(1, 4),
      noMatchReasons: selected ? [] : drivers
        .map((driver) => scoreCandidate({ route, driver, criteria, plannedAssignments }))
        .flatMap((candidate) => candidate.disqualifications)
        .filter((value, index, all) => all.indexOf(value) === index)
        .slice(0, 5),
    });
  }

  return { criteria, recommendations };
};

module.exports = {
  DEFAULT_CRITERIA,
  haversineKm,
  normalizeCriteria,
  overlaps,
  recommendAssignments,
  scoreCandidate,
};
