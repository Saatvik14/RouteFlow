import { routesService } from "@/services/api/routes";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoutePreviewPanel } from "@/components/route-preview-panel";
import MapScreen, {
  type ConfirmedRoute,
  type RouteMapType,
  type RoutePoint,
} from "../(MapScreen)/MapScreen";

type PanelMode = "empty" | "search" | "details" | "setup" | "confirmed";

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
  address?: string;
  notes?: string;
  packages?: number;
  order?: "first" | "auto" | "last";
  stopType?: "delivery" | "pickup";
  status?: "pending" | "added";
};

type AppRoute = ConfirmedRoute & {
  stops: RouteStop[];
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

async function buildStopsFromBackend(rawStops: any[]): Promise<RouteStop[]> {
  if (!Array.isArray(rawStops)) return [];

  const stops = rawStops
    .map((item, index) => {
      const point = buildPointFromBackendLocation(item, `Stop ${index + 1}`);

      if (!point) return null;

      return {
        ...point,
        id: String(
          item?.id || item?._id || item?.place_id || `${Date.now()}-${index}`,
        ),
        sequence: Number(item?.sequence || index + 1),
        address: getAddressFromLocation(item) || point.description,
        packages: Number(item?.packages || 1),
        order: item?.order || "auto",
        stopType: item?.stopType || item?.stop_type || "delivery",
        notes: item?.notes || "",
        status: item?.status || "added",
      } as RouteStop;
    })
    .filter(Boolean) as RouteStop[];

  return stops.sort((a, b) => a.sequence - b.sequence);
}

async function buildRouteFromBackendResponse(response: any): Promise<{
  route: AppRoute;
  routeTitle: string;
  startTime: string;
  routeMeta: RouteMeta;
  panelMode: PanelMode;
}> {
  const rawRoute = unwrapApiPayload(response);
  
  if (!rawRoute || typeof rawRoute !== "object") {
    throw new Error("Route not found.");
  }

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

  const stops = await buildStopsFromBackend(
    rawRoute.stops || rawRoute.route_stops || rawRoute.routeStops || [],
  );

  const route: AppRoute = {
    start: startPoint,
    end: endPoint,
    stops,
    coordinates: [],
  };

  const routeCoordinates = backendCoordinates.length
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
    panelMode:
      routeCoordinates.length > stops.length + 2
        ? "confirmed"
        : stops.length
          ? "setup"
          : "empty",
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

export default function RoutePreviewScreen() {
  const router = useRouter();
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
  const [errorMessage, setErrorMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaceSuggestion | null>(null);
  const [stopDetails, setStopDetails] = useState<StopDetails>({
    packages: 1,
    order: "auto",
    stopType: "delivery",
    notes: "",
  });

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
        const result = await buildRouteFromBackendResponse(response);

        if (!mounted) return;

        setRoute(result.route);
        setRouteTitle(result.routeTitle);
        setPreviewStartTime(result.startTime);
        setRouteMeta(result.routeMeta);
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
    setPanelMode(route?.stops?.length ? "setup" : "empty");
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setSelectedSuggestion(suggestion);
    setStopDetails({
      packages: 1,
      order: "auto",
      stopType: "delivery",
      notes: "",
    });
    setPanelMode("details");
  };

  const handleConfirmStopDetails = () => {
    if (!route || !selectedSuggestion) return;

    const nextSequence = route.stops.length + 1;

    const newStop: RouteStop = {
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
      status: "added",
    };

    const nextStops = [...route.stops, newStop];

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
    setPanelMode("setup");
    setCenterSignal((prev) => prev + 1);
  };

  const handleOptimizeRoute = async () => {
    if (!route) return;

    setIsOptimizing(true);

    const points = getRoutePoints(route);
    const path = await fetchRoutePath(points);

    setRoute({
      ...route,
      coordinates: path.coordinates,
    });

    setRouteMeta({
      distanceLabel: formatDistance(path.distanceMeters),
      durationLabel: formatDuration(path.durationSeconds),
    });

    setTimeout(() => {
      setIsOptimizing(false);
      setPanelMode("confirmed");
      setCenterSignal((prev) => prev + 1);
    }, 900);
  };

  const handleToggleMapType = () => {
    setMapType((prev) => (prev === "standard" ? "satellite" : "standard"));
  };

  const handleConfirmRoute = () => {
    router.replace("/" as never);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <MapScreen
        confirmedRoute={route}
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
        onPress={() => router.back()}
      >
        <View style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </View>
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
          mode={panelMode}
          routeName={routeTitle}
          startTime={previewStartTime}
          start={route.start}
          end={route.end}
          stops={route.stops}
          durationLabel={routeMeta.durationLabel}
          distanceLabel={routeMeta.distanceLabel}
          searchText={searchText}
          suggestions={suggestions}
          selectedSuggestion={selectedSuggestion}
          stopDetails={stopDetails}
          onSearchTextChange={setSearchText}
          onOpenSearch={handleOpenSearch}
          onCloseSearch={handleCloseSearch}
          onSelectSuggestion={handleSelectSuggestion}
          onStopDetailsChange={setStopDetails}
          onConfirmStopDetails={handleConfirmStopDetails}
          onOptimizeRoute={handleOptimizeRoute}
          onRefine={() => setPanelMode("setup")}
          onConfirm={handleConfirmRoute}
        />
      ) : null}

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
