import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  getNavigationSession,
  NavigationSession,
} from './../../services/navigation-session';

type LatLng = {
  latitude: number;
  longitude: number;
};

type RouteStep = {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
};

const FALLBACK_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceMeters = (a: LatLng, b: LatLng) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};


const getRoutePreviewNearOrigin = (
  coordinates: LatLng[],
  origin: LatLng,
  maxMeters = 3500,
) => {
  if (coordinates.length <= 2) return coordinates;

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  coordinates.forEach((point, index) => {
    const distance = distanceMeters(origin, point);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  const preview: LatLng[] = [origin];

  let travelled = 0;

  for (let index = nearestIndex; index < coordinates.length - 1; index += 1) {
    const current = coordinates[index];
    const next = coordinates[index + 1];

    preview.push(current);

    travelled += distanceMeters(current, next);

    if (travelled >= maxMeters) {
      preview.push(next);
      break;
    }
  }

  return preview.length > 1 ? preview : coordinates.slice(0, 20);
};

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return '--';

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--';

  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const formatEtaTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--';

  const eta = new Date(Date.now() + seconds * 1000);

  return eta.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const getInstructionIcon = (modifier?: string, type?: string) => {
  if (type === 'arrive') return 'flag-checkered';
  if (modifier?.includes('left')) return 'arrow-left-top';
  if (modifier?.includes('right')) return 'arrow-right-top';
  if (modifier?.includes('uturn')) return 'u-turn-left';

  return 'arrow-up-bold';
};

const buildInstruction = (step?: RouteStep) => {
  const type = step?.maneuver?.type;
  const modifier = step?.maneuver?.modifier;
  const roadName = step?.name;

  if (!step) {
    return {
      title: 'Getting route',
      subtitle: 'Please wait',
      icon: 'navigation-variant',
    };
  }

  if (type === 'depart') {
    return {
      title: modifier ? `Head ${modifier}` : 'Start driving',
      subtitle: roadName ? `On ${roadName}` : 'Follow the route',
      icon: getInstructionIcon(modifier, type),
    };
  }

  if (type === 'turn') {
    return {
      title: modifier ? `Turn ${modifier}` : 'Turn ahead',
      subtitle: roadName ? `Onto ${roadName}` : 'Continue ahead',
      icon: getInstructionIcon(modifier, type),
    };
  }

  if (type === 'new name') {
    return {
      title: 'Continue straight',
      subtitle: roadName ? `On ${roadName}` : 'Stay on route',
      icon: 'arrow-up-bold',
    };
  }

  if (type === 'roundabout') {
    return {
      title: 'Enter roundabout',
      subtitle: roadName ? `Exit towards ${roadName}` : 'Follow signs',
      icon: 'rotate-360',
    };
  }

  if (type === 'arrive') {
    return {
      title: 'Arrive at destination',
      subtitle: 'Your stop is nearby',
      icon: 'flag-checkered',
    };
  }

  return {
    title: modifier ? `Continue ${modifier}` : 'Continue ahead',
    subtitle: roadName ? `On ${roadName}` : 'Follow the highlighted route',
    icon: getInstructionIcon(modifier, type),
  };
};

export default function NavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastRouteOriginRef = useRef<LatLng | null>(null);
  const currentStepIndexRef = useRef(0);

  const [session, setSession] = useState<NavigationSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingDuration, setRemainingDuration] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const stepsRef = useRef<RouteStep[]>([]);
    const isFetchingRouteRef = useRef(false);
    const lastRouteFetchAtRef = useRef(0);
    const hasFittedInitialRouteRef = useRef(false);

  const destination = session?.destination;
  useEffect(() => {
  stepsRef.current = steps;
}, [steps]);

  const activeInstruction = useMemo(() => {
    return buildInstruction(steps[currentStepIndex]);
  }, [steps, currentStepIndex]);

  const progressLabel = useMemo(() => {
    if (!session) return '--';
    return `${session.activeStopIndex + 1}/${session.totalStops || 1}`;
  }, [session]);

  const moveCameraToUser = useCallback((location: LatLng, heading = 0) => {
    mapRef.current?.animateCamera(
      {
        center: location,
        heading,
        pitch: 55,
        zoom: 17.5,
      },
      { duration: 650 },
    );
  }, []);

//   const fetchRoute = useCallback(
//     async (origin: LatLng) => {
//       if (!destination) return;

//       try {
//         setIsLoadingRoute(true);

//         const url =
//           `https://router.project-osrm.org/route/v1/driving/` +
//           `${origin.longitude},${origin.latitude};` +
//           `${destination.longitude},${destination.latitude}` +
//           `?overview=full&geometries=geojson&steps=true`;

//         const response = await fetch(url);
//         const data = await response.json();

//         const route = data?.routes?.[0];

//         if (!route) {
//           throw new Error('No route found');
//         }

//         const coordinates: LatLng[] = route.geometry.coordinates.map(
//           ([longitude, latitude]: [number, number]) => ({
//             latitude,
//             longitude,
//           }),
//         );

//         const nextSteps: RouteStep[] = route.legs?.[0]?.steps || [];

//         setRouteCoordinates(coordinates);
//         setSteps(nextSteps);
//         setCurrentStepIndex(0);
//         currentStepIndexRef.current = 0;

//         setRemainingDistance(route.distance || 0);
//         setRemainingDuration(route.duration || 0);

//         lastRouteOriginRef.current = origin;

//         setTimeout(() => {
//           if (coordinates.length > 1) {
//             mapRef.current?.fitToCoordinates(coordinates, {
//               animated: true,
//               edgePadding: {
//                 top: 210,
//                 right: 60,
//                 bottom: 230,
//                 left: 60,
//               },
//             });
//           }
//         }, 250);
//       } catch (error) {
//         console.log('Navigation route error:', error);
//         Alert.alert('Route error', 'Unable to create navigation route.');
//       } finally {
//         setIsLoadingRoute(false);
//       }
//     },
//     [destination],
//   );

const fetchRoute = useCallback(
  async (
    origin: LatLng,
    options?: {
      silent?: boolean;
      fitMap?: boolean;
      force?: boolean;
    },
  ) => {
    if (!destination) return;

    const now = Date.now();

    // Prevent repeated route calls
    if (isFetchingRouteRef.current) return;

    // Do not refetch route too frequently unless force is true
    if (!options?.force && now - lastRouteFetchAtRef.current < 45000) {
      return;
    }

    try {
      isFetchingRouteRef.current = true;
      lastRouteFetchAtRef.current = now;

      if (!options?.silent) {
        setIsLoadingRoute(true);
      }

      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.longitude},${origin.latitude};` +
        `${destination.longitude},${destination.latitude}` +
        `?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);
      const data = await response.json();

      const route = data?.routes?.[0];

      if (!route) {
        throw new Error('No route found');
      }

      const coordinates: LatLng[] = route.geometry.coordinates.map(
        ([longitude, latitude]: [number, number]) => ({
          latitude,
          longitude,
        }),
      );

      const nextSteps: RouteStep[] = route.legs?.[0]?.steps || [];

      setRouteCoordinates(coordinates);
      setSteps(nextSteps);

      // Only reset instruction when route is created first time / forced
      if (options?.force || currentStepIndexRef.current === 0) {
        setCurrentStepIndex(0);
        currentStepIndexRef.current = 0;
      }

      setRemainingDistance(route.distance || 0);
      setRemainingDuration(route.duration || 0);

      lastRouteOriginRef.current = origin;

if (options?.fitMap && !hasFittedInitialRouteRef.current) {
  hasFittedInitialRouteRef.current = true;

  const nearbyRoute = getRoutePreviewNearOrigin(coordinates, origin, 3500);

  setTimeout(() => {
    if (nearbyRoute.length > 1) {
      mapRef.current?.fitToCoordinates(nearbyRoute, {
        animated: true,
        edgePadding: {
          top: 210,
          right: 70,
          bottom: 260,
          left: 70,
        },
      });
    } else {
      moveCameraToUser(origin, 0);
    }
  }, 250);
}
    } catch (error) {
      console.log('Navigation route error:', error);
    } finally {
      isFetchingRouteRef.current = false;

      if (!options?.silent) {
        setIsLoadingRoute(false);
      }
    }
  },
  [destination],
);

// const updateStepProgress = useCallback(
//     (location: LatLng) => {
//       const nextStep = steps[currentStepIndexRef.current + 1];

//       if (!nextStep?.maneuver?.location) return;

//       const [longitude, latitude] = nextStep.maneuver.location;

//       const distanceToNextStep = distanceMeters(location, {
//         latitude,
//         longitude,
//       });

//       if (distanceToNextStep < 35) {
//         const nextIndex = currentStepIndexRef.current + 1;
//         currentStepIndexRef.current = nextIndex;
//         setCurrentStepIndex(nextIndex);
//       }
//     },
//     [steps],
//   );


const updateStepProgress = useCallback((location: LatLng) => {
  const currentSteps = stepsRef.current;
  const nextStep = currentSteps[currentStepIndexRef.current + 1];

  if (!nextStep?.maneuver?.location) return;

  const [longitude, latitude] = nextStep.maneuver.location;

  const distanceToNextStep = distanceMeters(location, {
    latitude,
    longitude,
  });

  if (distanceToNextStep < 35) {
    const nextIndex = currentStepIndexRef.current + 1;

    if (nextIndex < currentSteps.length) {
      currentStepIndexRef.current = nextIndex;
      setCurrentStepIndex(nextIndex);
    }
  }
}, []);

  useEffect(() => {
    const loadSession = async () => {
      const savedSession = await getNavigationSession();

      if (!savedSession?.destination) {
        Alert.alert('Navigation unavailable', 'No active stop found.');
        router.back();
        return;
      }

      setSession(savedSession);
    };

    loadSession();
  }, [router]);

  useEffect(() => {
    if (!destination) return;

    let mounted = true;

    const startNavigation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Please allow location permission to use in-app navigation.',
        );
        router.back();
        return;
      }

      const firstLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!mounted) return;

      const origin = {
        latitude: firstLocation.coords.latitude,
        longitude: firstLocation.coords.longitude,
      };

      setCurrentLocation(origin);
      moveCameraToUser(origin, firstLocation.coords.heading || 0);
    //   fetchRoute(origin);
    //     watchRef.current = await Location.watchPositionAsync(
    //     {
    //       accuracy: Location.Accuracy.High,
    //       distanceInterval: 8,
    //       timeInterval: 2500,
    //     },
    //     location => {
    //       const nextLocation = {
    //         latitude: location.coords.latitude,
    //         longitude: location.coords.longitude,
    //       };

    //       setCurrentLocation(nextLocation);
    //       moveCameraToUser(nextLocation, location.coords.heading || 0);
    //       updateStepProgress(nextLocation);

    //       const lastRouteOrigin = lastRouteOriginRef.current;

    //       if (
    //         !lastRouteOrigin ||
    //         distanceMeters(lastRouteOrigin, nextLocation) > 45
    //       ) {
    //         fetchRoute(nextLocation);
    //       }
    //     },
    //   );
fetchRoute(origin, {
  force: true,
  fitMap: true,
});

watchRef.current = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 20,
    timeInterval: 5000,
  },
  location => {
    const nextLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setCurrentLocation(nextLocation);
    moveCameraToUser(nextLocation, location.coords.heading || 0);
    updateStepProgress(nextLocation);

    const lastRouteOrigin = lastRouteOriginRef.current;

    // Re-route only if user has moved far away from original route origin.
    // This prevents "Building route..." again and again.
    if (
      lastRouteOrigin &&
      distanceMeters(lastRouteOrigin, nextLocation) > 250
    ) {
      fetchRoute(nextLocation, {
        silent: true,
        fitMap: false,
      });
    }
  },
);
  
    };

    startNavigation();

    return () => {
      mounted = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [
    destination
    // fetchRoute,
    // moveCameraToUser,
    // router,
    // updateStepProgress,
  ]);

  const closeNavigation = () => {
    router.back();
  };

  const openStopPanel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={FALLBACK_REGION}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled
        rotateEnabled
        pitchEnabled
      >
        {routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2563EB"
            strokeWidth={8}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.destinationMarker}>
              <Text style={styles.destinationMarkerText}>
                {session ? session.activeStopIndex + 1 : ''}
              </Text>
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={[styles.topCard, { top: insets.top + 12 }]}>
        <View style={styles.mainInstruction}>
          <MaterialCommunityIcons
            name={activeInstruction.icon as any}
            size={38}
            color="#FFFFFF"
          />

          <Text style={styles.mainInstructionText} numberOfLines={2}>
            {activeInstruction.title}
          </Text>

          <Pressable style={styles.closeButton} onPress={closeNavigation}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.subInstruction}>
          <Text style={styles.thenText}>Then</Text>

          <Text style={styles.subInstructionText} numberOfLines={1}>
            {activeInstruction.subtitle}
          </Text>

          <View style={styles.etaPill}>
            <Feather name="flag" size={14} color="#475569" />

            <Text style={styles.etaText}>
              {formatEtaTime(remainingDuration)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightControls}>
        <Pressable style={styles.mapButton}>
          <Feather name="alert-triangle" size={22} color="#F59E0B" />
        </Pressable>

        <Pressable style={styles.mapButton}>
          <Feather name="settings" size={22} color="#2563EB" />
        </Pressable>

        <Pressable style={styles.mapButton}>
          <Feather name="layers" size={22} color="#2563EB" />
        </Pressable>

        <Pressable
          style={styles.mapButton}
          onPress={() => currentLocation && moveCameraToUser(currentLocation)}
        >
          <MaterialCommunityIcons
            name="navigation-variant"
            size={24}
            color="#2563EB"
          />
        </Pressable>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomHandle} />

        <View style={styles.stopHeader}>
          <View style={styles.stopTextBox}>
            <Text style={styles.stopTitle} numberOfLines={2}>
              {destination?.title || 'Current stop'}
            </Text>

            <View style={styles.stopMetaRow}>
              <View style={styles.blueDot} />

              <Text style={styles.stopMetaText}>
                {progressLabel}
                {destination?.orderId ? `  ID ${destination.orderId}` : ''}
              </Text>
            </View>
          </View>

          <Pressable style={styles.listButton} onPress={openStopPanel}>
            <Feather name="list" size={24} color="#111827" />
          </Pressable>
        </View>

        <Text style={styles.addressText} numberOfLines={2}>
          {destination?.address}
        </Text>

        <View style={styles.routeSummary}>
          <Text style={styles.durationText}>
            {formatDuration(remainingDuration)}
          </Text>

          <Text style={styles.summaryDivider}>•</Text>

          <Text style={styles.distanceText}>
            {formatDistance(remainingDistance)}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.statusButton} onPress={openStopPanel}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={23}
              color="#475569"
            />

            <View style={styles.failedBadge}>
              <Feather name="x" size={10} color="#FFFFFF" />
            </View>

            <Text style={styles.statusButtonText}>Failed</Text>
          </Pressable>

          <Pressable style={styles.statusButton} onPress={openStopPanel}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={23}
              color="#475569"
            />

            <View style={styles.successBadge}>
              <Feather name="check" size={10} color="#FFFFFF" />
            </View>

            <Text style={styles.statusButtonText}>Delivered</Text>
          </Pressable>
        </View>
      </View>

      {isLoadingRoute ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingText}>Building route...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  topCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  mainInstruction: {
    minHeight: 96,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  mainInstructionText: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  subInstruction: {
    minHeight: 56,
    backgroundColor: '#475569',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  thenText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  subInstructionText: {
    flex: 1,
    fontSize: 15,
    color: '#E5E7EB',
    fontWeight: '500',
  },

  etaPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  etaText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
  },

  rightControls: {
    position: 'absolute',
    right: 18,
    top: 330,
    gap: 14,
  },

  mapButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },

  destinationMarker: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  destinationMarkerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  bottomPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  bottomHandle: {
    width: 64,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },

  stopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  stopTextBox: {
    flex: 1,
  },

  stopTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#111827',
    fontWeight: '700',
  },

  stopMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },

  stopMetaText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  listButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addressText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },

  routeSummary: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  durationText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '800',
  },

  summaryDivider: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },

  distanceText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },

  statusButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  failedBadge: {
    position: 'absolute',
    top: 12,
    right: '43%',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successBadge: {
    position: 'absolute',
    top: 12,
    right: '43%',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusButtonText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },

  loadingBox: {
    position: 'absolute',
    top: '48%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  loadingText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
});