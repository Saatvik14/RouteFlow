import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { routesService, Route as ApiRoute } from '../services/api/routes';

export function RoutePanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  // Use light-mode colors only (do not enable dark theme styling)
  const theme = {
    background: '#FFFFFF',
    backgroundSelected: '#E5EAF1',
    backgroundElement: '#EEF5FF',
    text: '#101828',
    textSecondary: '#64748B',
  };

  const isWebWide = width >= 768;
  const isSmallScreen = height < 760 || width < 390;

  const panelHeight = isWebWide
    ? Math.min(Math.max(height * 0.48, 360), 420)
    : isSmallScreen
    ? Math.min(Math.max(height * 0.54, 400), 450)
    : Math.min(Math.max(height * 0.50, 420), 480);

  const [latestRoute, setLatestRoute] = useState<ApiRoute | any | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

const normalizedLatestStatus = latestRoute?.status?.toLowerCase?.() || '';
const isCancelledRoute =
  normalizedLatestStatus === 'cancelled' || normalizedLatestStatus === 'canceled';

const isOptimized =
  latestRoute &&
  ['optimized', 'confirmed', 'in_transit', 'completed', 'cancelled', 'canceled'].includes(
    normalizedLatestStatus,
  );

  // const isOptimized = latestRoute && ['optimized', 'confirmed', 'in_transit', 'completed'].includes(latestRoute.status?.toLowerCase());
  const hasStops = latestRoute && latestRoute.stops && latestRoute.stops.length > 0;

  const MIN_HEIGHT = panelHeight;
  const MAX_HEIGHT = height * 0.6;

  const animatedHeight = useSharedValue(MIN_HEIGHT);
  const context = useSharedValue({ y: 0 });

  useEffect(() => {
    // Update height when window dimensions or layout changes (e.g. on Web resize)
    if (Math.abs(animatedHeight.value - MIN_HEIGHT) < 50) {
      animatedHeight.value = withTiming(MIN_HEIGHT, { duration: 300 });
    }
  }, [MIN_HEIGHT]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: animatedHeight.value };
    })
    .onUpdate((event) => {
      animatedHeight.value = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, context.value.y - event.translationY));
    })
    .onEnd((event) => {
      if (event.velocityY < -500 || animatedHeight.value > MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) / 3) {
        animatedHeight.value = withTiming(MAX_HEIGHT, { duration: 300 });
      } else {
        animatedHeight.value = withTiming(MIN_HEIGHT, { duration: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const formatStatus = (status?: string) => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
  };

  const getStatusColor = (status?: string) => {
    const s = status?.toLowerCase();
    if (s === 'optimized' || s === 'confirmed') return '#ECFDF5';
    if (s === 'in_transit') return '#EFF6FF';
    if (s === 'completed') return '#F0FDF4';
    return '#F9FAFB';
  };

  const getStatusTextColor = (status?: string) => {
    const s = status?.toLowerCase();
    if (s === 'optimized' || s === 'confirmed') return '#059669';
    if (s === 'in_transit') return '#2563EB';
    if (s === 'completed') return '#15803D';
    return '#6B7280';
  };

  const loadLatest = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const resp: any = await routesService.getRoutes(1, 0);
      let first: any = null;

      if (resp && typeof resp === 'object' && 'success' in resp) {
        const d = resp.data || resp;
        if (Array.isArray(d)) first = d[0];
        else if (d?.routes) first = d.routes[0];
        else first = d;
      } else {
        const d = resp;
        if (Array.isArray(d)) first = d[0];
        else if (d?.routes) first = d.routes[0];
        else first = d;
      }

      if (!first) {
        if (isMounted.current) setLatestRoute(null);
        return;
      }

      const routeId = first.route_id || first.id || first.routeId;
      if (routeId) {
        const detailsResp: any = await routesService.getRoute(String(routeId));
        if (detailsResp && typeof detailsResp === 'object' && 'success' in detailsResp) {
          if (detailsResp.success && isMounted.current) {
            setLatestRoute(detailsResp.data || detailsResp);
          } else if (isMounted.current) {
            setLatestRoute(first);
          }
        } else if (isMounted.current) {
          setLatestRoute(detailsResp || first);
        }
      } else if (isMounted.current) {
        setLatestRoute(first);
      }
    } catch (error) {
      console.error('Failed to load latest route', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadLatest();
    return () => { isMounted.current = false; };
  }, []);

  const handleStartRoute = async () => {
    const routeId = latestRoute?.route_id || latestRoute?.id || latestRoute?.routeId;
    if (!routeId) return;

    try {
      setLoading(true);
      // Update status to in_transit
      await routesService.updateRoute({
        route_id: String(routeId),
        status: 'in_transit',
      });

      router.push({
        pathname: '/route-preview',
        params: { id: String(routeId) },
      } as any);
    } catch (error) {
      console.error('Failed to start route', error);
      // Fallback: navigate anyway if update fails
      router.push({
        pathname: '/route-preview',
        params: { id: String(routeId) },
      } as any);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAction = () => {
    const routeId = latestRoute?.route_id || latestRoute?.id || latestRoute?.routeId;
    if (routeId) {
      router.push({
        pathname: '/route-preview',
        params: { id: String(routeId) },
      } as any);
      return;
    } else {
      const today = new Date();
      router.push({
        pathname: '/route-points',
        params: {
          routeName: `Route ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
          routeDate: today.toISOString().split('T')[0],
          routeDateLabel: today.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          routeDay: today.toLocaleDateString('en-IN', { weekday: 'long' }),
          carryPastStops: 'false',
        },
      } as any);
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.panel,
          animatedStyle,
          {
            paddingBottom: Math.max(insets.bottom + 18, 26),
            backgroundColor: theme.background,
            borderColor: theme.backgroundSelected,
            shadowColor: theme.backgroundSelected,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />

        <View style={styles.content}>
          <View style={{ flex: 1, width: '100%' }}>
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#2F76F6" />
                <Text style={[styles.description, { marginTop: 8, color: theme.textSecondary }]}>Loading route...</Text>
              </View>
            ) : (hasStops && isOptimized) ? (
              <View style={{ width: '100%', flex: 1, alignItems: isWebWide ? 'flex-start' : 'center' }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { fontSize: 17 }]}>{latestRoute.name || 'Latest route'}</Text>
                  <View style={[styles.statusChip, { backgroundColor: getStatusColor(latestRoute.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusTextColor(latestRoute.status) }]}>
                      {formatStatus(latestRoute.status)}
                    </Text>
                  </View>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  style={{ marginTop: 16 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  <View style={styles.timelineContainer}>
                    {/* Start Location */}
                    <View style={styles.timelineItem}>
                      <View style={styles.markerColumn}>
                        <View style={[styles.markerCircle, { backgroundColor: '#2F76F6' }]} />
                        <View style={styles.connectorLine} />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.label}>Start</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {latestRoute.start_location?.full_address || latestRoute.start_full_address || '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Waypoints */}
                    {latestRoute.stops && latestRoute.stops.map((s: any, idx: number) => (
                      <View key={idx} style={styles.timelineItem}>
                        <View style={styles.markerColumn}>
                          <View style={styles.markerCircle} />
                          <View style={styles.connectorLine} />
                        </View>
                        <View style={styles.itemContent}>
                          <Text style={styles.label}>Stop {idx + 1}</Text>
                          <Text style={styles.addressText} numberOfLines={1}>
                            {s.full_address || s.title || s.name || s.address || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* End Location */}
                    <View style={styles.timelineItem}>
                      <View style={styles.markerColumn}>
                        <View style={[styles.markerCircle, { backgroundColor: '#101828' }]} />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.label}>End</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {latestRoute.end_location?.full_address || latestRoute.end_full_address || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            ) : (
              <Pressable 
                onPress={handleAction}
                style={{ alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}
              >
                <Text style={[styles.title, { color: theme.text }]}>
                  {latestRoute?.name || 'My first route'}
                </Text>
                <Text style={[styles.question, { color: theme.text }]}>
                  {latestRoute ? 'Add stops to your route' : 'Where do you start and end\nyour route?'}
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  {latestRoute 
                    ? 'Your route has been created. Start adding stops to optimize your sequence.'
                    : 'Set your start and end location before adding route stops.'}
                </Text>
              </Pressable>
            )}
          </View>
            </View>

        <View style={styles.buttonGroup}>
        {hasStops && isOptimized && !isCancelledRoute &&  (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              {
                opacity: pressed ? 0.88 : 1,
                marginBottom: 8,
              },
            ]}
            onPress={handleStartRoute}
          >
            <Text style={styles.buttonText}>Start Route</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            hasStops ? styles.secondaryButton : styles.button,
            {
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={handleAction}
        >
          <Text
            style={
              hasStops
                ? styles.secondaryButtonText
                : styles.buttonText
            }
          >
            {isCancelledRoute ? 'View cancelled route' : latestRoute ? 'Add locations' : 'Set up locations'}
          </Text>
        </Pressable>
      </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 16,
  },

  handle: {
    width: 74,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    marginBottom: 14,
  },

  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },

  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 14,
  },

  illustrationCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#EEF5FF',
  },

  illustrationCircleWeb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },

  warehouse: {
    position: 'absolute',
    left: 22,
    bottom: 28,
    width: 66,
    height: 58,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },

  roof: {
    position: 'absolute',
    top: -13,
    left: -7,
    width: 82,
    height: 22,
    backgroundColor: '#64748B',
    transform: [{ skewX: '26deg' }],
  },

  door: {
    position: 'absolute',
    right: 10,
    bottom: 0,
    width: 32,
    height: 39,
    backgroundColor: '#E2E8F0',
    borderTopWidth: 4,
    borderTopColor: '#FFFFFF',
  },

  doorLine: {
    height: 3,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
    marginHorizontal: 5,
    borderRadius: 2,
  },

  truck: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 58,
    height: 38,
  },

  truckBox: {
    position: 'absolute',
    left: 0,
    bottom: 10,
    width: 35,
    height: 25,
    backgroundColor: '#93C5FD',
    borderRadius: 3,
  },

  truckCab: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    width: 28,
    height: 31,
    backgroundColor: '#BFDBFE',
    borderTopRightRadius: 8,
  },

  wheelOne: {
    position: 'absolute',
    left: 8,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1E293B',
  },

  wheelTwo: {
    position: 'absolute',
    right: 8,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1E293B',
  },

  question: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
  },

  button: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },

  buttonGroup: {
    width: '100%',
    marginTop: 8,
  },

  secondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#344054',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },

  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },

  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  addressText: {
    fontSize: 13,
    color: '#101828',
    lineHeight: 18,
  },

  waypointText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },

  timelineContainer: {
    paddingHorizontal: 8,
  },

  timelineItem: {
    flexDirection: 'row',
  },

  markerColumn: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },

  markerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
  },

  connectorLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5EAF1',
    marginTop: 4,
  },

  itemContent: {
    flex: 1,
    paddingBottom: 20,
  },
});
