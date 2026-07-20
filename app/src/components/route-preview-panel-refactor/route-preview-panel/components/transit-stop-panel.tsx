import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { McIcon, PackageActionIcon } from './icons';
import { RouteCompletionPromptPanel } from './completion-panels';

type TransitPanelView = 'current' | 'route' | 'stop-detail';

type TransitStopPanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
  isCancellingRoute?: boolean;
  onCancelRoute?: () => void | Promise<void>;
  onOpenStopDetails?: (stop: any) => void;
};

const DONE_STATUSES = new Set(['delivered', 'failed', 'completed']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled']);

const getText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return '';
};

const formatClock = (date: Date) => {
  return date
    .toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(' AM', ' am')
    .replace(' PM', ' pm');
};

const formatArrivalTime = (value: unknown, options?: { includeDay?: boolean }) => {
  const text = getText(value);
  if (!text) return '';

  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [hourText, minute] = text.split(':');
    const hour = Number(hourText);
    const suffix = hour >= 12 ? 'pm' : 'am';
    const twelveHour = hour % 12 || 12;
    const timeStr = `${twelveHour}:${minute} ${suffix}`;
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString([], { month: 'short' });
    return `${day} ${month}, ${timeStr}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = parsed.toLocaleDateString([], { month: 'short' });
    const time = formatClock(parsed);
    return `${day} ${month}, ${time}`;
  }

  return text;
};

const formatStopDistance = (meters: unknown) => {
  const num = Number(meters);
  if (!Number.isFinite(num) || num <= 0) return '';
  const miles = num * 0.000621371;
  return `${miles.toFixed(1)} mi`;
};

const getDistributedStopDistance = (index: number, stopsCount: number, distanceLabel?: string) => {
  if (stopsCount <= 0 || !distanceLabel) return null;
  const match = distanceLabel.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const totalVal = parseFloat(match[1]);
  if (Number.isNaN(totalVal)) return null;

  const unit = distanceLabel.toLowerCase().includes('km') ? 'km' : 'mi';
  const distributedVal = totalVal * ((index + 1) / (stopsCount + 1));
  return `${distributedVal.toFixed(1)} ${unit}`;
};

const getStopDisplayDistance = (
  stop: any,
  index: number,
  stopsCount: number,
  distanceLabel?: string,
) => {
  const directLabel = getText(
    stop?.distance_label,
    stop?.distanceLabel,
    stop?.distance_text,
    stop?.distanceText,
    typeof stop?.distance === 'string' && /[a-zA-Z]/.test(stop.distance)
      ? stop.distance
      : '',
  );

  if (directLabel) return directLabel;

  const directMeters = getNumericValue(
    stop?.distance_meters,
    stop?.distanceMeters,
    stop?.distance,
  );
  if (directMeters !== null) {
    const formatted = formatStopDistance(directMeters);
    if (formatted) return formatted;
  }

  return getDistributedStopDistance(index, stopsCount, distanceLabel) || '';
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
    address.full_address || address.fullAddress,
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

  return Array.from(new Set(parts.map(String))).join(', ');
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

const getPointAddress = (point: any) => {
  return (
    getText(
      point?.full_address,
      point?.fullAddress,
      point?.address,
      point?.subtitle,
      point?.description,
      point?.name,
    ) || buildAddressFromObject(point) || 'Address not available'
  );
};

const getPointTitle = (point: any, fallback: string) => {
  const address = getPointAddress(point);

  return getText(
    point?.title,
    point?.name,
    point?.locationName,
    point?.location_name,
    address.split(',')[0],
    fallback,
  );
};

const getStopTitle = (stop: any, index: number) => {
  const stopAddress = getStopAddress(stop);

  return getText(
    stop?.title,
    stop?.name,
    stop?.customerName,
    stop?.customer_name,
    stop?.locationName,
    stop?.location_name,
    stopAddress.split(',')[0],
    `Stop ${index + 1}`,
  );
};

const getStopOrderId = (stop: any, index: number) => {
  return getText(
    stop?.orderId,
    stop?.order_id,
    stop?.backendOrderId,
    stop?.backend_order_id,
    stop?.orderNumber,
    stop?.order_number,
    stop?.id,
    `A${index + 1}`,
  );
};

const getStopNotes = (stop: any) => {
  return getText(stop?.notes, stop?.note, stop?.deliveryNotes, stop?.delivery_notes);
};

const humanizeFieldValue = (...values: unknown[]) => {
  const text = getText(...values);
  if (!text) return '';

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStopType = (stop: any) => {
  return humanizeFieldValue(
    stop?.stop_type,
    stop?.stopType,
    stop?.order_type,
    stop?.orderType,
    stop?.type,
  );
};

const getStopPhone = (stop: any) => {
  return getText(
    stop?.phone,
    stop?.phoneNumber,
    stop?.phone_number,
    stop?.customerPhone,
    stop?.customer_phone,
  );
};

const getNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  }

  return null;
};

const parseDurationLabelToSeconds = (label?: string) => {
  if (!label) return null;

  const normalized = label.toLowerCase().replace(/,/g, ' ');
  let seconds = 0;

  const dayMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:d|day|days)/);
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)/);
  const secondMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)/);

  if (dayMatch) seconds += Number(dayMatch[1]) * 86400;
  if (hourMatch) seconds += Number(hourMatch[1]) * 3600;
  if (minuteMatch) seconds += Number(minuteMatch[1]) * 60;
  if (secondMatch) seconds += Number(secondMatch[1]);

  return seconds > 0 ? seconds : null;
};

const getStopOffsetSeconds = (stop: any, fallbackOffsetSeconds?: number | null) => {
  const directOffset = getNumericValue(
    stop?.arrivalOffsetSeconds,
    stop?.arrival_offset_seconds,
    stop?.etaSeconds,
    stop?.eta_seconds,
    stop?.cumulativeDurationSeconds,
    stop?.cumulative_duration_seconds,
    stop?.durationSeconds,
    stop?.duration_seconds,
    stop?.arrival,
    stop?.duration,
  );

  if (directOffset !== null) return directOffset;
  return Number.isFinite(Number(fallbackOffsetSeconds)) ? Number(fallbackOffsetSeconds) : null;
};

const getDistributedOffsetSeconds = (index: number, stopsCount: number, durationLabel?: string) => {
  const totalSeconds = parseDurationLabelToSeconds(durationLabel);
  if (!totalSeconds || stopsCount <= 0) return null;

  // Fallback only: distribute total route duration across stops when backend/optimizer
  // does not return per-stop ETA. Accurate ETA should come from optimize steps.
  return Math.round(totalSeconds * ((index + 1) / (stopsCount + 1)));
};

const formatArrivalFromOffset = (startTime: unknown, offsetSeconds: number | null, includeDay: boolean) => {
  const startText = getText(startTime);
  if (!startText || offsetSeconds === null) return '';

  const parsedStart = new Date(startText);
  if (Number.isNaN(parsedStart.getTime())) return '';

  const arrival = new Date(parsedStart.getTime() + offsetSeconds * 1000);
  return formatArrivalTime(arrival.toISOString(), { includeDay });
};

const getStopArrivalTime = (
  stop: any,
  includeDay = false,
  fallbackStartTime?: unknown,
  fallbackOffsetSeconds?: number | null,
) => {
  // If the stop is already delivered or failed, show actual arrival time
  if (isStopDone(stop)) {
    const actualTime = getStopActualArrivalTime(stop, includeDay);
    if (actualTime) return actualTime;
  }

  // ETA = current time + time taken to cover that stop
  const travelDuration = getNumericValue(
    stop?.duration_seconds,
    stop?.durationSeconds,
    stop?.duration,
    stop?.arrivalOffsetSeconds,
    stop?.arrival_offset_seconds,
    stop?.etaSeconds,
    stop?.eta_seconds,
    fallbackOffsetSeconds,
  );

  if (travelDuration !== null) {
    const baseTime = new Date();
    const arrival = new Date(baseTime.getTime() + travelDuration * 1000);
    return formatArrivalTime(arrival.toISOString(), { includeDay });
  }

  // Fallback to direct labels if numeric duration is unavailable
  const directArrival = formatArrivalTime(
    stop?.eta ||
    stop?.etaLabel ||
    stop?.eta_label ||
    stop?.etaTime ||
    stop?.eta_time ||
    stop?.time ||
    stop?.arrivalTime ||
    stop?.arrival_time ||
    stop?.arrivalDatetime ||
    stop?.arrival_datetime ||
    stop?.estimatedArrival ||
    stop?.estimated_arrival ||
    stop?.estimatedArrivalTime ||
    stop?.estimated_arrival_time ||
    stop?.plannedArrival ||
    stop?.planned_arrival ||
    stop?.expectedArrival ||
    stop?.expected_arrival ||
    stop?.scheduledTime ||
    stop?.scheduled_time,
    { includeDay },
  );

  return directArrival || '';
};

const getStopIdentity = (stop: any) => {
  return getText(
    stop?.backendOrderId,
    stop?.backend_order_id,
    stop?.orderId,
    stop?.order_id,
    stop?.id,
    stop?.sequenceNo,
    stop?.sequence,
  );
};

const isSameStop = (left: any, right: any) => {
  if (!left || !right) return false;

  const leftId = getStopIdentity(left);
  const rightId = getStopIdentity(right);

  if (leftId && rightId) return leftId === rightId;

  return left === right;
};

function getStopStatus(stop: any) {
  return getText(stop?.status, stop?.orderStatus, stop?.order_status).toLowerCase();
}

function isStopDone(stop: any) {
  return DONE_STATUSES.has(getStopStatus(stop));
}

function isStopFailed(stop: any) {
  return FAILED_STATUSES.has(getStopStatus(stop));
}

const getStopStatusMeta = (stop: any, isActive: boolean) => {
  const status = getStopStatus(stop);

  if (FAILED_STATUSES.has(status)) {
    return { label: 'Failed', tone: 'red' as const };
  }

  if (status === 'delivered' || status === 'completed') {
    return { label: 'Delivered', tone: 'green' as const };
  }

  if (isActive) {
    return { label: 'Current', tone: 'blue' as const };
  }

  if (status === 'in_transit' || status === 'in-transit') {
    return { label: 'In transit', tone: 'blue' as const };
  }

  return { label: 'Pending', tone: 'slate' as const };
};

function getStopActualArrivalTime(stop: any, includeDay = false) {
  const actualTime =
    stop?.actualArrivalTime ||
    stop?.actual_arrival_time ||
    stop?.deliveredAt ||
    stop?.delivered_at ||
    stop?.failedAt ||
    stop?.failed_at ||
    stop?.completedAt ||
    stop?.completed_at ||
    stop?.statusUpdatedAt ||
    stop?.status_updated_at ||
    stop?.markedAt ||
    stop?.marked_at ||
    stop?.updatedAt ||
    stop?.updated_at;

  return formatArrivalTime(actualTime, { includeDay });
}

const getStopTimelineTimeInfo = (
  stop: any,
  index: number,
  stopsCount: number,
  startTime: unknown,
  durationLabel?: string,
) => {
  const failed = isStopFailed(stop);
  const done = isStopDone(stop);

  if (done) {
    const actualTime =
      getStopActualArrivalTime(stop, true) ||
      getStopArrivalTime(
        stop,
        true,
        startTime,
        getDistributedOffsetSeconds(index, stopsCount, durationLabel),
      );

    return {
      label: failed ? 'Failed at' : 'Arrived',
      value: actualTime || '--',
    };
  }

  return {
    label: 'ETA',
    value:
      getStopArrivalTime(
        stop,
        true,
        startTime,
        getDistributedOffsetSeconds(index, stopsCount, durationLabel),
      ) || '--',
  };
};

const getStopPackageCount = (stop: any) => {
  const packagesValue =
    stop?.packages ??
    stop?.packageCount ??
    stop?.package_count ??
    stop?.packagesCount ??
    stop?.packages_count ??
    stop?.numberOfPackages ??
    stop?.number_of_packages;

  if (Array.isArray(packagesValue)) {
    const count = packagesValue.length;
    return `${count} ${count === 1 ? 'package' : 'packages'}`;
  }

  if (typeof packagesValue === 'number' && Number.isFinite(packagesValue)) {
    return `${packagesValue} ${packagesValue === 1 ? 'package' : 'packages'}`;
  }

  if (typeof packagesValue === 'string' && packagesValue.trim()) {
    const value = packagesValue.trim();
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return `${numericValue} ${numericValue === 1 ? 'package' : 'packages'}`;
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const count = parsed.length;
        return `${count} ${count === 1 ? 'package' : 'packages'}`;
      }
    } catch {
      // Keep a descriptive package value as-is, for example "2 boxes".
    }

    return value;
  }

  return '';
};

const getStopIssueText = (stop: any) => {
  return getText(
    stop?.failureReason,
    stop?.failure_reason,
    stop?.issue,
    stop?.issueText,
    stop?.issue_text,
    stop?.cancelReason,
    stop?.cancel_reason,
  );
};

const getNavigationUrl = (stop: any) => {
  const latitude = Number(stop?.latitude ?? stop?.lat ?? stop?.location?.latitude ?? stop?.location?.lat);
  const longitude = Number(stop?.longitude ?? stop?.lng ?? stop?.lon ?? stop?.location?.longitude ?? stop?.location?.lng ?? stop?.location?.lon);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getStopAddress(stop))}`;
};

function ActionButton({
  label,
  icon,
  variant = 'light',
  disabled,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  variant?: 'blue' | 'green' | 'red' | 'light';
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        localStyles.actionButton,
        variant === 'blue' && localStyles.actionButtonBlue,
        variant === 'green' && localStyles.actionButtonGreen,
        variant === 'red' && localStyles.actionButtonRed,
        disabled && localStyles.actionDisabled,
        pressed && !disabled && localStyles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon}
      <Text
        style={[
          localStyles.actionButtonText,
          variant === 'blue' && localStyles.actionButtonTextBlue,
          variant === 'green' && localStyles.actionButtonTextGreen,
          variant === 'red' && localStyles.actionButtonTextRed,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  muted,
  danger,
  rightIcon = true,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  muted?: boolean;
  danger?: boolean;
  rightIcon?: boolean;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper style={localStyles.detailRow} onPress={onPress}>
      <View style={[localStyles.detailIconBox, danger && localStyles.detailIconDanger]}>{icon}</View>
      <View style={localStyles.detailTextBox}>
        <Text style={[localStyles.detailLabel, danger && localStyles.dangerText]}>{label}</Text>
        {value ? (
          <Text
            style={[
              localStyles.detailValue,
              muted && localStyles.mutedValue,
              danger && localStyles.dangerText,
            ]}
            numberOfLines={2}
          >
            {value}
          </Text>
        ) : null}
      </View>
      {rightIcon ? <Feather name="chevron-right" size={20} color="#94A3B8" /> : null}
    </Wrapper>
  );
}

function StopInformationCard({
  packages,
  notes,
  arrivalTime,
  stopType,
  onEdit,
}: {
  packages: string;
  notes: string;
  arrivalTime: string;
  stopType: string;
  onEdit?: () => void;
}) {
  return (
    <View style={localStyles.stopInformationSection}>
      <View style={localStyles.stopInformationHeader}>
        <Text style={localStyles.stopInformationTitle}>Stop details</Text>
        {onEdit ? (
          <Pressable
            style={({ pressed }) => [
              localStyles.inlineEditButton,
              pressed && localStyles.pressed,
            ]}
            onPress={onEdit}
          >
            <Feather name="edit-3" size={14} color="#2563EB" />
            <Text style={localStyles.inlineEditText}>Edit stop</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={localStyles.stopInformationCard}>
        <View style={localStyles.stopInformationTopRow}>
          <View style={localStyles.stopInformationCompactItem}>
            <View style={localStyles.stopInformationIconBlue}>
              <Feather name="package" size={18} color="#2563EB" />
            </View>
            <Text style={localStyles.stopInformationLabel}>Packages</Text>
            <Text style={localStyles.stopInformationValue} numberOfLines={2}>
              {packages || 'Not specified'}
            </Text>
          </View>

          <View style={localStyles.stopInformationVerticalDivider} />

          <View style={localStyles.stopInformationCompactItem}>
            <View style={localStyles.stopInformationIconPurple}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={19} color="#7C3AED" />
            </View>
            <Text style={localStyles.stopInformationLabel}>Stop type</Text>
            <Text style={localStyles.stopInformationValue} numberOfLines={2}>
              {stopType || 'Not specified'}
            </Text>
          </View>
        </View>

        <View style={localStyles.stopInformationDivider} />

        <View style={localStyles.stopInformationWideItem}>
          <View style={localStyles.stopInformationIconGreen}>
            <Feather name="clock" size={18} color="#15803D" />
          </View>
          <View style={localStyles.stopInformationTextBox}>
            <Text style={localStyles.stopInformationLabel}>Time of arrival</Text>
            <Text style={localStyles.stopInformationValue}>
              {arrivalTime || 'Not available'}
            </Text>
          </View>
          <View style={localStyles.sameAsEtaBadge}>
            <Text style={localStyles.sameAsEtaBadgeText}>Same as ETA</Text>
          </View>
        </View>

        <View style={localStyles.stopInformationDivider} />

        <View style={[localStyles.stopInformationWideItem, localStyles.notesInformationItem]}>
          <View style={localStyles.stopInformationIconSlate}>
            <McIcon name="note-text-outline" size={18} color="#475569" />
          </View>
          <View style={localStyles.stopInformationTextBox}>
            <Text style={localStyles.stopInformationLabel}>Notes</Text>
            <Text
              style={[
                localStyles.stopInformationValue,
                !notes && localStyles.stopInformationMutedValue,
              ]}
            >
              {notes || 'No notes added for this stop'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SegmentedHeader({
  active,
  onCurrent,
  onRoute,
}: {
  active: 'current' | 'route';
  onCurrent: () => void;
  onRoute: () => void;
}) {
  return (
    <View style={localStyles.segmentedControl}>
      <Pressable
        style={[localStyles.segmentItem, active === 'current' && localStyles.segmentItemActive]}
        onPress={onCurrent}
      >
        <Text style={[localStyles.segmentText, active === 'current' && localStyles.segmentTextActive]}>
          Current stop
        </Text>
      </Pressable>

      <Pressable
        style={[localStyles.segmentItem, active === 'route' && localStyles.segmentItemActive]}
        onPress={onRoute}
      >
        <Text style={[localStyles.segmentText, active === 'route' && localStyles.segmentTextActive]}>
          Full route
        </Text>
      </Pressable>
    </View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'blue' | 'green' | 'red' | 'slate' }) {
  return (
    <View
      style={[
        localStyles.statusPill,
        tone === 'blue' && localStyles.statusPillBlue,
        tone === 'green' && localStyles.statusPillGreen,
        tone === 'red' && localStyles.statusPillRed,
        tone === 'slate' && localStyles.statusPillSlate,
      ]}
    >
      <View
        style={[
          localStyles.statusDot,
          tone === 'blue' && localStyles.statusDotBlue,
          tone === 'green' && localStyles.statusDotGreen,
          tone === 'red' && localStyles.statusDotRed,
          tone === 'slate' && localStyles.statusDotSlate,
        ]}
      />
      <Text
        style={[
          localStyles.statusPillText,
          tone === 'blue' && localStyles.statusPillTextBlue,
          tone === 'green' && localStyles.statusPillTextGreen,
          tone === 'red' && localStyles.statusPillTextRed,
          tone === 'slate' && localStyles.statusPillTextSlate,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function MetaChip({ icon, text }: { icon: ReactNode; text: string }) {
  if (!text) return null;

  return (
    <View style={localStyles.metaChip}>
      {icon}
      <Text style={localStyles.metaChipText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export function TransitStopPanel(props: TransitStopPanelProps) {
  const {
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
    isCancellingRoute,
    onOpenSearch,
    onNavigateActiveStop,
    onMarkStopDelivered,
    onMarkStopFailed,
    onMarkRouteCompleted,
    onCancelRoute,
    onOpenStopDetails,
  } = props;

  const insets = useSafeAreaInsets();
  const [panelView, setPanelView] = useState<TransitPanelView>('current');
  const [selectedStop, setSelectedStop] = useState<any | null>(null);
  const [navModalVisible, setNavModalVisible] = useState(false);
  const [navModalStop, setNavModalStop] = useState<any | null>(null);

  const stop: any = activeStop || null;

  const activeIndexInAllStops = useMemo(() => {
    if (!stop) return -1;
    const index = (stops || []).findIndex((item: any) => isSameStop(item, stop));
    return index >= 0 ? index : activeStopIndex;
  }, [activeStopIndex, stop, stops]);

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

  const totalStops = Math.max((stops || []).length, totalActiveStops || 0, 1);
  const progressIndex = Math.min(Math.max(activeIndexInAllStops + 1, activeStopIndex + 1), totalStops);
  const progressLabel = `${progressIndex}/${totalStops}`;
  const stopTitle = getStopTitle(stop, activeIndexInAllStops >= 0 ? activeIndexInAllStops : activeStopIndex);
  const stopAddress = getStopAddress(stop);
  const currentFallbackOffsetSeconds = getDistributedOffsetSeconds(
    activeIndexInAllStops >= 0 ? activeIndexInAllStops : activeStopIndex,
    (stops || []).length,
    durationLabel,
  );
  const arrivalTime = getStopArrivalTime(stop, false, startTime, currentFallbackOffsetSeconds);
  const completedStops = (stops || []).filter((item: any) => isStopDone(item)).length;
  const progressPercent = Math.min(100, Math.max(8, (completedStops / totalStops) * 100));

  const openRoute = () => {
    setSelectedStop(null);
    setPanelView('route');
  };

  const openCurrent = () => {
    setSelectedStop(null);
    setPanelView('current');
  };

  const openStopDetail = (nextStop: any) => {
    setSelectedStop(nextStop);
    setPanelView('stop-detail');
  };

  const handleNavigateStop = (targetStop: any) => {
    setNavModalStop(targetStop);
    setNavModalVisible(true);
  };

  const handleCallStop = async (targetStop: any) => {
    const phone = getStopPhone(targetStop);
    if (!phone) return;

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      // No-op. Device may not support calls.
    }
  };

  const markDeliveredIfActive = () => {
    if (!selectedStop || isSameStop(selectedStop, stop)) onMarkStopDelivered?.();
  };

  const markFailedIfActive = () => {
    if (!selectedStop || isSameStop(selectedStop, stop)) onMarkStopFailed?.();
  };

  const contentBottomPadding = Math.max(insets.bottom + 18, 30);

  const renderCurrentStop = () => {
    const currentIndex = activeIndexInAllStops >= 0 ? activeIndexInAllStops : activeStopIndex;
    const notes = getStopNotes(stop);
    const packages = getStopPackageCount(stop);
    const stopType = getStopType(stop);
    const stopDistance = getStopDisplayDistance(stop, currentIndex, totalStops, distanceLabel);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[localStyles.currentContent, { paddingBottom: contentBottomPadding }]}
      >
        <SegmentedHeader active="current" onCurrent={openCurrent} onRoute={openRoute} />

        <View style={localStyles.currentHeader}>
          <View style={localStyles.currentHeaderText}>
            <Text style={localStyles.eyebrow}>Current stop</Text>
            <Text style={localStyles.currentTitle} numberOfLines={2}>{stopTitle}</Text>
            <Text style={localStyles.currentAddress} numberOfLines={3}>{stopAddress}</Text>
          </View>

          <View style={localStyles.countPill}>
            <Text style={localStyles.countPillText}>{progressLabel}</Text>
          </View>
        </View>

        <View style={localStyles.travelSummaryCard}>
          <View style={localStyles.travelSummaryItem}>
            <View style={localStyles.travelSummaryIconBlue}>
              <Feather name="clock" size={18} color="#2563EB" />
            </View>
            <View style={localStyles.travelSummaryTextBox}>
              <Text style={localStyles.travelSummaryLabel}>ETA</Text>
              <Text style={localStyles.travelSummaryValue} numberOfLines={1}>
                {arrivalTime || '--'}
              </Text>
            </View>
          </View>

          <View style={localStyles.travelSummaryDivider} />

          <View style={localStyles.travelSummaryItem}>
            <View style={localStyles.travelSummaryIconBlue}>
              <Feather name="map-pin" size={18} color="#2563EB" />
            </View>
            <View style={localStyles.travelSummaryTextBox}>
              <Text style={localStyles.travelSummaryLabel}>Distance</Text>
              <Text style={localStyles.travelSummaryValue} numberOfLines={1}>
                {stopDistance || '--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={localStyles.currentActionsRow}>
          <ActionButton
            label="Navigate"
            variant="blue"
            disabled={Boolean(isUpdatingStopStatus)}
            icon={<MaterialCommunityIcons name="navigation-variant" size={24} color="#FFFFFF" />}
            onPress={() => handleNavigateStop(stop)}
          />

          <ActionButton
            label={isUpdatingStopStatus ? 'Updating' : 'Delivered'}
            variant="green"
            disabled={Boolean(isUpdatingStopStatus)}
            icon={<PackageActionIcon type="delivered" />}
            onPress={onMarkStopDelivered}
          />

          <ActionButton
            label={isUpdatingStopStatus ? 'Updating' : 'Failed'}
            variant="red"
            disabled={Boolean(isUpdatingStopStatus)}
            icon={<PackageActionIcon type="failed" />}
            onPress={onMarkStopFailed}
          />
        </View>

        <View style={localStyles.addressCard}>
          <View style={localStyles.addressIconBox}>
            <McIcon name="map-marker-outline" size={22} color="#2563EB" />
          </View>
          <View style={localStyles.addressContent}>
            <Text style={localStyles.sectionLabel}>Full delivery address</Text>
            <Text style={localStyles.addressText}>{stopAddress}</Text>
          </View>
        </View>

        <StopInformationCard
          packages={packages}
          notes={notes}
          arrivalTime={arrivalTime}
          stopType={stopType}
          onEdit={onOpenStopDetails ? () => onOpenStopDetails(stop) : undefined}
        />
      </ScrollView>
    );
  };

  const renderFullRoute = () => {
    const allStops = stops || [];
    const deliveredCount = allStops.filter((item: any) => isStopDone(item) && !isStopFailed(item)).length;
    const failedCount = allStops.filter((item: any) => isStopFailed(item)).length;
    const pendingCount = allStops.filter((item: any) => !isStopDone(item)).length;
    const activeTitle = stop ? getStopTitle(stop, activeIndexInAllStops >= 0 ? activeIndexInAllStops : activeStopIndex) : '';
    const stopDistance = getStopDisplayDistance(stop, progressIndex - 1, totalStops, distanceLabel);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[localStyles.fullRouteContent, { paddingBottom: contentBottomPadding }]}
      >
        <SegmentedHeader active="route" onCurrent={openCurrent} onRoute={openRoute} />

        <View style={localStyles.progressHeader}>
          <Text style={localStyles.progressLabel}>Route progress</Text>
          <Text style={localStyles.progressValue}>{progressIndex} of {totalStops} stops</Text>
        </View>
        <View style={localStyles.progressTrack}>
          <View style={[localStyles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={localStyles.statsGrid}>
          <View style={localStyles.statBox}>
            <Text style={localStyles.statLabel}>Remaining</Text>
            <Text style={localStyles.statValue}>{pendingCount} stops</Text>
          </View>
          <View style={localStyles.statBox}>
            <Text style={localStyles.statLabel}>Delivered</Text>
            <Text style={localStyles.statValue}>{deliveredCount}</Text>
          </View>
          <View style={localStyles.statBox}>
            <Text style={localStyles.statLabel}>Failed</Text>
            <Text style={localStyles.statValue}>{failedCount}</Text>
          </View>
        </View>


        {activeTitle ? (
          <View style={localStyles.nextStopCard}>
            <View style={localStyles.nextStopIcon}>
              <MaterialCommunityIcons name="navigation-variant" size={15} color="#2563EB" />
            </View>
            <View style={localStyles.nextStopTextBox}>
              <Text style={localStyles.nextStopLabel}>Current stop</Text>
              <Text style={localStyles.nextStopTitle} numberOfLines={1}>{activeTitle}</Text>
            </View>
            <Text style={localStyles.nextStopEta}>
              ETA {arrivalTime || '--'}
              {stopDistance ? ` • ${stopDistance}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={localStyles.timelineCard}>
          <View style={localStyles.timelineRow}>
            <View style={localStyles.timeColumn}>
              <Text style={localStyles.timelineTime}>{formatArrivalTime(startTime) || '--'}</Text>
              <Text style={localStyles.timelineTimeKind}>Start</Text>
            </View>
            <View style={localStyles.markerColumn}>
              <View style={[localStyles.timelineMarker, localStyles.timelineMarkerBlue]}>
                <MaterialCommunityIcons name="navigation-variant" size={13} color="#FFFFFF" />
              </View>
              <View style={localStyles.timelineConnector} />
            </View>
            <View style={localStyles.timelineContent}>
              <Text style={localStyles.timelineTitle}>Start location</Text>
              <Text style={localStyles.timelineAddress} numberOfLines={2}>{getPointAddress(start)}</Text>
            </View>
          </View>

          {allStops.map((item: any, index: number) => {
            const isActive = isSameStop(item, stop);
            const done = isStopDone(item);
            const failed = isStopFailed(item);
            const statusMeta = getStopStatusMeta(item, isActive);
            const timeInfo = getStopTimelineTimeInfo(item, index, allStops.length, startTime, durationLabel);
            const itemDistance = getStopDisplayDistance(item, index, allStops.length, distanceLabel);

            return (
              <Pressable
                key={`${getStopIdentity(item) || index}`}
                style={({ pressed }) => [
                  localStyles.timelineRow,
                  localStyles.timelineStopRow,
                  isActive && localStyles.timelineActiveRow,
                  pressed && localStyles.pressed,
                ]}
                onPress={() => openStopDetail(item)}
              >
                <View style={localStyles.timeColumn}>
                  <Text
                    style={[
                      localStyles.timelineTime,
                      done && !failed && localStyles.timelineTimeGreen,
                      failed && localStyles.timelineTimeRed,
                    ]}
                  >
                    {timeInfo.value}
                  </Text>
                  <Text
                    style={[
                      localStyles.timelineTimeKind,
                      done && !failed && localStyles.timelineTimeKindGreen,
                      failed && localStyles.timelineTimeKindRed,
                    ]}
                  >
                    {timeInfo.label}
                  </Text>
                  {itemDistance ? (
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {itemDistance}
                    </Text>
                  ) : null}
                </View>
                <View style={localStyles.markerColumn}>
                  <View
                    style={[
                      localStyles.timelineMarker,
                      isActive && localStyles.timelineMarkerBlue,
                      done && !failed && localStyles.timelineMarkerGreen,
                      failed && localStyles.timelineMarkerRed,
                    ]}
                  >
                    {done ? (
                      <Feather name={failed ? 'x' : 'check'} size={12} color="#FFFFFF" />
                    ) : isActive ? (
                      <MaterialCommunityIcons name="navigation-variant" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={[localStyles.timelineMarkerText, isActive && localStyles.timelineMarkerTextActive]}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={localStyles.timelineConnector} />
                </View>
                <View style={localStyles.timelineContent}>
                  <View style={localStyles.timelineTitleRow}>
                    <Text style={localStyles.timelineTitle} numberOfLines={1}>{getStopTitle(item, index)}</Text>
                    <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                  </View>
                  <Text style={localStyles.timelineAddress} numberOfLines={2}>{getStopAddress(item)}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#CBD5E1" />
              </Pressable>
            );
          })}

          <View style={[localStyles.timelineRow, localStyles.timelineRowLast]}>
            <View style={localStyles.timeColumn}>
              <Text style={localStyles.timelineTime}>End</Text>
            </View>
            <View style={localStyles.markerColumn}>
              <View style={[localStyles.timelineMarker, localStyles.timelineMarkerFinish]}>
                <Feather name="flag" size={12} color="#FFFFFF" />
              </View>
            </View>
            <View style={localStyles.timelineContent}>
              <Text style={localStyles.timelineTitle}>End location</Text>
              <Text style={localStyles.timelineAddress} numberOfLines={2}>{getPointAddress(end)}</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            localStyles.cancelRouteButton,
            (isCancellingRoute || !onCancelRoute) && localStyles.actionDisabled,
            pressed && onCancelRoute && !isCancellingRoute && localStyles.pressed,
          ]}
          onPress={onCancelRoute}
          disabled={Boolean(isCancellingRoute || !onCancelRoute)}
        >
          <Feather name="trash-2" size={17} color="#EF4444" />
          <Text style={localStyles.cancelRouteText}>{isCancellingRoute ? 'Cancelling...' : 'Cancel route'}</Text>
        </Pressable>
      </ScrollView>
    );
  };

  const renderStopDetail = () => {
    const detailStop = selectedStop || stop;
    const detailIndex = Math.max(0, (stops || []).findIndex((item: any) => isSameStop(item, detailStop)));
    const detailTitle = getStopTitle(detailStop, detailIndex);
    const detailAddress = getStopAddress(detailStop);
    const detailNotes = getStopNotes(detailStop);
    const detailPackages = getStopPackageCount(detailStop);
    const detailStopType = getStopType(detailStop);
    const detailArrivalTime = getStopArrivalTime(
      detailStop,
      false,
      startTime,
      getDistributedOffsetSeconds(detailIndex, (stops || []).length, durationLabel),
    );
    const phone = getStopPhone(detailStop);
    const canUpdateThisStop = isSameStop(detailStop, stop) && !isStopDone(detailStop);
    const detailStopDistance = getStopDisplayDistance(detailStop, detailIndex, (stops || []).length, distanceLabel);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[localStyles.stopDetailContent, { paddingBottom: contentBottomPadding }]}
      >
        <View style={localStyles.stopDetailTopBar}>
          <Pressable style={localStyles.backButton} onPress={openRoute}>
            <Feather name="chevron-left" size={20} color="#2563EB" />
            <Text style={localStyles.backText}>Full route</Text>
          </Pressable>

          <Pressable style={localStyles.roundIconButton} onPress={openCurrent}>
            <Feather name="chevron-down" size={18} color="#0F172A" />
          </Pressable>
        </View>

        <Text style={localStyles.detailTitle} numberOfLines={2}>{detailTitle}</Text>
        <Text style={localStyles.detailSubtitle} numberOfLines={2}>{detailAddress}</Text>

        <View style={localStyles.detailTravelSummaryCard}>
          <View style={localStyles.travelSummaryItem}>
            <View style={localStyles.travelSummaryIconBlue}>
              <Feather name="clock" size={18} color="#2563EB" />
            </View>
            <View style={localStyles.travelSummaryTextBox}>
              <Text style={localStyles.travelSummaryLabel}>ETA</Text>
              <Text style={localStyles.travelSummaryValue} numberOfLines={1}>
                {detailArrivalTime || '--'}
              </Text>
            </View>
          </View>

          <View style={localStyles.travelSummaryDivider} />

          <View style={localStyles.travelSummaryItem}>
            <View style={localStyles.travelSummaryIconBlue}>
              <Feather name="map-pin" size={18} color="#2563EB" />
            </View>
            <View style={localStyles.travelSummaryTextBox}>
              <Text style={localStyles.travelSummaryLabel}>Distance</Text>
              <Text style={localStyles.travelSummaryValue} numberOfLines={1}>
                {detailStopDistance || '--'}
              </Text>
            </View>
          </View>
        </View>

        {/* <View style={localStyles.detailQuickActions}>
          <Pressable
            style={[localStyles.quickActionCircle, !phone && localStyles.actionDisabled]}
            onPress={() => handleCallStop(detailStop)}
            disabled={!phone}
          >
            <Feather name="phone" size={20} color="#2563EB" />
            <Text style={localStyles.quickActionText}>Call</Text>
          </Pressable>

          <Pressable style={localStyles.quickActionCircle} onPress={() => handleNavigateStop(detailStop)}>
            <MaterialCommunityIcons name="navigation-variant" size={22} color="#2563EB" />
            <Text style={localStyles.quickActionText}>Navigate</Text>
          </Pressable>

          <Pressable style={localStyles.quickActionCircle}>
            <Feather name="more-horizontal" size={22} color="#0F172A" />
            <Text style={localStyles.quickActionText}>More</Text>
          </Pressable>
        </View> */}

        <StopInformationCard
          packages={detailPackages}
          notes={detailNotes}
          arrivalTime={detailArrivalTime}
          stopType={detailStopType}
          onEdit={onOpenStopDetails ? () => onOpenStopDetails(detailStop) : undefined}
        />

        <View style={localStyles.optionsCard}>
          {/* <DetailRow
            icon={<Feather name="plus-square" size={18} color="#2563EB" />}
            label="Add note"
            value=""
          /> */}
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="flag" size={18} color="#EF4444" />}
            label="Report issue"
            value=""
            danger
          />
        </View>

        <View style={localStyles.detailBottomActions}>
          <Pressable
            style={({ pressed }) => [
              localStyles.bottomStatusButton,
              localStyles.bottomDeliveredButton,
              (!canUpdateThisStop || isUpdatingStopStatus) && localStyles.actionDisabled,
              pressed && canUpdateThisStop && !isUpdatingStopStatus && localStyles.pressed,
            ]}
            onPress={markDeliveredIfActive}
            disabled={!canUpdateThisStop || Boolean(isUpdatingStopStatus)}
          >
            <Feather name="check-circle" size={18} color="#16A34A" />
            <Text style={localStyles.bottomDeliveredText}>Delivered</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              localStyles.bottomStatusButton,
              localStyles.bottomFailedButton,
              (!canUpdateThisStop || isUpdatingStopStatus) && localStyles.actionDisabled,
              pressed && canUpdateThisStop && !isUpdatingStopStatus && localStyles.pressed,
            ]}
            onPress={markFailedIfActive}
            disabled={!canUpdateThisStop || Boolean(isUpdatingStopStatus)}
          >
            <Feather name="x-circle" size={18} color="#EF4444" />
            <Text style={localStyles.bottomFailedText}>Failed</Text>
          </Pressable>
        </View>

        {!canUpdateThisStop ? (
          <Text style={localStyles.currentOnlyHint}>Delivery status can be changed only for the current active stop.</Text>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <>
      <DraggableRouteSheet
        isWide={isWide}
        initialSnap="top"
        collapsedHeight={92}
      >
        {panelView === 'current' ? renderCurrentStop() : null}
        {panelView === 'route' ? renderFullRoute() : null}
        {panelView === 'stop-detail' ? renderStopDetail() : null}
      </DraggableRouteSheet>

      <Modal
        visible={navModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNavModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContainer}>
            <View style={localStyles.modalHeaderIcon}>
              <MaterialCommunityIcons name="navigation" size={32} color="#2563EB" />
            </View>

            <Text style={localStyles.modalTitle}>Choose Navigation</Text>
            <Text style={localStyles.modalSubtitle}>
              Select how you want to navigate to this stop:
            </Text>

            <Pressable
              style={({ pressed }) => [
                localStyles.modalOptionButton,
                localStyles.routeFlowBtn,
                pressed && localStyles.btnPressed,
              ]}
              onPress={async () => {
                setNavModalVisible(false);
                if (onNavigateActiveStop && navModalStop) {
                  await onNavigateActiveStop(navModalStop);
                }
              }}
            >
              <MaterialCommunityIcons name="compass-outline" size={24} color="#FFFFFF" />
              <View style={localStyles.btnTextContainer}>
                <Text style={localStyles.btnTitleLight}>RouteFlow Navigation</Text>
                <Text style={localStyles.btnDescLight}>Stay in app with live GPS follow</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                localStyles.modalOptionButton,
                localStyles.googleMapsBtn,
                pressed && localStyles.btnPressed,
              ]}
              onPress={async () => {
                setNavModalVisible(false);
                if (navModalStop) {
                  try {
                    await Linking.openURL(getNavigationUrl(navModalStop));
                  } catch {
                    Alert.alert('Error', 'Unable to open Google Maps.');
                  }
                }
              }}
            >
              <MaterialCommunityIcons name="google-maps" size={24} color="#1E293B" />
              <View style={localStyles.btnTextContainer}>
                <Text style={localStyles.btnTitleDark}>Google Maps</Text>
                <Text style={localStyles.btnDescDark}>Open in external Google Maps app</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                localStyles.modalCancelButton,
                pressed && localStyles.btnPressed,
              ]}
              onPress={() => setNavModalVisible(false)}
            >
              <Text style={localStyles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles = StyleSheet.create({
  currentContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  fullRouteContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  stopDetailContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  currentHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 6,
  },
  currentTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  currentAddress: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '400',
  },
  countPill: {
    minWidth: 54,
    height: 32,
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
  travelSummaryCard: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  detailTravelSummaryCard: {
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
  },
  travelSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  travelSummaryIconBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelSummaryTextBox: {
    flex: 1,
    minWidth: 0,
  },
  travelSummaryLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  travelSummaryValue: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  travelSummaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#BFDBFE',
    marginHorizontal: 12,
  },
  stopInformationSection: {
    marginBottom: 14,
  },
  stopInformationHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopInformationTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    fontWeight: '700',
  },
  inlineEditButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineEditText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  stopInformationCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  stopInformationTopRow: {
    flexDirection: 'row',
    minHeight: 118,
  },
  stopInformationCompactItem: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  stopInformationVerticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  stopInformationDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  stopInformationWideItem: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  notesInformationItem: {
    alignItems: 'flex-start',
  },
  stopInformationTextBox: {
    flex: 1,
    minWidth: 0,
  },
  stopInformationIconBlue: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stopInformationIconPurple: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stopInformationIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInformationIconSlate: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInformationLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  stopInformationValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#0F172A',
    fontWeight: '600',
  },
  stopInformationMutedValue: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  sameAsEtaBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sameAsEtaBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  currentActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    minHeight: 70,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonBlue: {
    backgroundColor: '#2F76F6',
    borderColor: '#2F76F6',
    shadowColor: '#2563EB',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  actionButtonGreen: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  actionButtonRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonTextBlue: {
    color: '#FFFFFF',
  },
  actionButtonTextGreen: {
    color: '#15803D',
  },
  actionButtonTextRed: {
    color: '#DC2626',
  },
  actionDisabled: {
    opacity: 0.52,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  segmentedControl: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    padding: 4,
    flexDirection: 'row',
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#CBD5E1',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  progressLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2F76F6',
  },
  statsGrid: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  timelineCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 12,
    paddingRight: 10,
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 68,
  },
  timelineRowLast: {
    minHeight: 54,
  },
  timeColumn: {
    width: 74,
    alignItems: 'flex-end',
    paddingTop: 2,
    paddingRight: 8,
  },
  timelineTime: {
    fontSize: 11,
    lineHeight: 15,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'right',
  },
  markerColumn: {
    width: 25,
    alignItems: 'center',
  },
  timelineMarker: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timelineMarkerBlue: {
    backgroundColor: '#2563EB',
  },
  timelineMarkerGreen: {
    backgroundColor: '#16A34A',
  },
  timelineMarkerRed: {
    backgroundColor: '#EF4444',
  },
  timelineMarkerFinish: {
    backgroundColor: '#64748B',
  },
  timelineMarkerText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  timelineMarkerTextActive: {
    color: '#FFFFFF',
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#DBEAFE',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
    minWidth: 0,
  },
  timelineTitle: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineAddress: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    fontWeight: '400',
  },

  timelineStopRow: {
    minHeight: 92,
    paddingTop: 2,
  },
  timelineActiveRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginRight: -4,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  timelineTimeKind: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'right',
  },
  timelineTimeGreen: {
    color: '#15803D',
  },
  timelineTimeRed: {
    color: '#DC2626',
  },
  timelineTimeKindGreen: {
    color: '#16A34A',
  },
  timelineTimeKindRed: {
    color: '#EF4444',
  },
  statusSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  summaryValueGreen: {
    color: '#16A34A',
  },
  summaryValueRed: {
    color: '#EF4444',
  },
  nextStopCard: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  nextStopIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStopTextBox: {
    flex: 1,
    minWidth: 0,
  },
  nextStopLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  nextStopTitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    fontWeight: '600',
  },
  nextStopEta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  statusPill: {
    flexShrink: 0,
    minHeight: 22,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  statusPillBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  statusPillGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusPillRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillSlate: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusDotBlue: {
    backgroundColor: '#2563EB',
  },
  statusDotGreen: {
    backgroundColor: '#16A34A',
  },
  statusDotRed: {
    backgroundColor: '#EF4444',
  },
  statusDotSlate: {
    backgroundColor: '#94A3B8',
  },
  statusPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  statusPillTextBlue: {
    color: '#2563EB',
  },
  statusPillTextGreen: {
    color: '#15803D',
  },
  statusPillTextRed: {
    color: '#DC2626',
  },
  statusPillTextSlate: {
    color: '#64748B',
  },
  metaChip: {
    maxWidth: '100%',
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    maxWidth: 150,
    fontSize: 10,
    lineHeight: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  cancelRouteButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelRouteText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#EF4444',
    fontWeight: '600',
  },
  stopDetailTopBar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  backText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2563EB',
    fontWeight: '600',
  },
  roundIconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  detailSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    fontWeight: '500',
  },
  detailQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    marginBottom: 16,
  },
  quickActionCircle: {
    minWidth: 74,
    alignItems: 'center',
    gap: 7,
  },
  quickActionText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  addressCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
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
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    fontWeight: '500',
  },
  detailCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  optionsCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  detailRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 12,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  detailTextBox: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#0F172A',
    fontWeight: '400',
  },
  mutedValue: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  dangerText: {
    color: '#EF4444',
  },
  detailDivider: {
    height: 1,
    marginLeft: 58,
    backgroundColor: '#E2E8F0',
  },
  detailBottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomStatusButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomDeliveredButton: {
    borderColor: '#86EFAC',
    backgroundColor: '#FFFFFF',
  },
  bottomFailedButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFFFF',
  },
  bottomDeliveredText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#16A34A',
    fontWeight: '600',
  },
  bottomFailedText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#EF4444',
    fontWeight: '600',
  },
  currentOnlyHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalOptionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
    borderWidth: 1,
  },
  routeFlowBtn: {
    backgroundColor: '#2F74F5',
    borderColor: '#2F74F5',
  },
  googleMapsBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnTextContainer: {
    flex: 1,
  },
  btnTitleLight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDescLight: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  btnTitleDark: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  btnDescDark: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});
