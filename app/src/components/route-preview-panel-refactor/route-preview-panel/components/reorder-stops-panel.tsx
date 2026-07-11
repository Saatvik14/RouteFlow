import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
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

type ReorderStopsPanelProps = Pick<
  RoutePreviewPanelProps,
  'start' | 'end' | 'stops'
> & {
  isWide: boolean;
  isSaving?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onSave: (orderedStops: any[]) => Promise<void> | void;
};

const ROW_HEIGHT = 88;
const ROW_GAP = 10;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;

export function ReorderStopsPanel({
  isWide,
  start,
  end,
  stops,
  isSaving = false,
  errorMessage,
  onCancel,
  onSave,
}: ReorderStopsPanelProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [isDraggingStop, setIsDraggingStop] = useState(false);

  const optimizedStops = useMemo(() => normalizeStops(stops), [stops]);
  const [orderedStops, setOrderedStops] = useState<any[]>(optimizedStops);

  useEffect(() => {
    setOrderedStops(optimizedStops);
  }, [optimizedStops]);

  const optimizedOrderKey = useMemo(
    () => optimizedStops.map(getStopKey).join('|'),
    [optimizedStops],
  );

  const currentOrderKey = useMemo(
    () => orderedStops.map(getStopKey).join('|'),
    [orderedStops],
  );

  const hasChanges = optimizedOrderKey !== currentOrderKey;
  const saveDisabled = isSaving || !hasChanges || orderedStops.length === 0;

  const handleStopDragStart = useCallback(() => {
    // Lock the list immediately so the ScrollView cannot consume the same
    // vertical gesture that is being used to reorder a stop.
    setIsDraggingStop(true);
    scrollRef.current?.setNativeProps?.({ scrollEnabled: false });
  }, []);

  const handleStopDragEnd = useCallback(() => {
    setIsDraggingStop(false);
    scrollRef.current?.setNativeProps?.({ scrollEnabled: !isSaving });
  }, [isSaving]);

  const moveStop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setOrderedStops(current => {
      const next = [...current];
      const [movedStop] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedStop);
      return applySequenceNumbers(next);
    });
  };

  const handleRestoreOptimizedOrder = () => {
    if (isSaving) return;
    setOrderedStops(optimizedStops);
  };

  const handleSave = () => {
    if (saveDisabled) return;
    void onSave(applySequenceNumbers(orderedStops));
  };

  return (
    <DraggableRouteSheet
      isWide={isWide}
      initialSnap="top"
      collapsedHeight={110}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.titleIconBox}>
            <MaterialCommunityIcons
              name="drag-vertical"
              size={22}
              color="#2563EB"
            />
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Reorder stops</Text>
            <Text style={styles.subtitle}>
              Drag the handle on a stop to change its sequence.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Feather name="info" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            Start and end locations are locked. Arrival times and the map path
            are recalculated after you save.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={17} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces={false}
          overScrollMode="never"
          directionalLockEnabled
          scrollEnabled={!isSaving && !isDraggingStop}
        >
          <LockedLocationRow
            type="start"
            title="Start location"
            address={getLocationAddress(start)}
          />

          <View style={styles.stopList}>
            {orderedStops.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No stops to reorder</Text>
                <Text style={styles.emptyText}>
                  Add at least one stop before opening this screen.
                </Text>
              </View>
            ) : (
              orderedStops.map((stop, index) => (
                <SortableStopRow
                  key={getStopKey(stop, index)}
                  stop={stop}
                  index={index}
                  totalStops={orderedStops.length}
                  disabled={isSaving}
                  onMove={moveStop}
                  onDragStart={handleStopDragStart}
                  onDragEnd={handleStopDragEnd}
                />
              ))
            )}
          </View>

          <LockedLocationRow
            type="end"
            title="End location"
            address={getLocationAddress(end)}
          />
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 8, 14) },
          ]}
        >
          <View style={styles.footerActionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressedLight,
              ]}
              onPress={onCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                saveDisabled && styles.disabledButton,
                pressed && !saveDisabled && styles.pressed,
              ]}
              onPress={handleSave}
              disabled={saveDisabled}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check-circle" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save order'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.restoreButton,
              !hasChanges && styles.restoreButtonDisabled,
              pressed && hasChanges && styles.pressedLight,
            ]}
            onPress={handleRestoreOptimizedOrder}
            disabled={isSaving || !hasChanges}
          >
            <MaterialCommunityIcons
              name="restore"
              size={20}
              color={hasChanges ? '#2563EB' : '#94A3B8'}
            />
            <View style={styles.restoreTextBox}>
              <Text
                style={[
                  styles.restoreTitle,
                  !hasChanges && styles.restoreTextDisabled,
                ]}
              >
                Restore optimized order
              </Text>
              <Text style={styles.restoreSubtitle}>
                Revert to the sequence returned by route optimization
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

function SortableStopRow({
  stop,
  index,
  totalStops,
  disabled,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  stop: any;
  index: number;
  totalStops: number;
  disabled: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled && Math.abs(gestureState.dy) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !disabled && Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          onDragStart();
          setIsDragging(true);
          translateY.stopAnimation();
          translateY.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          const indexOffset = Math.round(gestureState.dy / ROW_STRIDE);
          const nextIndex = clamp(index + indexOffset, 0, totalStops - 1);

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 240,
            mass: 0.8,
            overshootClamping: true,
          }).start(() => {
            setIsDragging(false);
            onMove(index, nextIndex);
            onDragEnd();
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            setIsDragging(false);
            onDragEnd();
          });
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      disabled,
      index,
      onDragEnd,
      onDragStart,
      onMove,
      totalStops,
      translateY,
    ],
  );

  return (
    <Animated.View
      style={[
        styles.stopCard,
        isDragging && styles.stopCardActive,
        {
          transform: [{ translateY }],
          zIndex: isDragging ? 20 : 1,
          elevation: isDragging ? 10 : 1,
        },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        style={[
          styles.dragHandle,
          Platform.OS === 'web'
            ? ({
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
              } as any)
            : null,
        ]}
        accessibilityRole="adjustable"
        accessibilityLabel={`Move stop ${index + 1}`}
        accessibilityHint="Drag up or down to change this stop's position"
      >
        <MaterialCommunityIcons
          name="drag-vertical"
          size={24}
          color={isDragging ? '#2563EB' : '#94A3B8'}
        />
      </View>

      <View style={styles.sequenceCircle}>
        <Text style={styles.sequenceText}>{index + 1}</Text>
      </View>

      <View style={styles.stopTextBox}>
        <Text style={styles.stopTitle} numberOfLines={1}>
          {getStopTitle(stop, index)}
        </Text>
        <Text style={styles.stopAddress} numberOfLines={2}>
          {getStopAddress(stop)}
        </Text>
      </View>

      <View style={styles.moreIconBox}>
        <MaterialCommunityIcons
          name="dots-vertical"
          size={21}
          color="#64748B"
        />
      </View>
    </Animated.View>
  );
}

function LockedLocationRow({
  type,
  title,
  address,
}: {
  type: 'start' | 'end';
  title: string;
  address: string;
}) {
  const isStart = type === 'start';

  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedIconBox}>
        {isStart ? (
          <Feather name="navigation" size={16} color="#2563EB" />
        ) : (
          <MaterialCommunityIcons
            name="flag-checkered"
            size={17}
            color="#2563EB"
          />
        )}
      </View>

      <View style={styles.lockedTextBox}>
        <Text style={styles.lockedTitle}>{title}</Text>
        <Text style={styles.lockedAddress} numberOfLines={2}>
          {address || 'Address not available'}
        </Text>
        <View style={styles.lockedBadge}>
          <Feather name="lock" size={11} color="#2563EB" />
          <Text style={styles.lockedBadgeText}>Locked</Text>
        </View>
      </View>
    </View>
  );
}

function normalizeStops(stops: any[] = []) {
  return applySequenceNumbers(
    [...(Array.isArray(stops) ? stops : [])].sort(
      (left, right) =>
        getSequence(left, Number.MAX_SAFE_INTEGER) -
        getSequence(right, Number.MAX_SAFE_INTEGER),
    ),
  );
}

function applySequenceNumbers(stops: any[]) {
  return stops.map((stop, index) => ({
    ...stop,
    sequence: index + 1,
    sequenceNo: index + 1,
    sequence_no: index + 1,
    markerLabel: String(index + 1),
  }));
}

function getSequence(stop: any, fallback: number) {
  const value = Number(
    stop?.sequence_no ?? stop?.sequenceNo ?? stop?.sequence ?? fallback,
  );

  return Number.isFinite(value) ? value : fallback;
}

function getStopKey(stop: any, index?: number) {
  return String(
    stop?.backendOrderId ??
      stop?.orderId ??
      stop?.order_id ??
      stop?.id ??
      stop?.stop_id ??
      index ??
      '',
  );
}

function getStopTitle(stop: any, index: number) {
  return String(
    stop?.title ||
      stop?.name ||
      stop?.customerName ||
      stop?.customer_name ||
      stop?.location?.name ||
      `Stop ${index + 1}`,
  );
}

function getStopAddress(stop: any) {
  return String(
    stop?.address ||
      stop?.full_address ||
      stop?.fullAddress ||
      stop?.description ||
      stop?.subtitle ||
      stop?.location?.full_address ||
      stop?.location?.fullAddress ||
      stop?.location?.address ||
      'Address not available',
  );
}

function getLocationAddress(location: any) {
  return String(
    location?.full_address ||
      location?.fullAddress ||
      location?.address ||
      location?.description ||
      location?.subtitle ||
      location?.location?.full_address ||
      location?.location?.fullAddress ||
      location?.location?.address ||
      '',
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  sheet: {
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
  titleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 10,
  },
  headerTextBox: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...font('600'),
    color: '#0F172A',
    fontSize: 19,
    lineHeight: 24,
  },
  subtitle: {
    ...font('400'),
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
  },
  infoText: {
    ...font('400'),
    flex: 1,
    color: '#1E4F9B',
    fontSize: 12.5,
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    ...font('400'),
    flex: 1,
    color: '#B91C1C',
    fontSize: 12.5,
    lineHeight: 17,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  stopList: {
    paddingVertical: 10,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 88,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  lockedIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
    marginRight: 11,
  },
  lockedTextBox: {
    flex: 1,
    minWidth: 0,
  },
  lockedTitle: {
    ...font('600'),
    color: '#111827',
    fontSize: 15,
    lineHeight: 20,
  },
  lockedAddress: {
    ...font('400'),
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  lockedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#EAF2FF',
    marginTop: 8,
  },
  lockedBadgeText: {
    ...font('500'),
    color: '#2563EB',
    fontSize: 10.5,
    lineHeight: 14,
  },
  stopCard: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: ROW_GAP,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  stopCardActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FBFF',
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  dragHandle: {
    width: 34,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  sequenceCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F74F7',
    marginLeft: 6,
    marginRight: 11,
  },
  sequenceText: {
    ...font('600'),
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 15,
  },
  stopTextBox: {
    flex: 1,
    minWidth: 0,
  },
  stopTitle: {
    ...font('600'),
    color: '#111827',
    fontSize: 14.5,
    lineHeight: 19,
  },
  stopAddress: {
    ...font('400'),
    color: '#475569',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  moreIconBox: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 5,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    ...font('600'),
    color: '#334155',
    fontSize: 14,
  },
  emptyText: {
    ...font('400'),
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    ...font('600'),
    color: '#2563EB',
    fontSize: 14,
  },
  saveButton: {
    flex: 1.15,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#2F74F7',
  },
  saveButtonText: {
    ...font('600'),
    color: '#FFFFFF',
    fontSize: 14,
  },
  restoreButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E4FA',
    backgroundColor: '#F8FBFF',
  },
  restoreButtonDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  restoreTextBox: {
    flex: 1,
  },
  restoreTitle: {
    ...font('600'),
    color: '#2563EB',
    fontSize: 13,
    lineHeight: 17,
  },
  restoreSubtitle: {
    ...font('400'),
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  restoreTextDisabled: {
    color: '#94A3B8',
  },
  disabledButton: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.86,
  },
  pressedLight: {
    opacity: 0.78,
  },
});
