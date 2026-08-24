import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { driversService, Driver } from '../services/api/drivers';
import { routesService } from '../services/api/routes';
import { ordersService } from '../services/api/orders';
import { Sidebar } from '../components/sidebar';
import { useUserRole } from '../hooks/useUserRole';

type RouteItem = {
  id: string;
  title: string;
  driverId?: number | null;
  driverName?: string | null;
  dateLabel: string;
  statusLabel: string;
  statusTone: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
  stopCount: number;
  distanceLabel: string;
  durationLabel: string;
  sortDate: number;
};

const getStatusMeta = (status?: string) => {
  const norm = String(status || 'draft').toLowerCase().trim();
  if (['completed', 'complete', 'done'].includes(norm)) return { label: 'Completed', tone: 'green' as const };
  if (['active', 'in_transit', 'in-transit', 'started'].includes(norm)) return { label: 'In transit', tone: 'blue' as const };
  if (['optimized', 'ready'].includes(norm)) return { label: 'Optimized', tone: 'purple' as const };
  if (['pending', 'new', 'scheduled'].includes(norm)) return { label: 'Pending', tone: 'amber' as const };
  if (['failed', 'cancelled', 'canceled'].includes(norm)) return { label: 'Cancelled', tone: 'red' as const };
  return { label: 'Draft', tone: 'slate' as const };
};

const formatDateLabel = (dateStr?: string) => {
  if (!dateStr) return 'Date not set';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Date not set';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDistance = (dist?: number | string) => {
  const num = Number(dist || 0);
  if (!num) return '0 mi';
  const miles = num > 1000 ? num * 0.000621371 : num;
  return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
};

const formatDuration = (dur?: number | string) => {
  const num = Number(dur || 0);
  if (!num) return '0m';
  const mins = num > 300 ? Math.round(num / 60) : Math.round(num);
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (!hours) return `${remaining}m`;
  if (!remaining) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

export default function DriverRoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { isFleetDriver } = useUserRole();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch Drivers and Routes
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorMsg('');

        const [driversRes, routesRes] = await Promise.all([
          driversService.getDrivers().catch(() => ({ success: false, data: [] })),
          routesService.getRoutes(100, 0).catch(() => ({ success: false, data: [] })),
        ]);

        if (isMounted) {
          if (driversRes.success && Array.isArray(driversRes.data)) {
            setDrivers(driversRes.data);
          }

          let allOrders: any[] = [];
          try {
            const ordersRes = (await ordersService.fetchOrders()) as any;
            const rawOrders = ordersRes?.data ?? ordersRes;
            allOrders = Array.isArray(rawOrders)
              ? rawOrders
              : rawOrders?.orders || rawOrders?.data?.orders || [];
          } catch (err) {
            console.log('Error fetching orders:', err);
          }

          const rawRoutesList = Array.isArray(routesRes.data)
            ? routesRes.data
            : (routesRes as any)?.routes || (routesRes as any)?.data || [];

          if (Array.isArray(rawRoutesList)) {
            const parsedRoutes: RouteItem[] = rawRoutesList.map((r: any, idx: number) => {
              const routeId = r.route_id ?? r.id ?? idx + 1;
              const statusMeta = getStatusMeta(r.status || r.route_status);
              const dateStr = r.start_datetime || r.created_at;
              const dateObj = dateStr ? new Date(dateStr) : null;

              const routeOrders = allOrders.filter(
                (o: any) => String(o.route_id) === String(routeId)
              );
              const stopCount = routeOrders.length || Number(r.stops_count || r.total_stops || (r.stops?.length) || 0);

              return {
                id: String(routeId),
                title: r.name || r.route_name || `Route ${idx + 1}`,
                driverId: r.driver_id ? Number(r.driver_id) : null,
                driverName: r.driver_name || r.driver?.name || null,
                dateLabel: formatDateLabel(dateStr),
                statusLabel: statusMeta.label,
                statusTone: statusMeta.tone,
                stopCount,
                distanceLabel: formatDistance(r.distance),
                durationLabel: formatDuration(r.duration),
                sortDate: dateObj?.getTime() || 0,
              };
            }).sort((a, b) => b.sortDate - a.sortDate);

            setRoutes(parsedRoutes);
          }
        }
      } catch (err) {
        console.error('DriverRoutes load error:', err);
        if (isMounted) {
          setErrorMsg('Unable to load routes');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, []);

  const filteredDrivers = useMemo(() => {
    if (!driverSearchQuery.trim()) return drivers;
    const query = driverSearchQuery.toLowerCase();
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.phone && d.phone.includes(query)) ||
        (d.email && d.email.toLowerCase().includes(query))
    );
  }, [drivers, driverSearchQuery]);

  const displayedRoutes = useMemo(() => {
    if (!selectedDriver) {
      // If "All Drivers" or none selected, return all routes
      return routes;
    }
    return routes.filter((r) => {
      if (r.driverId && r.driverId === selectedDriver.driver_id) return true;
      if (r.driverName && r.driverName.toLowerCase() === selectedDriver.name.toLowerCase()) return true;
      return false;
    });
  }, [routes, selectedDriver]);

  const handleRouteClick = (routeId: string) => {
    router.push({
      pathname: '/route-preview',
      params: {
        id: String(routeId),
        routeId: String(routeId),
      },
    } as never);
  };

  const getStatusBadgeStyle = (tone: string) => {
    switch (tone) {
      case 'green':
        return styles.badgeGreen;
      case 'blue':
        return styles.badgeBlue;
      case 'amber':
        return styles.badgeAmber;
      case 'purple':
        return styles.badgePurple;
      case 'red':
        return styles.badgeRed;
      default:
        return styles.badgeSlate;
    }
  };

  const getStatusTextStyle = (tone: string) => {
    switch (tone) {
      case 'green':
        return styles.badgeTextGreen;
      case 'blue':
        return styles.badgeTextBlue;
      case 'amber':
        return styles.badgeTextAmber;
      case 'purple':
        return styles.badgeTextPurple;
      case 'red':
        return styles.badgeTextRed;
      default:
        return styles.badgeTextSlate;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open navigation"
          style={styles.backButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Feather name="menu" size={22} color="#101828" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isFleetDriver ? 'My Assigned Routes' : 'Routes per Driver'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <View style={styles.workspaceSheet}>
        <View style={styles.sheetHandle} />

        {/* Driver Selector Section */}
        {!isFleetDriver ? (
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Select Driver</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowDriverDropdown(true)}
            >
              <View style={styles.dropdownButtonContent}>
                <Feather name="user" size={18} color="#2F76F6" style={{ marginRight: 10 }} />
                <Text numberOfLines={1} style={styles.dropdownButtonText}>
                  {selectedDriver ? selectedDriver.name : 'All Drivers'}
                </Text>
              </View>
              <Feather name="chevron-down" size={20} color="#64748B" />
            </Pressable>
          </View>
        ) : null}

        {/* Routes List */}
        <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2F76F6" />
            <Text style={styles.loadingText}>Loading routes...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : displayedRoutes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Feather name="truck" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Routes Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedDriver
                ? `No routes are currently assigned to ${selectedDriver.name}.`
                : 'No routes available.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.routesList,
              { paddingBottom: Math.max(insets.bottom + 20, 32) },
            ]}
          >
            <View style={styles.countSummaryRow}>
              <Text style={styles.countSummaryText}>
                Showing {displayedRoutes.length} route{displayedRoutes.length === 1 ? '' : 's'}
                {selectedDriver ? ` for ${selectedDriver.name}` : ''}
              </Text>
            </View>

            {displayedRoutes.map((route) => (
              <Pressable
                key={route.id}
                style={styles.routeCard}
                onPress={() => handleRouteClick(route.id)}
              >
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {route.title}
                  </Text>
                  <View style={[styles.statusBadge, getStatusBadgeStyle(route.statusTone)]}>
                    <Text style={[styles.statusBadgeText, getStatusTextStyle(route.statusTone)]}>
                      {route.statusLabel}
                    </Text>
                  </View>
                </View>

                {route.driverName ? (
                  <View style={styles.driverTagRow}>
                    <Feather name="user-check" size={13} color="#2563EB" />
                    <Text numberOfLines={1} style={styles.driverTagText}>
                      Driver: {route.driverName}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardDetailsRow}>
                  <View style={styles.detailItem}>
                    <Feather name="calendar" size={13} color="#64748B" />
                    <Text style={styles.detailText}>{route.dateLabel}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Feather name="map-pin" size={13} color="#64748B" />
                    <Text style={styles.detailText}>{route.stopCount} stops</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Feather name="navigation" size={13} color="#64748B" />
                    <Text style={styles.detailText}>{route.distanceLabel}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Feather name="clock" size={13} color="#64748B" />
                    <Text style={styles.detailText}>{route.durationLabel}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
        </View>
      </View>

      {/* Driver Selection Modal */}
      <Modal
        visible={showDriverDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriverDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDriverDropdown(false)} />
          <View
            style={[
              styles.dropdownSheet,
              { paddingBottom: Math.max(insets.bottom + 20, 28) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Driver</Text>
              <Pressable onPress={() => setShowDriverDropdown(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* Driver Search Field */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color="#98A2B3" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search driver by name, phone or email..."
                placeholderTextColor="#98A2B3"
                value={driverSearchQuery}
                onChangeText={setDriverSearchQuery}
              />
              {driverSearchQuery.length > 0 ? (
                <Pressable onPress={() => setDriverSearchQuery('')}>
                  <Feather name="x-circle" size={16} color="#98A2B3" />
                </Pressable>
              ) : null}
            </View>

            {/* Drivers Options */}
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {/* Option for All Drivers */}
              <Pressable
                style={[
                  styles.driverOptionItem,
                  selectedDriver === null && styles.driverOptionSelected,
                ]}
                onPress={() => {
                  setSelectedDriver(null);
                  setShowDriverDropdown(false);
                }}
              >
                <View style={styles.driverOptionIcon}>
                  <Feather name="users" size={18} color={selectedDriver === null ? '#2F76F6' : '#64748B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverOptionName, selectedDriver === null && styles.textSelected]}>
                    All Drivers
                  </Text>
                  <Text style={styles.driverOptionMeta}>Show routes for all drivers</Text>
                </View>
                {selectedDriver === null ? <Feather name="check" size={18} color="#2F76F6" /> : null}
              </Pressable>

              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriver?.driver_id === driver.driver_id;
                return (
                  <Pressable
                    key={driver.driver_id}
                    style={[
                      styles.driverOptionItem,
                      isSelected && styles.driverOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDriver(driver);
                      setShowDriverDropdown(false);
                    }}
                  >
                    <View style={styles.driverOptionIcon}>
                      <Feather name="user" size={18} color={isSelected ? '#2F76F6' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverOptionName, isSelected && styles.textSelected]}>
                        {driver.name}
                      </Text>
                      {driver.phone || driver.email ? (
                        <Text style={styles.driverOptionMeta}>
                          {[driver.phone, driver.email].filter(Boolean).join(' • ')}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? <Feather name="check" size={18} color="#2F76F6" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  workspaceSheet: {
    flex: 1,
    width: '96%',
    maxWidth: 1200,
    alignSelf: 'center',
    marginVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  sheetHandle: {
    width: 74,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    alignSelf: 'center',
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
  },
  selectorContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475467',
    marginBottom: 8,
  },
  dropdownButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    backgroundColor: '#F8FAFC',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 15,
    color: '#DC2626',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  routesList: {
    padding: 20,
  },
  countSummaryRow: {
    marginBottom: 14,
  },
  countSummaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeBlue: { backgroundColor: '#EFF6FF' },
  badgeTextBlue: { color: '#2563EB' },
  badgeGreen: { backgroundColor: '#F0FDF4' },
  badgeTextGreen: { color: '#16A34A' },
  badgeAmber: { backgroundColor: '#FFFBEB' },
  badgeTextAmber: { color: '#D97706' },
  badgePurple: { backgroundColor: '#F5F3FF' },
  badgeTextPurple: { color: '#7C3AED' },
  badgeRed: { backgroundColor: '#FEF2F2' },
  badgeTextRed: { color: '#DC2626' },
  badgeSlate: { backgroundColor: '#F1F5F9' },
  badgeTextSlate: { color: '#64748B' },
  driverTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  driverTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
    marginLeft: 6,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalBackdrop: {
    flex: 1,
  },
  dropdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#101828',
  },
  driverOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  driverOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  driverOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
  },
  driverOptionMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  textSelected: {
    color: '#2F76F6',
  },
});

