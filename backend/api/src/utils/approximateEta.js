const APPROXIMATE_AVERAGE_SPEED_MPH = 44;

const COMPLETED_STOP_STATUSES = new Set([
  'arrived',
  'delivered',
  'failed',
  'completed',
]);

const getValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
};

const isStopDone = (stop) => {
  const status = String(stop?.status || '')
    .trim()
    .toLowerCase();

  return COMPLETED_STOP_STATUSES.has(status);
};

const getActualStopTime = (stop) => {

  if (!isStopDone(stop)) {
    return null;
  }

  const status = String(stop?.status || '')
    .trim()
    .toLowerCase();

  let val;
  if (status === 'failed') {
    val = getValidDate(stop?.failed_at || stop?.status_updated_at);
    console.log(val)
    return val;
}


  val= getValidDate(
    stop?.arrive_at ||
    stop?.updated_at ||
    stop?.status_updated_at
  );
  return val;
};

/**
 * Adds two response-only fields:
 *
 * approx_travel_time_seconds:
 * Approximate driving time from the previous stop.
 *
 * approx_eta_time:
 * Approximate arrival time calculated from the previous
 * stop's ETA or actual arrival time.
 *
 * eta_distance must be cumulative and already in miles.
 */
const addApproximateEtaFields = (
  stops,
  routeStartTime,
  averageSpeedMph = APPROXIMATE_AVERAGE_SPEED_MPH
) => {
  if (!Array.isArray(stops) || stops.length === 0) {
    return [];
  }

  const speed = Number(averageSpeedMph);

  if (!Number.isFinite(speed) || speed <= 0) {
    return stops.map((stop) => ({
      ...stop,
      approx_travel_time_seconds: null,
      approx_eta_time: null,
    }));
  }

  const currentTime = new Date();
  const configuredStartTime = getValidDate(routeStartTime);

  // Use future route start time; otherwise calculate from now.
  let previousEtaTime =
    configuredStartTime &&
    configuredStartTime.getTime() > currentTime.getTime()
      ? configuredStartTime
      : currentTime;

  let previousDistanceMiles = 0;

  // Calculate in route sequence but preserve original response order.
  const orderedStops = stops
    .map((stop, originalIndex) => ({
      stop,
      originalIndex,
    }))
    .sort((left, right) => {
      const leftSequence = getFiniteNumber(
        left.stop?.sequence_no
      );

      const rightSequence = getFiniteNumber(
        right.stop?.sequence_no
      );

      if (
        leftSequence !== null &&
        rightSequence !== null
      ) {
        return leftSequence - rightSequence;
      }

      if (leftSequence !== null) return -1;
      if (rightSequence !== null) return 1;

      return left.originalIndex - right.originalIndex;
    });

  const calculatedFields = new Map();

  for (const { stop, originalIndex } of orderedStops) {
    const currentDistanceMiles = getFiniteNumber(
      stop?.eta_distance
    );

    const actualStopTime = getActualStopTime(stop);
    console.log(actualStopTime, stop.id);

    // Stop has no optimized/cumulative distance.
    if (currentDistanceMiles === null) {
      calculatedFields.set(originalIndex, {
        approx_travel_time_seconds: null,
        approx_eta_time:
          actualStopTime?.toISOString() || null,
      });

      // A completed stop can still anchor the next ETA.
      if (actualStopTime) {
        previousEtaTime = actualStopTime;
      }

      continue;
    }

    // eta_distance is cumulative, so subtract the
    // previous cumulative distance to get this leg.
    const legDistanceMiles = Math.max(
      currentDistanceMiles - previousDistanceMiles,
      0
    );

    const travelTimeSeconds = Math.round(
      (legDistanceMiles / speed) * 60 * 60
    );

    const calculatedEtaTime = new Date(
      previousEtaTime.getTime() +
      travelTimeSeconds * 1000
    );

    // Completed/failed stops use actual time.
    // Pending stops use calculated ETA.
    const etaTime =
      actualStopTime || calculatedEtaTime;

    calculatedFields.set(originalIndex, {
      approx_travel_time_seconds: travelTimeSeconds,
      approx_eta_time: etaTime.toISOString(),
    });

    previousDistanceMiles = currentDistanceMiles;
    previousEtaTime = etaTime;
  }

  return stops.map((stop, index) => ({
    ...stop,
    ...calculatedFields.get(index),
  }));
};

/**
 * Used when one response contains orders from multiple routes.
 */
const addApproximateEtaFieldsByRoute = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const rowsByRoute = new Map();

  rows.forEach((row, originalIndex) => {
    const routeKey = String(row?.route_id ?? '');

    if (!rowsByRoute.has(routeKey)) {
      rowsByRoute.set(routeKey, []);
    }

    rowsByRoute.get(routeKey).push({
      row,
      originalIndex,
    });
  });

  const calculatedRowsByIndex = new Map();

  for (const routeRows of rowsByRoute.values()) {
    const calculatedRows = addApproximateEtaFields(
      routeRows.map(({ row }) => row),
      routeRows[0]?.row?.route_start_datetime
    );

    calculatedRows.forEach((row, index) => {
      calculatedRowsByIndex.set(
        routeRows[index].originalIndex,
        row
      );
    });
  }

  return rows.map((row, index) => {
    const calculatedRow =
      calculatedRowsByIndex.get(index) || row;

    // Do not expose this temporary SQL alias.
    const {
      route_start_datetime,
      ...responseRow
    } = calculatedRow;

    return responseRow;
  });
};

module.exports = {
  addApproximateEtaFields,
  addApproximateEtaFieldsByRoute,
};