import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { restoreAuthToken, setAuthToken } from '@/services/api';

// Simple Auth Context for demonstration
const AuthContext = createContext({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const segments = useSegments();

  // Restore auth state on app load
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await restoreAuthToken();
        if (token) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = useMemo(() => ({
    isLoggedIn,
    isLoading,
    login: () => setIsLoggedIn(true),
    logout: async () => {
      await setAuthToken(null);
      setIsLoggedIn(false);
    },
  }), [isLoggedIn, isLoading]);

  useEffect(() => {
    // Check if the current route is an auth screen
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'forgot-password';

    if (!isLoggedIn && !inAuthGroup) {
      // If not logged in and not on an auth screen, redirect to login
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // If logged in and on an auth screen, redirect to home
      router.replace('/');
    }
  }, [isLoggedIn, segments]);

  return (
    <AuthContext.Provider value={authContext}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {!isLoading && isLoggedIn ? (
          <AppTabs />
        ) : !isLoading ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
          </Stack>
        ) : null}
      </ThemeProvider>
    </AuthContext.Provider>
  );
}
