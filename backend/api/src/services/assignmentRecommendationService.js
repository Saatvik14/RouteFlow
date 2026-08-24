const { runQuery, withTransaction } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { assignRouteWithClient } = require('./routeAssignmentService');
const {
  normalizeCriteria,
  overlaps,
  recommendAssignments,
} = require('./assignmentRecommendationEngine');
const {
  explainRecommendations,
  interpretAssignmentCriteria,
} = require('./geminiAssignmentService');

const routePayload = (row) => ({
  routeId: Number(row.route_id),
  name: row.name,
  start: row.start_datetime,
  end: row.end_datetime,
  startAddress: row.start_full_address,
  endAddress: row.end_full_address,
  assignmentVersion: Number(row.assignment_version || 0),
  startLocation: row.start_latitude === null || row.start_longitude === null
    ? null
    : { latitude: Number(row.start_latitude), longitude: Number(row.start_longitude) },
});

const loadRecommendationData = async ({ organizationId, routeIds }) => {
  const routesResult = await runQuery(
    `SELECT
       r.*,
       start_location.latitude AS start_latitude,
       start_location.longitude AS start_longitude
     FROM routes r
     LEFT JOIN LATERAL (
       SELECT latitude, longitude
       FROM locations
       WHERE full_address = r.start_full_address
       ORDER BY created_at DESC
       LIMIT 1
     ) start_location ON TRUE
     WHERE r.organization_id = $1
       AND r.route_id = ANY($2::integer[])
       AND r.status IN ('draft', 'assigned', 'accepted')
     ORDER BY r.start_datetime ASC`,
    [organizationId, routeIds]
  );
  if (routesResult.rows.length !== routeIds.length) {
    throw new HttpError(
      409,
      'ROUTES_NOT_ASSIGNABLE',
      'One or more selected routes are missing or no longer assignable.'
    );
  }

  const driversResult = await runQuery(
    `SELECT
       d.driver_id, d.name, d.assignment_profile,
       latest_location.latitude AS last_latitude,
       latest_location.longitude AS last_longitude,
       stats.completed_routes,
       stats.completed_stops,
       stats.performance_percent
     FROM drivers d
     JOIN organization_memberships om ON om.membership_id = d.membership_id
     LEFT JOIN LATERAL (
       SELECT rl.latitude, rl.longitude
       FROM route_locations rl
       WHERE rl.organization_id = d.organization_id AND rl.driver_id = d.driver_id
       ORDER BY rl.received_at DESC
       LIMIT 1
     ) latest_location ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT r.route_id) FILTER (WHERE r.status = 'completed')::integer AS completed_routes,
         COUNT(o.order_id) FILTER (WHERE o.status IN ('delivered', 'failed', 'reschedule_required'))::integer AS completed_stops,
         CASE
           WHEN COUNT(o.order_id) FILTER (WHERE o.status IN ('delivered', 'failed', 'reschedule_required')) = 0 THEN NULL
           ELSE 100.0 * COUNT(o.order_id) FILTER (WHERE o.status = 'delivered') /
             COUNT(o.order_id) FILTER (WHERE o.status IN ('delivered', 'failed', 'reschedule_required'))
         END AS performance_percent
       FROM routes r
       LEFT JOIN orders o ON o.route_id = r.route_id
       WHERE r.organization_id = d.organization_id AND r.driver_id = d.driver_id
     ) stats ON TRUE
     WHERE d.organization_id = $1
       AND d.is_active = TRUE
       AND d.removed_at IS NULL
       AND d.account_user_id IS NOT NULL
       AND om.status = 'active'
     ORDER BY d.name ASC`,
    [organizationId]
  );

  if (driversResult.rows.length === 0) {
    throw new HttpError(409, 'NO_ACTIVE_DRIVERS', 'No active drivers with accepted invitations are available.');
  }

  const driverIds = driversResult.rows.map((driver) => Number(driver.driver_id));
  const [scheduleResult, historyResult] = await Promise.all([
    runQuery(
      `SELECT route_id, name, driver_id, start_datetime, end_datetime
       FROM routes
       WHERE organization_id = $1
         AND driver_id = ANY($2::integer[])
         AND NOT (route_id = ANY($3::integer[]))
         AND status IN ('assigned', 'accepted', 'in_progress')
       ORDER BY start_datetime ASC`,
      [organizationId, driverIds, routeIds]
    ),
    runQuery(
      `SELECT driver_id, start_full_address, end_full_address
       FROM routes
       WHERE organization_id = $1
         AND driver_id = ANY($2::integer[])
         AND status = 'completed'
         AND start_datetime >= NOW() - INTERVAL '18 months'
       ORDER BY start_datetime DESC
       LIMIT 2000`,
      [organizationId, driverIds]
    ),
  ]);

  const scheduleByDriver = new Map();
  for (const row of scheduleResult.rows) {
    const id = Number(row.driver_id);
    if (!scheduleByDriver.has(id)) scheduleByDriver.set(id, []);
    scheduleByDriver.get(id).push({
      routeId: Number(row.route_id),
      routeName: row.name,
      start: row.start_datetime,
      end: row.end_datetime,
    });
  }
  const historyByDriver = new Map();
  for (const row of historyResult.rows) {
    const id = Number(row.driver_id);
    if (!historyByDriver.has(id)) historyByDriver.set(id, []);
    historyByDriver.get(id).push({
      startAddress: row.start_full_address,
      endAddress: row.end_full_address,
    });
  }

  const drivers = driversResult.rows.map((row) => {
    const driverId = Number(row.driver_id);
    const existingAssignments = scheduleByDriver.get(driverId) || [];
    return {
      driverId,
      name: row.name,
      assignmentProfile: row.assignment_profile || {},
      lastLocation: row.last_latitude === null || row.last_longitude === null
        ? null
        : { latitude: Number(row.last_latitude), longitude: Number(row.last_longitude) },
      completedRoutes: Number(row.completed_routes || 0),
      completedStops: Number(row.completed_stops || 0),
      performancePercent: row.performance_percent === null ? null : Number(row.performance_percent),
      weeklyAssignedHours: existingAssignments.reduce((sum, assignment) =>
        sum + Math.max(0, (new Date(assignment.end) - new Date(assignment.start)) / 3_600_000), 0),
      existingAssignments,
      historicalRoutes: historyByDriver.get(driverId) || [],
    };
  });

  return { routes: routesResult.rows.map(routePayload), drivers };
};

const createRecommendation = async ({ organizationId, userId, routeIds, criteriaText }) => {
  let interpreted;
  let llmWarning = null;
  try {
    interpreted = await interpretAssignmentCriteria(criteriaText);
  } catch (error) {
    console.error('Gemini criteria interpretation failed:', error.message);
    interpreted = {
      criteria: normalizeCriteria({}),
      interpretation: 'Gemini was unavailable, so the standard balanced assignment policy was used.',
      llmUsed: false,
      model: null,
    };
    llmWarning = 'Gemini was unavailable. The recommendation uses the standard balanced policy.';
  }

  const data = await loadRecommendationData({ organizationId, routeIds });
  const plan = recommendAssignments({ ...data, criteria: interpreted.criteria });
  let aiExplanation = null;
  if (interpreted.llmUsed) {
    try {
      aiExplanation = await explainRecommendations({
        interpretation: interpreted.interpretation,
        recommendations: plan.recommendations,
      });
    } catch (error) {
      console.error('Gemini recommendation explanation failed:', error.message);
      llmWarning = 'Assignments were calculated successfully, but Gemini could not generate the explanation.';
    }
  }

  const recommendations = plan.recommendations.map((item) => ({
    ...item,
    explanation: aiExplanation?.routeExplanations.get(item.routeId) || (
      item.selected
        ? `${item.selected.driverName} is the highest eligible candidate with a score of ${item.selected.score}.`
        : 'No eligible driver currently satisfies the hard constraints.'
    ),
  }));
  const matchedCount = recommendations.filter((item) => item.selected).length;
  const summary = aiExplanation?.summary ||
    `${matchedCount} of ${recommendations.length} route${recommendations.length === 1 ? '' : 's'} have an eligible suggested driver.`;

  const saved = await withTransaction(async (client) => {
    const runResult = await client.query(
      `INSERT INTO assignment_recommendation_runs (
         organization_id, requested_by_user_id, criteria_text, criteria,
         interpretation, summary, llm_used, model_name
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING recommendation_run_id, expires_at, created_at`,
      [
        organizationId,
        userId,
        criteriaText || null,
        plan.criteria,
        interpreted.interpretation,
        summary,
        interpreted.llmUsed,
        interpreted.model,
      ]
    );
    const run = runResult.rows[0];

    for (const recommendation of recommendations) {
      const candidates = recommendation.selected
        ? [recommendation.selected, ...recommendation.alternatives]
        : [];
      if (candidates.length === 0) {
        await client.query(
          `INSERT INTO assignment_recommendation_items (
             recommendation_run_id, route_id, route_assignment_version,
             candidate_rank, explanation, no_match_reasons
           ) VALUES ($1,$2,$3,1,$4,$5)`,
          [
            run.recommendation_run_id,
            recommendation.routeId,
            recommendation.assignmentVersion,
            recommendation.explanation,
            recommendation.noMatchReasons,
          ]
        );
        continue;
      }
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        await client.query(
          `INSERT INTO assignment_recommendation_items (
             recommendation_run_id, route_id, driver_id, route_assignment_version,
             candidate_rank, score, explanation, reasons, warnings, metrics, selected
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            run.recommendation_run_id,
            recommendation.routeId,
            candidate.driverId,
            recommendation.assignmentVersion,
            index + 1,
            candidate.score,
            index === 0 ? recommendation.explanation : null,
            candidate.reasons,
            candidate.warnings,
            candidate.metrics,
            index === 0,
          ]
        );
      }
    }
    return run;
  });

  return {
    recommendationRunId: Number(saved.recommendation_run_id),
    status: 'draft',
    expiresAt: saved.expires_at,
    createdAt: saved.created_at,
    criteria: plan.criteria,
    interpretation: interpreted.interpretation,
    summary,
    llm: { used: interpreted.llmUsed, model: interpreted.model, warning: llmWarning },
    recommendations,
  };
};

const confirmRecommendation = async ({ organizationId, userId, recommendationRunId, assignments }) =>
  withTransaction(async (client) => {
    const runResult = await client.query(
      `SELECT * FROM assignment_recommendation_runs
       WHERE recommendation_run_id = $1 AND organization_id = $2
       FOR UPDATE`,
      [recommendationRunId, organizationId]
    );
    const run = runResult.rows[0];
    if (!run) throw new HttpError(404, 'RECOMMENDATION_NOT_FOUND', 'Assignment recommendation not found.');
    if (run.status === 'confirmed') {
      throw new HttpError(409, 'RECOMMENDATION_ALREADY_CONFIRMED', 'This recommendation was already confirmed.');
    }
    if (run.status !== 'draft' || new Date(run.expires_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE assignment_recommendation_runs SET status = 'expired'
         WHERE recommendation_run_id = $1 AND status = 'draft'`,
        [recommendationRunId]
      );
      throw new HttpError(409, 'RECOMMENDATION_EXPIRED', 'This recommendation expired. Generate a new one.');
    }

    const itemsResult = await client.query(
      `SELECT i.*, r.name AS route_name, r.start_datetime, r.end_datetime
       FROM assignment_recommendation_items i
       JOIN routes r ON r.route_id = i.route_id
       WHERE i.recommendation_run_id = $1
       ORDER BY i.route_id, i.candidate_rank`,
      [recommendationRunId]
    );
    const items = itemsResult.rows;
    const requested = Array.isArray(assignments) && assignments.length
      ? assignments
      : items.filter((item) => item.selected && item.driver_id).map((item) => ({
          routeId: Number(item.route_id),
          driverId: Number(item.driver_id),
        }));
    if (!requested.length) {
      throw new HttpError(409, 'NO_ASSIGNMENTS_TO_CONFIRM', 'No eligible assignments are available to confirm.');
    }

    const chosen = requested.map((selection) => {
      const item = items.find((candidate) =>
        Number(candidate.route_id) === Number(selection.routeId) &&
        Number(candidate.driver_id) === Number(selection.driverId)
      );
      if (!item) {
        throw new HttpError(
          400,
          'INVALID_RECOMMENDATION_SELECTION',
          'Choose a driver from the generated candidates for each route.'
        );
      }
      return item;
    });

    const uniqueRouteIds = new Set(chosen.map((item) => Number(item.route_id)));
    if (uniqueRouteIds.size !== chosen.length) {
      throw new HttpError(400, 'DUPLICATE_ROUTE_SELECTION', 'Choose only one driver per route.');
    }

    const bufferMinutes = Number(run.criteria?.routeBufferMinutes || 0);
    const selectedRouteIds = [...uniqueRouteIds];
    const planned = [];
    for (const item of chosen.sort((left, right) => new Date(left.start_datetime) - new Date(right.start_datetime))) {
      const candidateWindow = { start: item.start_datetime, end: item.end_datetime };
      const plannedConflict = planned.find((entry) =>
        Number(entry.driverId) === Number(item.driver_id) && overlaps(candidateWindow, entry, bufferMinutes)
      );
      if (plannedConflict) {
        throw new HttpError(409, 'DRIVER_SCHEDULE_CONFLICT', `${item.driver_id} is selected for overlapping routes.`);
      }
      const conflictResult = await client.query(
        `SELECT route_id, name
         FROM routes
         WHERE organization_id = $1
           AND driver_id = $2
           AND NOT (route_id = ANY($3::integer[]))
           AND status IN ('assigned', 'accepted', 'in_progress')
           AND start_datetime < ($4::timestamptz + ($6 || ' minutes')::interval)
           AND end_datetime > ($5::timestamptz - ($6 || ' minutes')::interval)
         LIMIT 1
         FOR UPDATE`,
        [organizationId, item.driver_id, selectedRouteIds, item.end_datetime, item.start_datetime, String(bufferMinutes)]
      );
      if (conflictResult.rows.length) {
        throw new HttpError(
          409,
          'DRIVER_SCHEDULE_CONFLICT',
          `The selected driver now overlaps ${conflictResult.rows[0].name}. Generate a fresh recommendation.`
        );
      }
      planned.push({
        driverId: Number(item.driver_id),
        start: item.start_datetime,
        end: item.end_datetime,
      });
    }

    const assignedRoutes = [];
    for (const item of chosen) {
      const assigned = await assignRouteWithClient(client, {
        organizationId,
        routeId: Number(item.route_id),
        driverId: Number(item.driver_id),
        actorUserId: userId,
        expectedVersion: Number(item.route_assignment_version),
        auditMetadata: { recommendationRunId, assignmentSource: 'ai_recommendation' },
      });
      assignedRoutes.push({
        routeId: Number(assigned.route_id),
        driverId: Number(item.driver_id),
        assignmentVersion: Number(assigned.assignment_version || item.route_assignment_version),
      });
    }

    await client.query(
      `UPDATE assignment_recommendation_items
       SET selected = FALSE
       WHERE recommendation_run_id = $1`,
      [recommendationRunId]
    );
    for (const item of chosen) {
      await client.query(
        `UPDATE assignment_recommendation_items
         SET selected = TRUE
         WHERE recommendation_run_id = $1 AND route_id = $2 AND driver_id = $3`,
        [recommendationRunId, item.route_id, item.driver_id]
      );
    }
    await client.query(
      `UPDATE assignment_recommendation_runs
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE recommendation_run_id = $1`,
      [recommendationRunId]
    );

    return { recommendationRunId, status: 'confirmed', assignments: assignedRoutes };
  });

module.exports = {
  confirmRecommendation,
  createRecommendation,
  loadRecommendationData,
};
