import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
    Marker,
    Polyline,
    PROVIDER_GOOGLE,
    Region,
} from 'react-native-maps';
import { useAuth } from '../../app/_layout';
import { restoreAuthToken } from '../../services/api';
import { isTokenValid } from '../../services/auth/jwtUtils';

export type RouteMapType = 'standard' | 'satellite' | 'hybrid';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
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

const FALLBACK_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
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
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

function offsetMarkerCoordinate(point: RoutePoint, index: number, total: number): RoutePoint {
  if (total <= 1) return point;

  const radiusMeters = 18;
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeScale = Math.max(
    0.01,
    Math.abs(Math.cos((point.latitude * Math.PI) / 180)),
  );
  const longitudeOffset =
    (Math.cos(angle) * radiusMeters) / (111_320 * longitudeScale);

  return {
    ...point,
    latitude: point.latitude + latitudeOffset,
    longitude: point.longitude + longitudeOffset,
  };
}

function buildDisplayMarkers(route: ConfirmedRoute): DisplayMarker[] {
  const markerItems = [
    {
      key: 'start',
      type: 'start' as const,
      point: route.start,
      label: route.start.markerLabel || 'S',
      icon: route.start.markerIcon || '⌂',
    },
    ...(route.stops || []).map(stop => ({
      key: `stop-${stop.id}`,
      type: 'stop' as const,
      point: stop,
      label: stop.markerLabel || String(stop.sequence),
      icon: stop.markerIcon || (stop.stopType === 'pickup' ? '↑' : '●'),
    })),
    {
      key: 'end',
      type: 'end' as const,
      point: route.end,
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

function getMarkerTitle(marker: DisplayMarker) {
  if (marker.point.title) return marker.point.title;
  if (marker.type === 'start') return 'Start location';
  if (marker.type === 'end') return 'End location';
  return `Stop ${marker.label}`;
}

function renderMarker(marker: DisplayMarker) {
  if (marker.type === 'stop') {
    return (
      <View style={styles.stopMarkerWrap}>
        <View style={styles.stopMarkerIconBubble}>
          <Text style={styles.stopMarkerIcon}>{marker.icon}</Text>
        </View>
        <View style={styles.stopMarkerLabelBubble}>
          <Text style={styles.stopMarkerText}>{marker.label}</Text>
        </View>
      </View>
    );
  }

  const isStart = marker.type === 'start';

  return (
    <View style={isStart ? styles.startMarker : styles.endMarker}>
      <Text style={isStart ? styles.startMarkerIcon : styles.endMarkerIcon}>
        {marker.icon}
      </Text>
      <Text style={isStart ? styles.startMarkerLabel : styles.endMarkerLabel}>
        {marker.label}
      </Text>
    </View>
  );
}

export default function MapScreen({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
  isNavigating = false,
  userLocation = null,
}: MapScreenProps) {
  const mapRef = useRef<MapView | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  // Check for valid JWT token
  useEffect(() => {
    const validateToken = async () => {
      const token = await restoreAuthToken();
      if (!isTokenValid(token)) {
        // Token is invalid or missing, redirect to login
        console.log('Invalid or missing token, redirecting to login');
        logout();
        router.replace('/login');
      }
    };

    validateToken();
  }, [router, logout]);

  const routePoints = useMemo(() => {
    if (!confirmedRoute) return [];

    return [
      confirmedRoute.start,
      ...(confirmedRoute.stops || []),
      confirmedRoute.end,
    ];
  }, [confirmedRoute]);

  const routeCoordinates = useMemo(() => {
    if (!confirmedRoute) return [];
    if (confirmedRoute.coordinates?.length) return confirmedRoute.coordinates;
    return routePoints;
  }, [confirmedRoute, routePoints]);

  const displayMarkers = useMemo(() => {
    if (!confirmedRoute) return [];
    return buildDisplayMarkers(confirmedRoute);
  }, [confirmedRoute]);

  const fitRouteOnMap = useCallback(() => {
    if (!confirmedRoute || !routeCoordinates.length) return;

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        animated: true,
        edgePadding: {
          top: 120,
          right: 70,
          bottom: 360,
          left: 70,
        },
      });
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

      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        700
      );
    } catch (error) {
      console.log('Location error:', error);
    }
  }, []);

  useEffect(() => {
    if (confirmedRoute) {
      fitRouteOnMap();
    } else {
      moveToCurrentLocation();
    }
  }, [confirmedRoute, fitRouteOnMap, moveToCurrentLocation]);

  useEffect(() => {
    if (isNavigating && userLocation) {
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          pitch: 45,
          heading: userLocation.heading ?? 0,
          zoom: 18,
        },
        { duration: 800 }
      );
    }
  }, [isNavigating, userLocation]);

  useEffect(() => {
    if (centerSignal > 0) {
      if (isNavigating && userLocation) {
        mapRef.current?.animateCamera(
          {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            pitch: 45,
            heading: userLocation.heading ?? 0,
            zoom: 18,
          },
          { duration: 800 }
        );
      } else if (confirmedRoute) {
        fitRouteOnMap();
      } else {
        moveToCurrentLocation();
      }
    }
  }, [centerSignal, confirmedRoute, fitRouteOnMap, moveToCurrentLocation, isNavigating, userLocation]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={FALLBACK_REGION}
        mapType={mapType}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled
      >
        {confirmedRoute ? (
          <>
            {routeCoordinates.length > 1 ? (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={6}
                strokeColor="#2F76F6"
                lineCap="round"
                lineJoin="round"
              />
            ) : null}

            {displayMarkers.map(marker => (
              <Marker
                key={marker.key}
                coordinate={marker.coordinate}
                title={getMarkerTitle(marker)}
                description={marker.point.description}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                {renderMarker(marker)}
              </Marker>
            ))}
          </>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  stopMarkerIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stopMarkerIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
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
});