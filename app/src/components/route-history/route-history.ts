export type RouteHistoryStatus = "all" | "completed" | "pending" | "cancelled";

export type RouteHistoryTone = "green" | "amber" | "red" | "blue" | "slate";

export type RouteHistoryPoint = {
  latitude: number;
  longitude: number;
  sequence?: number;
  stopId?: string;
};

export type RouteHistoryStopStatus =
  | "on_time"
  | "delayed"
  | "failed"
  | "pending"
  | "completed"
  | "delivered";

export type RouteHistoryStop = {
  id: string;
  sequence: number;
  title: string;
  address: string;
  eta: string;
  actualTime?: string;
  status: RouteHistoryStopStatus;
  statusLabel: string;
  delayMinutes?: number;
  proofCount?: number;
  notes?: string;

  // Optional order fields. The UI renders them when the API returns them.
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  timeWindow?: string;
  serviceDurationMinutes?: number;
  priority?: "low" | "normal" | "high" | "urgent" | string;
  itemsCount?: number;
  latitude?: number;
  longitude?: number;
};

export type RouteHistoryRoute = {
  id: string;
  title: string;
  dateLabel: string;
  fullDateLabel: string;
  startTime: string;
  endTime: string;
  status: Exclude<RouteHistoryStatus, "all"> | "active" | "optimized";
  statusLabel: string;
  statusTone: RouteHistoryTone;
  stopsCount: number;
  distanceKm: number;
  durationText: string;
  onTimePercentage: number;
  driverName: string;
  vehicleName: string;
  startLocation: string;
  endLocation: string;
  notes?: string;
  stops: RouteHistoryStop[];
  mapPoints: RouteHistoryPoint[];
  proofCount: number;

  // Prefer optimizedPath when the backend stores the complete route geometry.
  // mapPoints can continue to contain only start/stop/end coordinates.
  optimizedPath?: RouteHistoryPoint[];
  startPoint?: RouteHistoryPoint;
  endPoint?: RouteHistoryPoint;
  currentStopId?: string;
  remainingDistanceKm?: number;
  remainingDurationText?: string;
  durationSeconds?: number;
};

export type RouteHistoryGroup = {
  key: string;
  title: string;
  count: number;
  routes: RouteHistoryRoute[];
};
