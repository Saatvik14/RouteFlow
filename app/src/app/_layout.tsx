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
import { fetchAndStoreConfig, restoreAuthToken, setAuthToken } from './../services/api';

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

  // Lock app when returning from background (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground — lock if user is logged in
        if (isLoggedIn) {
          setIsAppLocked(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isLoggedIn]);

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
    // Check if the current route is an auth screen
    const currentRoute = segments[1] ?? '';
    const inAuthGroup = PUBLIC_ROUTES.includes(currentRoute);
    // console.log('Current route:', segments[1], 'In auth group:', inAuthGroup);

    if (!isLoading && !isLoggedIn && !inAuthGroup) {
      // If not logged in and not on an auth screen, redirect to login
      router.replace('/login');
    } else if (!isLoading && isLoggedIn && inAuthGroup) {
      // If logged in and on an auth screen, redirect to home
      router.replace('/');
    }
  }, [isLoggedIn, isLoading, segments, router]);

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
