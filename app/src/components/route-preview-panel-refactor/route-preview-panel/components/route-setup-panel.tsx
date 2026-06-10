import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { LocationCard, StopListItem, SummaryCard } from './shared';

export function RouteSetupPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  onOpenSearch,
  onOptimizeRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

  return (
    <DraggableRouteSheet isWide={isWide}>
      <View style={styles.previewHeader}>
        <View style={styles.routeIconBox}>
          <Text style={styles.routeIconText}>↝</Text>
        </View>

        <View style={styles.previewTitleBox}>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {routeName || 'Route preview'}
            </Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>Active</Text>
            </View>
          </View>
          <Text style={styles.previewSubtitle}>{stopLabel} • Round trip</Text>
        </View>

        <Pressable style={styles.headerIconButton} onPress={onOpenSearch}>
          <Text style={styles.headerIconText}>⌕</Text>
        </Pressable>
        <Pressable style={styles.headerIconButton}>
          <Text style={styles.headerIconText}>⋮</Text>
        </Pressable>
      </View>

      <View style={[styles.summaryGrid, isWide && styles.summaryGridWeb]}>
        <SummaryCard tone="blue" icon="⌖" label="Stops" value={String(stops.length)} />
        <SummaryCard tone="green" icon="⌁" label="Distance" value={distanceLabel || '0 km'} />
        <SummaryCard tone="purple" icon="◷" label="Duration" value={durationLabel || '0 min'} />
        <SummaryCard tone="orange" icon="▣" label="Start time" value={startTime || 'Now'} />
      </View>

      <ScrollView
        style={styles.previewScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.previewScrollContent,
          { paddingBottom: Math.max(insets.bottom + 116, 130) },
        ]}
      >
        <View style={[styles.previewMain, isWide && styles.previewMainWeb]}>
          <View style={[styles.routeSetupCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Route setup</Text>
              <View style={styles.roundTripChip}>
                <Text style={styles.roundTripChipText}>↻ Round trip</Text>
              </View>
            </View>

            <LocationCard
              marker="start"
              title="Start location"
              subtitle={start.description || start.title || 'Use GPS position when optimizing'}
              time={startTime || 'Now'}
            />

            <View style={styles.locationConnector} />

            <LocationCard
              marker="end"
              title="End location"
              subtitle={end.description || end.title || 'Return to start location'}
              time={startTime || 'Now'}
            />
          </View>

          <View style={[styles.stopsCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Stops</Text>
              <Text style={styles.sectionMeta}>{stopLabel}</Text>
            </View>

            {stops.length ? (
              stops.map((stop: any) => <StopListItem key={stop.id} stop={stop} />)
            ) : (
              <View style={styles.noStopsCard}>
                <Text style={styles.noStopsTitle}>No stops added yet</Text>
                <Text style={styles.noStopsSubtitle}>Add delivery or pickup stops to build this route.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.previewFooter,
          isWide && styles.previewFooterWeb,
          { paddingBottom: Math.max(insets.bottom + 10, 18) },
        ]}
      >
        <Pressable style={[styles.secondaryActionButton, isWide && styles.actionButtonWeb]} onPress={onOpenSearch}>
          <Text style={styles.secondaryActionText}>Refine</Text>
        </Pressable>

        <Pressable style={[styles.primaryActionButton, isWide && styles.actionButtonWeb]} onPress={onOptimizeRoute}>
          <Text style={styles.primaryActionText}>↻ Optimize route</Text>
        </Pressable>
      </View>
    </DraggableRouteSheet>
  );
}
