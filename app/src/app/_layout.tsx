import { Stack, useRouter, useSegments } from 'expo-router';
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme, Modal, Text, Pressable, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import './../global.css';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { AnimatedSplashOverlay } from './../components/animated-icon';
import { SecurityLockScreen } from './../components/security-lock-screen';
import { fetchAndStoreConfig, restoreAuthToken, setAuthToken, userService } from './../services/api';
import { getMySubscription } from './../services/api/subscriptionApi';

// Simple Auth Context for demonstration
const AuthContext = createContext({
  isLoggedIn: false,
  login: () => { },
  logout: () => { },
  refreshSubscription: async () => { },
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const AUTH_ONLY_ROUTES = ['login', 'signup', 'forgot-password'];
const PUBLIC_ROUTES = [...AUTH_ONLY_ROUTES, 'invite', 'landing', 'dispatch', 'driver-showcase', 'index', ''];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Feather.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const ICON_FONT_STYLE_ID = 'routeflow-vector-icon-fonts';
      if (!document.getElementById(ICON_FONT_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = ICON_FONT_STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(`
          @font-face {
            font-family: 'feather';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Feather';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Feather.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'material-community';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/MaterialCommunityIcons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'ionicons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'Ionicons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/Ionicons.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'fontawesome';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/FontAwesome.ttf') format('truetype');
            font-display: swap;
          }
          @font-face {
            font-family: 'FontAwesome';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.2.0/Fonts/FontAwesome.ttf') format('truetype');
            font-display: swap;
          }
        `));
        document.head.appendChild(style);
      }
    }
  }, []);

  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const router = useRouter();
  const segments = useSegments();

  // Restore auth state on app load
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await restoreAuthToken();
        if (token) {
          setIsLoggedIn(true);
          // Lock the app on cold start if user is already logged in
          if (Platform.OS !== 'web') {
            setIsAppLocked(true);
          }
          await fetchAndStoreConfig();
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const handleUnlocked = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  const checkTrial = useCallback(async () => {
    if (!isLoggedIn) {
      setIsTrialExpired(false);
      return;
    }

    try {
      const subRes = await getMySubscription().catch(() => null);
      if (subRes?.active && subRes?.subscription) {
        setIsTrialExpired(false);
        return;
      }

      const profileRes = await userService.getProfile().catch(() => null);
      const profile = profileRes?.success ? (profileRes.data ?? profileRes) as any : (profileRes || null);
      const userObj = profile?.user || profile;

      if (!userObj) {
        console.log("No user profile object resolved for trial check.");
        return;
      }

      const userRole = String(userObj.role || '').toUpperCase().trim();
      if (userRole === 'FLEET_DRIVER') {
        setIsTrialExpired(false);
        return;
      }

      const subscriptionType = String(userObj.subscription_type || userObj.subscriptionType || 'trial').toLowerCase();

      if (subscriptionType !== 'trial') {
        setIsTrialExpired(false);
        return;
      }

      if (subscriptionType !== 'trial' &&(userObj.created_at || userObj.createdAt)) {
        const createdAt = new Date(userObj.created_at || userObj.createdAt);
        const diffTime = Math.abs(Date.now() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) {
          setIsTrialExpired(true);
          return;
        }
      }

      setIsTrialExpired(false);
    } catch (err) {
      console.log('Error checking user trial status:', err);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        checkTrial();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkTrial]);

  const authContext = useMemo(() => ({
    isLoggedIn,
    isLoading,
    login: () => {
      setIsLoggedIn(true);
      // Don't lock on fresh login — user just authenticated
      setIsAppLocked(false);
      fetchAndStoreConfig();
      checkTrial();
    },
    logout: async () => {
      await setAuthToken(null);
      setIsLoggedIn(false);
    },
    refreshSubscription: checkTrial,
  }), [isLoggedIn, isLoading, checkTrial]);

  useEffect(() => {
    if (isLoggedIn) {
      checkTrial();
    }
  }, [isLoggedIn, segments, checkTrial]);

  useEffect(() => {
    // Check if the current route is an auth screen or public landing page
    const currentRoute = String((segments as any)[segments.length - 1] ?? '').replace(/[()]/g, '');
    const inAuthGroup = PUBLIC_ROUTES.includes(currentRoute);
    const authOnlyRoute = AUTH_ONLY_ROUTES.includes(currentRoute);

    if (!isLoading && !isLoggedIn) {
      if (Platform.OS === 'web') {
        if (!inAuthGroup) {
          // On Web: Non-public routes redirect to home root '/'
          router.replace('/');
        }
      } else {
        if (!AUTH_ONLY_ROUTES.includes(currentRoute) && currentRoute !== 'invite') {
          // On Mobile Native App (iOS/Android): Redirect directly to login screen
          router.replace('/(auth)/login' as any);
        }
      }
    } else if (!isLoading && isLoggedIn) {
      if (isTrialExpired) {
        // Trial has expired; a blocking modal dialog box is shown on top of the app.
        // No automatic redirect to /subscription here.
      } else if (authOnlyRoute || (Platform.OS === 'web' && (currentRoute === 'landing' || currentRoute === 'dispatch'))) {
        // If logged in and on an auth or public landing screen, redirect to home
        router.replace('/');
      }
    }
  }, [isLoggedIn, isLoading, isTrialExpired, segments, router]);

  if (isLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
      </ThemeProvider>
    );
  }

  const isSubscriptionPage = segments.join('/').includes('subscription');
  const inAuthGroup = PUBLIC_ROUTES.includes(String((segments as any)[segments.length - 1] ?? '').replace(/[()]/g, ''));

  return (
    <AuthContext.Provider value={authContext}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {isLoggedIn && isAppLocked && Platform.OS !== 'web' ? (
          <SecurityLockScreen onUnlocked={handleUnlocked} />
        ) : (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="landing" />
              <Stack.Screen name="dispatch" />
              <Stack.Screen name="driver-showcase" />
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/signup" />
              <Stack.Screen name="(auth)/forgot-password" />
              <Stack.Screen name="(MapScreen)/MapScreen" />
              <Stack.Screen name="route-points" />
              <Stack.Screen name="route-preview" />
              <Stack.Screen name="fleet-routes" />
              <Stack.Screen name="driver-route" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="team" />
              <Stack.Screen name="reports" />
              <Stack.Screen name="route-detail" />
              <Stack.Screen name="invite" />
            </Stack>

              <Modal
                visible={isLoggedIn && isTrialExpired && !isSubscriptionPage && !inAuthGroup}
                transparent={true}
                animationType="fade"
              >
                <View style={layoutStyles.modalOverlay}>
                  <View style={layoutStyles.modalContainer}>
                    <View style={layoutStyles.iconCircle}>
                      <Text style={layoutStyles.iconText}>⏳</Text>
                    </View>
                    <Text style={layoutStyles.modalTitle}>Trial Expired</Text>
                    <Text style={layoutStyles.modalMessage}>
                      Your 7-day free trial has expired. Subscribe to RouteFloww to continue organizing, scanning, and optimizing routes.
                    </Text>
                    <Pressable
                      style={layoutStyles.upgradeButton}
                      onPress={() => {
                        router.push('/subscription');
                      }}
                    >
                      <Text style={layoutStyles.upgradeButtonText}>Upgrade Subscription</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </>
          )}
        </ThemeProvider>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}

const layoutStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Sleek dark slate glassmorphism backdrop
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#2F74F5',
    borderRadius: 12,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
