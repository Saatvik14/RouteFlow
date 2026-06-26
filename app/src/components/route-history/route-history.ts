export type RouteHistoryStatus = "all" | "completed" | "pending" | "cancelled";

export type RouteHistoryTone = "green" | "amber" | "red" | "blue" | "slate";

export type RouteHistoryPoint = {
  latitude: number;
  longitude: number;
};

export type RouteHistoryStopStatus =
  | "on_time"
  | "delayed"
  | "failed"
  | "pending"
  | "completed";

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
};

export type RouteHistoryGroup = {
  key: string;
  title: string;
  count: number;
  routes: RouteHistoryRoute[];
};
