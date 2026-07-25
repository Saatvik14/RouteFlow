import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationOverlayProps = {
  targetStop: any;
  userLocation: {
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null;
  routeCoordinates?: { latitude: number; longitude: number }[];
  onExit: () => void;
  onSimulateLocationUpdate?: (location: { latitude: number; longitude: number; heading: number | null }) => void;
  onToggleSimulationMode?: (active: boolean) => void;
  onReRoute?: (newCoordinates: { latitude: number; longitude: number }[]) => void;
};

// Haversine formula to compute distance between two coords in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate distance from point P to line segment AB in meters
function pointToSegmentDistanceMeters(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  if (dx === 0 && dy === 0) {
    return getDistanceMeters(pLat, pLng, aLat, aLng);
  }

  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  const projLat = aLat + t * dy;
  const projLng = aLng + t * dx;
  return getDistanceMeters(pLat, pLng, projLat, projLng);
}

// Calculate minimum distance from userLocation to polyline coordinates
function minDistanceToPolyline(
  userLat: number,
  userLng: number,
  coordinates: { latitude: number; longitude: number }[]
): number {
  if (!coordinates || coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return getDistanceMeters(userLat, userLng, coordinates[0].latitude, coordinates[0].longitude);
  }

  let minDist = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const dist = pointToSegmentDistanceMeters(
      userLat, userLng,
      Number(a.latitude), Number(a.longitude),
      Number(b.latitude), Number(b.longitude)
    );
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

// Format distance helper for steps (always in miles)
function formatStepDistance(meters: number): string {
  const mi = meters * 0.000621371;
  if (mi < 0.1) {
    return `${mi.toFixed(2)} mi`;
  }
  return `${mi.toFixed(1)} mi`;
}

// Convert maneuver type & modifier into display action text and icon
function getManeuverAction(type?: string, modifier?: string): { actionText: string; iconName: string } {
  const mod = (modifier || '').toLowerCase();
  const typ = (type || '').toLowerCase();

  if (typ === 'arrive') {
    return { actionText: 'arrive at destination', iconName: 'check-circle' };
  }

  if (mod.includes('left')) {
    return { actionText: mod.includes('slight') ? 'bear left' : 'turn left', iconName: 'arrow-left-top' };
  }
  if (mod.includes('right')) {
    return { actionText: mod.includes('slight') ? 'bear right' : 'turn right', iconName: 'arrow-right-top' };
  }
  if (mod.includes('uturn') || mod.includes('u-turn')) {
    return { actionText: 'make a U-turn', iconName: 'u-turn' };
  }

  return { actionText: 'continue straight', iconName: 'arrow-up' };
}

export default function InAppNavigationOverlay({
  targetStop,
  userLocation,
  routeCoordinates,
  onExit,
  onSimulateLocationUpdate,
  onToggleSimulationMode,
  onReRoute,
}: NavigationOverlayProps) {
  const insets = useSafeAreaInsets();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simInterval, setSimInterval] = useState<any>(null);
  const [liveSteps, setLiveSteps] = useState<any[]>([]);
  const [lastFetchedCoords, setLastFetchedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [lastRerouteTime, setLastRerouteTime] = useState<number>(0);

  const destLat = Number(
    targetStop?.latitude ?? targetStop?.lat ?? targetStop?.location?.latitude ?? targetStop?.location?.lat
  );
  const destLng = Number(
    targetStop?.longitude ?? targetStop?.lng ?? targetStop?.location?.longitude ?? targetStop?.location?.lng
  );

  // Automatic Re-Routing when driver deviates/goes off-route (>50 meters away)
  useEffect(() => {
    if (!userLocation || !Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    const userLat = userLocation.latitude;
    const userLng = userLocation.longitude;
    const now = Date.now();

    let offRoute = false;
    if (routeCoordinates && routeCoordinates.length >= 2) {
      const distToPolyline = minDistanceToPolyline(userLat, userLng, routeCoordinates);
      if (distToPolyline > 50) {
        offRoute = true;
      }
    }

    if (offRoute && now - lastRerouteTime > 4000) {
      setIsRerouting(true);
      setLastRerouteTime(now);

      const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?steps=true&overview=full&geometries=geojson`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.code === 'Ok' && data.routes?.[0]) {
            const routeData = data.routes[0];
            const steps = routeData.legs?.[0]?.steps || [];
            setLiveSteps(steps);

            const rawCoords = routeData.geometry?.coordinates || [];
            const newRouteCoords = rawCoords.map((c: [number, number]) => ({
              latitude: c[1],
              longitude: c[0],
            }));

            if (newRouteCoords.length >= 2 && onReRoute) {
              onReRoute(newRouteCoords);
            }
          }
        })
        .catch((err) => {
          console.warn('Auto re-routing fetch error:', err);
        })
        .finally(() => {
          setTimeout(() => setIsRerouting(false), 1500);
        });
    }
  }, [userLocation?.latitude, userLocation?.longitude, destLat, destLng, routeCoordinates, lastRerouteTime, onReRoute]);

  // Fetch live OSRM turn-by-turn route steps as driver moves
  useEffect(() => {
    if (!userLocation || !Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    const userLat = userLocation.latitude;
    const userLng = userLocation.longitude;

    if (lastFetchedCoords) {
      const distFromLast = getDistanceMeters(userLat, userLng, lastFetchedCoords.lat, lastFetchedCoords.lng);
      if (distFromLast < 40) return;
    }

    let isMounted = true;
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?steps=true&overview=false`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.code === 'Ok' && data.routes?.[0]?.legs?.[0]?.steps) {
          setLiveSteps(data.routes[0].legs[0].steps);
          setLastFetchedCoords({ lat: userLat, lng: userLng });
        }
      })
      .catch((err) => {
        console.warn('OSRM live steps fetch error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [userLocation?.latitude, userLocation?.longitude, destLat, destLng]);

  // Default initial/mock states
  let distanceMeters = 2250;
  let hasGPS = false;

  if (userLocation && Number.isFinite(destLat) && Number.isFinite(destLng)) {
    distanceMeters = getDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      destLat,
      destLng
    );
    hasGPS = true;
  }

  // Calculate dynamic driving ETA based on 40 km/h (11 m/s) average driving speed
  const averageSpeedMps = 11;
  const timeRemainingSeconds = Math.max(15, distanceMeters / averageSpeedMps);
  const timeRemainingMins = Math.ceil(timeRemainingSeconds / 60);

  const etaDate = new Date(Date.now() + timeRemainingSeconds * 1000);
  const etaText = etaDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(' AM', ' am').replace(' PM', ' pm');

  // Format distance display (always in miles)
  const distanceMiles = distanceMeters * 0.000621371;
  const distanceText =
    distanceMiles < 0.1
      ? `${distanceMiles.toFixed(2)} mi`
      : `${distanceMiles.toFixed(1)} mi`;

  const timeText =
    timeRemainingMins === 1 ? '1 min' : `${timeRemainingMins} mins`;

  // Dynamic live instruction calculation
  const targetName =
    targetStop?.title ||
    targetStop?.name ||
    targetStop?.address?.split(',')[0] ||
    'destination';

  let instruction = `Follow route to ${targetName}`;
  let bannerDistance = distanceText;
  let iconName = 'arrow-up';

  if (isRerouting) {
    instruction = `Rerouting route to ${targetName}...`;
    iconName = 'arrow-up';
    bannerDistance = 'Rerouting';
  } else if (distanceMeters <= 20) {
    instruction = `You have arrived at ${targetName}`;
    iconName = 'check-circle';
    bannerDistance = 'Arrived';
  } else if (distanceMeters <= 80) {
    instruction = `Arriving shortly at ${targetName}`;
    iconName = 'arrow-up';
    bannerDistance = 'Arriving';
  } else if (liveSteps && liveSteps.length > 0) {
    // Pick upcoming step
    const upcomingStep =
      liveSteps.find((step, idx) => {
        if (idx === 0 && step.maneuver?.type === 'depart') return false;
        return true;
      }) || liveSteps[0];

    if (upcomingStep) {
      const stepDistMeters = upcomingStep.distance || distanceMeters;
      const stepDistText = formatStepDistance(stepDistMeters);
      const { actionText, iconName: stepIcon } = getManeuverAction(
        upcomingStep.maneuver?.type,
        upcomingStep.maneuver?.modifier
      );
      const streetName = upcomingStep.name ? upcomingStep.name.trim() : '';

      iconName = stepIcon;
      bannerDistance = stepDistText;

      if (upcomingStep.maneuver?.type === 'arrive') {
        instruction = `Arriving shortly at ${targetName}`;
        bannerDistance = 'Arriving';
        iconName = 'check-circle';
      } else if (streetName) {
        instruction = `In ${stepDistText}, ${actionText} onto ${streetName}`;
      } else {
        instruction = `In ${stepDistText}, ${actionText} towards ${targetName}`;
      }
    }
  } else {
    // Dynamic live instructions fallback based on actual distance & target stop name
    if (distanceMeters > 1600) {
      instruction = `Continue straight towards ${targetName}`;
      iconName = 'arrow-up';
      bannerDistance = distanceText;
    } else if (distanceMeters > 400) {
      instruction = `In ${distanceText}, proceed towards ${targetName}`;
      iconName = 'arrow-up';
      bannerDistance = distanceText;
    } else {
      instruction = `In ${distanceText}, destination ${targetName} is ahead`;
      iconName = 'arrow-up';
      bannerDistance = distanceText;
    }
  }

  // Simulation mode triggers
  const startSimulation = () => {
    if (!onSimulateLocationUpdate || !Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    if (simInterval) {
      clearInterval(simInterval);
    }

    onToggleSimulationMode?.(true);
    setIsSimulating(true);

    // Start 1.5km away southwest
    const startLat = destLat - 0.012;
    const startLng = destLng - 0.012;

    let step = 0;
    const totalSteps = 12;

    // Send first step immediately
    onSimulateLocationUpdate({
      latitude: startLat,
      longitude: startLng,
      heading: 45,
    });

    const interval = setInterval(() => {
      step++;
      const fraction = step / totalSteps;
      const currentLat = startLat + (destLat - startLat) * fraction;
      const currentLng = startLng + (destLng - startLng) * fraction;

      // Compute simple bearing heading (around 45 degrees for northeast direction)
      onSimulateLocationUpdate({
        latitude: currentLat,
        longitude: currentLng,
        heading: fraction >= 1 ? 0 : 45,
      });

      if (step >= totalSteps) {
        clearInterval(interval);
        setSimInterval(null);
        setIsSimulating(false);
        onToggleSimulationMode?.(false);
      }
    }, 2000);

    setSimInterval(interval);
  };

  const stopSimulation = () => {
    onToggleSimulationMode?.(false);
    if (simInterval) {
      clearInterval(simInterval);
      setSimInterval(null);
    }
    setIsSimulating(false);
  };

  // Clean up interval on exit
  useEffect(() => {
    return () => {
      if (simInterval) {
        clearInterval(simInterval);
      }
    };
  }, [simInterval]);

  // Check if developer is far away (more than 100 km)
  const isFarAway = distanceMeters > 100000;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Top Banner (Instructions) */}
      <View style={[styles.topBanner, { paddingTop: insets.top + 16 }]}>
        <View style={styles.bannerRow}>
          <View style={styles.directionCircle}>
            {iconName === 'check-circle' ? (
              <Feather name="check" size={28} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name={iconName as any} size={32} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.distanceText}>{bannerDistance}</Text>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        </View>

      </View>

      {/* Live GPS Lock Indicator */}
      <View style={[styles.gpsLockBadge, { top: insets.top + 106 }]}>
        <View style={[styles.gpsDot, hasGPS && styles.gpsDotLive]} />
        <Text style={styles.gpsLockText}>
          {hasGPS ? 'Live GPS Active' : 'Waiting for GPS Lock...'}
        </Text>
      </View>

      {/* Bottom Card (Metrics & Control) */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{timeText}</Text>
            <Text style={styles.metricLabel}>Time</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{distanceText}</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{etaText}</Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Pressable style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitButtonText}>Exit Navigation</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  directionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2F74F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
  },
  distanceText: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '800',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  debugAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  debugText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  gpsLockBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  gpsDotLive: {
    backgroundColor: '#10B981',
  },
  gpsLockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  simulateButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2F74F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  exitButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
