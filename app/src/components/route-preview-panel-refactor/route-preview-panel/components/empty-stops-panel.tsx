import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

export function EmptyStopsPanel({
  isWide,
  onOpenSearch,
  onCopyStopsFromPastRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="bottom">
      <Pressable style={styles.searchRow} onPress={onOpenSearch}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Tap to add stops</Text>
        <Text style={styles.searchSideIcon}>⌗</Text>
        <Text style={styles.searchSideIcon}>🎙</Text>
        <Text style={styles.moreText}>⋮</Text>
      </Pressable>

      <View style={styles.emptyBody}>
        <Text style={styles.emptyIcon}>▢</Text>
        <Text style={styles.emptyText}>
          Add your first stops to start{'\n'}creating your route
        </Text>
      </View>

      <View style={[styles.emptyFooter, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
        <Pressable style={styles.primaryFullButton} onPress={onOpenSearch}>
          <Text style={styles.primaryFullButtonText}>＋ Add stops</Text>
        </Pressable>

        <Pressable style={styles.secondaryFullButton} onPress={onCopyStopsFromPastRoute}>
          <Text style={styles.secondaryFullButtonText}>Copy stops from a past route</Text>
        </Pressable>
      </View>
    </DraggableRouteSheet>
  );
}
