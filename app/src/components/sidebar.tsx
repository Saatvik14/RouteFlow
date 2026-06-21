import { useAuth } from './../app/_layout';
import { restoreAuthToken } from './../services/api';
import { routesService } from './../services/api/routes';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTE_STATUS_IN_ARCHIVE } from '../app/(route-preview)/route-preview';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TokenUserPayload = {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  user?: {
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
  };
};

type SidebarUser = {
  name: string;
  email: string;
  phone?: string;
  initial: string;
};

type BackendRoute = {
  id?: string | number;
  route_id?: string | number;
  routeId?: string | number;
  name?: string;
  route_name?: string;
  status?: string;
  route_status?: string;
  state?: string;
  start_datetime?: string;
  created_at?: string;
  updated_at?: string;
  routeDate?: string;
};

type RouteStatusTone = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
type FeatherIconName = ComponentProps<typeof Feather>['name'];

type RouteHistoryItem = {
  id: string;
  title: string;
  date: string;
  statusLabel: string;
  statusTone: RouteStatusTone;
};

const getUserFromToken = (token: string): SidebarUser => {
  const decoded = jwtDecode<TokenUserPayload>(token);
  const tokenUser = decoded.user || decoded;

  const name = tokenUser.fullName || tokenUser.name || 'Driver';
  const email = tokenUser.email || 'driver@routeflow.com';
  const phone = tokenUser.phone || tokenUser.mobile || '';
  const initial = name.trim().charAt(0).toUpperCase() || 'D';

  return {
    name,
    email,
    phone,
    initial,
  };
};

const formatRouteDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

const toTitleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());

const getRouteStatusMeta = (status?: string): { label: string; tone: RouteStatusTone } => {
  const normalized = String(status || 'draft').toLowerCase().trim();

  if (['completed', 'complete', 'done', 'closed'].includes(normalized)) {
    return { label: 'Completed', tone: 'green' };
  }

  if (['active', 'in_transit', 'in-transit', 'started', 'running'].includes(normalized)) {
    return { label: normalized.includes('transit') ? 'In transit' : 'Active', tone: 'blue' };
  }

  if (['optimized', 'optimised', 'ready'].includes(normalized)) {
    return { label: 'Optimized', tone: 'purple' };
  }

  if (['pending', 'new', 'created', 'scheduled'].includes(normalized)) {
    return { label: toTitleCase(normalized), tone: 'amber' };
  }

  if (['failed', 'cancelled', 'canceled', 'error'].includes(normalized)) {
    return { label: toTitleCase(normalized), tone: 'red' };
  }

  return { label: toTitleCase(normalized || 'Draft'), tone: 'slate' };
};

const normalizeRoutes = (response: any): RouteHistoryItem[] => {
  const list: BackendRoute[] = Array.isArray(response)
    ? response
    : response?.routes || response?.data?.routes || response?.data || [];

  if (!Array.isArray(list)) return [];

  return list.map((route, index) => {
    const id = route.route_id ?? route.routeId ?? route.id ?? index + 1;
    const dateSource = route.start_datetime || route.routeDate || route.created_at || route.updated_at;
    const status = route.status || route.route_status || route.state;
    const statusMeta = getRouteStatusMeta(status);

    return {
      id: String(id),
      title: route.name || route.route_name || `Route ${index + 1}`,
      date: formatRouteDate(dateSource),
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
    };
  });
};


function getStatusBadgeStyle(tone: RouteStatusTone) {
  switch (tone) {
    case 'blue':
      return styles.statusBadge_blue;
    case 'green':
      return styles.statusBadge_green;
    case 'amber':
      return styles.statusBadge_amber;
    case 'purple':
      return styles.statusBadge_purple;
    case 'red':
      return styles.statusBadge_red;
    default:
      return styles.statusBadge_slate;
  }
}

function getStatusTextStyle(tone: RouteStatusTone) {
  switch (tone) {
    case 'blue':
      return styles.statusText_blue;
    case 'green':
      return styles.statusText_green;
    case 'amber':
      return styles.statusText_amber;
    case 'purple':
      return styles.statusText_purple;
    case 'red':
      return styles.statusText_red;
    default:
      return styles.statusText_slate;
  }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [user, setUser] = useState<SidebarUser>({
    name: 'Driver',
    email: 'driver@routeflow.com',
    phone: '',
    initial: 'D',
  });

  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState('');

  const [mounted, setMounted] = useState(isOpen);
  const translateX = useSharedValue(-450);
  const opacity = useSharedValue(0);

  // Action Panel State
  const [menuRouteId, setMenuRouteId] = useState<string | null>(null);
  const actionSheetTranslateY = useSharedValue(300);

  const sidebarWidth = useMemo(() => {
    if (width < 640) {
      return Math.min(Math.max(width * 0.94, 320), 420);
    }

    return Math.min(Math.max(width * 0.3, 330), 390);
  }, [width]);

  useEffect(() => {
    setSelectedRouteId((params.id as string) || null);
  }, [params.id]);

  useEffect(() => {
    if (!isOpen) return;

    const loadSidebarData = async () => {
      try {
        setRouteError('');
        setIsLoadingRoutes(true);

        const token = await restoreAuthToken();

        if (token) {
          setUser(getUserFromToken(token));
        }

        if (!token) {
          setRoutes([]);
          return;
        }

        const response = await routesService.getRoutes(20, 0);

        if (!response.success) {
          throw new Error(response.error || 'Unable to fetch routes');
        }

        setRoutes(normalizeRoutes(response.data));
      } catch (error) {
        console.log('Sidebar load error:', error);
        setRouteError('Unable to load routes');
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    loadSidebarData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      translateX.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 250 });
      translateX.value = withTiming(-sidebarWidth, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [isOpen, sidebarWidth]);

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));



  const handleHome = () => {
    onClose();
    router.replace('/' as never);
  };

  const handleCreateRoute = () => {
    onClose();
    router.push('/setup-locations' as never);
  };

  const handleSettings = () => {
    onClose();
    router.push('/settings' as never);
  };

  const handleSupport = () => {
    onClose();
    router.push('/support' as never);
  };

  const openRouteMenu = (routeId: string) => {
    setMenuRouteId(routeId);
    actionSheetTranslateY.value = withTiming(0, { duration: 300 });
  };

  const closeRouteMenu = () => {
    actionSheetTranslateY.value = withTiming(300, { duration: 250 }, (finished) => {
      if (finished) runOnJS(setMenuRouteId)(null);
    });
  };

  const performDelete = async () => {
    if (!menuRouteId) return;
    
    try {
       const response = await routesService.updateRoute({
         route_id: menuRouteId,
         is_active: false, 
       });
      if (response.success) {
        setRoutes(prev => prev.filter(r => r.id !== menuRouteId));
        if (selectedRouteId === menuRouteId) {
          router.replace('/' as any);
        }
        closeRouteMenu();
      } else {
        setRouteError('Could not delete route');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleRoutePress = (routeId: string) => {
    onClose();

    router.push({
      pathname: '/route-preview',
      params: {
        id: String(routeId),
      },
    } as never);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const renderQuickAction = (
    icon: FeatherIconName,
    label: string,
    onPress: () => void,
  ) => (
    <Pressable style={styles.quickActionButton} onPress={onPress}>
      <View style={styles.quickActionIconBox}>
        <Feather name={icon} size={16} color="#334155" />
      </View>
      <Text numberOfLines={1} style={styles.quickActionText}>
        {label}
      </Text>
    </Pressable>
  );

  const renderRouteItem = (route: RouteHistoryItem) => {
    const isActive = selectedRouteId === route.id;

    return (
      <Pressable
        key={route.id}
        style={[styles.routeItem, isActive && styles.activeRouteItem]}
        onPress={() => handleRoutePress(route.id)}>
        <View style={[styles.routeDatePill, isActive && styles.activeRouteDatePill]}>
          <Text style={[styles.routeDate, isActive && styles.activeRouteDate]}>
            {route.date || '--'}
          </Text>
        </View>

        <View style={styles.routeInfoBox}>
          <Text numberOfLines={1} style={[styles.routeTitle, isActive && styles.activeRouteTitle]}>
            {route.title}
          </Text>

          <View style={styles.routeMetaRow}>
            <Text numberOfLines={1} style={styles.routeIdText}>
              ID #{route.id}
            </Text>
            <View style={[styles.statusBadge, getStatusBadgeStyle(route.statusTone)]}>
              <Text style={[styles.statusBadgeText, getStatusTextStyle(route.statusTone)]}>
                {route.statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.routeMoreButton}
          hitSlop={12}
          onPress={(e) => {
            e.stopPropagation();
            openRouteMenu(route.id);
          }}>
          <Feather name="more-vertical" size={18} color={isActive ? '#2563EB' : '#94A3B8'} />
        </Pressable>
      </Pressable>
    );
  };

  const actionSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: actionSheetTranslateY.value }],
  }));

  if (!mounted) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          animatedSidebarStyle,
          {
            width: sidebarWidth,
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom + 10, 18),
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initial}</Text>
          </View>

          <View style={styles.profileTextBox}>
            <Text numberOfLines={1} style={styles.userName}>
              {user.name}
            </Text>

            <Text numberOfLines={1} style={styles.userEmail}>
              {user.email}
            </Text>

            {user.phone ? (
              <Text numberOfLines={1} style={styles.userPhone}>
                {user.phone}
              </Text>
            ) : null}
          </View>

          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={18} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.planCard}>
          <View style={styles.planIconCircle}>
            <Feather name="user" size={17} color="#2563EB" />
          </View>

          <View style={styles.planTextBox}>
            <Text style={styles.planTitle}>Free plan</Text>
            <Text style={styles.planSubtitle}>No subscription</Text>
          </View>

          <View style={styles.planRouteCountPill}>
            <Text style={styles.planRouteCountText}>{routes.length} routes</Text>
          </View>
        </View>

        <Pressable style={styles.subscribeButton}>
          <View style={styles.subscribeIconBox}>
            <MaterialCommunityIcons name="lightning-bolt" size={15} color="#F59E0B" />
          </View>
          <Text style={styles.subscribeText}>Upgrade subscription</Text>
        </Pressable>

        <View style={styles.quickActions}>
          {renderQuickAction('home', 'Home', handleHome)}
          {renderQuickAction('settings', 'Settings', handleSettings)}
          {renderQuickAction('help-circle', 'Support', handleSupport)}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Routes</Text>
            <Text style={styles.sectionTitle}>Recent activity</Text>
          </View>
          <Text style={styles.sectionCount}>{routes.length}</Text>
        </View>

        <ScrollView
          style={styles.routeList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.routeListContent}>
          {isLoadingRoutes ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && routeError ? (
            <View style={styles.emptyCard}>
              <Feather name="alert-circle" size={19} color="#EF4444" />
              <Text style={styles.emptyText}>{routeError}</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && !routeError && routes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="map" size={19} color="#64748B" />
              <Text style={styles.emptyText}>No routes created yet.</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && routes.map(renderRouteItem)}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.createRouteButton} onPress={handleCreateRoute}>
            <Feather name="plus" size={19} color="#FFFFFF" />
            <Text style={styles.createRouteText}>Create route</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={16} color="#64748B" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* Route Action Panel (Internal Action Sheet) */}
        {menuRouteId && (
          <>
            <Animated.View 
              entering={FadeIn.duration(200)} 
              exiting={FadeOut.duration(200)}
              style={styles.menuOverlay}
            >
              <Pressable style={{ flex: 1 }} onPress={closeRouteMenu} />
            </Animated.View>
            
            <Animated.View style={[styles.actionSheet, actionSheetStyle]}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.actionSheetTitle}>Route Actions</Text>
              
              <Pressable style={styles.actionButton} onPress={performDelete}>
                <View style={[styles.actionIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </View>
                <Text style={styles.actionButtonTextDanger}>Delete Route History</Text>
              </Pressable>

              <Pressable style={styles.actionCancelButton} onPress={closeRouteMenu}>
                <Text style={styles.actionCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 210,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderRightWidth: 1,
    borderRightColor: '#E7EDF6',
    elevation: 20,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 10,
      height: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 24,
    zIndex: 250,
  },

  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
    zIndex: 260,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  actionSheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  actionButtonTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },

  actionCancelButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },

  headerRow: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#EA580C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
  },

  profileTextBox: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },

  userEmail: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    color: '#64748B',
  },

  userPhone: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: '#64748B',
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5EAF3',
    marginLeft: 8,
  },

  planCard: {
    marginTop: 22,
    marginHorizontal: 18,
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE8F7',
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  planIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  planTextBox: {
    flex: 1,
    minWidth: 0,
  },

  planTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  planSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '400',
    color: '#64748B',
  },

  planRouteCountPill: {
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8F2',
  },

  planRouteCountText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
    color: '#64748B',
  },

  subscribeButton: {
    height: 44,
    marginTop: 12,
    marginHorizontal: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCE6F4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  subscribeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    marginRight: 8,
  },

  subscribeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2563EB',
  },

  quickActions: {
    marginTop: 14,
    marginHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quickActionButton: {
    width: '31.5%',
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#F7FAFE',
    borderWidth: 1,
    borderColor: '#E1E8F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  quickActionIconBox: {
    width: 26,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },

  quickActionText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    color: '#334155',
  },

  sectionHeader: {
    marginTop: 24,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E293B',
  },

  sectionCount: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EEF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },

  routeList: {
    flex: 1,
  },

  routeListContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  routeItem: {
    minHeight: 70,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },

  activeRouteItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#CFE2FF',
  },

  routeDatePill: {
    width: 54,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E7EDF6',
    marginRight: 11,
  },

  activeRouteDatePill: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },

  routeDate: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#64748B',
  },

  activeRouteDate: {
    color: '#1D4ED8',
  },

  routeInfoBox: {
    flex: 1,
    minWidth: 0,
  },

  routeTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.15,
  },

  activeRouteTitle: {
    color: '#1D4ED8',
  },

  routeMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },

  routeIdText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 7,
  },

  statusBadge: {
    minHeight: 21,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  statusBadgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
  },

  statusBadge_blue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  statusText_blue: {
    color: '#2563EB',
  },

  statusBadge_green: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },

  statusText_green: {
    color: '#16A34A',
  },

  statusBadge_amber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },

  statusText_amber: {
    color: '#D97706',
  },

  statusBadge_purple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },

  statusText_purple: {
    color: '#7C3AED',
  },

  statusBadge_red: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  statusText_red: {
    color: '#DC2626',
  },

  statusBadge_slate: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },

  statusText_slate: {
    color: '#64748B',
  },

  routeMoreButton: {
    width: 30,
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 6,
  },

  loadingBox: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E7EDF6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },

  emptyCard: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E7EDF6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },

  emptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
  },

  createRouteButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },

  createRouteText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    marginLeft: 8,
  },

  logoutButton: {
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },

  logoutText: {
    color: '#64748B',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 7,
  },
});
