import { Stack, useRouter, useSegments } from 'expo-router';
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme, Modal, Text, Pressable, View, StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from './../components/animated-icon';
import { SecurityLockScreen } from './../components/security-lock-screen';
import { fetchAndStoreConfig, restoreAuthToken, setAuthToken, userService } from './../services/api';

// Simple Auth Context for demonstration
const AuthContext = createContext({
  isLoggedIn: false,
  login: () => { },
  logout: () => { },
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ['login', 'signup', 'forgot-password'];

export default function RootLayout() {
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

  const authContext = useMemo(() => ({
    isLoggedIn,
    isLoading,
    login: () => {
      setIsLoggedIn(true);
      // Don't lock on fresh login — user just authenticated
      setIsAppLocked(false);
      fetchAndStoreConfig();
    },
      logout: async () => {
      await setAuthToken(null);
      setIsLoggedIn(false);
    },
  }), [isLoggedIn, isLoading]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsTrialExpired(false);
      return;
    }

    const checkTrial = async () => {
      try {
        const profileRes = await userService.getProfile();
        const profile = profileRes?.success ? (profileRes.data ?? profileRes) as any : (profileRes || null);
        const userObj = profile?.user || profile;

        if (!userObj) {
          console.log("No user profile object resolved for trial check.");
          return;
        }

        const subscriptionType = String(userObj.subscription_type || userObj.subscriptionType || 'trial').toLowerCase();

        if (subscriptionType === 'trial' && (userObj.created_at || userObj.createdAt)) {
          const createdAt = new Date(userObj.created_at || userObj.createdAt);
          const diffTime = Math.abs(Date.now() - createdAt.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) {
            setIsTrialExpired(true);
          }
        }
      } catch (err) {
        console.log('Error checking user trial status:', err);
      }
    };

    checkTrial();
  }, [isLoggedIn]);

  useEffect(() => {
    // Check if the current route is an auth screen
    const currentRoute = (segments as any)[1] ?? '';
    const inAuthGroup = PUBLIC_ROUTES.includes(currentRoute);
    // console.log('Current route:', segments[1], 'In auth group:', inAuthGroup);

    if (!isLoading && !isLoggedIn && !inAuthGroup) {
      // If not logged in and not on an auth screen, redirect to login
      router.replace('/login');
    } else if (!isLoading && isLoggedIn) {
      if (isTrialExpired) {
        // Trial has expired; a blocking modal dialog box is shown on top of the app.
        // No automatic redirect to /subscription here.
      } else if (inAuthGroup) {
        // If logged in and on an auth screen, redirect to home
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
  const inAuthGroup = PUBLIC_ROUTES.includes((segments as any)[1] ?? '');

  return (
    <AuthContext.Provider value={authContext}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {isLoggedIn && isAppLocked && Platform.OS !== 'web' ? (
          <SecurityLockScreen onUnlocked={handleUnlocked} />
        ) : isLoggedIn ? (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(MapScreen)/MapScreen" />
              <Stack.Screen name="route-points" />
              <Stack.Screen name="route-preview" />
            </Stack>

            <Modal
              visible={isTrialExpired && !isSubscriptionPage && !inAuthGroup}
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
                    Your 7-day free trial has expired. Subscribe to RouteFlow to continue organizing, scanning, and optimizing routes.
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
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/signup" />
            <Stack.Screen name="(auth)/forgot-password" />
          </Stack>
        )}
      </ThemeProvider>
    </AuthContext.Provider>
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
    fontWeight: '700',
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
