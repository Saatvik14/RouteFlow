import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { McIcon, PackageActionIcon } from './icons';
import { RouteCompletionPromptPanel } from './completion-panels';

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }

  return '';
};

const formatArrivalTime = (value: unknown) => {
  const text = getText(value);
  if (!text) return '';

  // Already formatted like 22:46
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    return text;
  }

  // ISO datetime support
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return text;
};

const getOrdinal = (value: number) => {
  const number = value + 1;
  const suffix =
    number % 10 === 1 && number % 100 !== 11
      ? 'st'
      : number % 10 === 2 && number % 100 !== 12
        ? 'nd'
        : number % 10 === 3 && number % 100 !== 13
          ? 'rd'
          : 'th';

  return `${number}${suffix}`;
};

const buildAddressFromObject = (address: any) => {
  if (!address || typeof address !== 'object') return '';

  const parts = [
    address.name,
    address.houseNumber || address.housenumber || address.house_number,
    address.street,
    address.area,
    address.locality,
    address.city,
    address.district,
    address.state,
    address.postcode || address.postalCode || address.postal_code,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
};

const getStopAddress = (stop: any) => {
  const directAddress = getText(
    stop?.full_address,
    stop?.fullAddress,
    stop?.address,
    stop?.subtitle,
    stop?.description,
  );

  if (directAddress) return directAddress;

  const addressFromLocation = buildAddressFromObject(stop?.location);
  if (addressFromLocation) return addressFromLocation;

  const addressFromAddressObject = buildAddressFromObject(stop?.address);
  if (addressFromAddressObject) return addressFromAddressObject;

  return 'Address not available';
};

const getStopArrivalTime = (stop: any) => {
  return formatArrivalTime(
    stop?.eta ||
      stop?.etaLabel ||
      stop?.eta_label ||
      stop?.time ||
      stop?.arrivalTime ||
      stop?.arrival_time ||
      stop?.estimatedArrival ||
      stop?.estimated_arrival ||
      stop?.estimatedArrivalTime ||
      stop?.estimated_arrival_time ||
      stop?.expectedArrival ||
      stop?.expected_arrival ||
      stop?.scheduledTime ||
      stop?.scheduled_time,
  );
};

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

  const stopAddress = getStopAddress(stop);

  const stopTitle = getText(
    stop.title,
    stop.name,
    stop.customerName,
    stop.customer_name,
    stop.locationName,
    stop.location_name,
    stopAddress.split(',')[0],
    `Stop ${activeStopIndex + 1}`,
  );

  const stopCode = getText(
    stop.orderId,
    stop.order_id,
    stop.backendOrderId,
    stop.backend_order_id,
    stop.id,
    `A${activeStopIndex + 1}`,
  );

  const arrivalTime = getStopArrivalTime(stop);
  const totalStops = totalActiveStops || 1;
  const progressLabel = `${activeStopIndex + 1}/${totalStops}`;

  return (
    <DraggableRouteSheet
      isWide={isWide}
      mode="large"
      variant="transit"
      initialSnap="top"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          localStyles.sheetContent,
          { paddingBottom: Math.max(insets.bottom + 18, 30) },
        ]}
      >
        <View style={localStyles.header}>
          <View style={localStyles.headerContent}>
            <Text style={localStyles.eyebrow}>Current delivery stop</Text>

            <Text style={localStyles.title} numberOfLines={2}>
              {stopTitle}
            </Text>

            <View style={localStyles.metaRow}>
              <View style={localStyles.blueDot} />

              <Text style={localStyles.progressText}>
                Stop {progressLabel}
              </Text>
            </View>
          </View>

          <View style={localStyles.headerRight}>
            <View style={localStyles.countPill}>
              <Text style={localStyles.countPillText}>{progressLabel}</Text>
            </View>

            <View style={localStyles.arrivalPill}>
              <Feather name="clock" size={13} color="#2563EB" />

              <Text style={localStyles.arrivalPillText} numberOfLines={1}>
                {arrivalTime ? arrivalTime : 'ETA --'}
              </Text>
            </View>
          </View>
        </View>

        <View style={localStyles.actionsRow}>
          <Pressable
            style={[
              localStyles.actionCard,
              localStyles.navigateCard,
              isUpdatingStopStatus && localStyles.actionDisabled,
            ]}
            onPress={onNavigateActiveStop}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <MaterialCommunityIcons
              name="navigation-variant"
              size={24}
              color="#FFFFFF"
            />

            <Text style={[localStyles.actionText, localStyles.navigateText]}>
              Navigate
            </Text>
          </Pressable>

          <Pressable
            style={[
              localStyles.actionCard,
              localStyles.statusCard,
              isUpdatingStopStatus && localStyles.actionDisabled,
            ]}
            onPress={onMarkStopFailed}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="failed" />

            <Text style={localStyles.actionText} numberOfLines={1}>
              {isUpdatingStopStatus ? 'Updating' : 'Failed'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              localStyles.actionCard,
              localStyles.statusCard,
              isUpdatingStopStatus && localStyles.actionDisabled,
            ]}
            onPress={onMarkStopDelivered}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="delivered" />

            <Text style={localStyles.actionText} numberOfLines={1}>
              {isUpdatingStopStatus ? 'Updating' : 'Delivered'}
            </Text>
          </Pressable>
        </View>

        <View style={localStyles.addressCard}>
          <View style={localStyles.addressIconBox}>
            <McIcon name="map-marker-outline" size={22} color="#2563EB" />
          </View>

          <View style={localStyles.addressContent}>
            <Text style={localStyles.sectionLabel}>Full delivery address</Text>

            <Text style={localStyles.addressText}>
              {stopAddress}
            </Text>
          </View>
        </View>

        <View style={localStyles.infoCard}>
          <Pressable style={localStyles.infoRow}>
            <View style={localStyles.rowIconBox}>
              <McIcon name="note-text-outline" size={21} color="#475569" />
            </View>

            <View style={localStyles.rowTextBox}>
              <Text style={localStyles.rowLabel}>Notes</Text>
              <Text style={localStyles.rowMutedText}>Add notes for this stop</Text>
            </View>

            <Feather name="chevron-right" size={21} color="#94A3B8" />
          </Pressable>

          <View style={localStyles.divider} />

          <Pressable style={localStyles.infoRow}>
            <View style={localStyles.rowIconBox}>
              <Text style={localStyles.idIconText}>ID</Text>
            </View>

            <View style={localStyles.rowTextBox}>
              <Text style={localStyles.rowLabel}>Order ID</Text>

              <Text style={localStyles.rowValue} numberOfLines={1}>
                {String(stopCode)}{' '}
                <Text style={localStyles.inlineMuted}>
                  Originally {getOrdinal(activeStopIndex)}
                </Text>
              </Text>
            </View>

            <Feather name="chevron-right" size={21} color="#94A3B8" />
          </Pressable>

          <View style={localStyles.divider} />

          <View style={localStyles.infoRow}>
            <View style={localStyles.rowIconBox}>
              <Feather name="clock" size={20} color="#475569" />
            </View>

            <View style={localStyles.rowTextBox}>
              <Text style={localStyles.rowLabel}>Time of arrival</Text>

              <Text style={localStyles.rowValue}>
                {arrivalTime || 'Not available'}
              </Text>
            </View>
          </View>
        </View>

        <View style={localStyles.optionsCard}>
          <Pressable style={localStyles.optionRow}>
            <View style={localStyles.optionIconBox}>
              <Feather name="edit-3" size={20} color="#475569" />
            </View>

            <Text style={localStyles.optionText}>Edit stop</Text>

            <Feather name="chevron-right" size={21} color="#94A3B8" />
          </Pressable>
        </View>
      </ScrollView>
    </DraggableRouteSheet>
  );
}

const localStyles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },

  title: {
    fontSize: 19,
    lineHeight: 25,
    color: '#111827',
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2F7DF6',
  },

  progressText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },

  headerRight: {
    alignItems: 'flex-end',
    gap: 7,
  },

  countPill: {
    minWidth: 58,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countPillText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },

  arrivalPill: {
    height: 30,
    maxWidth: 95,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  arrivalPillText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  actionCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  navigateCard: {
    backgroundColor: '#2F7DF6',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  statusCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#D8E0EA',
  },

  actionDisabled: {
    opacity: 0.55,
  },

  actionText: {
    fontSize: 13,
    lineHeight: 17,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },

  navigateText: {
    color: '#FFFFFF',
  },

  addressCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  addressIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addressContent: {
    flex: 1,
  },

  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },

  addressText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#111827',
    fontWeight: '500',
  },

  infoCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },

  infoRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },

  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  idIconText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },

  rowTextBox: {
    flex: 1,
  },

  rowLabel: {
    fontSize: 13,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },

  rowValue: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '500',
  },

  rowMutedText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#94A3B8',
    fontWeight: '500',
  },

  inlineMuted: {
    color: '#94A3B8',
    fontWeight: '500',
  },

  divider: {
    height: 1,
    marginLeft: 60,
    backgroundColor: '#E2E8F0',
  },

  optionsCard: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },

  optionRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },

  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '500',
  },
});