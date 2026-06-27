import { useMemo, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    return `${twelveHour}:${minute} ${suffix}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const time = formatClock(parsed);

    if (!options?.includeDay) return time;

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const parsedStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
    const dayDiff = Math.round((parsedStart - todayStart) / 86400000);

    if (dayDiff === 1) return `Tomorrow\n${time}`;
    if (dayDiff > 1) {
      return `${parsed.toLocaleDateString([], { weekday: 'short' })}\n${time}`;
    }

    return time;
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

  return [...new Set(parts.map(String))].join(', ');
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

const getStopPhone = (stop: any) => {
  return getText(
    stop?.phone,
    stop?.phoneNumber,
    stop?.phone_number,
    stop?.customerPhone,
    stop?.customer_phone,
  );
};

const getStopArrivalTime = (stop: any, includeDay = false) => {
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
    { includeDay },
  );
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

const getStopStatus = (stop: any) => getText(stop?.status, stop?.orderStatus, stop?.order_status).toLowerCase();
const isStopDone = (stop: any) => DONE_STATUSES.has(getStopStatus(stop));
const isStopFailed = (stop: any) => FAILED_STATUSES.has(getStopStatus(stop));

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
  const arrivalTime = getStopArrivalTime(stop);
  const completedStops = (stops || []).filter((item: any) => isStopDone(item)).length;
  const progressPercent = Math.min(100, Math.max(8, (completedStops / totalStops) * 100));

  const openRoute = () => setPanelView('route');
  const openCurrent = () => setPanelView('current');

  const openStopDetail = (nextStop: any) => {
    setSelectedStop(nextStop);
    setPanelView('stop-detail');
  };

  const handleNavigateStop = async (targetStop: any) => {
    if (isSameStop(targetStop, stop) && onNavigateActiveStop) {
      await onNavigateActiveStop();
      return;
    }

    try {
      await Linking.openURL(getNavigationUrl(targetStop));
    } catch {
      // Keep the UI silent here. The existing controller handles active-stop navigation errors.
    }
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

  const renderCurrentStop = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[localStyles.currentContent, { paddingBottom: contentBottomPadding }]}
    >
      <View style={localStyles.currentHeader}>
        <View style={localStyles.currentHeaderText}>
          <Text style={localStyles.eyebrow}>Current stop</Text>
          <Text style={localStyles.currentTitle} numberOfLines={2}>{stopTitle}</Text>
          <Text style={localStyles.currentAddress} numberOfLines={2}>{stopAddress}</Text>
        </View>

        <View style={localStyles.countPill}>
          <Text style={localStyles.countPillText}>{progressLabel}</Text>
        </View>
      </View>

      <View style={localStyles.etaPillWide}>
        <Feather name="clock" size={14} color="#2563EB" />
        <Text style={localStyles.etaPillText}>ETA {arrivalTime || '--'}</Text>
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

      <Pressable style={localStyles.viewFullRouteRow} onPress={openRoute}>
        <View style={localStyles.viewFullIconBox}>
          <Feather name="list" size={18} color="#2563EB" />
        </View>
        <Text style={localStyles.viewFullText}>View full route</Text>
        <Feather name="chevron-right" size={21} color="#94A3B8" />
      </Pressable>
    </ScrollView>
  );

  const renderFullRoute = () => (
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
          <Text style={localStyles.statValue}>{durationLabel || '--'}</Text>
        </View>
        <View style={localStyles.statBox}>
          <Text style={localStyles.statLabel}>Distance left</Text>
          <Text style={localStyles.statValue}>{distanceLabel || '--'}</Text>
        </View>
      </View>

      <View style={localStyles.timelineCard}>
        <View style={localStyles.timelineRow}>
          <View style={localStyles.timeColumn}>
            <Text style={localStyles.timelineTime}>{formatArrivalTime(startTime) || '--'}</Text>
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

        {(stops || []).map((item: any, index: number) => {
          const isActive = isSameStop(item, stop);
          const done = isStopDone(item);
          const failed = isStopFailed(item);

          return (
            <Pressable key={`${getStopIdentity(item) || index}`} style={localStyles.timelineRow} onPress={() => openStopDetail(item)}>
              <View style={localStyles.timeColumn}>
                <Text style={localStyles.timelineTime}>{getStopArrivalTime(item, true) || '--'}</Text>
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
                  ) : (
                    <Text style={[localStyles.timelineMarkerText, isActive && localStyles.timelineMarkerTextActive]}>{index + 1}</Text>
                  )}
                </View>
                <View style={localStyles.timelineConnector} />
              </View>
              <View style={localStyles.timelineContent}>
                <Text style={localStyles.timelineTitle} numberOfLines={1}>{getStopTitle(item, index)}</Text>
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

  const renderStopDetail = () => {
    const detailStop = selectedStop || stop;
    const detailIndex = Math.max(0, (stops || []).findIndex((item: any) => isSameStop(item, detailStop)));
    const detailTitle = getStopTitle(detailStop, detailIndex);
    const detailAddress = getStopAddress(detailStop);
    const detailNotes = getStopNotes(detailStop);
    const detailOrderId = getStopOrderId(detailStop, detailIndex);
    const detailArrivalTime = getStopArrivalTime(detailStop);
    const phone = getStopPhone(detailStop);
    const canUpdateThisStop = isSameStop(detailStop, stop) && !isStopDone(detailStop);

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

        <View style={localStyles.detailQuickActions}>
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
        </View>

        <View style={localStyles.detailCard}>
          <DetailRow
            icon={<McIcon name="note-text-outline" size={18} color="#475569" />}
            label="Notes"
            value={detailNotes || 'Leave with reception if not available.'}
            rightIcon={false}
          />
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="package" size={17} color="#475569" />}
            label="Order ID"
            value={`${detailOrderId} Originally ${getOrdinal(detailIndex)}`}
            rightIcon={false}
          />
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="clock" size={17} color="#475569" />}
            label="Time of arrival"
            value={detailArrivalTime || 'Not available'}
            rightIcon={false}
          />
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="camera" size={17} color="#475569" />}
            label="Proof of delivery"
            value="No proof uploaded"
            rightIcon={false}
          />
        </View>

        <View style={localStyles.optionsCard}>
          <DetailRow
            icon={<Feather name="plus-square" size={18} color="#2563EB" />}
            label="Add note"
            value=""
          />
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="flag" size={18} color="#EF4444" />}
            label="Report issue"
            value=""
            danger
          />
          <View style={localStyles.detailDivider} />
          <DetailRow
            icon={<Feather name="edit-3" size={18} color="#475569" />}
            label="Edit stop"
            value=""
            onPress={() => onOpenStopDetails?.(detailStop)}
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
    <DraggableRouteSheet
      key={panelView}
      isWide={isWide}
      mode="large"
      variant="transit"
      initialSnap={panelView === 'current' ? 'bottom' : 'top'}
    >
      {panelView === 'current' ? renderCurrentStop() : null}
      {panelView === 'route' ? renderFullRoute() : null}
      {panelView === 'stop-detail' ? renderStopDetail() : null}
    </DraggableRouteSheet>
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
  etaPillWide: {
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  etaPillText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2563EB',
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
  viewFullRouteRow: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  viewFullIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewFullText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    fontWeight: '500',
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
    width: 62,
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
});
