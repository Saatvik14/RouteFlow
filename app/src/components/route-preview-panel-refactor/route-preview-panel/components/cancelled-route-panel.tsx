import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type CancelledRoutePanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
};

type TimelineItem = {
  id: string;
  type: 'start' | 'stop' | 'end';
  title: string;
  address: string;
  status?: string;
  sequenceLabel?: string;
};

export function CancelledRoutePanel({
  isWide,
  routeName,
  start,
  end,
  stops = [],
  startTime,
  durationLabel,
  distanceLabel,
}: CancelledRoutePanelProps) {
  const insets = useSafeAreaInsets();

  const timelineItems = buildTimelineItems({
    start,
    end,
    stops,
  });

  const cancelledStopsCount = stops.filter((stop: any) =>
    isCancelledStatus(getStopStatus(stop)),
  ).length;

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="middle">
      <View style={styles.sheetInner}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Feather name="x-circle" size={20} color="#DC2626" />
          </View>

          <View style={styles.headerContent}>
            <View style={styles.routeNameRow}>
              <Text style={styles.routeTitle}>
                {routeName || 'Cancelled route'}
              </Text>

              <View style={styles.cancelledChip}>
                <Text style={styles.cancelledChipText}>Cancelled</Text>
              </View>
            </View>

            <Text style={styles.routeMeta}>
              This route is locked. You can view the map and route details only.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 28, 44),
            },
          ]}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#B91C1C"
              />
            </View>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Route cancelled</Text>
              <Text style={styles.noticeText}>
                Pending orders were cancelled. Orders that were already delivered,
                failed, or completed were not changed.
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <InfoPill label="Stops" value={String(stops.length)} />
            <InfoPill label="Cancelled" value={String(cancelledStopsCount)} />
            <InfoPill label="Distance" value={distanceLabel || '0 km'} />
            <InfoPill label="Duration" value={durationLabel || '0 min'} />
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start time</Text>
              <Text style={styles.detailValue}>{startTime || 'Not available'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route status</Text>
              <Text style={styles.statusValue}>Cancelled</Text>
            </View>
          </View>

          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>Full route details</Text>
              <Text style={styles.timelineSubText}>
                Start · {stops.length} stops · End
              </Text>
            </View>

            {timelineItems.map((item, index) => (
              <TimelineRow
                key={item.id}
                item={item}
                isLast={index === timelineItems.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </DraggableRouteSheet>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const isStart = item.type === 'start';
  const isEnd = item.type === 'end';
  const isStop = item.type === 'stop';

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeftRail}>
        <View
          style={[
            styles.leftIconWrap,
            isStart && styles.leftIconStart,
            isStop && styles.leftIconStop,
            isEnd && styles.leftIconEnd,
          ]}
        >
          {isStart ? (
            <Feather name="navigation" size={13} color="#2563EB" />
          ) : isEnd ? (
            <MaterialCommunityIcons
              name="flag-checkered"
              size={13}
              color="#2563EB"
            />
          ) : (
            <Text style={styles.stopNumberText}>{item.sequenceLabel}</Text>
          )}
        </View>

        {!isLast ? <View style={styles.leftRailLine} /> : null}
      </View>

      <View style={styles.timelineBody}>
        <View style={styles.timelineCenterContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemAddress}>{item.address}</Text>

          {item.status ? (
            <View
              style={[
                styles.stopStatusChip,
                getStatusChipStyle(item.status),
              ]}
            >
              <Text
                style={[
                  styles.stopStatusChipText,
                  getStatusTextStyle(item.status),
                ]}
              >
                {formatStatusLabel(item.status)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function buildTimelineItems({
  start,
  end,
  stops,
}: {
  start: any;
  end: any;
  stops: any[];
}): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: 'start-location',
      type: 'start',
      title: 'Start location',
      address: getLocationAddress(start) || 'Start address not available',
    },
  ];

  stops.forEach((stop: any, index: number) => {
    const sequence = stop?.sequence_no || stop?.sequenceNo || stop?.sequence || index + 1;

    items.push({
      id: String(stop?.id || stop?.stop_id || stop?.order_id || index),
      type: 'stop',
      title: getStopTitle(stop, index),
      address: getStopAddress(stop),
      status: getStopStatus(stop),
      sequenceLabel: String(sequence),
    });
  });

  items.push({
    id: 'end-location',
    type: 'end',
    title: 'End location',
    address: getLocationAddress(end) || 'End address not available',
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

function getStopStatus(stop: any) {
  return String(
    stop?.status ||
      stop?.orderStatus ||
      stop?.order_status ||
      'pending',
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isCancelledStatus(status: string) {
  return status === 'cancelled' || status === 'canceled';
}

function formatStatusLabel(status: string) {
  if (!status) return 'Pending';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusChipStyle(status: string) {
  if (isCancelledStatus(status)) return styles.statusCancelled;
  if (status === 'delivered' || status === 'completed') return styles.statusDelivered;
  if (status === 'failed') return styles.statusFailed;

  return styles.statusPending;
}

function getStatusTextStyle(status: string) {
  if (isCancelledStatus(status)) return styles.statusCancelledText;
  if (status === 'delivered' || status === 'completed') return styles.statusDeliveredText;
  if (status === 'failed') return styles.statusFailedText;

  return styles.statusPendingText;
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

const styles = StyleSheet.create({
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginRight: 12,
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

  cancelledChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
  },

  cancelledChipText: {
    ...font('500'),
    fontSize: 11,
    lineHeight: 14,
    color: '#DC2626',
  },

  routeMeta: {
    ...font('400'),
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },

  scroll: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  noticeCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
    padding: 14,
    marginBottom: 12,
  },

  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginRight: 10,
  },

  noticeContent: {
    flex: 1,
    minWidth: 0,
  },

  noticeTitle: {
    ...font('600'),
    fontSize: 14,
    lineHeight: 18,
    color: '#991B1B',
  },

  noticeText: {
    ...font('400'),
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#7F1D1D',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  infoPill: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  infoLabel: {
    ...font('400'),
    fontSize: 11,
    lineHeight: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  infoValue: {
    ...font('600'),
    marginTop: 4,
    fontSize: 13,
    lineHeight: 17,
    color: '#111827',
    textAlign: 'center',
  },

  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    overflow: 'hidden',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },

  detailLabel: {
    ...font('400'),
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },

  detailValue: {
    ...font('500'),
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#111827',
    textAlign: 'right',
  },

  statusValue: {
    ...font('600'),
    fontSize: 13,
    lineHeight: 18,
    color: '#DC2626',
  },

  timelineCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  timelineHeader: {
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
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },

  timelineRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  timelineLeftRail: {
    width: 34,
    alignItems: 'center',
    marginRight: 10,
  },

  leftIconWrap: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  leftIconStart: {
    backgroundColor: '#EAF2FF',
  },

  leftIconStop: {
    backgroundColor: '#FEE2E2',
  },

  leftIconEnd: {
    backgroundColor: '#EAF2FF',
  },

  stopNumberText: {
    ...font('600'),
    fontSize: 11,
    lineHeight: 13,
    color: '#DC2626',
  },

  leftRailLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: '#E5E7EB',
    minHeight: 30,
  },

  timelineBody: {
    flex: 1,
    minWidth: 0,
  },

  timelineCenterContent: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    ...font('500'),
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
  },

  itemAddress: {
    ...font('400'),
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },

  stopStatusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  stopStatusChipText: {
    ...font('500'),
    fontSize: 11,
    lineHeight: 14,
  },

  statusCancelled: {
    backgroundColor: '#FEF2F2',
  },

  statusCancelledText: {
    color: '#DC2626',
  },

  statusDelivered: {
    backgroundColor: '#ECFDF5',
  },

  statusDeliveredText: {
    color: '#047857',
  },

  statusFailed: {
    backgroundColor: '#FFF7ED',
  },

  statusFailedText: {
    color: '#C2410C',
  },

  statusPending: {
    backgroundColor: '#F8FAFC',
  },

  statusPendingText: {
    color: '#64748B',
  },
});