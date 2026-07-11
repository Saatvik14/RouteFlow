import type { ConfirmedRoute, RoutePoint } from '../../components/maps/RouteMap';

export type PanelMode = any;

export type RouteStatus = string;

export type EndMode = 'round_trip' | 'other_address' | 'no_end';

export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

export type StopDetails = {
  packages: number;
  order_preference: 'early' | 'auto' | 'last';
  stop_type: 'delivery' | 'pickup';
  notes: string;
  arrivalTime: string | null;
  timeAtStopMinutes: number | null;
};

export type RouteStop = RoutePoint & {
  id: string;
  sequence: number;
  markerType?: 'start' | 'stop' | 'end';
  markerLabel?: string;
  markerIcon?: string;
  address?: string;
  notes?: string;
  packages?: number;
  order_preference?: 'early' | 'auto' | 'last';
  stop_type?: 'delivery' | 'pickup';
  status?: string;
  backendOrderId?: string | number;
  orderId?: string | number;
  sequenceNo?: number;
  planned_arrival_time?: string | null;
  timeAtStopMinutes?: number | null;
};

export type AppRoute = Omit<ConfirmedRoute, 'stops'> & {
  stops: RouteStop[];
};

export type RouteMeta = {
  distanceLabel: string;
  durationLabel: string;
};

export type ActiveStopInfo = {
  stop: RouteStop | null;
  index: number;
  total: number;
};

export type RouteLoadResult = {
  route: AppRoute;
  routeTitle: string;
  startTime: string;
  routeMeta: RouteMeta;
  panelMode: PanelMode;
  routeStatus: RouteStatus;
  routeId: string;
};


