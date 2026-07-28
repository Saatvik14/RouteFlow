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
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
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

  // Fetch live OSRM turn-by-turn route steps & road polyline for target stop
  useEffect(() => {
    if (!userLocation || !Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    const userLat = userLocation.latitude;
    const userLng = userLocation.longitude;

    if (lastFetchedCoords) {
      const distFromLast = getDistanceMeters(userLat, userLng, lastFetchedCoords.lat, lastFetchedCoords.lng);
      if (distFromLast < 30) return;
    }

    let isMounted = true;
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?steps=true&overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.code === 'Ok' && data.routes?.[0]) {
          const routeData = data.routes[0];
          if (routeData.legs?.[0]?.steps) {
            setLiveSteps(routeData.legs[0].steps);
          }
          setLastFetchedCoords({ lat: userLat, lng: userLng });

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
        console.warn('OSRM live steps fetch error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [userLocation?.latitude, userLocation?.longitude, destLat, destLng, targetStop?.id]);

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

  // Target Stop Title & Address for bottom card
  const stopTitle = targetStop?.title || targetStop?.address || targetStop?.fullAddress || 'Next Stop';
  const stopSub = targetStop?.description || targetStop?.subtitle || (targetStop?.address !== stopTitle ? targetStop?.address : '');

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Top Navigation Banner (Turn Instructions) */}
      <View style={[styles.topBanner, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topAccentBar} />
        <View style={styles.bannerRow}>
          <View style={styles.directionCircle}>
            {iconName === 'check-circle' ? (
              <Feather name="check" size={30} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name={iconName as any} size={34} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.bannerTextContainer}>
            <View style={styles.distanceBadgeRow}>
              <Text style={styles.distanceText}>{bannerDistance}</Text>
              {isRerouting && (
                <View style={styles.rerouteBadge}>
                  <Feather name="refresh-cw" size={11} color="#F59E0B" />
                  <Text style={styles.rerouteText}>Re-routing...</Text>
                </View>
              )}
            </View>
            <Text style={styles.instructionText} numberOfLines={2}>{instruction}</Text>
          </View>
        </View>
      </View>

      {/* Live GPS Lock Floating Status Pill */}
      <View style={[styles.gpsLockBadge, { top: insets.top + 110 }]}>
        <View style={[styles.gpsDot, hasGPS && styles.gpsDotLive]} />
        <Text style={styles.gpsLockText}>
          {hasGPS ? 'GPS Connected' : 'Acquiring GPS...'}
        </Text>
      </View>

      {/* Bottom Panel (Google Maps Style Metrics & End Navigation) */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        {/* Drag handle / Indicator bar */}
        <View style={styles.handleBar} />

        {/* Target Destination Row */}
        <View style={styles.destinationRow}>
          <View style={styles.destIconBadge}>
            <Feather name="navigation" size={16} color="#059669" />
          </View>
          <View style={styles.destTextContainer}>
            <Text style={styles.destTitle} numberOfLines={1}>{stopTitle}</Text>
            {Boolean(stopSub) && <Text style={styles.destSub} numberOfLines={1}>{stopSub}</Text>}
          </View>
        </View>

        {/* Primary Metrics Row (ETA, Time, Distance) */}
        <View style={styles.metricsCard}>
          <View style={styles.primaryMetric}>
            <Text style={styles.etaValue}>{etaText}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.secondaryMetric}>
            <Text style={styles.metricVal}>{timeText}</Text>
            <Text style={styles.metricLabel}>Time left</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.secondaryMetric}>
            <Text style={styles.metricVal}>{distanceText}</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.controlRow}>
          <Pressable style={styles.endNavButton} onPress={onExit}>
            <Feather name="x-circle" size={20} color="#FFFFFF" />
            <Text style={styles.endNavButtonText}>End Navigation</Text>
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
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginBottom: 12,
    width: '100%',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  directionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  bannerTextContainer: {
    flex: 1,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distanceText: {
    color: '#34D399',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  rerouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  rerouteText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  instructionText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 21,
  },
  gpsLockBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  gpsDotLive: {
    backgroundColor: '#10B981',
  },
  gpsLockText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 14,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  destIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTextContainer: {
    flex: 1,
  },
  destTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  destSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  metricsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  primaryMetric: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  etaValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.5,
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  secondaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endNavButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  endNavButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
