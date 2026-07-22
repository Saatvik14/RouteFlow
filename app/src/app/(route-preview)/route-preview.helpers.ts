import { ordersService } from './../../services/api/orders';
import { routesService } from './../../services/api/routes';
import { ROUTE_STATUS } from './../../constants/api';
import type { RoutePoint } from '../../components/maps/RouteMap';
import type {
  ActiveStopInfo,
  AppRoute,
  EndMode,
  PanelMode,
  PlaceSuggestion,
  RouteLoadResult,
  RouteMeta,
  RouteStatus,
  RouteStop,
  StopDetails,
} from './route-preview.types';

export const DEFAULT_POINT: RoutePoint = {
  latitude: 28.6139,
  longitude: 77.209,
  title: 'Delhi',
  description: 'Delhi',
};

export const DEFAULT_STOP_DETAILS: StopDetails = {
  notes: '',
  packages: 1,

  order_preference: 'auto',
  stop_type: 'delivery',

  arrivalTime: '',
  timeAtStopMinutes: 1,

  address: '',
  latitude: null,
  longitude: null
} as StopDetails;


export const ROUTE_STATUS_PENDING =
  (ROUTE_STATUS as Record<string, string>).PENDING || 'pending';

export const ROUTE_STATUS_OPTIMIZED =
  (ROUTE_STATUS as Record<string, string>).OPTIMIZED || 'optimized';

export const ROUTE_STATUS_IN_TRANSIT =
  (ROUTE_STATUS as Record<string, string>).IN_TRANSIT || 'in_transit';

export const ROUTE_STATUS_COMPLETED =
  (ROUTE_STATUS as Record<string, string>).COMPLETED || 'completed';

export const ROUTE_STATUS_CANCELLED =
  (ROUTE_STATUS as Record<string, string>).CANCELLED || 'cancelled';

export const ORDER_STATUS_DELIVERED = 'delivered';
export const ORDER_STATUS_FAILED = 'failed';

export function normalizeRouteStatus(status: unknown): RouteStatus {
  return String(status || ROUTE_STATUS_PENDING)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function isStatus(status: unknown, expectedStatus: unknown) {
  return normalizeRouteStatus(status) === normalizeRouteStatus(expectedStatus);
}

export function isOptimizedStatus(status: unknown) {
  return isStatus(status, ROUTE_STATUS_OPTIMIZED);
}

export function isInTransitStatus(status: unknown) {
  return isStatus(status, ROUTE_STATUS_IN_TRANSIT);
}

export function getPanelModeFromStatus(
  status: unknown,
  stopsCount: number,
): PanelMode {
  if (isCancelledRouteStatus(status)) {
    return 'cancelled';
  }

  if (isInTransitStatus(status) || isStatus(status, ROUTE_STATUS_COMPLETED)) {
    return 'transit';
  }

  if (isOptimizedStatus(status)) {
    return 'confirmed';
  }

  return stopsCount > 0 ? 'setup' : 'empty';
}

export function isFinishedStopStatus(status: unknown) {
  const normalized = normalizeRouteStatus(status);

  return [
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_FAILED,
    'completed',
    'cancelled',
    'canceled',
  ].includes(normalized);
}

export function isSuccessResponse(response: any) {
  if (response === undefined || response === null) return true;
  if (response.success === false) return false;
  if (response.data?.success === false) return false;

  const possibleCodes = [
    response?.code,
    response?.data?.code,
    response?.data?.data?.code,
  ];
  const numericCode = possibleCodes.find((code) =>
    Number.isFinite(Number(code)),
  );

  return !(numericCode !== undefined && Number(numericCode) !== 0);
}

export function getResponseErrorMessage(response: any, fallback: string) {
  return String(
    response?.error ||
      response?.message ||
      response?.data?.error ||
      response?.data?.message ||
      fallback,
  );
}

export function getParam(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function isValidCoordinate(latitude: unknown, longitude: unknown) {
  const lat = toNumberOrNull(latitude);
  const lng = toNumberOrNull(longitude);

  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function formatDisplayTime(date: Date) {
  return date
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
}

export function formatTimeFromDateTime(value: unknown, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return fallback || value;

  return formatDisplayTime(parsedDate);
}

export function formatDistance(meters: number) {
  if (!meters || meters <= 0) return '0 mi';
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)} mi`;
}

export function formatMiles(miles: number) {
  if (!miles || miles <= 0) return '0 mi';
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0 min';

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes <= 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function unwrapApiPayload(response: any) {
  const payload = response?.data ?? response;

  if (payload?.route?.start || payload?.route?.start_location) {
    return payload.route;
  }

  if (payload?.data?.route?.start || payload?.data?.route?.start_location) {
    return payload.data.route;
  }

  return payload?.data?.route ?? payload?.route ?? payload?.data ?? payload;
}

function getLocationValue(rawLocation: any) {
  if (!rawLocation) return null;
  return rawLocation.location || rawLocation;
}

function getAddressFromLocation(rawLocation: any) {
  const location = getLocationValue(rawLocation);

  return String(
    location?.full_address ||
      location?.fullAddress ||
      location?.formatted ||
      location?.address ||
      location?.display_name ||
      location?.name ||
      '',
  );
}

function getTitleFromLocation(rawLocation: any, fallbackTitle: string) {
  const location = getLocationValue(rawLocation);

  return String(
    location?.title ||
      location?.name ||
      location?.addressLine1 ||
      location?.address_line1 ||
      fallbackTitle,
  );
}

function getCoordinatesFromLocation(rawLocation: any) {
  const location = getLocationValue(rawLocation);
  const details = location?.details || {};
  const coordinates = location?.coordinates || {};

  const latitude = toNumberOrNull(
    location?.latitude ??
      location?.lat ??
      details?.latitude ??
      details?.lat ??
      coordinates?.latitude ??
      coordinates?.lat,
  );
  const longitude = toNumberOrNull(
    location?.longitude ??
      location?.lng ??
      location?.lon ??
      details?.longitude ??
      details?.lng ??
      details?.lon ??
      coordinates?.longitude ??
      coordinates?.lng ??
      coordinates?.lon,
  );

  if (!isValidCoordinate(latitude, longitude)) return null;

  return {
    latitude: latitude as number,
    longitude: longitude as number,
  };
}

function getCoordinatesFromBackendRoute(rawRoute: any): RoutePoint[] {
  if (!Array.isArray(rawRoute?.coordinates)) return [];

  return rawRoute.coordinates
    .map((point: any) => {
      const latitude = toNumberOrNull(
        Array.isArray(point) ? point[1] : point?.latitude ?? point?.lat,
      );
      const longitude = toNumberOrNull(
        Array.isArray(point)
          ? point[0]
          : point?.longitude ?? point?.lng ?? point?.lon,
      );

      if (!isValidCoordinate(latitude, longitude)) return null;

      return {
        latitude: latitude as number,
        longitude: longitude as number,
      };
    })
    .filter(Boolean) as RoutePoint[];
}

function buildPointFromBackendLocation(
  rawLocation: any,
  fallbackTitle: string,
  fallbackPoint?: RoutePoint,
): RoutePoint | null {
  const coordinates = getCoordinatesFromLocation(rawLocation) || fallbackPoint;

  if (!coordinates) return null;

  const title = getTitleFromLocation(rawLocation, fallbackTitle);
  const address = getAddressFromLocation(rawLocation);

  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    title,
    description: address || title,
  };
}

export function getRoutePoints(route: AppRoute): RoutePoint[] {
  return [route.start, ...(route.stops || []), route.end].filter(Boolean);
}

export function getInitialCoordinates(route: AppRoute): RoutePoint[] {
  return getRoutePoints(route);
}

export function hasDetailedRoadPath(route: AppRoute) {
  const routePointsCount = getRoutePoints(route).length;
  return Boolean(route.coordinates && route.coordinates.length > routePointsCount + 2);
}

function unwrapApiList(response: any): any[] {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.stops)) return payload.stops;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  return [];
}

function getOrderRouteId(order: any) {
  const routeValue =
    order?.routeId ??
    order?.route_id ??
    order?.routeID ??
    order?.route?.id ??
    order?.route?._id ??
    order?.route;

  return routeValue === null || routeValue === undefined ? '' : String(routeValue);
}

function isOrderForRoute(order: any, routeId: string) {
  if (!routeId) return false;
  return getOrderRouteId(order) === routeId;
}

export function getStopIdentity(stop: RouteStop) {
  if (stop.id) return `id:${stop.id}`;

  return [
    'geo',
    stop.latitude.toFixed(6),
    stop.longitude.toFixed(6),
    stop.address || stop.description || stop.title || '',
  ].join(':');
}

function mergeStops(...stopGroups: RouteStop[][]) {
  const seen = new Set<string>();
  const merged: RouteStop[] = [];

  stopGroups.flat().forEach((stop) => {
    const key = getStopIdentity(stop);

    if (seen.has(key)) return;

    seen.add(key);
    merged.push(stop);
  });

  return merged
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    .map((stop, index) => ({
      ...stop,
      sequence: index + 1,
    }));
}

export function getActiveStop(stops: RouteStop[] = []): ActiveStopInfo {
  const orderedStops = [...stops].sort(
    (a, b) => Number(a.sequence || 0) - Number(b.sequence || 0),
  );

  const deliverableStops = orderedStops.filter(
    (stop) => stop.markerType !== 'start' && stop.markerType !== 'end',
  );

  const activeIndex = deliverableStops.findIndex(
    (stop) => !isFinishedStopStatus(stop.status),
  );

  return {
    stop: activeIndex >= 0 ? deliverableStops[activeIndex] : null,
    index: activeIndex >= 0 ? activeIndex : 0,
    total: deliverableStops.length,
  };
}

export function getStopBackendId(stop?: RouteStop | null) {
  return String(stop?.backendOrderId || stop?.orderId || stop?.id || '');
}

export async function updateOrderStatusOnBackend(stop: RouteStop, status: string) {
  const orderId = getStopBackendId(stop);

  if (!orderId) {
    throw new Error('Order id is missing.');
  }

  return ordersService.editOrder({
    order_id: orderId,
    status,
  });
}

export function getMapsNavigationUrl(stop: RouteStop) {
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
}

async function buildStopsFromBackend(rawStops: any[]): Promise<RouteStop[]> {
  if (!Array.isArray(rawStops)) return [];

  const stops = rawStops
    .map((item, index) => {
      const point = buildPointFromBackendLocation(item, `Stop ${index + 1}`);

      if (!point) return null;

      return {
        ...point,
        id: String(
          item?.id ||
            item?._id ||
            item?.orderId ||
            item?.order_id ||
            item?.place_id ||
            `${Date.now()}-${index}`,
        ),
        backendOrderId: item?.id || item?._id || item?.orderId || item?.order_id,
        orderId: item?.orderId || item?.order_id || item?.id || item?._id,
        sequence: Number(
          item?.sequence || item?.stopSequence || item?.stop_sequence || index + 1,
        ),
        address: getAddressFromLocation(item) || item?.address || point.description,
        packages: Number(item?.packages || item?.packageCount || item?.package_count || 1),
        order: item?.order || 'auto',
        stopType: item?.stopType || item?.stop_type || item?.type || 'delivery',
        notes: item?.notes || item?.note || '',
        status: item?.status || ROUTE_STATUS_PENDING,
        arrive_at: item?.arrive_at,
        failed_at: item?.failed_at,
        status_updated_at: item?.updated_at,
        priority: item?.priority !== undefined && item?.priority !== null ? Number(item.priority) : null,
        eta_duration: item?.eta_duration != null ? Number(item.eta_duration) : (item?.etaDuration != null ? Number(item.etaDuration) : null),
        eta_distance: item?.eta_distance != null ? Number(item.eta_distance) : (item?.etaDistance != null ? Number(item.etaDistance) : null),
        approx_eta_time: item?.approx_eta_time || item?.approxEtaTime || null,
      } as RouteStop;
    })
    .filter(Boolean) as RouteStop[];

  return stops.sort((a, b) => a.sequence - b.sequence);
}

async function fetchRouteOrderStops(routeId: string): Promise<RouteStop[]> {
  if (!routeId) return [];

  try {
    const response = await routesService.getRoute(routeId);
    const routeOrders = unwrapApiList(response).filter((order) =>
      isOrderForRoute(order, routeId),
    );
    return buildStopsFromBackend(routeOrders);
  } catch {
    return [];
  }
}

export async function buildRouteFromBackendResponse(
  response: any,
  routeId = '',
): Promise<RouteLoadResult> {
  const rawRoute = unwrapApiPayload(response);

  if (!rawRoute || typeof rawRoute !== 'object') {
    throw new Error('Route not found.');
  }

  const routeStatus = normalizeRouteStatus(rawRoute.status || ROUTE_STATUS_PENDING);
  const backendCoordinates = getCoordinatesFromBackendRoute(rawRoute);

  const startRaw =
    rawRoute.start_location ||
    rawRoute.startLocation ||
    rawRoute.start?.location ||
    rawRoute.start;

  const endRaw =
    rawRoute.end_location ||
    rawRoute.endLocation ||
    rawRoute.end?.location ||
    rawRoute.end;

  const endMode = (rawRoute.end_mode ||
    rawRoute.endMode ||
    rawRoute.end?.mode ||
    'round_trip') as EndMode;

  const startPoint = buildPointFromBackendLocation(
    startRaw,
    'Start location',
    backendCoordinates[0],
  );

  if (!startPoint) {
    throw new Error('Start location coordinates missing in route response.');
  }

  let endPoint: RoutePoint | null = null;

  if (endMode !== 'no_end') {
    endPoint = buildPointFromBackendLocation(
      endRaw,
      'End location',
      backendCoordinates[backendCoordinates.length - 1],
    );
  }

  if (!endPoint) {
    endPoint = {
      ...startPoint,
      title: 'End location',
      description:
        endMode === 'round_trip'
          ? 'Return to start location'
          : 'No end location selected',
    };
  }

  const resolvedRouteId = String(
    routeId || rawRoute.id || rawRoute._id || rawRoute.routeId || rawRoute.route_id || '',
  );
  const routeStops = await buildStopsFromBackend(
    rawRoute.stops || rawRoute.route_stops || rawRoute.routeStops || [],
  );
  const orderStops = await fetchRouteOrderStops(resolvedRouteId);
  const stops = mergeStops(routeStops, orderStops);

  const route: AppRoute = {
    start: startPoint,
    end: endPoint,
    stops,
    coordinates: [],
  };

  const routeCoordinates =
    backendCoordinates.length >= stops.length + 2
      ? backendCoordinates
      : getInitialCoordinates(route);

  const distance = Number(rawRoute.distance || rawRoute.total_distance || 0);
  const duration = Number(rawRoute.duration || rawRoute.total_duration || 0);

  return {
    route: {
      ...route,
      coordinates: routeCoordinates,
    },
    routeTitle: String(rawRoute.name || rawRoute.routeName || rawRoute.title || 'Route'),
    startTime: formatTimeFromDateTime(
      rawRoute.start_datetime || rawRoute.startDateTime || rawRoute.start?.dateTime,
    ),
    rawStartDatetime: String(
      rawRoute.start_datetime || rawRoute.startDateTime || rawRoute.start?.dateTime || '',
    ),
    routeMeta: {
      distanceLabel: formatMiles(distance),
      durationLabel: formatDuration(duration),
    },
    panelMode: getPanelModeFromStatus(routeStatus, stops.length),
    routeStatus,
    routeId: resolvedRouteId,
  };
}

function getStraightLineDistanceMeters(start: RoutePoint, end: RoutePoint) {
  const earthRadius = 6371000;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const deltaLat = ((end.latitude - start.latitude) * Math.PI) / 180;
  const deltaLng = ((end.longitude - start.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export async function fetchRoutePath(points: RoutePoint[]) {
  try {
    if (points.length < 2) {
      return {
        coordinates: points,
        distanceMeters: 0,
        durationSeconds: 0,
      };
    }

    const coordString = points
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route?.geometry?.coordinates?.length) {
      throw new Error('No route found.');
    }

    const coordinates: RoutePoint[] = route.geometry.coordinates.map(
      ([longitude, latitude]: [number, number]) => ({
        latitude,
        longitude,
      }),
    );

    return {
      coordinates,
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
    };
  } catch {
    let distanceMeters = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
      distanceMeters += getStraightLineDistanceMeters(
        points[index],
        points[index + 1],
      );
    }

    return {
      coordinates: points,
      distanceMeters,
      durationSeconds: Math.max(300, (distanceMeters / 35000) * 3600),
    };
  }
}

function serializeRouteCoordinates(coordinates: RoutePoint[] = []) {
  return coordinates.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
}

export function getOptimizePayload(response: any) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload;
}

export function getOptimizedRouteData(response: any) {
  const payload = getOptimizePayload(response);
  return payload?.routes?.[0] || payload?.route || payload;
}

export function getOptimizedSteps(response: any) {
  const routeData = getOptimizedRouteData(response);
  const payload = getOptimizePayload(response);

  return routeData?.steps || payload?.steps || [];
}

export async function persistRouteSnapshot({
  routeId,
  status,
  route,
  distanceMeters,
  durationSeconds,
  startDatetime,
  endDatetime,
}: {
  routeId: string;
  status?: string;
  route: AppRoute;
  distanceMeters?: number;
  durationSeconds?: number;
  startDatetime?: string;
  endDatetime?: string;
}) {
  if (!routeId) return;

  const payload: any = {
    route_id: routeId
  };

  if (status) payload.status = status;
  if (distanceMeters !== undefined && Number.isFinite(distanceMeters)) {
    payload.distance = distanceMeters * 0.000621371;
  }
  if (durationSeconds !== undefined && Number.isFinite(durationSeconds)) {
    payload.duration = durationSeconds;
  }
  if (startDatetime) {
    payload.start_datetime = startDatetime;
  }
  if (endDatetime) {
    payload.end_datetime = endDatetime;
  }

  await routesService.updateRoute(payload);
}

function parsePlaceSuggestion(
  item: any,
  index: number,
  fallbackQuery: string,
): PlaceSuggestion | null {
  const properties = item?.properties || item || {};
  const geometryCoordinates = item?.geometry?.coordinates || [];
  const latitude = toNumberOrNull(
    properties.latitude ??
      properties.lat ??
      item?.lat ??
      item?.latitude ??
      (Array.isArray(geometryCoordinates) ? geometryCoordinates[1] : undefined),
  );
  const longitude = toNumberOrNull(
    properties.longitude ??
      properties.lng ??
      properties.lon ??
      item?.lng ??
      item?.lon ??
      item?.longitude ??
      (Array.isArray(geometryCoordinates) ? geometryCoordinates[0] : undefined),
  );

  if (!isValidCoordinate(latitude, longitude)) return null;

  const fullAddress = String(
    properties.fullAddress ??
      properties.full_address ??
      properties.formatted ??
      properties.address ??
      properties.display_name ??
      item?.fullAddress ??
      item?.full_address ??
      item?.address ??
      item?.display_name ??
      fallbackQuery,
  );
  const title = String(
    properties.title ||
      properties.name ||
      properties.address_line1 ||
      item?.title ||
      item?.name ||
      item?.text ||
      fullAddress.split(',')[0] ||
      fallbackQuery,
  );
  const subtitle = String(
    properties.subtitle ||
      properties.address_line2 ||
      properties.description ||
      item?.subtitle ||
      item?.description ||
      fullAddress.replace(title, '').trim().replace(/^,/, '').trim() ||
      'Address suggestion',
  );

  return {
    id: String(
      properties.place_id ||
        properties.placeId ||
        item?.id ||
        item?.place_id ||
        index,
    ),
    title,
    subtitle,
    fullAddress,
    latitude: latitude as number,
    longitude: longitude as number,
  };
}

export async function fetchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) return [];

  try {
    const response = await routesService.getAutocompleteAddress(cleanQuery, 7);
    const rawData = response?.data ?? response;
    const rawList = Array.isArray(rawData)
      ? rawData
      : rawData?.suggestions || rawData?.results || rawData?.features || [];

    return rawList
      .map((item: any, index: number) =>
        parsePlaceSuggestion(item, index, cleanQuery),
      )
      .filter(Boolean) as PlaceSuggestion[];
  } catch {
    return [];
  }
}


export function getResolvedAddressSuggestions(
  response: any,
  fallbackQuery = 'Address',
): PlaceSuggestion[] {
  const rawData = response?.data ?? response;
  const rawList = Array.isArray(rawData)
    ? rawData
    : rawData?.suggestions ||
      rawData?.results ||
      rawData?.features ||
      rawData?.data?.suggestions ||
      rawData?.data?.results ||
      rawData?.data?.features ||
      [];

  return rawList
    .map((item: any, index: number) =>
      parsePlaceSuggestion(item, index, fallbackQuery),
    )
    .filter(Boolean) as PlaceSuggestion[];
}

export function getResolvedManifestRows(response: any): any[] {
  const rawData = response?.data ?? response;
  const rows = rawData?.rows || rawData?.data?.rows || rawData?.manifestRows || [];

  return Array.isArray(rows) ? rows : [];
}

export function unwrapOrderPayload(response: any) {
  const payload = response?.data ?? response;

  return (
    payload?.data?.order ||
    payload?.data?.item ||
    payload?.order ||
    payload?.item ||
    payload?.data ||
    payload
  );
}

export function buildOrderPayload({
  routeId,
  sequence,
  suggestion,
  details,
}: {
  routeId: string;
  sequence: number;
  suggestion: PlaceSuggestion;
  details: StopDetails;
}) {
  const location = {
    mode: 'manual_address',
    address: suggestion.fullAddress,
    selectedFromSuggestion: true,
    details: {
      housenumber: '',
      street: '',
      placeId: suggestion.id,
      addressLine1: suggestion.title,
      addressLine2: suggestion.subtitle,
      city: '',
      district: '',
      state: '',
      country: '',
      countryCode: '',
      postalCode: '',
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    },
  };

  return {
    route_id: routeId,
    sequence,
    location,
    address: suggestion.fullAddress,
    title: suggestion.title,
    description: suggestion.subtitle,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    packages: details.packages,
    order_preference: details.order_preference,
    stop_type: details.stop_type,
    notes: details.notes,
    status: ROUTE_STATUS_PENDING,
  };
}

export function buildStopFromSavedOrder(
  savedOrder: any,
  fallbackStop: RouteStop,
): RouteStop {
  if (!savedOrder || typeof savedOrder !== 'object') return fallbackStop;

  const point =
    buildPointFromBackendLocation(savedOrder, fallbackStop.title || 'Stop', fallbackStop) ||
    fallbackStop;

  return {
    ...fallbackStop,
    ...point,
    id: String(
      savedOrder.id ||
        savedOrder._id ||
        savedOrder.orderId ||
        savedOrder.order_id ||
        fallbackStop.id,
    ),
    backendOrderId:
      savedOrder.id ||
      savedOrder._id ||
      savedOrder.orderId ||
      savedOrder.order_id ||
      fallbackStop.backendOrderId,
    orderId:
      savedOrder.orderId ||
      savedOrder.order_id ||
      savedOrder.id ||
      savedOrder._id ||
      fallbackStop.orderId,
    sequence: Number(
      savedOrder.sequence ||
        savedOrder.stopSequence ||
        savedOrder.stop_sequence ||
        fallbackStop.sequence,
    ),
    address:
      getAddressFromLocation(savedOrder) ||
      savedOrder.address ||
      fallbackStop.address ||
      point.description,
    packages: Number(
      savedOrder.packages ||
        savedOrder.packageCount ||
        savedOrder.package_count ||
        fallbackStop.packages ||
        1,
    ),
    order_preference: savedOrder.order_preference || fallbackStop.order_preference || 'auto',
    stop_type:
      savedOrder.stop_type ||
      savedOrder.type ||
      fallbackStop.stop_type ||
      'delivery',
    notes: savedOrder.notes || savedOrder.note || fallbackStop.notes || '',
    status: savedOrder.status || fallbackStop.status,
    actualArrivalTime:
      savedOrder.actualArrivalTime ||
      savedOrder.actual_arrival_time ||
      savedOrder.arrivedAt ||
      savedOrder.arrived_at ||
      savedOrder.deliveredAt ||
      savedOrder.delivered_at ||
      savedOrder.completedAt ||
      savedOrder.completed_at ||
      (fallbackStop as any).actualArrivalTime ||
      (fallbackStop as any).actual_arrival_time ||
      null,
    actual_arrival_time:
      savedOrder.actual_arrival_time ||
      savedOrder.actualArrivalTime ||
      savedOrder.arrived_at ||
      savedOrder.arrivedAt ||
      savedOrder.delivered_at ||
      savedOrder.deliveredAt ||
      savedOrder.completed_at ||
      savedOrder.completedAt ||
      (fallbackStop as any).actual_arrival_time ||
      (fallbackStop as any).actualArrivalTime ||
      null,
    arrivedAt: savedOrder.arrivedAt || savedOrder.arrived_at || (fallbackStop as any).arrivedAt || null,
    arrived_at: savedOrder.arrived_at || savedOrder.arrivedAt || (fallbackStop as any).arrived_at || null,
    deliveredAt:
      savedOrder.deliveredAt ||
      savedOrder.delivered_at ||
      (fallbackStop as any).deliveredAt ||
      (fallbackStop as any).delivered_at ||
      null,
    delivered_at:
      savedOrder.delivered_at ||
      savedOrder.deliveredAt ||
      (fallbackStop as any).delivered_at ||
      (fallbackStop as any).deliveredAt ||
      null,
    failedAt:
      savedOrder.failedAt ||
      savedOrder.failed_at ||
      savedOrder.attemptedAt ||
      savedOrder.attempted_at ||
      (fallbackStop as any).failedAt ||
      (fallbackStop as any).failed_at ||
      null,
    failed_at:
      savedOrder.failed_at ||
      savedOrder.failedAt ||
      savedOrder.attempted_at ||
      savedOrder.attemptedAt ||
      (fallbackStop as any).failed_at ||
      (fallbackStop as any).failedAt ||
      null,
    completedAt:
      savedOrder.completedAt ||
      savedOrder.completed_at ||
      (fallbackStop as any).completedAt ||
      (fallbackStop as any).completed_at ||
      null,
    completed_at:
      savedOrder.completed_at ||
      savedOrder.completedAt ||
      (fallbackStop as any).completed_at ||
      (fallbackStop as any).completedAt ||
      null,
    statusUpdatedAt:
      savedOrder.statusUpdatedAt ||
      savedOrder.status_updated_at ||
      savedOrder.updatedAt ||
      savedOrder.updated_at ||
      (fallbackStop as any).statusUpdatedAt ||
      null,
    status_updated_at:
      savedOrder.status_updated_at ||
      savedOrder.statusUpdatedAt ||
      savedOrder.updated_at ||
      savedOrder.updatedAt ||
      (fallbackStop as any).status_updated_at ||
      null,
  } as RouteStop;
}

export function buildSuggestionFromStop(stop: RouteStop): PlaceSuggestion {
  const title = String(stop.title || stop.address || 'Stop location');
  const subtitle = String(stop.description || stop.address || 'Address details not available');
  const fullAddress = String(stop.address || stop.description || stop.title || '');

  return {
    id: String(stop.backendOrderId || stop.orderId || stop.id),
    title,
    subtitle,
    fullAddress,
    latitude: stop.latitude,
    longitude: stop.longitude,
  };
}

export function buildStopDetailsFromStop(stop: RouteStop): StopDetails {
  return {
    packages: Number(stop.packages || 1),
    order_preference: stop.order_preference || 'auto',
    stop_type: stop.stop_type || 'delivery',
    notes: stop.notes || '',
    arrivalTime: stop.planned_arrival_time ||null,
    timeAtStopMinutes: stop.timeAtStopMinutes || null,
  };
}

type MarkerRoutePoint = RoutePoint & {
  markerType?: 'start' | 'stop' | 'end';
  markerLabel?: string;
  markerIcon?: string;
};

type MarkerRouteStop = RouteStop & MarkerRoutePoint;

function getCoordinateKey(point: RoutePoint) {
  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return '0.0,0.0';
  }
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function offsetPointForMarker(point: RoutePoint, index: number, total: number) {
  if (total <= 1) return point;

  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return point;
  }

  const radiusMeters = 16;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((lat * Math.PI) / 180)),
  );
  const longitudeOffset = (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: lat + latitudeOffset,
    longitude: lon + longitudeOffset,
  };
}

export function buildMapDisplayRoute(route: AppRoute): AppRoute {
  const markerItems = [
    {
      key: 'start',
      markerType: 'start' as const,
      markerLabel: 'S',
      markerIcon: '⌂',
      point: route.start,
    },
    ...route.stops.map((stop) => ({
      key: `stop-${stop.id}`,
      markerType: 'stop' as const,
      markerLabel: String(stop.sequence),
      markerIcon: '●',
      point: stop,
    })),
    {
      key: 'end',
      markerType: 'end' as const,
      markerLabel: 'E',
      markerIcon: '⚑',
      point: route.end,
    },
  ];

  const grouped = markerItems.reduce<Record<string, typeof markerItems>>((acc, item) => {
    const key = getCoordinateKey(item.point);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const displayMarkers = new Map<string, MarkerRoutePoint | MarkerRouteStop>();

  Object.values(grouped).forEach((items) => {
    items.forEach((item, index) => {
      const offsetPoint = offsetPointForMarker(item.point, index, items.length);

      displayMarkers.set(item.key, {
        ...item.point,
        ...offsetPoint,
        markerType: item.markerType,
        markerLabel: item.markerLabel,
        markerIcon: item.markerIcon,
        title:
          item.markerType === 'stop'
            ? `Stop ${item.markerLabel}: ${item.point.title || 'Stop'}`
            : item.markerType === 'start'
              ? item.point.title || 'Start location'
              : item.point.title || 'End location',
      });
    });
  });

  return {
    ...route,
    start: (displayMarkers.get('start') || route.start) as RoutePoint,
    stops: route.stops.map(
      (stop) => (displayMarkers.get(`stop-${stop.id}`) || stop) as RouteStop,
    ),
    end: (displayMarkers.get('end') || route.end) as RoutePoint,
    coordinates: route.coordinates?.length ? route.coordinates : getInitialCoordinates(route),
  };
}

export function isCancelledRouteStatus(status: unknown) {
  const normalized = normalizeRouteStatus(status);

  return normalized === ROUTE_STATUS_CANCELLED || normalized === 'canceled';
}

export function isPendingOrderStatus(status: unknown) {
  const normalized = normalizeRouteStatus(status);

  return (
    normalized === ROUTE_STATUS_PENDING ||
    normalized === 'pnding' ||
    normalized === ''
  );
}


// Add these helper functions to route-preview.helpers.ts

export function buildRouteLocationPayload(suggestion: PlaceSuggestion) {
  const fullAddress = suggestion.fullAddress || suggestion.subtitle || suggestion.title || '';

  return {
    mode: 'manual_address',
    address: fullAddress,
    full_address: fullAddress,
    name: suggestion.title || fullAddress,
    selectedFromSuggestion: true,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    details: {
      placeId: String(suggestion.id || ''),
      addressLine1: suggestion.title || '',
      addressLine2: suggestion.subtitle || '',
      city: '',
      district: '',
      state: '',
      country: '',
      countryCode: '',
      postalCode: '',
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    },
  };
}

export function buildRoutePointFromSuggestion(
  suggestion: PlaceSuggestion,
  fallbackTitle = 'Location',
): RoutePoint {
  return {
    latitude: Number(suggestion.latitude),
    longitude: Number(suggestion.longitude),
    title: suggestion.title || fallbackTitle,
    description: suggestion.fullAddress || suggestion.subtitle || suggestion.title || fallbackTitle,
  };
}
