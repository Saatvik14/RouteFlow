import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { countStopsByStatus, formatStopCount, getStopSubtitle, getStopTitle, isDeliveredStop, isFailedStop } from '../utils';
import { DraggableRouteSheet } from './draggable-route-sheet';

function CompletionTimelineItem({
  time,
  title,
  subtitle,
  marker,
  isLast,
  status,
}: {
  time: string;
  title: string;
  subtitle: string;
  marker: string;
  isLast?: boolean;
  status?: 'delivered' | 'failed' | 'start' | 'end';
}) {
  const isDelivered = status === 'delivered';
  const isFailed = status === 'failed';
  const isStart = status === 'start';
  const isEnd = status === 'end';

  return (
    <View style={styles.completionTimelineItem}>
      <View style={styles.completionTimeBox}>
        <Text style={[styles.completionTimeText, isLast && styles.completionTimeActiveText]}>
          {time}
        </Text>
      </View>

      <View style={styles.completionMarkerColumn}>
        <View
          style={[
            styles.completionMarker,
            isDelivered && styles.completionMarkerSuccess,
            isFailed && styles.completionMarkerDanger,
            isStart && styles.completionMarkerStart,
            isEnd && styles.completionMarkerEnd,
          ]}
        >
          {isDelivered ? (
            <Feather name="check" size={13} color="#FFFFFF" />
          ) : isFailed ? (
            <Feather name="x" size={13} color="#FFFFFF" />
          ) : isEnd ? (
            <MaterialCommunityIcons name="flag" size={14} color="#FFFFFF" />
          ) : (
            <Text style={styles.completionMarkerText}>{marker}</Text>
          )}
        </View>

        {!isLast ? <View style={styles.completionMarkerLine} /> : null}
      </View>

      <View style={[styles.completionTimelineCard, isLast && styles.completionTimelineCardActive]}>
        <View style={styles.completionTimelineTextBox}>
          <Text
            style={[styles.completionTimelineTitle, isLast && styles.completionTimelineTitleActive]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={styles.completionTimelineSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {isDelivered || isFailed ? (
          <View
            style={[
              styles.completionStatusBadge,
              isDelivered ? styles.completionStatusSuccess : styles.completionStatusFailed,
            ]}
          >
            <Text
              style={[
                styles.completionStatusText,
                isDelivered ? styles.completionStatusSuccessText : styles.completionStatusFailedText,
              ]}
            >
              {isDelivered ? 'Done' : 'Failed'}
            </Text>
          </View>
        ) : isEnd ? (
          <View style={styles.completionEndIconBox}>
            <MaterialCommunityIcons name="flag" size={21} color="#2563EB" />
          </View>
        ) : null}
      </View>
    </View>
  );
}
export function RouteCompletionPromptPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  isCompletingRoute,
  onOpenSearch,
  onMarkRouteCompleted,
}: Pick<
  RoutePreviewPanelProps,
  | 'routeName'
  | 'start'
  | 'end'
  | 'stops'
  | 'startTime'
  | 'durationLabel'
  | 'distanceLabel'
  | 'isCompletingRoute'
  | 'onOpenSearch'
  | 'onMarkRouteCompleted'
> & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const routeStops = Array.isArray(stops) ? stops : [];
  const stats = countStopsByStatus(routeStops);
  const pendingCount = routeStops.length > 0 && stats.resolved === 0 ? 0 : stats.pending;
  const finishMeta = `Finish route • ${formatStopCount(pendingCount)} pending • ${distanceLabel || '0 km'}`;
  const buttonDisabled = Boolean(isCompletingRoute || !onMarkRouteCompleted);

  return (
    <DraggableRouteSheet isWide={isWide} mode="large" variant="transit">
      <View style={styles.completionTopBar}>
        <View style={styles.completionTopTextBox}>
          <Text style={styles.completionTopTitle} numberOfLines={1}>
            {finishMeta}
          </Text>
          <Text style={styles.completionTopSubtitle} numberOfLines={1}>
            {routeName || 'All route stops are finished'}
          </Text>
        </View>

        <Pressable style={styles.completionIconButton} onPress={onOpenSearch}>
          <Feather name="search" size={25} color="#64748B" />
        </Pressable>

        <Pressable style={styles.completionIconButton}>
          <Feather name="more-vertical" size={25} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.completionContent,
          { paddingBottom: Math.max(insets.bottom + 18, 28) },
        ]}
      >
        <View style={styles.completionTimelineBlock}>
          <CompletionTimelineItem
            time={startTime || 'Start'}
            title="Start location"
            subtitle={start.description || start.title || 'Used GPS position when optimizing'}
            marker="•"
            status="start"
          />

          {routeStops.map((stop: any, index: number) => {
            const delivered = isDeliveredStop(stop);
            const failed = isFailedStop(stop);
            const stopStatus = delivered ? 'delivered' : failed ? 'failed' : undefined;
            const marker = String(stop.sequence || index + 1).padStart(2, '0');

            return (
              <CompletionTimelineItem
                key={stop.id || stop.backendOrderId || `${index}`}
                time={stop.eta || stop.time || marker}
                title={getStopTitle(stop, `Stop ${index + 1}`)}
                subtitle={getStopSubtitle(stop)}
                marker={marker}
                status={stopStatus}
              />
            );
          })}

          <CompletionTimelineItem
            time={durationLabel || 'End'}
            title={end.title || 'End location'}
            subtitle={end.description || 'Route is ready to be closed'}
            marker="✓"
            status="end"
            isLast
          />
        </View>

        <Pressable
          style={[styles.markRouteCompletedButton, buttonDisabled && styles.buttonDisabled]}
          onPress={onMarkRouteCompleted}
          disabled={buttonDisabled}
        >
          <Feather name="check" size={23} color="#2563EB" />
          <Text style={styles.markRouteCompletedText}>
            {isCompletingRoute ? 'Completing route...' : 'Mark route as completed'}
          </Text>
        </Pressable>
      </ScrollView>
    </DraggableRouteSheet>
  );
}
export function RouteCompletedPanel({
  isWide,
  routeName,
  stops,
  distanceLabel,
  durationLabel,
  onCopyStopsToNewRoute,
  onCreateNewRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const routeStops = Array.isArray(stops) ? stops : [];
  const stats = countStopsByStatus(routeStops);
  const statusText = stats.failed > 0
    ? `${stats.delivered} delivered • ${stats.failed} failed`
    : 'All successful';

  return (
    <DraggableRouteSheet isWide={isWide} mode="large" variant="transit">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.routeCompletedContent,
          { paddingBottom: Math.max(insets.bottom + 20, 30) },
        ]}
      >
        <View style={styles.routeCompletedHeroCard}>
          <View style={styles.routeCompletedIconBox}>
            <Feather name="check" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.routeCompletedTitle}>Route completed!</Text>

          <Text style={styles.routeCompletedSubtitle} numberOfLines={1}>
            {routeName || `${distanceLabel || 'Route'} • ${durationLabel || 'Done'}`}
          </Text>

          <View style={styles.routeCompletedStatsRow}>
            <View style={styles.routeCompletedStatsLeft}>
              <MaterialCommunityIcons name="map-marker-check-outline" size={27} color="#475569" />
              <Text style={styles.routeCompletedStatsText}>{formatStopCount(routeStops.length)}</Text>
            </View>

            <Text style={styles.routeCompletedStatusText}>{statusText}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.copyRouteButton, !onCopyStopsToNewRoute && styles.buttonDisabled]}
          onPress={onCopyStopsToNewRoute}
          disabled={!onCopyStopsToNewRoute}
        >
          <MaterialCommunityIcons name="map-marker-plus-outline" size={28} color="#2563EB" />
          <Text style={styles.copyRouteButtonText}>Copy stops to a new route</Text>
        </Pressable>

        <Pressable
          style={[styles.createRouteButton, !onCreateNewRoute && styles.buttonDisabled]}
          onPress={onCreateNewRoute}
          disabled={!onCreateNewRoute}
        >
          <Text style={styles.createRouteButtonText}>Create new route</Text>
        </Pressable>
      </ScrollView>
    </DraggableRouteSheet>
  );
}
