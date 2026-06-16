import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <DraggableRouteSheet isWide={isWide} mode="large" variant="transit" initialSnap="top">
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
function CompletedMetric({
  icon,
  value,
  label,
  muted,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  value: string | number;
  label: string;
  muted?: boolean;
}) {
  return (
    <View style={completedPanelStyles.metricCard}>
      <View style={[completedPanelStyles.metricIconBox, muted && completedPanelStyles.metricIconBoxMuted]}>
        <Feather name={icon} size={17} color={muted ? '#64748B' : '#2563EB'} />
      </View>
      <Text style={completedPanelStyles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={completedPanelStyles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
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
  const failedCount = stats.failed || 0;
  const deliveredCount = stats.delivered || Math.max(routeStops.length - failedCount, 0);
  const hasFailures = failedCount > 0;
  const copyDisabled = !onCopyStopsToNewRoute;
  const createDisabled = !onCreateNewRoute;

  return (
    <DraggableRouteSheet
      isWide={isWide}
      mode="large"
      variant="transit"
      initialSnap="top"
      bottomSnapHeight={isWide ? 420 : 76}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          completedPanelStyles.content,
          isWide && completedPanelStyles.contentWide,
          { paddingBottom: Math.max(insets.bottom + 22, 34) },
        ]}
      >
        <View style={completedPanelStyles.heroCard}>
          <View style={completedPanelStyles.successIconOuter}>
            <View style={completedPanelStyles.successIconInner}>
              <Feather name="check" size={27} color="#FFFFFF" />
            </View>
          </View>

          <Text style={completedPanelStyles.title}>Route completed</Text>
          <Text style={completedPanelStyles.subtitle} numberOfLines={1}>
            {routeName || 'Your route has been closed successfully'}
          </Text>

          <View style={completedPanelStyles.statusPill}>
            <Feather name={hasFailures ? 'alert-circle' : 'check-circle'} size={15} color={hasFailures ? '#B45309' : '#047857'} />
            <Text style={[completedPanelStyles.statusPillText, hasFailures && completedPanelStyles.statusPillWarningText]}>
              {hasFailures ? `${failedCount} stop${failedCount > 1 ? 's' : ''} failed` : 'All stops successful'}
            </Text>
          </View>
        </View>

        <View style={completedPanelStyles.metricsRow}>
          <CompletedMetric icon="map-pin" value={routeStops.length} label="Stops" />
          <CompletedMetric icon="check-circle" value={deliveredCount} label="Done" />
          <CompletedMetric icon="x-circle" value={failedCount} label="Failed" muted={!hasFailures} />
        </View>

        {(distanceLabel || durationLabel) ? (
          <View style={completedPanelStyles.summaryCard}>
            {distanceLabel ? (
              <View style={completedPanelStyles.summaryItem}>
                <Feather name="navigation" size={18} color="#475569" />
                <View style={completedPanelStyles.summaryTextBox}>
                  <Text style={completedPanelStyles.summaryLabel}>Distance</Text>
                  <Text style={completedPanelStyles.summaryValue}>{distanceLabel}</Text>
                </View>
              </View>
            ) : null}

            {durationLabel ? (
              <View style={completedPanelStyles.summaryItem}>
                <Feather name="clock" size={18} color="#475569" />
                <View style={completedPanelStyles.summaryTextBox}>
                  <Text style={completedPanelStyles.summaryLabel}>Duration</Text>
                  <Text style={completedPanelStyles.summaryValue}>{durationLabel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={completedPanelStyles.actionBlock}>
          <Pressable
            style={[completedPanelStyles.secondaryButton, copyDisabled && completedPanelStyles.disabledButton]}
            onPress={onCopyStopsToNewRoute}
            disabled={copyDisabled}
          >
            <View style={completedPanelStyles.secondaryIconBox}>
              <MaterialCommunityIcons name="map-marker-plus-outline" size={22} color="#2563EB" />
            </View>
            <Text style={completedPanelStyles.secondaryButtonText}>Copy stops to new route</Text>
          </Pressable>

          <Pressable
            style={[completedPanelStyles.primaryButton, createDisabled && completedPanelStyles.disabledButton]}
            onPress={onCreateNewRoute}
            disabled={createDisabled}
          >
            <Text style={completedPanelStyles.primaryButtonText}>Create new route</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </DraggableRouteSheet>
  );
}

const completedPanelStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 16,
  },
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E8EEF6',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  successIconOuter: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 14,
    width: 68,
  },
  successIconInner: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  title: {
    color: '#0F172A',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 33,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8492A6',
    fontSize: 15.5,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: '94%',
    textAlign: 'center',
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  statusPillText: {
    color: '#047857',
    fontSize: 13.5,
    fontWeight: '600',
  },
  statusPillWarningText: {
    color: '#B45309',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECF3',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  metricIconBox: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    marginBottom: 8,
    width: 32,
  },
  metricIconBoxMuted: {
    backgroundColor: '#F1F5F9',
  },
  metricValue: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
  },
  metricLabel: {
    color: '#8A97AA',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECF3',
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  summaryTextBox: {
    flex: 1,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 17,
  },
  summaryValue: {
    color: '#1E293B',
    fontSize: 15.5,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 1,
  },
  actionBlock: {
    gap: 12,
    marginTop: 2,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE6F3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  secondaryIconBox: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  secondaryButtonText: {
    color: '#2563EB',
    flex: 1,
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
