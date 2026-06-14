import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { LocationCard, StopListItem, SummaryCard } from './shared';

export function ConfirmedRoutePanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  routeStatus,
  isStartingRoute,
  onOpenSearch,
  onRefine,
  onConfirm,
  onStartRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

  const normalizedStatus = String(routeStatus || '').toLowerCase();
  const isReadyToStart =
    normalizedStatus === 'optimized' || normalizedStatus === 'confirmed';

  const isInTransit = normalizedStatus === 'in_transit';

  const primaryButtonDisabled = Boolean(
    isStartingRoute || isInTransit || (isReadyToStart && !onStartRoute),
  );

  const handlePrimaryAction = () => {
    if (isReadyToStart) {
      onStartRoute?.();
      return;
    }

    onConfirm();
  };

  const primaryLabel = isReadyToStart
    ? isStartingRoute
      ? 'Starting...'
      : 'Start route'
    : 'Confirm route';

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="middle">
      <View style={styles.previewHeader}>
        <View style={styles.routeIconBox}>
          <Text style={styles.routeIconText}>✓</Text>
        </View>

        <View style={styles.previewTitleBox}>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {routeName || 'Optimized route'}
            </Text>

            <View style={[styles.statusChip, styles.optimizedChip]}>
              <Text style={[styles.statusChipText, styles.optimizedChipText]}>
                Optimized
              </Text>
            </View>
          </View>

          <Text style={styles.previewSubtitle}>
            {stopLabel} • {distanceLabel} • {durationLabel}
          </Text>
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
          { paddingBottom: Math.max(insets.bottom + 104, 118) },
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
              subtitle={start.description || start.title || 'Used GPS position when optimizing'}
              time={startTime || 'Now'}
            />

            <View style={styles.locationConnector} />

            <LocationCard
              marker="end"
              title="End location"
              subtitle={end.description || end.title || 'Return to start location'}
              time="End"
            />
          </View>

          <View style={[styles.stopsCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Optimized stops</Text>
              <Text style={styles.sectionMeta}>{durationLabel}</Text>
            </View>

            {stops.map((stop: any) => (
              <StopListItem key={stop.id} stop={stop} />
            ))}
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
        <View style={styles.confirmSummaryPill}>
          <Text style={styles.confirmSummaryLabel}>Total</Text>
          <Text style={styles.confirmSummaryValue}>{durationLabel || '0 min'}</Text>
        </View>

        <Pressable
          style={[styles.refineActionButton, isWide && styles.confirmActionWeb]}
          onPress={onRefine}
        >
          <Text style={styles.refineActionText}>
            {isReadyToStart ? 'Edit' : 'Refine'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.primaryActionButton,
            isWide && styles.confirmActionWeb,
            primaryButtonDisabled && styles.buttonDisabled,
          ]}
          onPress={handlePrimaryAction}
          disabled={primaryButtonDisabled}
        >
          <Text style={styles.primaryActionText}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </DraggableRouteSheet>
  );
}
