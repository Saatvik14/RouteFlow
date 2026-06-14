import { useAuth } from './../app/_layout';
import { restoreAuthToken } from './../services/api';
import { routesService } from './../services/api/routes';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  start_datetime?: string;
  created_at?: string;
  routeDate?: string;
};

type RouteHistoryItem = {
  id: string;
  title: string;
  date: string;
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

const normalizeRoutes = (response: any): RouteHistoryItem[] => {
  const list: BackendRoute[] = Array.isArray(response)
    ? response
    : response?.routes || response?.data?.routes || response?.data || [];

  if (!Array.isArray(list)) return [];

  return list.map((route, index) => {
    const id = route.route_id ?? route.routeId ?? route.id ?? index;
    const dateSource = route.start_datetime || route.routeDate || route.created_at;

    return {
      id: String(id),
      title: route.name || route.route_name || `Route ${index + 1}`,
      date: formatRouteDate(dateSource),
    };
  });
};

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

  const sidebarWidth = useMemo(() => {
    const mobileWidth = width * 0.92;
    const webWidth = width * 0.32;
    const calculatedWidth = width < 640 ? mobileWidth : webWidth;

    return Math.min(Math.max(calculatedWidth, 292), 360);
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

  if (!isOpen) return null;

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
    icon: string,
    label: string,
    onPress: () => void,
  ) => (
    <Pressable style={styles.quickActionButton} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text numberOfLines={1} style={styles.quickActionText}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View
        style={[
          styles.sidebar,
          {
            width: sidebarWidth,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom + 10, 18),
          },
        ]}>
        <View style={styles.profileRow}>
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
        </View>

        <View style={styles.planCard}>
          <View style={styles.planIconCircle}>
            <Text style={styles.planIcon}>👤</Text>
          </View>

          <View style={styles.planTextBox}>
            <Text style={styles.planTitle}>Free plan</Text>
            <Text style={styles.planSubtitle}>No subscription</Text>
          </View>

          <Text style={styles.planChevron}>⌄</Text>
        </View>

        <Pressable style={styles.subscribeButton}>
          <Text style={styles.subscribeIcon}>⚡</Text>
          <Text style={styles.subscribeText}>Subscribe</Text>
        </Pressable>

        <View style={styles.quickActions}>
          {renderQuickAction('⌂', 'Home', handleHome)}
          {renderQuickAction('⚙', 'Settings', handleSettings)}
          {renderQuickAction('?', 'Support', handleSupport)}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earlier this week</Text>
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
            <Text style={styles.emptyText}>{routeError}</Text>
          ) : null}

          {!isLoadingRoutes && !routeError && routes.length === 0 ? (
            <Text style={styles.emptyText}>No routes created yet.</Text>
          ) : null}

          {!isLoadingRoutes &&
            routes.map((route) => (
              <Pressable
                key={route.id}
                style={[
                  styles.routeItem,
                  selectedRouteId === route.id && styles.activeRouteItem,
                ]}
                onPress={() => handleRoutePress(route.id)}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.routeDate,
                    selectedRouteId === route.id && styles.activeRouteDate,
                  ]}>
                  {route.date || '--'}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.routeTitle,
                    selectedRouteId === route.id && styles.activeRouteTitle,
                  ]}>
                  {route.title}
                </Text>

                <Text style={styles.routeMore}>⋮</Text>
              </Pressable>
            ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.createRouteButton} onPress={handleCreateRoute}>
            <Text style={styles.createRouteIcon}>＋</Text>
            <Text style={styles.createRouteText}>Create route</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 210,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderRightWidth: 1,
    borderRightColor: '#E5EAF3',
    elevation: 18,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 8,
      height: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },

  profileRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9320A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '600',
  },

  profileTextBox: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: '#111827',
  },

  userEmail: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '400',
    color: '#64748B',
  },

  userPhone: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '400',
    color: '#64748B',
  },

  planCard: {
    marginTop: 24,
    marginHorizontal: 14,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE6F4',
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  planIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  planIcon: {
    fontSize: 16,
    lineHeight: 20,
  },

  planTextBox: {
    flex: 1,
    minWidth: 0,
  },

  planTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2563EB',
  },

  planSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: '#64748B',
  },

  planChevron: {
    width: 20,
    textAlign: 'right',
    fontSize: 14,
    lineHeight: 18,
    color: '#94A3B8',
  },

  subscribeButton: {
    height: 42,
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE6F4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  subscribeIcon: {
    fontSize: 14,
    lineHeight: 18,
    marginRight: 7,
  },

  subscribeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: '#2563EB',
  },

  quickActions: {
    marginTop: 14,
    marginHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
  },

  quickActionButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F4F7FC',
    borderWidth: 1,
    borderColor: '#E1E8F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 6,
  },

  quickActionIcon: {
    fontSize: 13,
    lineHeight: 17,
    color: '#475569',
    marginRight: 5,
  },

  quickActionText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: '#334155',
  },

  sectionHeader: {
    marginTop: 26,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },

  routeList: {
    flex: 1,
  },

  routeListContent: {
    paddingHorizontal: 10,
    paddingBottom: 14,
  },

  routeItem: {
    minHeight: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 4,
  },

  activeRouteItem: {
    backgroundColor: '#EEF6FF',
  },

  routeDate: {
    width: 58,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '500',
    color: '#8A97AA',
  },

  activeRouteDate: {
    color: '#2563EB',
  },

  routeTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: '#111827',
  },

  activeRouteTitle: {
    color: '#1D4ED8',
    fontWeight: '600',
  },

  routeMore: {
    width: 22,
    textAlign: 'right',
    fontSize: 22,
    lineHeight: 22,
    color: '#2563EB',
    fontWeight: '500',
  },

  loadingBox: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '400',
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    paddingHorizontal: 8,
    marginTop: 6,
  },

  footer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },

  createRouteButton: {
    height: 46,
    borderRadius: 9,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  createRouteIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    marginRight: 8,
  },

  createRouteText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },

  logoutButton: {
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  logoutText: {
    color: '#475569',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '500',
  },
});
