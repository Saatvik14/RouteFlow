import React, { useState, useEffect } from 'react';
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
  onExit: () => void;
  onSimulateLocationUpdate?: (location: { latitude: number; longitude: number; heading: number | null }) => void;
  onToggleSimulationMode?: (active: boolean) => void;
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

export default function InAppNavigationOverlay({
  targetStop,
  userLocation,
  onExit,
  onSimulateLocationUpdate,
  onToggleSimulationMode,
}: NavigationOverlayProps) {
  const insets = useSafeAreaInsets();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simInterval, setSimInterval] = useState<any>(null);

  const destLat = Number(
    targetStop?.latitude ?? targetStop?.lat ?? targetStop?.location?.latitude ?? targetStop?.location?.lat
  );
  const destLng = Number(
    targetStop?.longitude ?? targetStop?.lng ?? targetStop?.location?.longitude ?? targetStop?.location?.lng
  );

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

  // Format distance display
  const distanceText =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(2)} km`
      : `${Math.round(distanceMeters)} m`;

  const timeText =
    timeRemainingMins === 1 ? '1 min' : `${timeRemainingMins} mins`;

  // Dynamic instruction logic based on remaining distance
  let instruction = 'Follow route to destination';
  let bannerDistance = distanceText;
  let iconName = 'arrow-up';

  if (distanceMeters > 2000) {
    instruction = 'Continue straight on main route';
    iconName = 'arrow-up';
    bannerDistance = 'Continue';
  } else if (distanceMeters <= 2000 && distanceMeters > 1000) {
    instruction = 'In 1 km, prepare to turn left';
    iconName = 'arrow-left-top';
    bannerDistance = '1.0 km';
  } else if (distanceMeters <= 1000 && distanceMeters > 400) {
    instruction = 'In 500 meters, merge onto Amphitheatre Pkwy';
    iconName = 'arrow-right-top';
    bannerDistance = '500 m';
  } else if (distanceMeters <= 400 && distanceMeters > 100) {
    instruction = 'In 200 meters, destination is on your right';
    iconName = 'arrow-right-top';
    bannerDistance = '200 m';
  } else if (distanceMeters <= 100 && distanceMeters > 20) {
    instruction = `Arriving shortly at: ${targetStop?.title || targetStop?.address || 'Stop'}`;
    iconName = 'arrow-up';
    bannerDistance = 'Arriving';
  } else {
    instruction = 'You have arrived!';
    iconName = 'check-circle';
    bannerDistance = 'Arrived';
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

        {isFarAway && !isSimulating && (
          <View style={styles.debugAlert}>
            <Text style={styles.debugText}>
              📍 UK Route detected from India (Distance: {distanceText}). Use "Simulate Drive" to test.
            </Text>
          </View>
        )}
      </View>

      {/* Live GPS Lock Indicator */}
      <View style={[styles.gpsLockBadge, { top: insets.top + (isFarAway && !isSimulating ? 134 : 106) }]}>
        <View style={[styles.gpsDot, (hasGPS || isSimulating) && styles.gpsDotLive]} />
        <Text style={styles.gpsLockText}>
          {isSimulating ? 'Simulating Drive...' : hasGPS ? 'Live GPS Active' : 'Waiting for GPS Lock...'}
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
          {isSimulating ? (
            <Pressable
              style={[styles.simulateButton, { backgroundColor: '#E2E8F0' }]}
              onPress={stopSimulation}
            >
              <Text style={[styles.simulateButtonText, { color: '#475569' }]}>Stop Sim</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.simulateButton}
              onPress={startSimulation}
            >
              <Text style={styles.simulateButtonText}>Simulate Drive</Text>
            </Pressable>
          )}

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
