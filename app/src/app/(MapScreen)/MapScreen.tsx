import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

export type RouteMapType = 'standard' | 'satellite' | 'hybrid';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
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
};

const FALLBACK_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export default function MapScreen({
  mapType = 'standard',
  centerSignal = 0,
  confirmedRoute = null,
}: MapScreenProps) {
  const mapRef = useRef<MapView | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

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
    if (centerSignal > 0) {
      if (confirmedRoute) fitRouteOnMap();
      else moveToCurrentLocation();
    }
  }, [centerSignal, confirmedRoute, fitRouteOnMap, moveToCurrentLocation]);

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

            <Marker
              coordinate={confirmedRoute.start}
              title={confirmedRoute.start.title || 'Start location'}
              description={confirmedRoute.start.description}
            >
              <View style={styles.startMarker}>
                <Text style={styles.markerIcon}>⌂</Text>
              </View>
            </Marker>

            {(confirmedRoute.stops || []).map(stop => (
              <Marker
                key={stop.id}
                coordinate={stop}
                title={stop.title}
                description={stop.description}
              >
                <View style={styles.stopMarker}>
                  <Text style={styles.stopMarkerText}>{stop.sequence}</Text>
                </View>
              </Marker>
            ))}

            <Marker
              coordinate={confirmedRoute.end}
              title={confirmedRoute.end.title || 'End location'}
              description={confirmedRoute.end.description}
            >
              <View style={styles.endMarker}>
                <Text style={styles.markerIcon}>⚑</Text>
              </View>
            </Marker>
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
    ...StyleSheet.absoluteFill,
  },
  startMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    fontSize: 16,
    color: '#2F76F6',
  },
  stopMarker: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stopMarkerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});