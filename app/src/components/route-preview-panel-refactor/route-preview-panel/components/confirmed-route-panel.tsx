import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type ConfirmedRoutePanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
  onStopPress?: (stop: any, index: number) => void;
};

type TimelineItem = {
  id: string;
  type: 'start' | 'stop' | 'end';
  title: string;
  address: string;
  time: string;
  badge: string;
  sequenceLabel?: string;
  rawStop?: any;
  rawIndex?: number;
};

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
  onStopPress,
}: ConfirmedRoutePanelProps) {
  const insets = useSafeAreaInsets();

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

  const startAddress =
    getLocationAddress(start) || 'Used GPS position when optimizing';

  const endAddress = getLocationAddress(end) || 'Return to start location';

  const timelineItems = buildTimelineItems({
    start,
    end,
    stops,
    startTime,
    durationLabel,
    startAddress,
    endAddress,
  });

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="middle">
      <View style={localStyles.sheetInner}>
        <View style={localStyles.header}>
          <Pressable style={localStyles.menuButton}>
            <Text style={localStyles.menuButtonText}>☰</Text>
          </Pressable>

          <View style={localStyles.headerContent}>
            <View style={localStyles.routeNameRow}>
              <Text style={localStyles.routeTitle}>
                {routeName || 'Optimized route'}
              </Text>

              <View style={localStyles.statusChip}>
                <Text style={localStyles.statusChipText}>
                  {isReadyToStart ? 'Optimized' : 'Ready'}
                </Text>
              </View>
            </View>

            <Text style={localStyles.routeMeta}>
              {durationLabel || '0 min'} · {stops.length}{' '}
              {stops.length === 1 ? 'stop' : 'stops'} ·{' '}
              {distanceLabel || '0 km'}
            </Text>
          </View>

          <Pressable style={localStyles.iconButton} onPress={onOpenSearch}>
            <Text style={localStyles.iconButtonText}>⌕</Text>
          </Pressable>

          <Pressable style={localStyles.iconButton}>
            <Text style={localStyles.iconButtonText}>⋮</Text>
          </Pressable>
        </View>

        <View style={localStyles.quickActions}>
          <Pressable style={localStyles.quickActionButton}>
            <Text style={localStyles.quickActionIcon}>⌁</Text>
            <Text style={localStyles.quickActionText}>Share live route</Text>
          </Pressable>

          <Pressable style={localStyles.quickActionButton}>
            <Text style={localStyles.quickActionIcon}>▣</Text>
            <Text style={localStyles.quickActionText}>Load vehicle</Text>
          </Pressable>
        </View>

        <ScrollView
          style={localStyles.scroll}
          contentContainerStyle={[
            localStyles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 112, 132),
            },
          ]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.summaryRow}>
            <InfoPill label="Stops" value={String(stops.length)} />
            <InfoPill label="Distance" value={distanceLabel || '0 km'} />
            <InfoPill label="Duration" value={durationLabel || '0 min'} />
            <InfoPill label="Start" value={startTime || 'Now'} />
          </View>

          <View style={localStyles.timelineCard}>
            <View style={localStyles.timelineHeader}>
              <Text style={localStyles.timelineTitle}>Route sequence</Text>
              <Text style={localStyles.timelineSubText}>
                {durationLabel || '0 min'}
              </Text>
            </View>

            <View style={localStyles.breakRow}>
              <View style={localStyles.breakDot} />

              <View style={localStyles.breakContent}>
                <Text style={localStyles.breakTitle}>No break</Text>
                <Text style={localStyles.breakText}>Tap to plan a break</Text>
              </View>

              <View style={localStyles.breakIconBox}>
                <Text style={localStyles.breakIcon}>☕</Text>
              </View>
            </View>

            {timelineItems.map((item, index) => (
              <TimelineRow
                key={item.id}
                item={item}
                isLast={index === timelineItems.length - 1}
                onPress={
                  item.type === 'stop' && item.rawStop
                    ? () => onStopPress?.(item.rawStop, item.rawIndex ?? 0)
                    : undefined
                }
              />
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            localStyles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 10, 18),
            },
          ]}
        >
          <Text style={localStyles.footerDuration}>
            {durationLabel || '0 min'}
          </Text>

          <Pressable
            style={({ pressed }) => [
              localStyles.editButton,
              pressed && localStyles.buttonPressed,
            ]}
            onPress={onRefine}
          >
            <Text style={localStyles.editButtonText}>
              {isReadyToStart ? 'Edit' : 'Refine'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              localStyles.startButton,
              primaryButtonDisabled && localStyles.disabledButton,
              pressed && !primaryButtonDisabled && localStyles.buttonPressed,
            ]}
            onPress={handlePrimaryAction}
            disabled={primaryButtonDisabled}
          >
            <Text style={localStyles.startButtonText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={localStyles.infoPill}>
      <Text style={localStyles.infoLabel}>{label}</Text>
      <Text style={localStyles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TimelineRow({
  item,
  isLast,
  onPress,
}: {
  item: TimelineItem;
  isLast: boolean;
  onPress?: () => void;
}) {
  const isStart = item.type === 'start';
  const isEnd = item.type === 'end';
  const isStop = item.type === 'stop';

  return (
    <Pressable
      disabled={!isStop}
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.timelineRow,
        isStop && localStyles.clickableTimelineRow,
        pressed && localStyles.timelineRowPressed,
      ]}
    >
      <View style={localStyles.timeColumn}>
        <Text style={localStyles.timeText}>{item.time}</Text>

        {item.sequenceLabel ? (
          <Text style={localStyles.sequenceText}>{item.sequenceLabel}</Text>
        ) : null}
      </View>

      <View style={localStyles.lineColumn}>
        <View
          style={[
            localStyles.timelineDot,
            isStart && localStyles.startDot,
            isEnd && localStyles.endDot,
            isStop && localStyles.stopDot,
          ]}
        />

        {!isLast ? <View style={localStyles.verticalLine} /> : null}
      </View>

      <View style={localStyles.timelineContent}>
        <View style={localStyles.timelineTextBlock}>
          <Text style={localStyles.itemTitle}>{item.title}</Text>
          <Text style={localStyles.itemAddress}>{item.address}</Text>
        </View>

        <View
          style={[
            localStyles.badge,
            isStart && localStyles.startBadge,
            isEnd && localStyles.endBadge,
          ]}
        >
          <Text
            style={[
              localStyles.badgeText,
              isEnd && localStyles.endBadgeText,
            ]}
          >
            {item.badge}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function buildTimelineItems({
  start,
  end,
  stops,
  startTime,
  durationLabel,
  startAddress,
  endAddress,
}: {
  start: any;
  end: any;
  stops: any[];
  startTime?: string;
  durationLabel?: string;
  startAddress: string;
  endAddress: string;
}): TimelineItem[] {
  const totalStops = stops.length;

  const items: TimelineItem[] = [
    {
      id: 'start-location',
      type: 'start',
      title: 'Start location',
      address: startAddress,
      time: formatDisplayTime(startTime) || 'Start',
      badge: '⌂',
    },
  ];

  stops.forEach((stop: any, index: number) => {
    const sequence = stop?.sequence_no || stop?.sequenceNo || index + 1;

    items.push({
      id: String(stop?.id || stop?.stop_id || stop?.order_id || index),
      type: 'stop',
      title: getStopTitle(stop, index),
      address: getStopAddress(stop),
      time: getStopArrivalTime(stop, index, totalStops, startTime, durationLabel),
      badge: `A${sequence}`,
      sequenceLabel: String(sequence).padStart(2, '0'),
      rawStop: stop,
      rawIndex: index,
    });
  });

  items.push({
    id: 'end-location',
    type: 'end',
    title: getLocationTitle(end) || 'End location',
    address: endAddress,
    time: getEndArrivalTime(end, startTime, durationLabel),
    badge: '⚑',
  });

  return items;
}

function getStopTitle(stop: any, index: number) {
  return (
    stop?.title ||
    stop?.name ||
    stop?.customerName ||
    stop?.customer_name ||
    stop?.label ||
    stop?.location?.name ||
    stop?.location?.title ||
    `Stop ${index + 1}`
  );
}

function getStopAddress(stop: any) {
  return (
    stop?.description ||
    stop?.subtitle ||
    stop?.address ||
    stop?.full_address ||
    stop?.fullAddress ||
    stop?.deliveryAddress ||
    stop?.delivery_address ||
    stop?.location?.address ||
    stop?.location?.full_address ||
    stop?.location?.fullAddress ||
    stop?.location?.description ||
    'Address not available'
  );
}

function getLocationTitle(location: any) {
  return (
    location?.title ||
    location?.name ||
    location?.label ||
    location?.location?.title ||
    location?.location?.name ||
    ''
  );
}

function getLocationAddress(location: any) {
  return (
    location?.description ||
    location?.subtitle ||
    location?.address ||
    location?.full_address ||
    location?.fullAddress ||
    location?.location?.address ||
    location?.location?.full_address ||
    location?.location?.fullAddress ||
    ''
  );
}

function getStopArrivalTime(
  stop: any,
  index: number,
  totalStops: number,
  startTime?: string,
  durationLabel?: string,
) {
  const explicitTime =
    stop?.arrival_time ||
    stop?.arrivalTime ||
    stop?.eta ||
    stop?.estimated_arrival ||
    stop?.estimatedArrival ||
    stop?.estimated_arrival_time ||
    stop?.estimatedArrivalTime;

  const formattedExplicit = formatDisplayTime(explicitTime);

  if (formattedExplicit) return formattedExplicit;

  const startMinutes = parseClockToMinutes(startTime);
  const totalMinutes = parseDurationToMinutes(durationLabel);

  if (startMinutes !== null && totalMinutes !== null && totalStops > 0) {
    const segment = totalMinutes / (totalStops + 1);

    return formatClockFromMinutes(
      startMinutes + Math.round(segment * (index + 1)),
    );
  }

  return '--:--';
}

function getEndArrivalTime(
  end: any,
  startTime?: string,
  durationLabel?: string,
) {
  const explicitTime =
    end?.arrival_time ||
    end?.arrivalTime ||
    end?.eta ||
    end?.estimated_arrival ||
    end?.estimatedArrival ||
    end?.estimated_arrival_time ||
    end?.estimatedArrivalTime;

  const formattedExplicit = formatDisplayTime(explicitTime);

  if (formattedExplicit) return formattedExplicit;

  const startMinutes = parseClockToMinutes(startTime);
  const totalMinutes = parseDurationToMinutes(durationLabel);

  if (startMinutes !== null && totalMinutes !== null) {
    return formatClockFromMinutes(startMinutes + totalMinutes);
  }

  return 'End';
}

function formatDisplayTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);

  if (!Number.isNaN(date.getTime()) && String(value).includes('T')) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const clockMinutes = parseClockToMinutes(value);

  if (clockMinutes !== null) {
    return formatClockFromMinutes(clockMinutes);
  }

  return value;
}

function parseClockToMinutes(value?: string) {
  if (!value) return null;

  const trimmed = String(value).trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridian = match[3];

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  if (meridian === 'pm' && hours < 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function formatClockFromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseDurationToMinutes(value?: string) {
  if (!value) return null;

  const text = String(value).toLowerCase();

  const hourMatch = text.match(/(\d+)\s*(h|hr|hrs|hour|hours)/);
  const minuteMatch = text.match(/(\d+)\s*(m|min|mins|minute|minutes)/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (hours || minutes) return hours * 60 + minutes;

  const numeric = Number(text.replace(/[^\d.]/g, ''));

  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric);

  return null;
}

type AppFontWeight = '400' | '500' | '600';

const APP_FONT =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  }) || 'System';

const font = (fontWeight: AppFontWeight = '400') => ({
  fontFamily: APP_FONT,
  fontWeight,
});

const localStyles = StyleSheet.create({
  sheetInner: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },

  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#F8FAFC',
  },

  menuButtonText: {
    ...font('500'),
    fontSize: 21,
    lineHeight: 24,
    color: '#64748B',
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  routeNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },

  routeTitle: {
    ...font('600'),
    flexShrink: 1,
    fontSize: 19,
    lineHeight: 24,
    color: '#111827',
  },

  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EAF2FF',
    marginTop: 2,
  },

  statusChipText: {
    ...font('500'),
    fontSize: 11,
    lineHeight: 14,
    color: '#2563EB',
  },

  routeMeta: {
    ...font('400'),
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#F8FAFC',
  },

  iconButtonText: {
    ...font('400'),
    fontSize: 20,
    lineHeight: 22,
    color: '#334155',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  quickActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E0EC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  quickActionIcon: {
    ...font('500'),
    fontSize: 15,
    color: '#2563EB',
    marginRight: 7,
  },

  quickActionText: {
    ...font('500'),
    fontSize: 13,
    lineHeight: 17,
    color: '#1E293B',
  },

  scroll: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 12,
  },

  infoPill: {
    flex: 1,
    paddingHorizontal: 7,
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },

  infoLabel: {
    ...font('400'),
    fontSize: 10,
    lineHeight: 13,
    color: '#64748B',
    marginBottom: 2,
  },

  infoValue: {
    ...font('600'),
    fontSize: 12,
    lineHeight: 16,
    color: '#111827',
  },

  timelineCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },

  timelineTitle: {
    ...font('600'),
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
  },

  timelineSubText: {
    ...font('400'),
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },

  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  breakDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    marginRight: 18,
    marginLeft: 26,
  },

  breakContent: {
    flex: 1,
    minWidth: 0,
  },

  breakTitle: {
    ...font('500'),
    fontSize: 16,
    lineHeight: 21,
    color: '#111827',
  },

  breakText: {
    ...font('400'),
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },

  breakIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  breakIcon: {
    ...font('400'),
    fontSize: 15,
  },

  timelineRow: {
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: 14,
  },

  clickableTimelineRow: {
    backgroundColor: '#FFFFFF',
  },

  timelineRowPressed: {
    backgroundColor: '#F8FAFC',
  },

  timeColumn: {
    width: 48,
    alignItems: 'center',
    paddingTop: 16,
  },

  timeText: {
    ...font('500'),
    fontSize: 12,
    lineHeight: 15,
    color: '#475569',
  },

  sequenceText: {
    ...font('500'),
    marginTop: 3,
    fontSize: 12,
    lineHeight: 15,
    color: '#475569',
  },

  lineColumn: {
    width: 20,
    alignItems: 'center',
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 18,
    backgroundColor: '#93C5FD',
  },

  startDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#60A5FA',
  },

  stopDot: {
    backgroundColor: '#93C5FD',
  },

  endDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#93C5FD',
  },

  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#BFDBFE',
    marginTop: 3,
  },

  timelineContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },

  timelineTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  itemTitle: {
    ...font('500'),
    fontSize: 16,
    lineHeight: 21,
    color: '#111827',
  },

  itemAddress: {
    ...font('400'),
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },

  badge: {
    minWidth: 34,
    height: 34,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startBadge: {
    backgroundColor: '#EAF2FF',
  },

  endBadge: {
    backgroundColor: '#EAF2FF',
  },

  badgeText: {
    ...font('600'),
    fontSize: 13,
    lineHeight: 16,
    color: '#2563EB',
  },

  endBadgeText: {
    fontSize: 15,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  footerDuration: {
    ...font('600'),
    minWidth: 72,
    fontSize: 18,
    lineHeight: 23,
    color: '#15803D',
  },

  editButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  editButtonText: {
    ...font('500'),
    fontSize: 14,
    lineHeight: 19,
    color: '#111827',
  },

  startButton: {
    flex: 1.2,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F74F7',
  },

  startButtonText: {
    ...font('600'),
    fontSize: 14,
    lineHeight: 19,
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.55,
  },

  buttonPressed: {
    opacity: 0.86,
  },
});