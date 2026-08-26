import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type MapType,
} from 'react-native-maps';
import { getActiveRouteCoordinates } from '../../utils/routePolyline';
import type {
  ConfirmedRoute,
  RouteMapType,
  RoutePoint,
  RouteStop,
} from './RouteMap.native';

type GoogleRouteMapProps = {
  mapType?: RouteMapType;
  centerSignal?: number;
  confirmedRoute?: ConfirmedRoute | null;
  isNavigating?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
  onUnavailable: () => void;
};

type DisplayMarker = {
  key: string;
  type: 'start' | 'stop' | 'end';
  point: RoutePoint | RouteStop;
  label: string;
};

const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const isValidPoint = (point: RoutePoint) =>
  Number.isFinite(Number(point?.latitude)) &&
  Number.isFinite(Number(point?.longitude));

const calculateBearing = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitude1Radians = toRadians(latitude1);
  const latitude2Radians = toRadians(latitude2);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const y = Math.sin(longitudeDelta) * Math.cos(latitude2Radians);
  const x =
    Math.cos(latitude1Radians) * Math.sin(latitude2Radians) -
    Math.sin(latitude1Radians) * Math.cos(latitude2Radians) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const getEffectiveHeading = (
  userLocation: GoogleRouteMapProps['userLocation'],
  coordinates: RoutePoint[],
) => {
  if (!userLocation) return 0;
  if (Number.isFinite(userLocation.heading) && Number(userLocation.heading) >= 0) {
    return Number(userLocation.heading);
  }
  if (coordinates.length < 2) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  coordinates.forEach((point, index) => {
    const distance =
      (Number(point.latitude) - userLocation.latitude) ** 2 +
      (Number(point.longitude) - userLocation.longitude) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  const target = coordinates[Math.min(closestIndex + 2, coordinates.length - 1)];
  return target
    ? calculateBearing(
        userLocation.latitude,
        userLocation.longitude,
        Number(target.latitude),
        Number(target.longitude),
      )
    : 0;
};

export default function GoogleRouteMap({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
  isNavigating = false,
  userLocation = null,
  onUnavailable,
}: GoogleRouteMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const routePoints = useMemo<RoutePoint[]>(() => {
    if (!confirmedRoute) return [];
    return [confirmedRoute.start, ...(confirmedRoute.stops || []), confirmedRoute.end]
      .filter(isValidPoint)
      .map(point => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      }));
  }, [confirmedRoute]);

  const routeCoordinates = useMemo<RoutePoint[]>(() => {
    const coordinates = confirmedRoute?.coordinates?.length
      ? confirmedRoute.coordinates
      : routePoints;
    return coordinates.filter(isValidPoint).map(point => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }));
  }, [confirmedRoute, routePoints]);

  const isOptimized = Boolean(
    confirmedRoute &&
      confirmedRoute.coordinates &&
      confirmedRoute.coordinates.length > 2 + (confirmedRoute.stops?.length || 0),
  );

  const displayMarkers = useMemo<DisplayMarker[]>(() => {
    if (!confirmedRoute) return [];
    return [
      { key: 'start', type: 'start', point: confirmedRoute.start, label: 'S' },
      ...(confirmedRoute.stops || []).map(stop => ({
        key: `stop-${stop.id}`,
        type: 'stop' as const,
        point: stop,
        label: stop.markerLabel || String(stop.sequence),
      })),
      { key: 'end', type: 'end', point: confirmedRoute.end, label: 'E' },
    ].filter(marker => isValidPoint(marker.point)) as DisplayMarker[];
  }, [confirmedRoute]);

  const effectiveHeading = useMemo(
    () => getEffectiveHeading(userLocation, routeCoordinates),
    [routeCoordinates, userLocation],
  );

  const activeRouteCoordinates = useMemo(
    () => getActiveRouteCoordinates(routeCoordinates, userLocation, isNavigating),
    [isNavigating, routeCoordinates, userLocation],
  );

  const fitRoute = useCallback(() => {
    if (!mapReady || routeCoordinates.length === 0) return;
    mapRef.current?.fitToCoordinates(routeCoordinates, {
      edgePadding: { top: 70, right: 70, bottom: 320, left: 70 },
      animated: true,
    });
  }, [mapReady, routeCoordinates]);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      setHasLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          zoom: 14,
        },
        { duration: 700 },
      );
    } catch (error) {
      console.warn('Unable to center Google map on current location:', error);
    }
  }, []);

  useEffect(() => {
    readyTimeoutRef.current = setTimeout(onUnavailable, 10000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    };
  }, [onUnavailable]);

  useEffect(() => {
    if (!mapReady) return;
    if (confirmedRoute) fitRoute();
    else moveToCurrentLocation();
  }, [confirmedRoute, fitRoute, mapReady, moveToCurrentLocation]);

  useEffect(() => {
    if (!mapReady || centerSignal <= 0) return;
    if (isNavigating && userLocation) {
      mapRef.current?.animateCamera(
        {
          center: userLocation,
          heading: effectiveHeading,
          pitch: 58,
          zoom: 18,
        },
        { duration: 800 },
      );
    } else if (confirmedRoute) fitRoute();
    else moveToCurrentLocation();
  }, [centerSignal, confirmedRoute, effectiveHeading, fitRoute, isNavigating, mapReady, moveToCurrentLocation, userLocation]);

  useEffect(() => {
    if (!mapReady || !isNavigating || !userLocation) return;
    mapRef.current?.animateCamera(
      {
        center: userLocation,
        heading: effectiveHeading,
        pitch: 58,
        zoom: 18,
      },
      { duration: 800 },
    );
  }, [effectiveHeading, isNavigating, mapReady, userLocation]);

  const nativeMapType: MapType =
    mapType === 'satellite' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'standard';

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      mapType={nativeMapType}
      showsUserLocation={hasLocationPermission && !userLocation}
      showsMyLocationButton={false}
      loadingEnabled
      onMapReady={() => {
        if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
        setMapReady(true);
      }}
    >
      {isOptimized && activeRouteCoordinates.length > 1 ? (
        <Polyline
          coordinates={activeRouteCoordinates}
          strokeColor="#2F76F6"
          strokeWidth={6}
        />
      ) : null}

      {displayMarkers.map(marker => (
        <Marker
          key={marker.key}
          coordinate={{
            latitude: Number(marker.point.latitude),
            longitude: Number(marker.point.longitude),
          }}
          title={marker.point.title}
          description={marker.point.description || marker.point.address}
          pinColor={
            marker.type === 'start' ? '#2F76F6' : marker.type === 'end' ? '#22C55E' : '#EA4335'
          }
        >
          <View style={styles.marker}>
            <Text style={styles.markerText}>{marker.label}</Text>
          </View>
        </Marker>
      ))}

      {userLocation ? (
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} flat>
          <View style={styles.userMarker}>
            <MaterialCommunityIcons
              name="navigation"
              size={20}
              color="#FFFFFF"
              style={{ transform: [{ rotate: `${effectiveHeading}deg` }] }}
            />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#2F76F6',
    borderWidth: 2,
  },
  markerText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  userMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
});
