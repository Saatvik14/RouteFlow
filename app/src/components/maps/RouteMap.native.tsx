import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Map, Camera, CameraRef, Marker, UserLocation, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useAuth } from '../../app/_layout';
import { restoreAuthToken } from '../../services/api';
import { isTokenValid } from '../../services/auth/jwtUtils';
import { getActiveRouteCoordinates } from '../../utils/routePolyline';
import GoogleRouteMap from './RouteMapGoogle.native';

export type RouteMapType = 'standard' | 'satellite' | 'hybrid';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  address?: string;
  fullAddress?: string;
  markerType?: 'start' | 'stop' | 'end';
  markerLabel?: string;
  markerIcon?: string;
};

export type RouteStop = RoutePoint & {
  id: string;
  sequence: number;
  address?: string;
  notes?: string;
  packages?: number;
  order?: 'first' | 'auto' | 'last';
  stopType?: 'delivery' | 'pickup';
  status?: 'pending' | 'added';
};

export type ConfirmedRoute = {
  start: RoutePoint;
  end: RoutePoint;
  stops?: RouteStop[];
  coordinates?: RoutePoint[];
};

type MapScreenProps = {
  mapType?: RouteMapType;
  centerSignal?: number;
  confirmedRoute?: ConfirmedRoute | null;
  isNavigating?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
};

const DEFAULT_CENTER_COORDINATE: [number, number] = [77.209, 28.6139]; // Delhi [lng, lat]

const GOOGLE_MAPS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED || '').toLowerCase(),
) && Boolean(
  Platform.OS === 'ios'
    ? Constants.expoConfig?.extra?.googleMapsIosConfigured
    : Constants.expoConfig?.extra?.googleMapsAndroidConfigured,
);
const TOMTOM_MAPS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.EXPO_PUBLIC_TOMTOM_MAPS_ENABLED || '').toLowerCase(),
);
const TOMTOM_MAPS_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_MAPS_API_KEY || '';

// Keyless final fallback. Public OSM tiles are suitable for light fallback usage.
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const TOMTOM_STYLE = {
  version: 8 as const,
  sources: {
    tomtom: {
      type: 'raster' as const,
      tiles: [
        `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${encodeURIComponent(TOMTOM_MAPS_API_KEY)}`,
      ],
      tileSize: 256,
      attribution: '© TomTom',
    },
  },
  layers: [
    {
      id: 'tomtom',
      type: 'raster' as const,
      source: 'tomtom',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

type DisplayMarker = {
  key: string;
  type: 'start' | 'stop' | 'end';
  point: RoutePoint | RouteStop;
  coordinate: RoutePoint;
  label: string;
  icon: string;
};

function getCoordinateKey(point: RoutePoint) {
  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return '0.0,0.0';
  }
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function offsetMarkerCoordinate(point: RoutePoint, index: number, total: number): RoutePoint {
  if (total <= 1) return point;

  const lat = Number(point.latitude);
  const lon = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return point;
  }

  const radiusMeters = 18;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((lat * Math.PI) / 180)),
  );
  const longitudeOffset =
    (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: lat + latitudeOffset,
    longitude: lon + longitudeOffset,
  };
}

function buildDisplayMarkers(route: ConfirmedRoute): DisplayMarker[] {
  const markerItems = [
    {
      key: 'start',
      type: 'start' as const,
      point: {
        ...route.start,
        latitude: Number(route.start.latitude),
        longitude: Number(route.start.longitude),
      },
      label: route.start.markerLabel || 'S',
      icon: route.start.markerIcon || '⌂',
    },
    ...(route.stops || []).map(stop => ({
      key: `stop-${stop.id}`,
      type: 'stop' as const,
      point: {
        ...stop,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      },
      label: stop.markerLabel || String(stop.sequence),
      icon: stop.markerIcon || (stop.stopType === 'pickup' ? '↑' : '●'),
    })),
    {
      key: 'end',
      type: 'end' as const,
      point: {
        ...route.end,
        latitude: Number(route.end.latitude),
        longitude: Number(route.end.longitude),
      },
      label: route.end.markerLabel || 'E',
      icon: route.end.markerIcon || '⚑',
    },
  ];

  const grouped = markerItems.reduce<Record<string, typeof markerItems>>((acc, item) => {
    const key = getCoordinateKey(item.point);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.values(grouped).flatMap(items =>
    items.map((item, index) => ({
      ...item,
      coordinate: offsetMarkerCoordinate(item.point, index, items.length),
    })),
  );
}

function renderMarker(marker: DisplayMarker, isOptimized: boolean) {
  if (marker.type === 'stop') {
    return (
      <View style={styles.stopMarkerWrap}>
        <View style={styles.stopMarkerPin}>
          <View style={styles.stopMarkerCircle}>
            <View style={styles.stopMarkerDot} />
          </View>
          <View style={styles.stopMarkerTriangle} />
        </View>
        {isOptimized && (
          <View style={styles.stopMarkerLabelBubble}>
            <Text style={styles.stopMarkerText}>{marker.label}</Text>
          </View>
        )}
      </View>
    );
  }

  const isStart = marker.type === 'start';

  return (
    <View style={isStart ? styles.startMarker : styles.endMarker}>
      <Text style={isStart ? styles.startMarkerIcon : styles.endMarkerIcon}>
        {marker.icon}
      </Text>
      {isOptimized && (
        <Text style={isStart ? styles.startMarkerLabel : styles.endMarkerLabel}>
          {marker.label}
        </Text>
      )}
    </View>
  );
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

function calculateRouteBearing(
  userLat: number,
  userLng: number,
  userHeading: number | null | undefined,
  coordinates?: { latitude: number; longitude: number }[]
): number {
  if (typeof userHeading === 'number' && Number.isFinite(userHeading) && userHeading > 0) {
    return userHeading;
  }

  if (!coordinates || coordinates.length < 2) return userHeading || 0;

  let minDist = Infinity;
  let targetIndex = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const pt = coordinates[i];
    if (!pt) continue;
    const dist = (pt.latitude - userLat) ** 2 + (pt.longitude - userLng) ** 2;
    if (dist < minDist) {
      minDist = dist;
      targetIndex = i;
    }
  }

  const lookAheadIndex = Math.min(targetIndex + 2, coordinates.length - 1);
  const nextTarget = coordinates[lookAheadIndex];

  if (!nextTarget || (nextTarget.latitude === userLat && nextTarget.longitude === userLng)) {
    return userHeading || 0;
  }

  return calculateBearing(userLat, userLng, Number(nextTarget.latitude), Number(nextTarget.longitude));
}

function MapLibreMapScreen({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
  isNavigating = false,
  userLocation = null,
}: MapScreenProps) {
  const cameraRef = useRef<CameraRef | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isTokenChecked, setIsTokenChecked] = useState(false);
  const [tomTomUnavailable, setTomTomUnavailable] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  // Validate JWT session token
  useEffect(() => {
    const validateToken = async () => {
      const token = await restoreAuthToken();
      if (!isTokenValid(token)) {
        console.log('Invalid token, redirecting to login');
        logout();
        router.replace('/login');
      } else {
        setIsTokenChecked(true);
      }
    };

    validateToken();
  }, [router, logout]);

  const routePoints = useMemo(() => {
    if (!confirmedRoute) return [];
    const points = [
      confirmedRoute.start,
      ...(confirmedRoute.stops || []),
      confirmedRoute.end,
    ];
    return points.map(p => ({
      ...p,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }));
  }, [confirmedRoute]);

  const routeCoordinates = useMemo(() => {
    if (!confirmedRoute) return [];
    const coords = confirmedRoute.coordinates?.length ? confirmedRoute.coordinates : routePoints;
    return coords.map(c => ({
      ...c,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    }));
  }, [confirmedRoute, routePoints]);

  const isOptimized = useMemo(() => {
    if (!confirmedRoute) return false;
    const pointsCount = 2 + (confirmedRoute.stops?.length || 0);
    return Boolean(confirmedRoute.coordinates && confirmedRoute.coordinates.length > pointsCount);
  }, [confirmedRoute]);

  const displayMarkers = useMemo(() => {
    if (!confirmedRoute) return [];
    return buildDisplayMarkers(confirmedRoute);
  }, [confirmedRoute]);

  const fitRouteOnMap = useCallback(() => {
    if (!confirmedRoute || !routeCoordinates.length) return;

    const lats = routeCoordinates.map(c => c.latitude);
    const lngs = routeCoordinates.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    setTimeout(() => {
      cameraRef.current?.fitBounds(
        [minLng, minLat, maxLng, maxLat],
        {
          padding: { top: 70, right: 70, bottom: 320, left: 70 },
          duration: 800,
        }
      );
    }, 450);
  }, [confirmedRoute, routeCoordinates]);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setHasLocationPermission(false);
        return;
      }

      setHasLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      cameraRef.current?.setStop({
        center: [location.coords.longitude, location.coords.latitude],
        zoom: 14,
        duration: 700,
      });
    } catch (error) {
      console.log('Location error:', error);
    }
  }, []);

  const effectiveHeading = useMemo(() => {
    if (!userLocation) return 0;
    return calculateRouteBearing(
      userLocation.latitude,
      userLocation.longitude,
      userLocation.heading,
      routeCoordinates
    );
  }, [userLocation, routeCoordinates]);

  useEffect(() => {
    if (!isTokenChecked) return;
    if (confirmedRoute) {
      fitRouteOnMap();
    } else {
      moveToCurrentLocation();
    }
  }, [isTokenChecked, confirmedRoute, fitRouteOnMap, moveToCurrentLocation]);

  useEffect(() => {
    if (isNavigating && userLocation) {
      cameraRef.current?.setStop({
        center: [userLocation.longitude, userLocation.latitude],
        pitch: 58,
        bearing: effectiveHeading,
        zoom: 17.8,
        padding: { bottom: 220, top: 100, left: 0, right: 0 },
        duration: 900,
      });
    }
  }, [isNavigating, userLocation, effectiveHeading]);

  useEffect(() => {
    if (centerSignal > 0) {
      if (isNavigating && userLocation) {
        cameraRef.current?.setStop({
          center: [userLocation.longitude, userLocation.latitude],
          pitch: 58,
          bearing: effectiveHeading,
          zoom: 17.8,
          padding: { bottom: 220, top: 100, left: 0, right: 0 },
          duration: 900,
        });
      } else if (confirmedRoute) {
        fitRouteOnMap();
      } else {
        moveToCurrentLocation();
      }
    }
  }, [centerSignal, confirmedRoute, fitRouteOnMap, moveToCurrentLocation, isNavigating, userLocation, effectiveHeading]);

  const activeRouteCoordinates = useMemo(() => {
    return getActiveRouteCoordinates(routeCoordinates, userLocation, isNavigating);
  }, [routeCoordinates, userLocation, isNavigating]);

  const polylineGeoJSON = useMemo(() => {
    if (activeRouteCoordinates.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: activeRouteCoordinates.map(c => [c.longitude, c.latitude]),
      },
    };
  }, [activeRouteCoordinates]);

  if (!isTokenChecked) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={
          TOMTOM_MAPS_ENABLED && TOMTOM_MAPS_API_KEY && !tomTomUnavailable
            ? TOMTOM_STYLE
            : OSM_STYLE
        }
        logo={false}
        attribution={false}
        onDidFailLoadingMap={() => setTomTomUnavailable(true)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: DEFAULT_CENTER_COORDINATE,
            zoom: 10,
          }}
          maxZoom={18}
        />

        {userLocation ? (
          <Marker
            key="user-nav-puck-marker"
            id="user-nav-puck-marker"
            lngLat={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.navPuckContainer}>
              <View style={styles.navPuckHalo} />
              <View
                style={[
                  styles.navPuckCircle,
                  { transform: [{ rotate: `${effectiveHeading}deg` }] },
                ]}
              >
                <MaterialCommunityIcons name="navigation" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        ) : hasLocationPermission ? (
          <UserLocation />
        ) : null}

        {confirmedRoute && isOptimized && polylineGeoJSON && (
          <GeoJSONSource id="routePath" data={polylineGeoJSON}>
            <Layer
              id="routeLine"
              type="line"
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#2F76F6',
                'line-width': 6,
              }}
            />
          </GeoJSONSource>
        )}

        {confirmedRoute && displayMarkers.map(marker => (
          <Marker
            key={marker.key}
            id={marker.key}
            lngLat={[Number(marker.coordinate.longitude), Number(marker.coordinate.latitude)]}
          >
            <View style={styles.annotationContainer}>
              {renderMarker(marker, isOptimized)}
            </View>
          </Marker>
        ))}
      </Map>
    </View>
  );
}

export default function MapScreen(props: MapScreenProps) {
  const [useFallbackMap, setUseFallbackMap] = useState(!GOOGLE_MAPS_ENABLED);
  const handleGoogleUnavailable = useCallback(() => setUseFallbackMap(true), []);

  if (!useFallbackMap) {
    return <GoogleRouteMap {...props} onUnavailable={handleGoogleUnavailable} />;
  }

  return <MapLibreMapScreen {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  annotationContainer: {
    width: 'auto',
    height: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  startMarker: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  endMarker: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  startMarkerIcon: {
    fontSize: 13,
    lineHeight: 15,
    color: '#2F76F6',
  },
  endMarkerIcon: {
    fontSize: 13,
    lineHeight: 15,
    color: '#22C55E',
  },
  startMarkerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2F76F6',
    lineHeight: 13,
  },
  endMarkerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22C55E',
    lineHeight: 13,
  },
  stopMarkerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  stopMarkerPin: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
  },
  stopMarkerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EA4335',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stopMarkerTriangle: {
    width: 12,
    height: 12,
    backgroundColor: '#EA4335',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    zIndex: 1,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  stopMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B31412',
  },
  stopMarkerLabelBubble: {
    minWidth: 30,
    height: 28,
    marginLeft: -7,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 9,
    paddingRight: 9,
  },
  stopMarkerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navPuckContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  navPuckHalo: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  navPuckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
