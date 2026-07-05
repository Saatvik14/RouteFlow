import { Stack, useRouter, useSegments } from 'expo-router';
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

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

  const lastUnlockTimeRef = useRef<number>(0);

  // Lock app when returning from background (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Ignore locking if the app was unlocked within the last 2 seconds
        // to prevent the biometric dialog dismissal from re-locking the app.
        const timeSinceUnlock = Date.now() - lastUnlockTimeRef.current;
        if (isLoggedIn && timeSinceUnlock > 2000) {
          setIsAppLocked(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isLoggedIn]);

  const handleUnlocked = useCallback(() => {
    lastUnlockTimeRef.current = Date.now();
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

        const subscriptionType = userObj.subscription_type || userObj.subscriptionType || 'trial';

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
    const currentRoute = segments[1] ?? '';
    const inAuthGroup = PUBLIC_ROUTES.includes(currentRoute);
    // console.log('Current route:', segments[1], 'In auth group:', inAuthGroup);

    if (!isLoading && !isLoggedIn && !inAuthGroup) {
      // If not logged in and not on an auth screen, redirect to login
      router.replace('/login');
    } else if (!isLoading && isLoggedIn) {
      if (isTrialExpired) {
        // If trial has expired, only allow them to visit /subscription or auth screens
        const isSubscriptionPage = segments.join('/').includes('subscription');
        if (!isSubscriptionPage && !inAuthGroup) {
          router.replace('/subscription');
        }
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

  return (
    <AuthContext.Provider value={authContext}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {isLoggedIn && isAppLocked && Platform.OS !== 'web' ? (
          <SecurityLockScreen onUnlocked={handleUnlocked} />
        ) : isLoggedIn ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(MapScreen)/MapScreen" />
            <Stack.Screen name="route-points" />
            <Stack.Screen name="route-preview" />
          </Stack>
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
