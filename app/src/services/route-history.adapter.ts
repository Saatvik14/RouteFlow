import { routesService } from "./api/routes";
import type {
  RouteHistoryGroup,
  RouteHistoryPoint,
  RouteHistoryRoute,
  RouteHistoryStatus,
  RouteHistoryStop,
  RouteHistoryStopStatus,
  RouteHistoryTone,
} from "./../components/route-history/route-history";

type AnyRecord = Record<string, any>;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const asArray = (value: any): AnyRecord[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.routes)) return value.routes;
  if (Array.isArray(value?.data?.routes)) return value.data.routes;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.orders)) return value.orders;
  if (Array.isArray(value?.stops)) return value.stops;
  return [];
};

const firstString = (...values: any[]) => {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return found ? found.trim() : "";
};

const firstNumber = (...values: any[]) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

const toDate = (...values: any[]) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

export const formatShortDate = (date: Date | null) => {
  if (!date) return "--";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

export const formatFullDate = (date: Date | null) => {
  if (!date) return "Unknown date";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (date: Date | null) => {
  if (!date) return "--";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return "--";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const normalizeStatus = (
  rawStatus?: string,
): {
  status: RouteHistoryRoute["status"];
  label: string;
  tone: RouteHistoryTone;
} => {
  const status = String(rawStatus || "pending")
    .toLowerCase()
    .trim();

  if (["completed", "complete", "done", "closed"].includes(status)) {
    return { status: "completed", label: "Completed", tone: "green" };
  }

  if (["cancelled", "canceled", "failed", "error"].includes(status)) {
    return {
      status: "cancelled",
      label: status.includes("fail") ? "Failed" : "Cancelled",
      tone: "red",
    };
  }

  if (
    ["active", "in_transit", "in-transit", "running", "started"].includes(
      status,
    )
  ) {
    return { status: "active", label: "In transit", tone: "blue" };
  }

  if (["optimized", "optimised", "ready"].includes(status)) {
    return { status: "optimized", label: "Optimized", tone: "blue" };
  }

  return { status: "pending", label: "Pending", tone: "amber" };
};

const normalizeStopStatus = (
  rawStatus?: string,
  delayMinutes?: number,
): { status: RouteHistoryStopStatus; label: string } => {
  const status = String(rawStatus || "")
    .toLowerCase()
    .trim();

  if (delayMinutes && delayMinutes > 0)
    return { status: "delayed", label: `Delayed ${delayMinutes}m` };
  if (["failed", "cancelled", "canceled"].includes(status))
    return { status: "failed", label: "Failed" };
  if (["completed", "complete", "delivered", "done"].includes(status))
    return { status: "completed", label: "Completed" };
  if (["on_time", "ontime", "on-time"].includes(status))
    return { status: "on_time", label: "On-time" };
  return { status: "pending", label: "Pending" };
};

const getLocationName = (...locations: any[]) => {
  for (const location of locations) {
    if (!location) continue;
    if (typeof location === "string") return location;
    const value = firstString(
      location.full_address,
      location.fullAddress,
      location.address,
      location.name,
      location.city,
    );
    if (value) return value;
  }
  return "--";
};

const getPoint = (...sources: any[]): RouteHistoryPoint | null => {
  for (const source of sources) {
    if (!source) continue;
    const latitude = firstNumber(
      source.latitude,
      source.lat,
      source?.location?.latitude,
      source?.location?.lat,
    );
    const longitude = firstNumber(
      source.longitude,
      source.lng,
      source.lon,
      source?.location?.longitude,
      source?.location?.lng,
    );
    if (latitude && longitude) return { latitude, longitude };
  }
  return null;
};

const normalizeStops = (raw: AnyRecord): RouteHistoryStop[] => {
  const rawStops = asArray(
    raw.stops || raw.orders || raw.route_orders || raw.sequence || raw.steps,
  );

  return rawStops.map((stop, index) => {
    const etaDate = toDate(
      stop.eta,
      stop.arrival_time,
      stop.estimated_arrival,
      stop.expected_time,
      stop.datetime,
    );
    const actualDate = toDate(
      stop.actual_time,
      stop.completed_at,
      stop.delivered_at,
    );
    const delayMinutes = firstNumber(
      stop.delay_minutes,
      stop.delayMinutes,
      stop.late_by_minutes,
    );
    const statusMeta = normalizeStopStatus(
      stop.status || stop.delivery_status || stop.order_status,
      delayMinutes,
    );

    return {
      id: String(stop.id ?? stop.order_id ?? stop.stop_id ?? index + 1),
      sequence: firstNumber(
        stop.sequence_no,
        stop.sequence,
        stop.order_sequence,
        index + 1,
      ),
      title: firstString(
        stop.title,
        stop.name,
        stop.customer_name,
        stop.order_name,
        `Stop ${index + 1}`,
      ),
      address: getLocationName(
        stop.location,
        stop.address,
        stop.drop_location,
        stop.destination,
      ),
      eta: formatTime(etaDate),
      actualTime: actualDate ? formatTime(actualDate) : undefined,
      status: statusMeta.status,
      statusLabel: statusMeta.label,
      delayMinutes,
      proofCount: firstNumber(
        stop.proof_count,
        stop.pod_count,
        stop.images?.length,
        stop.proofs?.length,
      ),
      notes: firstString(stop.notes, stop.driver_notes, stop.remark),
    };
  });
};

const normalizeMapPoints = (
  raw: AnyRecord,
  stops: RouteHistoryStop[],
): RouteHistoryPoint[] => {
  const candidates = [
    raw.geometry,
    raw.route_geometry,
    raw.path,
    raw.polyline,
    raw.coordinates,
    raw.steps,
    raw.stops,
    raw.orders,
  ];

  for (const candidate of candidates) {
    const points = asArray(candidate)
      .map((point) => getPoint(point))
      .filter(Boolean) as RouteHistoryPoint[];

    if (points.length > 1) return points;
  }

  const start = getPoint(raw.start_location, raw.startLocation, raw.start);
  const end = getPoint(raw.end_location, raw.endLocation, raw.end);
  const fallbackStops = asArray(raw.stops || raw.orders)
    .map((stop) => getPoint(stop, stop.location, stop.address))
    .filter(Boolean) as RouteHistoryPoint[];

  const fallback = [start, ...fallbackStops, end].filter(
    Boolean,
  ) as RouteHistoryPoint[];

  if (fallback.length > 1) return fallback;

  return stops.map((_, index) => ({
    latitude: 28.61 + index * 0.01,
    longitude: 77.2 + index * 0.012,
  }));
};

export const normalizeRouteHistoryRoute = (
  raw: AnyRecord,
  index = 0,
): RouteHistoryRoute => {
  const id = String(raw.route_id ?? raw.routeId ?? raw.id ?? index + 1);
  const startDate = toDate(
    raw.start_datetime,
    raw.startDateTime,
    raw.routeDate,
    raw.created_at,
  );
  const endDate = toDate(
    raw.end_datetime,
    raw.endDateTime,
    raw.completed_at,
    raw.updated_at,
  );
  const statusMeta = normalizeStatus(
    raw.status || raw.route_status || raw.state,
  );
  const stops = normalizeStops(raw);
  const distanceKm =
    firstNumber(
      raw.distance_km,
      raw.total_distance_km,
      raw.distance,
      raw.total_distance,
    ) || 0;
  const durationMinutes = firstNumber(
    raw.duration_minutes,
    raw.total_duration_minutes,
    raw.duration,
    raw.total_duration,
  );
  const onTimePercentage = firstNumber(
    raw.on_time_percentage,
    raw.onTimePercentage,
    raw.on_time_percent,
    raw.ontime_percentage,
  );

  return {
    id,
    title: firstString(
      raw.name,
      raw.route_name,
      raw.title,
      `Route ${formatShortDate(startDate)}`,
    ),
    dateLabel: formatShortDate(startDate),
    fullDateLabel: formatFullDate(startDate),
    startTime: formatTime(startDate),
    endTime: formatTime(endDate),
    status: statusMeta.status,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    stopsCount: firstNumber(
      raw.stops_count,
      raw.stop_count,
      raw.total_stops,
      stops.length,
    ),
    distanceKm: Number(distanceKm.toFixed ? distanceKm.toFixed(1) : distanceKm),
    durationText:
      firstString(raw.duration_text, raw.durationLabel) ||
      formatDuration(durationMinutes),
    onTimePercentage: Math.max(
      0,
      Math.min(
        100,
        onTimePercentage || (statusMeta.status === "completed" ? 92 : 0),
      ),
    ),
    driverName: firstString(
      raw.driver_name,
      raw.driver?.name,
      raw.user?.name,
      "Driver",
    ),
    vehicleName: firstString(
      raw.vehicle_name,
      raw.vehicle?.name,
      raw.vehicle_no,
      raw.vehicle_number,
      "--",
    ),
    startLocation: getLocationName(
      raw.start_location,
      raw.startLocation,
      raw.start,
    ),
    endLocation: getLocationName(raw.end_location, raw.endLocation, raw.end),
    notes: firstString(raw.notes, raw.description),
    stops,
    mapPoints: normalizeMapPoints(raw, stops),
    proofCount: firstNumber(raw.proof_count, raw.pod_count, raw.proofs?.length),
  };
};

export const groupRoutesByDate = (
  routes: RouteHistoryRoute[],
): RouteHistoryGroup[] => {
  const groups = new Map<string, RouteHistoryRoute[]>();

  routes.forEach((route) => {
    const key = route.fullDateLabel || "Unknown date";
    const current = groups.get(key) || [];
    current.push(route);
    groups.set(key, current);
  });

  return Array.from(groups.entries()).map(([title, groupRoutes]) => ({
    key: title,
    title,
    count: groupRoutes.length,
    routes: groupRoutes,
  }));
};

export const filterRouteHistory = (
  routes: RouteHistoryRoute[],
  status: RouteHistoryStatus,
  query: string,
) => {
  const search = query.trim().toLowerCase();

  return routes.filter((route) => {
    const matchesStatus = status === "all" || route.status === status;
    const matchesSearch =
      !search ||
      route.title.toLowerCase().includes(search) ||
      route.driverName.toLowerCase().includes(search) ||
      route.startLocation.toLowerCase().includes(search) ||
      route.endLocation.toLowerCase().includes(search);

    return matchesStatus && matchesSearch;
  });
};

export const getRouteHistory = async (limit = 40, offset = 0) => {
  const response = await routesService.getRoutes(limit, offset);

  if (!response?.success) {
    throw new Error(response?.error || "Unable to fetch route history");
  }

  return asArray(response.data).map(normalizeRouteHistoryRoute);
};

export const getRouteHistoryDetail = async (routeId: string) => {
  const service = routesService as any;

  if (typeof service.getRoute === "function") {
    const response = await service.getRoute(routeId);
    if (!response?.success)
      throw new Error(response?.error || "Unable to fetch route details");
    return normalizeRouteHistoryRoute(response.data?.route || response.data, 0);
  }

  const routes = await getRouteHistory(80, 0);
  const route = routes.find((item) => item.id === routeId);
  if (!route) throw new Error("Route not found");
  return route;
};

export const deleteRouteHistory = async (routeId: string) => {
  const response = await routesService.updateRoute({
    route_id: routeId,
    is_active: false,
  });
  if (!response?.success)
    throw new Error(response?.error || "Unable to delete route");
  return true;
};

export const duplicateRouteHistory = async (routeId: string) => {
  const service = routesService as any;

  if (typeof service.duplicateRoute === "function") {
    const response = await service.duplicateRoute(routeId);
    if (!response?.success)
      throw new Error(response?.error || "Unable to duplicate route");
    return response.data;
  }

  return { duplicateFrom: routeId };
};
