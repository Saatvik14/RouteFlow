import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { McIcon, PackageActionIcon, RowIcon } from './icons';
import { RouteCompletionPromptPanel } from './completion-panels';

export function TransitStopPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  activeStop,
  activeStopIndex = 0,
  totalActiveStops = 0,
  isUpdatingStopStatus,
  isCompletingRoute,
  onOpenSearch,
  onNavigateActiveStop,
  onMarkStopDelivered,
  onMarkStopFailed,
  onMarkRouteCompleted,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stop: any = activeStop || null;

  if (!stop) {
    return (
      <RouteCompletionPromptPanel
        isWide={isWide}
        routeName={routeName}
        start={start}
        end={end}
        stops={stops}
        startTime={startTime}
        durationLabel={durationLabel}
        distanceLabel={distanceLabel}
        isCompletingRoute={isCompletingRoute}
        onOpenSearch={onOpenSearch}
        onMarkRouteCompleted={onMarkRouteCompleted}
      />
    );
  }

  const stopTitle =
    stop.title ||
    stop.address ||
    stop.description ||
    `Stop ${activeStopIndex + 1}`;

  const stopAddress =
    stop.subtitle ||
    stop.description ||
    stop.address ||
    'Address not available';

  const stopCode =
    stop.orderId ||
    stop.backendOrderId ||
    stop.id ||
    `A${activeStopIndex + 1}`;

  const stopTime = stop.eta || stop.time || '';
  const progressLabel = `${activeStopIndex + 1}/${totalActiveStops || 1}${stopTime ? `, ${stopTime}` : ''
    }`;

  return (
    <DraggableRouteSheet isWide={isWide} mode="large" variant="transit">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.transitSheetContent,
          { paddingBottom: Math.max(insets.bottom + 18, 28) },
        ]}
      >
        <View style={styles.transitHeader}>
          <View style={styles.transitHeaderTextBox}>
            <Text style={styles.transitTitle} numberOfLines={2}>
              {stopTitle}
            </Text>

            <View style={styles.transitProgressRow}>
              <View style={styles.transitBlueDot} />
              <Text style={styles.transitProgressText}>{progressLabel}</Text>
            </View>
          </View>

          <Pressable style={styles.transitCloseButton} hitSlop={10}>
            <Feather name="x" size={28} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.transitActionsRow}>
          <Pressable
            style={[styles.transitActionCard, styles.transitNavigateCard]}
            onPress={onNavigateActiveStop}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <MaterialCommunityIcons
              name="navigation-variant"
              size={35}
              color="#FFFFFF"
            />

            <Text style={[styles.transitActionText, styles.transitNavigateText]}>
              Navigate
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.transitActionCard,
              isUpdatingStopStatus && styles.buttonDisabled,
            ]}
            onPress={onMarkStopFailed}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="failed" />

            <Text style={styles.transitActionText}>
              {isUpdatingStopStatus ? 'Updating...' : 'Failed'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.transitActionCard,
              isUpdatingStopStatus && styles.buttonDisabled,
            ]}
            onPress={onMarkStopDelivered}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="delivered" />

            <Text style={styles.transitActionText}>
              {isUpdatingStopStatus ? 'Updating...' : 'Delivered'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stopRowsBlock}>
          <Pressable style={styles.stopDetailRow}>
            <McIcon name="note-text-outline" size={29} color="#475569" />

            <Text style={styles.stopMutedText}>Add notes</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.stopDetailRow}>
            <McIcon name="map-outline" size={30} color="#475569" />

            <Text style={styles.stopMainText} numberOfLines={2}>
              {stopAddress}
            </Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.stopDetailRow}>
            <View style={styles.rowIconBox}>
              <Text style={styles.stopIdIcon}>ID</Text>
            </View>

            <Text style={styles.stopMainText} numberOfLines={1}>
              {String(stopCode)}{' '}
              <Text style={styles.stopMutedInlineText}>
                Originally {activeStopIndex + 1}
              </Text>
            </Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>
        </View>

        <View style={styles.transitOptionsBlock}>
          <Pressable style={styles.transitOptionRow}>
            <RowIcon name="edit-3" size={28} color="#475569" />

            <Text style={styles.transitOptionText}>Edit stop</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.transitOptionRow}>
            <McIcon name="content-duplicate" size={30} color="#475569" />

            <Text style={styles.transitOptionText}>Duplicate stop</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>
        </View>
      </ScrollView>
    </DraggableRouteSheet>
  );
}
