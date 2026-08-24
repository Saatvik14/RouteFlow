import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { SUBSCRIPTION_TYPES } from '@/src/constants/api';
import { useUserRole } from '@/src/hooks/useUserRole';
import { DriverProfile, enterpriseService } from '@/src/services/api/enterprise';

type ConfirmedRoutePanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
  onStopPress?: (stop: any, index: number) => void;
  onCancelRoute?: () => void;
  onOpenEditRoute?: () => void;
  onOpenReorderStops?: () => void;
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
  routeId,
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
  onOpenReorderStops,
  subscriptionType
}: ConfirmedRoutePanelProps) {
  const insets = useSafeAreaInsets();
  const { canNavigateRoute, isBusinessOwner, isFleetDriver } = useUserRole();
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<{ id: number; name: string } | null>(null);
  const [assignmentVersion, setAssignmentVersion] = useState(0);

  const normalizedStatus = String(routeStatus || '').toLowerCase();
  const isReadyToStart =
    normalizedStatus === 'optimized' || normalizedStatus === 'confirmed';

  const isInTransit = normalizedStatus === 'in_transit';
  const canOpenReorderStops = Boolean(onOpenReorderStops);
  const numericRouteId = Number(routeId);
  const canAssignDriver = isBusinessOwner && isReadyToStart && Number.isInteger(numericRouteId) && numericRouteId > 0;

  useEffect(() => {
    setAssignedDriver(null);
    setSelectedDriverId(null);
    setAssignmentVersion(0);
    setAssignmentError('');
    setIsAssignmentOpen(false);
  }, [routeId]);

  const openAssignment = async () => {
    if (!canAssignDriver) return;
    setIsAssignmentOpen(true);
    setIsLoadingDrivers(true);
    setAssignmentError('');

    const [teamResponse, routeResponse] = await Promise.all([
      enterpriseService.getTeam({ status: 'active' }),
      enterpriseService.getRouteDetail(numericRouteId),
    ]);

    if (!teamResponse.success || !teamResponse.data) {
      setDrivers([]);
      setAssignmentError(teamResponse.error || 'Active drivers could not be loaded. Try again.');
    } else {
      setDrivers((teamResponse.data.drivers || []).filter((driver) => driver.active));
    }

    if (routeResponse.success && routeResponse.data?.route) {
      const currentRoute = routeResponse.data.route;
      const currentDriver = currentRoute.driver
        ? { id: Number(currentRoute.driver.id), name: String(currentRoute.driver.name || 'Driver') }
        : null;
      setAssignedDriver(currentDriver);
      setSelectedDriverId(currentDriver?.id || null);
      setAssignmentVersion(Number(currentRoute.assignmentVersion || 0));
    } else if (!assignmentError) {
      setAssignmentError(routeResponse.error || 'Route assignment details could not be loaded.');
    }

    setIsLoadingDrivers(false);
  };

  const assignDriver = async () => {
    if (!selectedDriverId || isAssigningDriver) return;
    const selectedDriver = drivers.find((driver) => driver.driverId === selectedDriverId);
    if (!selectedDriver) return;

    setIsAssigningDriver(true);
    setAssignmentError('');
    const response = await enterpriseService.assignRoute(
      numericRouteId,
      selectedDriverId,
      assignmentVersion,
    );

    if (!response.success) {
      setAssignmentError(response.error || 'The route could not be assigned. Refresh and try again.');
      setIsAssigningDriver(false);
      return;
    }

    const nextVersion = Number((response.data as any)?.route?.assignmentVersion);
    setAssignmentVersion(Number.isFinite(nextVersion) ? nextVersion : assignmentVersion + 1);
    setAssignedDriver({ id: selectedDriver.driverId, name: selectedDriver.name });
    setIsAssigningDriver(false);
    setIsAssignmentOpen(false);
  };

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
    <>
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
          {canAssignDriver ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={assignedDriver ? `Reassign route currently assigned to ${assignedDriver.name}` : 'Assign driver to route'}
              style={({ pressed }) => [
                localStyles.assignButton,
                pressed && localStyles.buttonPressed,
              ]}
              onPress={openAssignment}
              hitSlop={6}
            >
              <Feather name={assignedDriver ? 'user-check' : 'user-plus'} size={17} color="#FFFFFF" />
              <Text numberOfLines={1} style={localStyles.assignButtonText}>
                {assignedDriver ? `Reassign driver · ${assignedDriver.name}` : 'Assign driver'}
              </Text>
            </Pressable>
          ) : null}

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

       {subscriptionType!= SUBSCRIPTION_TYPES.LITE &&     <Pressable
              style={({ pressed }) => [
                localStyles.editButton,
                !canOpenReorderStops && localStyles.disabledButton,
                pressed && canOpenReorderStops && localStyles.buttonPressedLight,
              ]}
              onPress={() => onOpenReorderStops?.()}
              disabled={!canOpenReorderStops}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="drag-vertical"
                size={18}
                color="#1E293B"
              />
              <Text style={localStyles.editButtonText}>Reorder stops</Text>
            </Pressable>}
          </View>

          {!isFleetDriver ? (
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
          ) : null}

          {canNavigateRoute ? (
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
          ) : null}
        </View>
      </View>
    </DraggableRouteSheet>
    <Modal
      visible={isAssignmentOpen}
      transparent
      animationType="slide"
      onRequestClose={() => !isAssigningDriver && setIsAssignmentOpen(false)}
    >
      <View style={localStyles.assignmentOverlay}>
        <Pressable
          accessibilityLabel="Close driver assignment"
          style={localStyles.assignmentBackdrop}
          onPress={() => !isAssigningDriver && setIsAssignmentOpen(false)}
        />
        <View style={[localStyles.assignmentSheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <View style={localStyles.assignmentHandle} />
          <View style={localStyles.assignmentHeader}>
            <View style={localStyles.assignmentHeaderCopy}>
              <Text style={localStyles.assignmentTitle}>{assignedDriver ? 'Reassign driver' : 'Assign driver'}</Text>
              <Text numberOfLines={2} style={localStyles.assignmentSubtitle}>{routeName || 'Optimized route'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isAssigningDriver}
              onPress={() => setIsAssignmentOpen(false)}
              style={localStyles.assignmentClose}
            >
              <Feather name="x" size={22} color="#64748B" />
            </Pressable>
          </View>

          {isLoadingDrivers ? (
            <View style={localStyles.assignmentState}>
              <ActivityIndicator color="#2F74F7" />
              <Text style={localStyles.assignmentStateText}>Loading active drivers…</Text>
            </View>
          ) : (
            <>
              {assignmentError ? (
                <View accessibilityRole="alert" style={localStyles.assignmentError}>
                  <Feather name="alert-circle" size={17} color="#B42318" />
                  <Text style={localStyles.assignmentErrorText}>{assignmentError}</Text>
                </View>
              ) : null}

              {drivers.length === 0 ? (
                <View style={localStyles.assignmentState}>
                  <View style={localStyles.assignmentEmptyIcon}><Feather name="users" size={22} color="#2F74F7" /></View>
                  <Text style={localStyles.assignmentEmptyTitle}>No active drivers</Text>
                  <Text style={localStyles.assignmentStateText}>Invite a driver from Team and wait for them to accept before assigning this route.</Text>
                </View>
              ) : (
                <ScrollView style={localStyles.driverList} showsVerticalScrollIndicator={false}>
                  {drivers.map((driver) => {
                    const selected = selectedDriverId === driver.driverId;
                    const sameRoute = driver.currentAssignment?.routeId === numericRouteId;
                    const availability = sameRoute
                      ? 'Currently assigned to this route'
                      : driver.currentAssignment
                        ? `Currently on ${driver.currentAssignment.name}`
                        : 'Available';
                    return (
                      <Pressable
                        key={driver.driverId}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedDriverId(driver.driverId)}
                        style={({ pressed }) => [
                          localStyles.driverOption,
                          selected && localStyles.driverOptionSelected,
                          pressed && localStyles.buttonPressedLight,
                        ]}
                      >
                        <View style={[localStyles.driverAvatar, selected && localStyles.driverAvatarSelected]}>
                          <Text style={[localStyles.driverAvatarText, selected && localStyles.driverAvatarTextSelected]}>{driver.name.trim().charAt(0).toUpperCase() || 'D'}</Text>
                        </View>
                        <View style={localStyles.driverCopy}>
                          <Text numberOfLines={1} style={localStyles.driverName}>{driver.name}</Text>
                          <Text numberOfLines={1} style={[localStyles.driverAvailability, !driver.currentAssignment && localStyles.driverAvailable]}>{availability}</Text>
                        </View>
                        <View style={[localStyles.radioOuter, selected && localStyles.radioOuterSelected]}>
                          {selected ? <View style={localStyles.radioInner} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {drivers.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={assignedDriver ? 'Confirm driver reassignment' : 'Confirm driver assignment'}
                  disabled={!selectedDriverId || isAssigningDriver || selectedDriverId === assignedDriver?.id}
                  onPress={assignDriver}
                  style={({ pressed }) => [
                    localStyles.assignmentConfirm,
                    (!selectedDriverId || isAssigningDriver || selectedDriverId === assignedDriver?.id) && localStyles.disabledButton,
                    pressed && selectedDriverId !== assignedDriver?.id && localStyles.buttonPressed,
                  ]}
                >
                  {isAssigningDriver ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="user-check" size={17} color="#FFFFFF" />}
                  <Text style={localStyles.assignmentConfirmText}>
                    {selectedDriverId === assignedDriver?.id ? 'Already assigned' : assignedDriver ? 'Reassign route' : 'Assign route'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
    </>
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

  assignButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#2F74F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },

  assignButtonText: {
    ...font('600'),
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
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
    width: '100%',
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

  assignmentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },

  assignmentBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  assignmentSheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '78%',
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 18,
  },

  assignmentHandle: {
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    alignSelf: 'center',
    marginBottom: 14,
  },

  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  assignmentHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  assignmentTitle: {
    ...font('600'),
    fontSize: 20,
    lineHeight: 26,
    color: '#101828',
  },

  assignmentSubtitle: {
    ...font('400'),
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },

  assignmentClose: {
    width: 44,
    height: 44,
    marginTop: -7,
    marginRight: -8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  assignmentState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  assignmentStateText: {
    ...font('400'),
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },

  assignmentEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  assignmentEmptyTitle: {
    ...font('600'),
    marginTop: 12,
    fontSize: 16,
    lineHeight: 21,
    color: '#101828',
  },

  assignmentError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  assignmentErrorText: {
    ...font('400'),
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
  },

  driverList: {
    maxHeight: 340,
    marginBottom: 14,
  },

  driverOption: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },

  driverOptionSelected: {
    borderColor: '#9BC0FF',
    backgroundColor: '#F3F7FF',
  },

  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  driverAvatarSelected: {
    backgroundColor: '#DCEAFF',
  },

  driverAvatarText: {
    ...font('600'),
    fontSize: 15,
    color: '#475467',
  },

  driverAvatarTextSelected: {
    color: '#1D5FD1',
  },

  driverCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  driverName: {
    ...font('500'),
    fontSize: 14,
    lineHeight: 19,
    color: '#101828',
  },

  driverAvailability: {
    ...font('400'),
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#667085',
  },

  driverAvailable: {
    color: '#027A48',
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#98A2B3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: '#2F74F7',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F74F7',
  },

  assignmentConfirm: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#2F74F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },

  assignmentConfirmText: {
    ...font('600'),
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
});
