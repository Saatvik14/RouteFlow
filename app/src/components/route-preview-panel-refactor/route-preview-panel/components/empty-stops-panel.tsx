import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

export function EmptyStopsPanel({
  isWide,
  onOpenSearch,
  onCopyStopsFromPastRoute,
  isAddingStop,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="bottom">
      <Pressable style={styles.searchRow} onPress={onOpenSearch} disabled={isAddingStop}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Tap to add stops</Text>
      </Pressable>

      <View style={styles.emptyBody}>
        <Text style={styles.emptyIcon}>▢</Text>
        <Text style={styles.emptyText}>
          Add your first stops to start{'\n'}creating your route
        </Text>
      </View>

      <View style={[styles.emptyFooter, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
        <Pressable
          style={[styles.primaryFullButton, isAddingStop && localStyles.disabledButton]}
          onPress={onOpenSearch}
          disabled={isAddingStop}
        >
          <Text style={styles.primaryFullButtonText}>＋ Add stops</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryFullButton, isAddingStop && localStyles.disabledButton]}
          onPress={onCopyStopsFromPastRoute}
          disabled={isAddingStop}
        >
          <Text style={styles.secondaryFullButtonText}>Copy stops from a past route</Text>
        </Pressable>
      </View>

      {isAddingStop ? (
        <View style={localStyles.loadingOverlay}>
          <View style={localStyles.loadingCard}>
            <ActivityIndicator size="large" color="#2F76F6" />
            <Text style={localStyles.loadingTitle}>Copying stops</Text>
            <Text style={localStyles.loadingText}>
              Creating the selected stops and preparing your route...
            </Text>
          </View>
        </View>
      ) : null}
    </DraggableRouteSheet>
  );
}


const localStyles = StyleSheet.create({
  disabledButton: {
    opacity: 0.55,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  loadingTitle: {
    marginTop: 14,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
