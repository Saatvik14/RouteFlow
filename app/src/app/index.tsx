import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { routesService } from '../services/api/routes';
import MapScreen from '../components/maps/RouteMap';
import { RoutePanel } from '../components/route-panel';
import { Sidebar } from '../components/sidebar';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkUserRoute() {
      try {
        const resp: any = await routesService.getRoutes(1, 0);
        const rawData = resp?.data ?? resp;
        const routesList = Array.isArray(rawData) ? rawData : (rawData?.routes || []);
        
        if (routesList && routesList.length > 0) {
          const latest = routesList[0];
          const routeId = latest.route_id || latest.id || latest.routeId;
          
          // Redirect to the last created route's preview page
          router.replace({
            pathname: '/route-preview',
            params: { id: String(routeId) }
          } as any);
        } else {
          // No routes found, stop loading and show onboarding on Home
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Home initialization route check failed:", error);
        setIsLoading(false);
      }
    }

    checkUserRoute();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.openingContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.openingLogo}
        />
        <Text style={styles.openingTitle}>
          Route<Text style={{ color: '#2F76F6' }}>Floww</Text>
        </Text>
        <Text style={styles.openingSubtitle}>Smart Route Optimization</Text>
        <ActivityIndicator size="small" color="#2F76F6" style={{ marginTop: 32 }} />
      </View>
    );
  }

  // Fallback UI for when no route exists - show the "Create your first route" panel
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <MapScreen />
        
        <Pressable
          style={[styles.menuButton, { top: insets.top + 16 }]}
          onPress={() => setIsSidebarOpen(true)}
        >
          <View style={styles.hamburger}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </Pressable>

        <RoutePanel />
        
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  openingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  openingLogo: {
    width: 104,
    height: 104,
    borderRadius: 24,
  },
  openingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  openingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  menuButton: {
    position: "absolute",
    left: 24,
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  hamburger: {
    width: 24,
    gap: 5,
  },
  bar: {
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
});