import { ROUTE_STATUS } from "@/constants/api";
import { ordersService } from "@/services/api/orders";
import { routesService } from "@/services/api/routes";
import {router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoutePreviewPanel } from "@/components/route-preview-panel";
import { Sidebar } from "@/components/sidebar";
import MapScreen, {
  type ConfirmedRoute,
  type RouteMapType,
  type RoutePoint,
} from "../(MapScreen)/MapScreen";

type PanelMode =
  | "empty"
  | "search"
  | "details"
  | "setup"
  | "confirmed"
  | "transit";

type RouteStatus = string;

type EndMode = "round_trip" | "other_address" | "no_end";

type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

type StopDetails = {
  packages: number;
  order: "first" | "auto" | "last";
  stopType: "delivery" | "pickup";
  notes: string;
};

type RouteStop = RoutePoint & {
  id: string;
  sequence: number;
  markerType?: "start" | "stop" | "end";
  markerLabel?: string;
  markerIcon?: string;
  address?: string;
  notes?: string;
  packages?: number;
  order?: "first" | "auto" | "last";
  stopType?: "delivery" | "pickup";
  status?: string;
  backendOrderId?: any;
  orderId?: any;
};

type AppRoute = ConfirmedRoute & {
  
  stops: any;
};

type RouteMeta = {
  distanceLabel: string;
  durationLabel: string;
};

const DEFAULT_POINT: RoutePoint = {
  latitude: 28.6139,
  longitude: 77.209,
  title: "Delhi",
  description: "Delhi",
};

const DEFAULT_STOP_DETAILS: StopDetails = {
  packages: 1,
  order: "auto",
  stopType: "delivery",
  notes: "",
};

const ROUTE_STATUS_PENDING =
  (ROUTE_STATUS as Record<string, string>).PENDING || "pending";

const ROUTE_STATUS_OPTIMIZED =
  (ROUTE_STATUS as Record<string, string>).OPTIMIZED || "optimized";

const ROUTE_STATUS_IN_TRANSIT =
  (ROUTE_STATUS as Record<string, string>).IN_TRANSIT || "in_transit";

const ROUTE_STATUS_COMPLETED =
  (ROUTE_STATUS as Record<string, string>).COMPLETED || "completed";


const ORDER_STATUS_DELIVERED = "delivered";
const ORDER_STATUS_FAILED = "failed";

function normalizeRouteStatus(status: unknown): RouteStatus {
  return String(status || ROUTE_STATUS_PENDING)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isStatus(status: unknown, expectedStatus: unknown) {
  return normalizeRouteStatus(status) === normalizeRouteStatus(expectedStatus);
}

function isOptimizedStatus(status: unknown) {
  return isStatus(status, ROUTE_STATUS_OPTIMIZED);
}

function isInTransitStatus(status: unknown) {
  return isStatus(status, ROUTE_STATUS_IN_TRANSIT);
}


function getPanelModeFromStatus(status: unknown, stopsCount: number): PanelMode {
  if (isInTransitStatus(status) || isStatus(status, ROUTE_STATUS_COMPLETED)) {
    return "transit";
  }

  if (isOptimizedStatus(status)) {
    return "confirmed";
  }

  return stopsCount > 0 ? "setup" : "empty";
}


function isFinishedStopStatus(status: unknown) {
  const normalized = normalizeRouteStatus(status);

  return [
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_FAILED,
    "completed",
    "cancelled",
    "canceled",
  ].includes(normalized);
}

function isSuccessResponse(response: any) {
  if (response === undefined || response === null) return true;
  if (response.success === false) return false;
  if (response.data?.success === false) return false;

  const possibleCodes = [response?.code, response?.data?.code, response?.data?.data?.code];
  const numericCode = possibleCodes.find((code) => Number.isFinite(Number(code)));

  if (numericCode !== undefined && Number(numericCode) !== 0) return false;

  return true;
}

function getResponseErrorMessage(response: any, fallback: string) {
  return String(
    response?.error ||
      response?.message ||
      response?.data?.error ||
      response?.data?.message ||
      fallback,
  );
}


function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isValidCoordinate(latitude: unknown, longitude: unknown) {
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

function formatDisplayTime(date: Date) {
  return date
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

function formatTimeFromDateTime(value: unknown, fallback = "") {
  if (typeof value !== "string" || !value.trim()) return fallback;

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return fallback || value;

  return formatDisplayTime(parsedDate);
}

function formatDistance(meters: number) {
  if (!meters || meters <= 0) return "0 km";

  const km = meters / 1000;

  if (km < 1) return `${Math.round(meters)} m`;

  return `${km.toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0 min";

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

  if (rawLocation.location) return rawLocation.location;

  return rawLocation;
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
      "",
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

function getRoutePoints(route: AppRoute): RoutePoint[] {
  return [route.start, ...(route.stops || []), route.end].filter(Boolean);
}

function getInitialCoordinates(route: AppRoute): RoutePoint[] {
  return getRoutePoints(route);
}

function hasDetailedRoadPath(route: AppRoute) {
  const routePointsCount = getRoutePoints(route).length;

  return Boolean(route.coordinates && route.coordinates.length > routePointsCount + 2);
}


function unwrapApiList(response: any): any[] {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
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

  return routeValue === null || routeValue === undefined ? "" : String(routeValue);
}

function isOrderForRoute(order: any, routeId: string) {
  if (!routeId) return false;
  return getOrderRouteId(order) === routeId;
}

function getStopIdentity(stop: RouteStop) {
  if (stop.id) return `id:${stop.id}`;

  return [
    "geo",
    stop.latitude.toFixed(6),
    stop.longitude.toFixed(6),
    stop.address || stop.description || stop.title || "",
  ].join(":");
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

function getActiveStop(stops: RouteStop[] = []) {
  const orderedStops = [...stops].sort(
    (a, b) => Number(a.sequence || 0) - Number(b.sequence || 0),
  );

  const deliverableStops = orderedStops.filter(
    (stop) => stop.markerType !== "start" && stop.markerType !== "end",
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

function getStopBackendId(stop?: RouteStop | null) {
  return String(stop?.backendOrderId || stop?.orderId || stop?.id || "");
}

async function updateOrderStatusOnBackend(stop: RouteStop, status: string) {
  const orderId = getStopBackendId(stop);

  if (!orderId) {
    throw new Error("Order id is missing.");
  }

  // Directly call ordersService.editOrder to update the order status
  // The payload includes the order_id and the new status.
  return ordersService.editOrder({
    order_id: orderId,
    status: status,
  });
}

function getMapsNavigationUrl(stop: RouteStop) {
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
        order: item?.order || "auto",
        stopType: item?.stopType || item?.stop_type || item?.type || "delivery",
        notes: item?.notes || item?.note || "",
        status: item?.status || ROUTE_STATUS.PENDING,
      } as RouteStop;
    })
    .filter(Boolean) as RouteStop[];

  return stops.sort((a, b) => a.sequence - b.sequence);
}


async function fetchRouteOrderStops(routeId: string): Promise<RouteStop[]> {
  if (!routeId) return [];

  try {
    const response = await ordersService.fetchOrders();
    const routeOrders = unwrapApiList(response).filter((order) =>
      isOrderForRoute(order, routeId),
    );

    return buildStopsFromBackend(routeOrders);
  } catch {
    return [];
  }
}

async function buildRouteFromBackendResponse(
  response: any,
  routeId = "",
): Promise<{
  route: AppRoute;
  routeTitle: string;
  startTime: string;
  routeMeta: RouteMeta;
  panelMode: PanelMode;
  routeStatus: RouteStatus;
}> {
  const rawRoute = unwrapApiPayload(response);
  
  if (!rawRoute || typeof rawRoute !== "object") {
    throw new Error("Route not found.");
  }

  const routeStatus = normalizeRouteStatus(rawRoute.status || ROUTE_STATUS.PENDING);
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
    "round_trip") as EndMode;

  const startPoint = buildPointFromBackendLocation(
    startRaw,
    "Start location",
    backendCoordinates[0],
  );

  if (!startPoint) {
    throw new Error("Start location coordinates missing in route response.");
  }

  let endPoint: RoutePoint | null = null;

  if (endMode !== "no_end") {
    endPoint = buildPointFromBackendLocation(
      endRaw,
      "End location",
      backendCoordinates[backendCoordinates.length - 1],
    );
  }

  if (!endPoint) {
    endPoint = {
      ...startPoint,
      title: "End location",
      description:
        endMode === "round_trip"
          ? "Return to start location"
          : "No end location selected",
    };
  }

  const routeIdForOrders = String(
    routeId || rawRoute.id || rawRoute._id || rawRoute.routeId || rawRoute.route_id || "",
  );
  const routeStops = await buildStopsFromBackend(
    rawRoute.stops || rawRoute.route_stops || rawRoute.routeStops || [],
  );
  console.log("Fetched route stops from route data:", routeStops);
  const orderStops = await fetchRouteOrderStops(routeIdForOrders);
  const stops = mergeStops(routeStops, orderStops);

  const route: any = {
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
    routeTitle: String(rawRoute.name || rawRoute.routeName || rawRoute.title || "Route"),
    startTime: formatTimeFromDateTime(
      rawRoute.start_datetime || rawRoute.startDateTime || rawRoute.start?.dateTime,
    ),
    routeMeta: {
      distanceLabel: formatDistance(distance),
      durationLabel: formatDuration(duration),
    },
    panelMode: getPanelModeFromStatus(routeStatus, stops.length),
    routeStatus,
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


async function fetchRoutePath(points: RoutePoint[]) {
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
      .join(";");

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    const route = data?.routes?.[0];

    if (!route?.geometry?.coordinates?.length) {
      throw new Error("No route found.");
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

function getOptimizePayload(response: any) {
  const payload = response?.data ?? response;

  return payload?.data ?? payload;
}

function getOptimizedRouteData(response: any) {
  const payload = getOptimizePayload(response);

  return payload?.routes?.[0] || payload?.route || payload;
}

function getOptimizedSteps(response: any) {
  const routeData = getOptimizedRouteData(response);
  const payload = getOptimizePayload(response);

  return routeData?.steps || payload?.steps || [];
}

async function persistRouteSnapshot({
  routeId,
  status,
  route,
  distanceMeters,
  durationSeconds,
}: {
  routeId: string;
  status?: string;
  route: AppRoute;
  distanceMeters?: number;
  durationSeconds?: number;
}) {
  if (!routeId) return;

  const payload: any = {
    route_id: routeId,
  };

  if (status) payload.status = status;
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
      item?.latitude ??
      item?.lat ??
      geometryCoordinates?.[1],
  );
  const longitude = toNumberOrNull(
    properties.longitude ??
      properties.lon ??
      properties.lng ??
      item?.longitude ??
      item?.lon ??
      item?.lng ??
      geometryCoordinates?.[0],
  );

  if (!isValidCoordinate(latitude, longitude)) return null;

  const fullAddress = String(
    properties.fullAddress ||
      properties.full_address ||
      properties.formatted ||
      properties.address ||
      properties.display_name ||
      item?.fullAddress ||
      item?.full_address ||
      item?.address ||
      item?.display_name ||
      fallbackQuery,
  );
  const title = String(
    properties.title ||
      properties.name ||
      properties.address_line1 ||
      item?.title ||
      item?.name ||
      item?.text ||
      fullAddress.split(",")[0] ||
      fallbackQuery,
  );
  const subtitle = String(
    properties.subtitle ||
      properties.address_line2 ||
      properties.description ||
      item?.subtitle ||
      item?.description ||
      fullAddress.replace(title, "").trim().replace(/^,/, "").trim() ||
      "Address suggestion",
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

async function fetchPlaceSuggestions(
  query: string,
): Promise<PlaceSuggestion[]> {
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


function unwrapOrderPayload(response: any) {
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

function buildOrderPayload({
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
    mode: "manual_address",
    address: suggestion.fullAddress,
    selectedFromSuggestion: true,
    details: {
      housenumber: "",
      street: "",
      placeId: suggestion.id,
      addressLine1: suggestion.title,
      addressLine2: suggestion.subtitle,
      city: "",
      district: "",
      state: "",
      country: "",
      countryCode: "",
      postalCode: "",
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    },
  };

  return {
    route_id: routeId,
    sequence,
    stopSequence: sequence,
    location,
    address: suggestion.fullAddress,
    title: suggestion.title,
    description: suggestion.subtitle,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    packages: details.packages,
    order: details.order,
    stopType: details.stopType,
    stop_type: details.stopType,
    notes: details.notes,
    status: ROUTE_STATUS.PENDING,
  };
}

function buildStopFromSavedOrder(savedOrder: any, fallbackStop: RouteStop): RouteStop {
  if (!savedOrder || typeof savedOrder !== "object") return fallbackStop;

  const point =
    buildPointFromBackendLocation(savedOrder, fallbackStop.title || "Stop", fallbackStop) ||
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
      savedOrder.id || savedOrder._id || savedOrder.orderId || savedOrder.order_id || fallbackStop.backendOrderId,
    orderId:
      savedOrder.orderId || savedOrder.order_id || savedOrder.id || savedOrder._id || fallbackStop.orderId,
    sequence: Number(
      savedOrder.sequence || savedOrder.stopSequence || savedOrder.stop_sequence || fallbackStop.sequence,
    ),
    address:
      getAddressFromLocation(savedOrder) ||
      savedOrder.address ||
      fallbackStop.address ||
      point.description,
    packages: Number(
      savedOrder.packages || savedOrder.packageCount || savedOrder.package_count || fallbackStop.packages || 1,
    ),
    order: savedOrder.order || fallbackStop.order || "auto",
    stopType:
      savedOrder.stopType ||
      savedOrder.stop_type ||
      savedOrder.type ||
      fallbackStop.stopType ||
      "delivery",
    notes: savedOrder.notes || savedOrder.note || fallbackStop.notes || "",
    status: savedOrder.status,
  };
}

type MarkerRoutePoint = RoutePoint & {
  markerType?: "start" | "stop" | "end";
  markerLabel?: string;
  markerIcon?: string;
};

type MarkerRouteStop = RouteStop & MarkerRoutePoint;

function getCoordinateKey(point: RoutePoint) {
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

function offsetPointForMarker(point: RoutePoint, index: number, total: number) {
  if (total <= 1) return point;

  const radiusMeters = 16;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((point.latitude * Math.PI) / 180)),
  );
  const longitudeOffset = (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: point.latitude + latitudeOffset,
    longitude: point.longitude + longitudeOffset,
  };
}

function buildMapDisplayRoute(route: AppRoute): AppRoute {
  const markerItems = [
    {
      key: "start",
      markerType: "start" as const,
      markerLabel: "S",
      markerIcon: "⌂",
      point: route.start,
    },
    ...route.stops.map((stop: any) => ({
      key: `stop-${stop.id}`,
      markerType: "stop" as const,
      markerLabel: String(stop.sequence),
      markerIcon: "●",
      point: stop,
    })),
    {
      key: "end",
      markerType: "end" as const,
      markerLabel: "E",
      markerIcon: "⚑",
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
          item.markerType === "stop"
            ? `Stop ${item.markerLabel}: ${item.point.title || "Stop"}`
            : item.markerType === "start"
              ? item.point.title || "Start location"
              : item.point.title || "End location",
      });
    });
  });

  return {
    ...route,
    start: (displayMarkers.get("start") || route.start) as RoutePoint,
    stops: route.stops.map(
      (stop: any) => (displayMarkers.get(`stop-${stop.id}`) || stop) as RouteStop,
    ),
    end: (displayMarkers.get("end") || route.end) as RoutePoint,
    coordinates: route.coordinates?.length ? route.coordinates : getInitialCoordinates(route),
  };
}

export default function RoutePreviewScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const routeId = useMemo(() => getParam(params.id, ""), [params.id]);

  const [route, setRoute] = useState<AppRoute | null>(null);
  const [routeTitle, setRouteTitle] = useState("Route");
  const [previewStartTime, setPreviewStartTime] = useState("");
  const [routeMeta, setRouteMeta] = useState<RouteMeta>({
    distanceLabel: "0 km",
    durationLabel: "0 min",
  });
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [mapType, setMapType] = useState<RouteMapType>("standard");
  const [centerSignal, setCenterSignal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>(
    normalizeRouteStatus(ROUTE_STATUS.PENDING),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaceSuggestion | null>(null);
  const [stopDetails, setStopDetails] = useState<StopDetails>(DEFAULT_STOP_DETAILS);
  const [isUpdatingStopStatus, setIsUpdatingStopStatus] = useState(false);

  const mapRoute = useMemo(() => {
    if (!route) return null;
    return buildMapDisplayRoute(route);
  }, [route]);

  const activeStopInfo = useMemo(() => {
  return getActiveStop(route?.stops || []);
}, [route?.stops]);

  useEffect(() => {
    let mounted = true;

    async function loadRoute() {
      setIsInitialLoading(true);
      setErrorMessage("");

      if (!routeId) {
        setRoute(null);
        setErrorMessage("Route id is missing.");
        setIsInitialLoading(false);
        return;
      }

      try {
        const response = await routesService.getRoute(routeId);
        const result = await buildRouteFromBackendResponse(response, routeId);

        let nextRoute = result.route;
        let nextRouteMeta = result.routeMeta;

        if (
          (isOptimizedStatus(result.routeStatus) || isInTransitStatus(result.routeStatus)) &&
          getRoutePoints(nextRoute).length >= 2 &&
          !hasDetailedRoadPath(nextRoute)
        ) {
          const roadPath = await fetchRoutePath(getRoutePoints(nextRoute));

          nextRoute = {
            ...nextRoute,
            coordinates: roadPath.coordinates,
          };
          nextRouteMeta = {
            distanceLabel: formatDistance(roadPath.distanceMeters),
            durationLabel: formatDuration(roadPath.durationSeconds),
          };
        }

        if (!mounted) return;

        setRoute(nextRoute);
        setRouteTitle(result.routeTitle);
        setPreviewStartTime(result.startTime);
        setRouteMeta(nextRouteMeta);
        setRouteStatus(result.routeStatus);
        setPanelMode(result.panelMode);
        setCenterSignal((prev) => prev + 1);
      } catch (error) {
        if (!mounted) return;

        setRoute({
          start: DEFAULT_POINT,
          end: DEFAULT_POINT,
          stops: [],
          coordinates: [DEFAULT_POINT],
        });
        setRouteTitle("Route");
        setPreviewStartTime("");
        setRouteStatus(normalizeRouteStatus(ROUTE_STATUS.PENDING));
        setPanelMode("empty");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load route details.",
        );
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    }

    loadRoute();

    return () => {
      mounted = false;
    };
  }, [routeId]);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(async () => {
      if (panelMode !== "search") return;

      const data = await fetchPlaceSuggestions(searchText);

      if (mounted) {
        setSuggestions(data);
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchText, panelMode]);

  const handleOpenSearch = () => {
    setSearchText("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setPanelMode("search");
  };

  const handleCloseSearch = () => {
    setSearchText("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setPanelMode(getPanelModeFromStatus(routeStatus, route?.stops?.length || 0));
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setSelectedSuggestion(suggestion);
    setStopDetails(DEFAULT_STOP_DETAILS);
    setPanelMode("details");
  };

  const handleConfirmStopDetails = async () => {
    if (!route || !selectedSuggestion || isAddingStop) return;

    if (!routeId) {
      setErrorMessage("Route id is missing. Unable to add stop.");
      return;
    }

    const nextSequence = route.stops.length + 1;

    const fallbackStop: RouteStop = {
      id: `${Date.now()}-${selectedSuggestion.id}`,
      sequence: nextSequence,
      latitude: selectedSuggestion.latitude,
      longitude: selectedSuggestion.longitude,
      title: selectedSuggestion.title,
      description: selectedSuggestion.subtitle,
      address: selectedSuggestion.fullAddress,
      packages: stopDetails.packages,
      order: stopDetails.order,
      stopType: stopDetails.stopType,
      notes: stopDetails.notes,
      status: ROUTE_STATUS.PENDING,
    };

    setIsAddingStop(true);
    setErrorMessage("");

    try {
      const payload = buildOrderPayload({
        routeId,
        sequence: nextSequence,
        suggestion: selectedSuggestion,
        details: stopDetails,
      });
      const response = await ordersService.addOrder(payload);
      const savedOrder = unwrapOrderPayload(response);
      const newStop = buildStopFromSavedOrder(savedOrder, fallbackStop);

      const nextStops = [...route.stops, newStop].map((stop, index) => ({
        ...stop,
        sequence: index + 1,
      }));

      const nextRoute: AppRoute = {
        ...route,
        stops: nextStops,
        coordinates: getInitialCoordinates({
          ...route,
          stops: nextStops,
        }),
      };

      setRoute(nextRoute);
      setSelectedSuggestion(null);
      setSearchText("");
      setSuggestions([]);
      setStopDetails(DEFAULT_STOP_DETAILS);
      setPanelMode("setup");
      setCenterSignal((prev) => prev + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add stop on backend.",
      );
    } finally {
      setIsAddingStop(false);
    }
  };


  const handleOptimizeRoute = async () => {
  if (!route || isOptimizing) return;

  if (!routeId) {
    setErrorMessage("Route id is missing.");
    return;
  }

  setIsOptimizing(true);
  setErrorMessage("");

  try {
    const response = await routesService.optimizeRoute(routeId);

    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, "Unable to optimize route."));
    }

    const optimizedSteps = getOptimizedSteps(response);
    const routeData = getOptimizedRouteData(response);

    const jobSteps = optimizedSteps
      .filter((step: any) => step.type === "job")
      .sort(
        (a: any, b: any) =>
          Number(a.sequence_no || a.sequenceNo || a.sequence || 0) -
          Number(b.sequence_no || b.sequenceNo || b.sequence || 0),
      );

    const usedStopIds = new Set<string>();
    const optimizedStops: RouteStop[] = [];

    jobSteps.forEach((step: any) => {
      let matchedStop = route.stops.find((stop: any) => {
        const possibleIds = [
          stop.backendOrderId,
          stop.orderId,
          stop.id,
          stop.sequence,
          stop.sequenceNo,
        ]
          .filter(Boolean)
          .map(String);

        return possibleIds.includes(String(step.id || step.order_id || step.orderId));
      });

      if (!matchedStop && Array.isArray(step.location)) {
        const [longitude, latitude] = step.location;

        matchedStop = route.stops.find((stop: any) => {
          const stopKey = String(stop.backendOrderId || stop.orderId || stop.id);

          if (usedStopIds.has(stopKey)) return false;

          return (
            Number(stop.latitude).toFixed(6) === Number(latitude).toFixed(6) &&
            Number(stop.longitude).toFixed(6) === Number(longitude).toFixed(6)
          );
        });
      }

      if (!matchedStop) return;

      const stopKey = String(
        matchedStop.backendOrderId || matchedStop.orderId || matchedStop.id,
      );

      if (usedStopIds.has(stopKey)) return;

      usedStopIds.add(stopKey);
      optimizedStops.push(matchedStop);
    });

    route.stops.forEach((stop: any) => {
      const stopKey = String(stop.backendOrderId || stop.orderId || stop.id);

      if (!usedStopIds.has(stopKey)) {
        optimizedStops.push(stop);
      }
    });

    const finalStops = optimizedStops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
      sequenceNo: index + 1,
      markerLabel: String(index + 1),
    }));

    const optimizedRoute: any = {
      ...route,
      stops: finalStops,
    };

    const path = await fetchRoutePath(getRoutePoints(optimizedRoute));
    const distanceMeters = Number(
      routeData?.distance ||
        getOptimizePayload(response)?.summary?.distance ||
        path.distanceMeters,
    );
    const durationSeconds = Number(
      routeData?.duration ||
        getOptimizePayload(response)?.summary?.duration ||
        path.durationSeconds,
    );
    const nextRoute = {
      ...optimizedRoute,
      coordinates: path.coordinates,
    };

    await persistRouteSnapshot({
      routeId,
      status: ROUTE_STATUS_OPTIMIZED,
      route: nextRoute,
      distanceMeters,
      durationSeconds,
    });

    setRoute(nextRoute);
    setRouteMeta({
      distanceLabel: formatDistance(distanceMeters),
      durationLabel: formatDuration(durationSeconds),
    });
    setRouteStatus(ROUTE_STATUS_OPTIMIZED);
    setPanelMode("confirmed");
    setCenterSignal((prev) => prev + 1);
  } catch (error) {
    setErrorMessage(
      error instanceof Error ? error.message : "Unable to optimize route.",
    );
  } finally {
    setIsOptimizing(false);
  }
};


  const handleToggleMapType = () => {
    setMapType((prev) => (prev === "standard" ? "satellite" : "standard"));
  };

  const handleConfirmRoute = async () => {
  if (!routeId || !route) return;

  try {
    setErrorMessage("");

    const path = await fetchRoutePath(getRoutePoints(route));
    const nextRoute = {
      ...route,
      coordinates: path.coordinates,
    };

    const response = await routesService.updateRoute({
      route_id: routeId,
      status: ROUTE_STATUS_OPTIMIZED
    });

    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, "Unable to confirm route."));
    }

    setRoute(nextRoute);

    setRouteMeta({
      distanceLabel: formatDistance(path.distanceMeters),
      durationLabel: formatDuration(path.durationSeconds),
    });

    setRouteStatus(ROUTE_STATUS_OPTIMIZED);
    setPanelMode("confirmed");
    setCenterSignal((prev) => prev + 1);
  } catch (error) {
    setErrorMessage(
      error instanceof Error
        ? error.message
        : "An error occurred while confirming the route.",
    );
  }
};

const handleStartRoute = async () => {
  if (!routeId || !route || isStartingRoute) return;

  setIsStartingRoute(true);
  setErrorMessage("");

  try {
    const path = await fetchRoutePath(getRoutePoints(route));
    const nextRoute = {
      ...route,
      coordinates: path.coordinates,
    };

    const response = await routesService.updateRoute({
      route_id: routeId,
      status: ROUTE_STATUS_IN_TRANSIT
    });

    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, "Unable to start route."));
    }

    setRoute(nextRoute);
    setRouteMeta({
      distanceLabel: formatDistance(path.distanceMeters),
      durationLabel: formatDuration(path.durationSeconds),
    });

    setRouteStatus(ROUTE_STATUS_IN_TRANSIT);
    setPanelMode("transit");
    setCenterSignal((prev) => prev + 1);
  } catch (error) {
    setErrorMessage(
      error instanceof Error ? error.message : "Unable to start route.",
    );
  } finally {
    setIsStartingRoute(false);
  }
};

const handleNavigateActiveStop = async () => {
  const activeStop = activeStopInfo.stop;

  if (!activeStop) return;

  try {
    await Linking.openURL(getMapsNavigationUrl(activeStop));
  } catch {
    setErrorMessage("Unable to open navigation.");
  }
};

const handleUpdateActiveStopStatus = async (nextStatus: string) => {
  if (!route || isUpdatingStopStatus) return;

  const activeStop = activeStopInfo.stop;

  if (!activeStop) return;

  setIsUpdatingStopStatus(true);
  setErrorMessage("");

  try {
    const response = await updateOrderStatusOnBackend(activeStop, nextStatus);

    if (!isSuccessResponse(response)) {
      throw new Error(
        getResponseErrorMessage(response, "Unable to update order status."),
      );
    }

    const activeStopKey = getStopIdentity(activeStop);

    const nextStops = route.stops.map((stop: any) =>
      getStopIdentity(stop) === activeStopKey
        ? {
            ...stop,
            status: nextStatus,
          }
        : stop,
    );

    const nextRoute = {
      ...route,
      stops: nextStops,
    };

    setRoute(nextRoute);

    const nextActiveStop = getActiveStop(nextStops).stop;

    if (!nextActiveStop) {
      try {
        await routesService.updateRoute({
          route_id: routeId,
          status: ROUTE_STATUS_COMPLETED,
        });

        setRouteStatus(ROUTE_STATUS_COMPLETED);
      } catch {
        // Order status was updated, route completion update failed.
      }
    }

    setPanelMode("transit");
    setCenterSignal((prev) => prev + 1);
  } catch (error) {
    setErrorMessage(
      error instanceof Error ? error.message : "Unable to update order status.",
    );
  } finally {
    setIsUpdatingStopStatus(false);
  }
};

const handleMarkStopDelivered = () => {
  return handleUpdateActiveStopStatus(ORDER_STATUS_DELIVERED);
};

const handleMarkStopFailed = () => {
  return handleUpdateActiveStopStatus(ORDER_STATUS_FAILED);
};

const resolvedPanelMode = useMemo(() => {
  if (isInTransitStatus(routeStatus) || isStatus(routeStatus, ROUTE_STATUS_COMPLETED)) {
    return "transit" as PanelMode;
  }

  return panelMode;
}, [panelMode, routeStatus]);


const handleCreateNewRoute = () => {
  router.push("/setup-locations" as any);
};


  return (
    <GestureHandlerRootView style={styles.root}>
      <MapScreen
        confirmedRoute={mapRoute}
        mapType={mapType}
        centerSignal={centerSignal}
      />

      <Pressable
        style={[
          styles.menuButton,
          {
            top: insets.top + 16,
          },
        ]}
        onPress={() => setIsSidebarOpen(true)}
      >
        <View style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.homeButton,
          {
            top: insets.top + 16,
          },
        ]}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.homeIcon}>🏠</Text>
      </Pressable>

      <View
        style={[
          styles.mapControls,
          {
            top: insets.top + 132,
          },
        ]}
      >
        <Pressable
          style={styles.mapControlButton}
          onPress={handleToggleMapType}
        >
          <Text style={styles.mapControlIcon}>▱</Text>
        </Pressable>

        <Pressable
          style={styles.mapControlButton}
          onPress={() => setCenterSignal((prev) => prev + 1)}
        >
          <Text style={styles.mapControlIcon}>⌖</Text>
        </Pressable>
      </View>

      {isInitialLoading ? (
        <View
          style={[
            styles.loadingCard,
            {
              bottom: Math.max(insets.bottom + 24, 34),
            },
          ]}
        >
          <ActivityIndicator color="#2F76F6" />
          <Text style={styles.loadingText}>Preparing route...</Text>
        </View>
      ) : null}

      {!isInitialLoading && errorMessage ? (
        <View
          style={[
            styles.errorCard,
            {
              bottom: Math.max(insets.bottom + 24, 34),
            },
          ]}
        >
          <Text style={styles.errorTitle}>Unable to load route</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!isInitialLoading && route ? (
<RoutePreviewPanel
  mode={resolvedPanelMode}
  routeName={routeTitle}
  startTime={previewStartTime}
  start={route.start}
  end={route.end}
  stops={route.stops}
  durationLabel={routeMeta.durationLabel}
  distanceLabel={routeMeta.distanceLabel}
  routeStatus={routeStatus}
  activeStop={activeStopInfo?.stop}
  activeStopIndex={activeStopInfo?.index}
  totalActiveStops={activeStopInfo?.total}
  isUpdatingStopStatus={isUpdatingStopStatus}
  searchText={searchText}
  suggestions={suggestions}
  selectedSuggestion={selectedSuggestion}
  stopDetails={stopDetails}
  isAddingStop={isAddingStop}
  isStartingRoute={isStartingRoute}
  onSearchTextChange={setSearchText}
  onOpenSearch={handleOpenSearch}
  onCloseSearch={handleCloseSearch}
  onSelectSuggestion={handleSelectSuggestion}
  onStopDetailsChange={setStopDetails}
  onConfirmStopDetails={handleConfirmStopDetails}
  onOptimizeRoute={handleOptimizeRoute}
  onRefine={() => setPanelMode("setup")}
  onConfirm={handleConfirmRoute}
  onStartRoute={handleStartRoute}
  onNavigateActiveStop={handleNavigateActiveStop}
  onMarkStopDelivered={handleMarkStopDelivered}
  onMarkStopFailed={handleMarkStopFailed}
  onCreateNewRoute={handleCreateNewRoute}
/>
      ) : null}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {isOptimizing ? (
        <View style={styles.optimizingOverlay}>
          <View style={styles.optimizingCard}>
            <Text style={styles.optimizingTitle}>Optimizing route</Text>

            <Text style={styles.optimizingArt}>⌖</Text>

            <Text style={styles.optimizingText}>Analyzing your stops...</Text>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  menuButton: {
    position: "absolute",
    left: 24,
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },

  hamburger: {
    width: 24,
    gap: 5,
  },

  hamburgerBar: {
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#111827",
  },

  homeButton: {
    position: "absolute",
    left: 94,
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  homeIcon: {
    fontSize: 24,
  },

  mapControls: {
    position: "absolute",
    right: 24,
    zIndex: 80,
    gap: 14,
  },

  mapControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
  },

  mapControlIcon: {
    fontSize: 26,
    fontWeight: "600",
    color: "#2F76F6",
  },

  loadingCard: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 100,
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#475569",
  },

  errorCard: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 100,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "400",
    color: "#64748B",
  },

  optimizingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  optimizingCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 28,
    alignItems: "center",
  },

  optimizingTitle: {
    fontSize: 28,
    fontWeight: "500",
    color: "#111827",
  },

  optimizingArt: {
    marginTop: 34,
    fontSize: 82,
    color: "#2F76F6",
  },

  optimizingText: {
    marginTop: 34,
    fontSize: 17,
    fontWeight: "400",
    color: "#111827",
  },

  progressTrack: {
    marginTop: 22,
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "#93C5FD",
    overflow: "hidden",
  },

  progressFill: {
    width: "48%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2F76F6",
  },
});
