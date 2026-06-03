import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import MapScreen from '../MapScreen';

export default function Index() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <MapScreen />
      
      {/* Sidebar Toggle Button */}
      <Pressable 
        style={[styles.menuButton, { top: insets.top + Spacing.three, left: Spacing.three }]}
        onPress={() => alert('Open Sidebar')}>
        <ThemedView type="backgroundElement" style={styles.iconWrapper}>
          <SymbolView name="line.3.horizontal" size={24} tintColor={theme.text} />
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuButton: {
    position: 'absolute',
    zIndex: 10,
  },
  iconWrapper: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});