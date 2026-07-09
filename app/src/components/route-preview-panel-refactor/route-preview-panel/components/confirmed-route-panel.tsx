import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type ConfirmedRoutePanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
  onStopPress?: (stop: any, index: number) => void;
  onCancelRoute?: () => void;
  onOpenEditRoute?: () => void;
};

type TimelineTime = {
  dayLabel?: string;
  clock: string;
};



type TimelineItem = {
  id: string;
  type: 'start' | 'stop' | 'end' | 'break';
  title: string;
  address: string;
  time: TimelineTime;
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
  onRefine,
  onConfirm,
  onStartRoute,
  onStopPress,
  onCancelRoute,
  onOpenEditRoute,
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
    <DraggableRouteSheet
      isWide={isWide}
      initialSnap="middle"
      collapsedHeight={96}
    >
      <View style={localStyles.sheetInner}>
        <View style={localStyles.header}>

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

          {/* <Pressable style={localStyles.iconButton}>
            <Text style={localStyles.iconButtonText}>⋮</Text>
          </Pressable> */}
        </View>

        {/* <View style={localStyles.quickActions}>
          <Pressable style={localStyles.quickActionButton}>
            <Feather
              name="share-2"
              size={15}
              color="#2563EB"
              style={localStyles.quickActionIconSvg}
            />
            <Text style={localStyles.quickActionText}>Share live route</Text>
          </Pressable>

          <Pressable style={localStyles.quickActionButton}>
            <MaterialCommunityIcons
              name="truck-outline"
              size={16}
              color="#2563EB"
              style={localStyles.quickActionIconSvg}
            />
            <Text style={localStyles.quickActionText}>Load vehicle</Text>
          </Pressable>
        </View> */}

        <ScrollView
          style={localStyles.scroll}
          contentContainerStyle={[
            localStyles.scrollContent,
            {
              paddingBottom: 20,
            },
          ]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.summaryRow}>
            <InfoPill
              label="Duration"
              value={durationLabel || '0 min'}
              icon={
                <Feather
                  name="clock"
                  size={15}
                  color="#2563EB"
                  style={localStyles.infoIcon}
                />
              }
            />

            <InfoPill
              label="Distance"
              value={distanceLabel || '0 km'}
              icon={
                <MaterialCommunityIcons
                  name="source-fork"
                  size={16}
                  color="#2563EB"
                  style={localStyles.infoIcon}
                />
              }
            />

            <InfoPill
              label="Stops"
              value={String(stops.length)}
              icon={
                <Feather
                  name="map-pin"
                  size={15}
                  color="#2563EB"
                  style={localStyles.infoIcon}
                />
              }
            />

            <InfoPill
              label="Start time"
              value={formatHeaderTime(startTime)}
              icon={
                <Feather
                  name="clock"
                  size={15}
                  color="#2563EB"
                  style={localStyles.infoIcon}
                />
              }
            />
          </View>

          <View style={localStyles.timelineCard}>
            <View style={localStyles.timelineHeader}>
              <Text style={localStyles.timelineTitle}>Route sequence</Text>
              <Text style={localStyles.timelineSubText}>
                {durationLabel || '0 min'}
              </Text>
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
              paddingBottom: Math.max(insets.bottom + 6, 8),
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              localStyles.cancelButton,
              pressed && localStyles.buttonPressedLight,
            ]}
            onPress={onCancelRoute}
            hitSlop={6}
          >
            <Feather name="trash-2" size={17} color="#EF4444" />
            <Text style={localStyles.cancelButtonText}>Cancel route</Text>
          </Pressable>

          <View style={localStyles.footerSecondRow}>
            <Pressable
              style={({ pressed }) => [
                localStyles.editButton,
                pressed && localStyles.buttonPressedLight,
              ]}
              onPress={onOpenEditRoute || onRefine}
              hitSlop={6}
            >
              <Feather name="edit-2" size={15} color="#1E293B" />
              <Text style={localStyles.editButtonText}>
                {isReadyToStart ? 'Edit route' : 'Refine route'}
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
              hitSlop={6}
            >
              <Feather name="play-circle" size={16} color="#FFFFFF" />
              <Text style={localStyles.startButtonText}>{primaryLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

function InfoPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <View style={localStyles.infoPill}>
      {icon}

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
  const isBreak = item.type === 'break';

  return (
    <Pressable
      disabled={!isStop}
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.timelineRow,
        isStop && localStyles.clickableTimelineRow,
        pressed && isStop && localStyles.timelineRowPressed,
      ]}
    >
      <View style={localStyles.timelineLeftRail}>
        <View
          style={[
            localStyles.leftIconWrap,
            isStart && localStyles.leftIconStart,
            isStop && localStyles.leftIconStop,
            isEnd && localStyles.leftIconEnd,
            isBreak && localStyles.leftIconBreak,
          ]}
        >
          {isStart ? (
            <Feather name="navigation" size={14} color="#2563EB" />
          ) : isEnd ? (
            <MaterialCommunityIcons
              name="flag-checkered"
              size={14}
              color="#2563EB"
            />
          ) : isBreak ? (
            <MaterialCommunityIcons
              name="coffee-outline"
              size={14}
              color="#2563EB"
            />
          ) : (
            <Text style={localStyles.stopNumberText}>{item.sequenceLabel}</Text>
          )}
        </View>

        {!isLast ? <View style={localStyles.leftRailLine} /> : null}
      </View>

      <View style={localStyles.timelineBody}>
        <View style={localStyles.timelineCenterContent}>
          <Text style={localStyles.itemTitle}>{item.title}</Text>
          <Text style={localStyles.itemAddress}>{item.address}</Text>
        </View>

        <View style={localStyles.timeRightColumn}>
          {item.time.dayLabel ? (
            <Text style={localStyles.timeDayText}>{item.time.dayLabel}</Text>
          ) : null}

          <Text style={localStyles.timeTextRight}>{item.time.clock}</Text>
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
      time: getStartDisplayTime(startTime),
    },
  ];

  // items.push({
  //   id: 'break-row',
  //   type: 'break',
  //   title: 'Break',
  //   address: 'Tap to plan a break',
  //   time: {
  //     clock: '',
  //   },
  // });

  stops.forEach((stop: any, index: number) => {
    const sequence = stop?.sequence_no || stop?.sequenceNo || index + 1;

    items.push({
      id: String(stop?.id || stop?.stop_id || stop?.order_id || index),
      type: 'stop',
      title: getStopTitle(stop, index),
      address: getStopAddress(stop),
      time: getStopArrivalTime(stop, index, totalStops, startTime, durationLabel),
      sequenceLabel: String(sequence),
      rawStop: stop,
      rawIndex: index,
    });
  });

  items.push({
    id: 'end-location',
    type: 'end',
    title: 'End location',
    address: endAddress,
    time: getEndArrivalTime(end, startTime, durationLabel),
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

function getStartDisplayTime(startTime?: string): TimelineTime {
  const formatted = formatDisplayTime(startTime);

  if (formatted) return formatted;

  return {
    dayLabel: 'Today',
    clock: 'Start',
  };
}

function getStopArrivalTime(
  stop: any,
  index: number,
  totalStops: number,
  startTime?: string,
  durationLabel?: string,
): TimelineTime {
  const explicitTime =
    stop?.arrival_time ||
    stop?.arrivalTime ||
    stop?.eta ||
    stop?.estimated_arrival ||
    stop?.estimatedArrival ||
    stop?.estimated_arrival_time ||
    stop?.estimatedArrivalTime;

  const startDate = parseDateTime(startTime);
  const formattedExplicit = formatDisplayTime(explicitTime, startDate);

  if (formattedExplicit) return formattedExplicit;

  const startMinutes = parseStartMinutes(startTime);
  const totalMinutes = parseDurationToMinutes(durationLabel);

  if (startMinutes !== null && totalMinutes !== null && totalStops > 0) {
    const segment = totalMinutes / (totalStops + 1);
    const absoluteMinutes = startMinutes + Math.round(segment * (index + 1));
    const dayOffset = Math.floor(absoluteMinutes / 1440);

    return {
      dayLabel: getDayLabelFromOffset(dayOffset, startDate),
      clock: formatClock12FromMinutes(absoluteMinutes),
    };
  }

  return {
    clock: '--',
  };
}

function getEndArrivalTime(
  end: any,
  startTime?: string,
  durationLabel?: string,
): TimelineTime {
  const explicitTime =
    end?.arrival_time ||
    end?.arrivalTime ||
    end?.eta ||
    end?.estimated_arrival ||
    end?.estimatedArrival ||
    end?.estimated_arrival_time ||
    end?.estimatedArrivalTime;

  const startDate = parseDateTime(startTime);
  const formattedExplicit = formatDisplayTime(explicitTime, startDate);

  if (formattedExplicit) return formattedExplicit;

  const startMinutes = parseStartMinutes(startTime);
  const totalMinutes = parseDurationToMinutes(durationLabel);

  if (startMinutes !== null && totalMinutes !== null) {
    const absoluteMinutes = startMinutes + totalMinutes;
    const dayOffset = Math.floor(absoluteMinutes / 1440);

    return {
      dayLabel: getDayLabelFromOffset(dayOffset, startDate),
      clock: formatClock12FromMinutes(absoluteMinutes),
    };
  }

  return {
    clock: 'End',
  };
}

function formatHeaderTime(value?: string) {
  const formatted = formatDisplayTime(value);

  if (!formatted) return 'Now';

  return formatted.clock;
}

function formatDisplayTime(
  value?: string,
  baseDate?: Date | null,
): TimelineTime | null {
  if (!value) return null;

  const date = parseDateTime(value);

  if (date) {
    return {
      dayLabel: getRelativeDayLabel(date, baseDate),
      clock: formatDateClock(date),
    };
  }

  const clockMinutes = parseClockToMinutes(value);

  if (clockMinutes !== null) {
    return {
      dayLabel: 'Today',
      clock: formatClock12FromMinutes(clockMinutes),
    };
  }

  return {
    clock: String(value),
  };
}

function parseDateTime(value?: string) {
  if (!value) return null;

  const text = String(value);

  if (!text.includes('T')) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function parseStartMinutes(value?: string) {
  const date = parseDateTime(value);

  if (date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  return parseClockToMinutes(value);
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

function formatDateClock(date: Date) {
  return date
    .toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function formatClock12FromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  const meridian = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;

  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )} ${meridian}`;
}

function getDayLabelFromOffset(dayOffset: number, baseDate?: Date | null) {
  if (baseDate) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + dayOffset);

    return getRelativeDayLabel(targetDate);
  }

  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';

  return `+${dayOffset} days`;
}

function getRelativeDayLabel(date: Date, baseDate?: Date | null) {
  const base = startOfLocalDay(baseDate || new Date());
  const target = startOfLocalDay(date);

  const diffDays = Math.round(
    (target.getTime() - base.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
  });
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  routeTitle: {
    ...font('600'),
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 24,
    color: '#111827',
  },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EAF7ED',
    marginTop: 2,
  },

  statusChipText: {
    ...font('500'),
    fontSize: 11,
    lineHeight: 14,
    color: '#2F8F46',
  },

  routeMeta: {
    ...font('400'),
    marginTop: 6,
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
    marginLeft: 8,
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

  quickActionIconSvg: {
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
    gap: 10,
    marginBottom: 12,
  },

  infoPill: {
    flex: 1,
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  infoIcon: {
    marginBottom: 7,
  },

  infoLabel: {
    ...font('400'),
    fontSize: 11,
    lineHeight: 14,
    color: '#64748B',
    marginBottom: 3,
    textAlign: 'center',
  },

  infoValue: {
    ...font('600'),
    fontSize: 13,
    lineHeight: 17,
    color: '#111827',
    textAlign: 'center',
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  timelineTitle: {
    ...font('600'),
    fontSize: 16,
    lineHeight: 20,
    color: '#111827',
  },

  timelineSubText: {
    ...font('400'),
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },

  timelineRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  clickableTimelineRow: {
    backgroundColor: '#FFFFFF',
  },

  timelineRowPressed: {
    backgroundColor: '#F8FAFC',
  },

  timelineLeftRail: {
    width: 34,
    alignItems: 'center',
    marginRight: 10,
  },

  leftIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  leftIconStart: {
    backgroundColor: '#EAF2FF',
  },

  leftIconStop: {
    backgroundColor: '#2F74F7',
  },

  leftIconEnd: {
    backgroundColor: '#EAF2FF',
  },

  leftIconBreak: {
    backgroundColor: '#EEF2FF',
  },

  stopNumberText: {
    ...font('600'),
    fontSize: 11,
    lineHeight: 13,
    color: '#FFFFFF',
  },

  leftRailLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: '#D5E4FF',
    minHeight: 28,
  },

  timelineBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },

  timelineCenterContent: {
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
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },

  timeRightColumn: {
    width: 76,
    alignItems: 'flex-end',
    paddingTop: 1,
  },

  timeDayText: {
    ...font('500'),
    fontSize: 11,
    lineHeight: 14,
    color: '#64748B',
    textAlign: 'right',
  },

  timeTextRight: {
    ...font('500'),
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#334155',
    textAlign: 'right',
  },

  footer: {
    paddingTop: 5,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },

  cancelButton: {
    width: '100%',
    height: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  cancelButtonText: {
    ...font('600'),
    fontSize: 13,
    lineHeight: 16,
    color: '#EF4444',
  },

  footerSecondRow: {
    flexDirection: 'row',
    gap: 10,
  },

  editButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 7,
  },

  editButtonText: {
    ...font('500'),
    fontSize: 14,
    lineHeight: 18,
    color: '#111827',
  },

  startButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F74F7',
    flexDirection: 'row',
    gap: 7,
  },

  startButtonText: {
    ...font('600'),
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.55,
  },

  buttonPressed: {
    opacity: 0.86,
  },

  buttonPressedLight: {
    opacity: 0.82,
  },
});