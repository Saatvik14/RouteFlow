import { useAuth } from '@/app/_layout';
import { restoreAuthToken } from '@/services/api';
import { routesService } from '@/services/api/routes';
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
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  routeName?: string;
  createdAt?: string;
  created_time?: string;
  createdTime?: string;
};

type RouteHistoryItem = {
  id: string;
  title: string;
  date: string;
};

const getUserFromToken = (token: string): SidebarUser => {
  const decoded = jwtDecode<TokenUserPayload>(token);

  const tokenUser = decoded.user || decoded;

  const name =
    tokenUser.fullName ||
    tokenUser.name ||
    'Driver';

  const email =
    tokenUser.email ||
    'driver@routeflow.com';

  const phone =
    tokenUser.phone ||
    tokenUser.mobile ||
    '';

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
    : response?.routes ||
      response?.data?.routes ||
      response?.data ||
      [];

  if (!Array.isArray(list)) return [];

  return list.map((route, index) => {
    const id = route.id || route._id || String(index);

    return {
      id,
      title:
        route.routeName ||
        route.name ||
        route.title ||
        `Route ${index + 1}`,
      date: formatRouteDate(
        route.createdAt ||
          route.createdTime ||
          route.created_time
      ),
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
    return Math.min(width * 0.82, 310);
  }, [width]);

  useEffect(() => {
    // Sync the selected highlight with the current route ID in the URL
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
          const decodedUser = getUserFromToken(token);
          setUser(decodedUser);
        }

        if (!token) {
          setRoutes([]);
          return;
        }

        // Using the routesService to fetch the last 20 routes
        const response = await routesService.getRoutes(20, 0);

        if (!response.success) {
          throw new Error(response.error || 'Unable to fetch routes');
        }
        const routeList = normalizeRoutes(response.data);

        setRoutes(routeList);
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
    // Close sidebar before navigating to ensure smooth transition
    onClose();

    // Navigate to the preview screen
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

  return (
    <>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View
        style={[
          styles.sidebar,
          {
            width: sidebarWidth,
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom + 8, 18),
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

          <View style={styles.planChevronBox}>
            <Text style={styles.planChevron}>⌃</Text>
            <Text style={styles.planChevron}>⌄</Text>
          </View>
        </View>

        <Pressable style={styles.subscribeButton}>
          <Text style={styles.subscribeText}>⚡  Subscribe</Text>
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable style={styles.quickActionButton} onPress={handleSettings}>
            <Text style={styles.quickActionText}>⚙ Settings</Text>
          </Pressable>

          <Pressable style={styles.quickActionButton} onPress={handleSupport}>
            <Text style={styles.quickActionText}>💬 Support</Text>
          </Pressable>
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
              <ActivityIndicator size="small" color="#2F76F6" />
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
            routes.map((route, index) => (
              <Pressable
                key={route.id}
                style={[
                  styles.routeItem,
                  selectedRouteId === route.id && styles.activeRouteItem,
                ]}
                onPress={() => handleRoutePress(route.id)}>
                <Text
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
            <Text style={styles.createRouteText}>＋  Create route</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 210,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E8EEF7',
    elevation: 22,
    shadowColor: '#000000',
    shadowOffset: {
      width: 8,
      height: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },

  topActions: {
    height: 30,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },

  topIconButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topIconText: {
    fontSize: 17,
    lineHeight: 22,
    color: '#52637A',
    fontWeight: '700',
  },

  profileRow: {
    marginTop: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9340B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
  },

  profileTextBox: {
    flex: 1,
  },

  userName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#111827',
  },

  userEmail: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
    color: '#475467',
  },

  userPhone: {
    marginTop: 1,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
    color: '#667085',
  },

  planCard: {
    marginTop: 18,
    marginHorizontal: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE6F2',
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  planIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DDEBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  planIcon: {
    fontSize: 14,
  },

  planTextBox: {
    flex: 1,
  },

  planTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: '#2875F0',
  },

  planSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  planChevronBox: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  planChevron: {
    fontSize: 10,
    lineHeight: 9,
    color: '#9AA6B8',
  },

  subscribeButton: {
    height: 32,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDE6F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  subscribeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#2475F0',
  },

  quickActions: {
    marginTop: 12,
    marginHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
  },

  quickActionButton: {
    flex: 1,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#F3F7FF',
    borderWidth: 1,
    borderColor: '#E3EBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickActionText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    color: '#344054',
  },

  sectionHeader: {
    marginTop: 24,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },

  routeList: {
    flex: 1,
  },

  routeListContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },

  routeItem: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },

  activeRouteItem: {
    backgroundColor: '#EAF3FF',
  },

  routeDate: {
    width: 58,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: '#8A97AA',
  },

  activeRouteDate: {
    color: '#6FA3F7',
  },

  routeTitle: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
    color: '#111827',
  },

  activeRouteTitle: {
    color: '#2475F0',
  },

  routeMore: {
    width: 20,
    textAlign: 'right',
    fontSize: 19,
    lineHeight: 22,
    color: '#2F76F6',
    fontWeight: '700',
  },

  loadingBox: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  loadingText: {
    fontSize: 12.5,
    color: '#667085',
    fontWeight: '500',
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
    paddingHorizontal: 8,
    marginTop: 6,
  },

  footer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },

  createRouteButton: {
    height: 38,
    borderRadius: 6,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createRouteText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },

  logoutButton: {
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  logoutText: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
});