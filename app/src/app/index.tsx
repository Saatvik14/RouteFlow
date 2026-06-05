import { useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoutePanel } from '@/components/route-panel';
import { Sidebar } from '@/components/sidebar';
import MapScreen from './(MapScreen)/MapScreen';

export default function Index() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  // const isDark = colorScheme === 'dark';
  const isDark = false
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const colors = {
    buttonBg: isDark ? '#151A21' : '#FFFFFF',
    buttonBorder: isDark ? '#2A3340' : '#E5EAF2',
    icon: isDark ? '#FFFFFF' : '#111827',
    shadow: isDark ? '#000000' : '#8BADEB',
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <MapScreen />

      <Pressable
        style={[
          styles.menuButton,
          {
            top: insets.top + 16,
            left: 20,
            backgroundColor: colors.buttonBg,
            borderColor: colors.buttonBorder,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={() => setIsSidebarOpen(true)}>
        <View style={styles.hamburger}>
          <View style={[styles.bar, { backgroundColor: colors.icon }]} />
          <View style={[styles.bar, { backgroundColor: colors.icon }]} />
          <View style={[styles.bar, { backgroundColor: colors.icon }]} />
        </View>
      </Pressable>

      <RoutePanel />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  menuButton: {
    position: 'absolute',
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
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
  },
});