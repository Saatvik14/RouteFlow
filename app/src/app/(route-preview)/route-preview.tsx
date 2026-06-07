import { routesService } from '@/services/api/routes';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoutePreviewPanel } from '@/components/route-preview-panel';
import MapScreen, {
  type ConfirmedRoute,
  type RouteMapType,
  type RoutePoint,
} from '../(MapScreen)/MapScreen';

type EndMode = 'round_trip' | 'other_address' | 'no_end';

type PanelMode = 'empty' | 'search' | 'details' | 'setup' | 'confirmed';

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
  order: 'first' | 'auto' | 'last';
  stopType: 'delivery' | 'pickup';
  notes: string;
};

type RouteStop = RoutePoint & {
  id: string;
  sequence: number;
  address?: string;
  notes?: string;
  packages?: number;
  order?: 'first' | 'auto' | 'last';
  stopType?: 'delivery' | 'pickup';
  status?: 'pending' | 'added';
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
  title: 'Delhi',
  description: 'Delhi',
};

function getParam(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

function getReadableAddress(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return 'Current location';

  return [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}

async function getCurrentPoint(): Promise<RoutePoint> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Location permission is required.');
  }

  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const reverseAddress = await Location.reverseGeocodeAsync({
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  });

  return {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
    title: 'Start location',
    description: getReadableAddress(reverseAddress[0]),
  };
}

async function geocodeAddress(address: string, title: string): Promise<RoutePoint> {
  const cleanAddress = address.trim();

  if (!cleanAddress || cleanAddress.toLowerCase() === 'use current location') {
    return getCurrentPoint();
  }

  const result = await Location.geocodeAsync(cleanAddress);

  if (!result.length) {
    throw new Error(`Unable to find coordinates for ${title}.`);
  }

  return {
    latitude: result[0].latitude,
    longitude: result[0].longitude,
    title,
    description: cleanAddress,
  };
}

function formatDistance(meters: number) {
  if (!meters || meters <= 0) return '0 km';

  const km = meters / 1000;

  if (km < 1) return `${Math.round(meters)} m`;

  return `${km.toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0 min';

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes <= 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
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
      .map(point => `${point.longitude},${point.latitude}`)
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
      })
    );

    return {
      coordinates,
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
    };
  } catch {
    let distanceMeters = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
      distanceMeters += getStraightLineDistanceMeters(points[index], points[index + 1]);
    }

    return {
      coordinates: points,
      distanceMeters,
      durationSeconds: Math.max(300, (distanceMeters / 35000) * 3600),
    };
  }
}

async function fetchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) return [];

  try {
    const response = await routesService.getAutocompleteAddress(cleanQuery, 7);

    if (response.success && response.data) {
      // Handle various potential response structures from the backend
      const rawList = Array.isArray(response.data) 
        ? response.data 
        : (response.data.suggestions || response.data.results || []);

      return rawList.map((item: any, index: number) => {
        const title = item.title || item.name || item.text || item.display_name?.split(',')[0] || cleanQuery;
        const fullAddress = item.fullAddress || item.address || item.display_name || cleanQuery;
        const subtitle = item.subtitle || item.description || fullAddress.replace(title, '').trim().replace(/^,/, '').trim() || 'Address suggestion';

        return {
          id: String(item.id || item.place_id || index),
          title,
          subtitle,
          fullAddress,
          latitude: Number(item.latitude || item.lat),
          longitude: Number(item.longitude || item.lon),
        };
      });
    }
    
    throw new Error('No data from backend');
  } catch {
    const result = await Location.geocodeAsync(cleanQuery);

    return result.slice(0, 5).map((item, index) => ({
      id: `${cleanQuery}-${index}`,
      title: cleanQuery,
      subtitle: 'Suggested location',
      fullAddress: cleanQuery,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  }
}

function getRoutePoints(route: AppRoute): RoutePoint[] {
  return [route.start, ...(route.stops || []), route.end];
}

function getInitialCoordinates(route: AppRoute): RoutePoint[] {
  const points = getRoutePoints(route);
  return points.filter(Boolean);
}

export default function RoutePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [route, setRoute] = useState<AppRoute | null>(null);
  const [routeMeta, setRouteMeta] = useState<RouteMeta>({
    distanceLabel: '0 km',
    durationLabel: '0 min',
  });

  const [panelMode, setPanelMode] = useState<PanelMode>('empty');
  const [mapType, setMapType] = useState<RouteMapType>('standard');
  const [centerSignal, setCenterSignal] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaceSuggestion | null>(null);

  const [stopDetails, setStopDetails] = useState<StopDetails>({
    packages: 1,
    order: 'auto',
    stopType: 'delivery',
    notes: '',
  });

  const routeName = useMemo(
    () => getParam(params.routeName, 'Sunday Route'),
    [params.routeName]
  );

  const startLocation = useMemo(
    () => getParam(params.startLocation, 'Use current location'),
    [params.startLocation]
  );

  const startTime = useMemo(
    () => getParam(params.startTime, ''),
    [params.startTime]
  );

  const endMode = useMemo(
    () => getParam(params.endMode, 'round_trip') as EndMode,
    [params.endMode]
  );

  const endAddress = useMemo(
    () => getParam(params.endAddress, ''),
    [params.endAddress]
  );

  useEffect(() => {
    let mounted = true;

    const createInitialRoute = async () => {
      try {
        setIsInitialLoading(true);

        const startPoint = await geocodeAddress(startLocation, 'Start location');

        let endPoint: RoutePoint;

        if (endMode === 'other_address' && endAddress.trim()) {
          endPoint = await geocodeAddress(endAddress, 'End location');
        } else {
          endPoint = {
            ...startPoint,
            title: 'End location',
            description:
              endMode === 'round_trip'
                ? 'Return to start location'
                : 'No end location selected',
          };
        }

        if (!mounted) return;

        const nextRoute: AppRoute = {
          start: startPoint,
          end: endPoint,
          stops: [],
          coordinates: [],
        };

        setRoute(nextRoute);
        setPanelMode('empty');
      } catch {
        if (!mounted) return;

        setRoute({
          start: DEFAULT_POINT,
          end: DEFAULT_POINT,
          stops: [],
          coordinates: [],
        });

        setPanelMode('empty');
      } finally {
        if (mounted) {
          setIsInitialLoading(false);
        }
      }
    };

    createInitialRoute();

    return () => {
      mounted = false;
    };
  }, [startLocation, endMode, endAddress]);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(async () => {
      if (panelMode !== 'search') return;

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
    console.log('Add stop clicked');

    setSearchText('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setPanelMode('search');
  };

  const handleCloseSearch = () => {
    setSearchText('');
    setSuggestions([]);
    setSelectedSuggestion(null);

    if (route?.stops?.length) {
      setPanelMode('setup');
    } else {
      setPanelMode('empty');
    }
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    console.log('Selected stop:', suggestion.title);

    setSelectedSuggestion(suggestion);
    setStopDetails({
      packages: 1,
      order: 'auto',
      stopType: 'delivery',
      notes: '',
    });
    setPanelMode('details');
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
      status: 'added',
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
    setSearchText('');
    setSuggestions([]);
    setPanelMode('setup');
    setCenterSignal(prev => prev + 1);
  };

  const handleOptimizeRoute = async () => {
    if (!route) return;

    setIsOptimizing(true);

    const points = getRoutePoints(route);
    const path = await fetchRoutePath(points);

    const nextRoute: AppRoute = {
      ...route,
      coordinates: path.coordinates,
    };

    setRoute(nextRoute);

    setRouteMeta({
      distanceLabel: formatDistance(path.distanceMeters),
      durationLabel: formatDuration(path.durationSeconds),
    });

    setTimeout(() => {
      setIsOptimizing(false);
      setPanelMode('confirmed');
      setCenterSignal(prev => prev + 1);
    }, 900);
  };

  const handleToggleMapType = () => {
    setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const handleConfirmRoute = () => {
    router.replace('/' as never);
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
        <Pressable style={styles.mapControlButton} onPress={handleToggleMapType}>
          <Text style={styles.mapControlIcon}>▱</Text>
        </Pressable>

        <Pressable
          style={styles.mapControlButton}
          onPress={() => setCenterSignal(prev => prev + 1)}
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

      {!isInitialLoading && route ? (
        <RoutePreviewPanel
          mode={panelMode}
          routeName={routeName}
          startTime={startTime}
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
          onRefine={() => setPanelMode('setup')}
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
    backgroundColor: '#F8FAFC',
  },

  menuButton: {
    position: 'absolute',
    left: 24,
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
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
    backgroundColor: '#111827',
  },

  mapControls: {
    position: 'absolute',
    right: 24,
    zIndex: 80,
    gap: 14,
  },

  mapControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
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
    fontWeight: '600',
    color: '#2F76F6',
  },

  loadingCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000000',
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
    fontWeight: '400',
    color: '#475569',
  },

  optimizingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  optimizingCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 28,
    alignItems: 'center',
  },

  optimizingTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: '#111827',
  },

  optimizingArt: {
    marginTop: 34,
    fontSize: 82,
    color: '#2F76F6',
  },

  optimizingText: {
    marginTop: 34,
    fontSize: 17,
    fontWeight: '400',
    color: '#111827',
  },

  progressTrack: {
    marginTop: 22,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#93C5FD',
    overflow: 'hidden',
  },

  progressFill: {
    width: '48%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2F76F6',
  },
});