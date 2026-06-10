import {
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import type { RoutePoint, RouteStop } from '@/app/(MapScreen)/MapScreen';

export type PanelMode =
  | 'empty'
  | 'search'
  | 'details'
  | 'setup'
  | 'confirmed'
  | 'transit';

  export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

export type StopDetails = {
  packages: number;
  order: 'first' | 'auto' | 'last';
  stopType: 'delivery' | 'pickup';
  notes: string;
};

type RoutePreviewPanelProps = {
  mode: PanelMode;
  routeName: string;
  startTime: string;
  start: RoutePoint;
  end: RoutePoint;
  stops: any;
  durationLabel: string;
  distanceLabel: string;
  routeStatus?: string;

  activeStop?: RouteStop | null;
  activeStopIndex?: number;
  totalActiveStops?: number;
  isUpdatingStopStatus?: boolean;

  searchText: string;
  suggestions: PlaceSuggestion[];
  selectedSuggestion: PlaceSuggestion | null;
  stopDetails: StopDetails;
  isAddingStop?: boolean;
  isStartingRoute?: boolean;

  onSearchTextChange: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  onStopDetailsChange: (details: StopDetails) => void;
  onConfirmStopDetails: () => void | Promise<void>;
  onOptimizeRoute: () => void;
  onRefine: () => void;
  onConfirm: () => void | Promise<void>;
  onStartRoute?: () => void | Promise<void>;

  onNavigateActiveStop?: () => void | Promise<void>;
  onMarkStopDelivered?: () => void | Promise<void>;
  onMarkStopFailed?: () => void | Promise<void>;
};


function RowIcon({
  name,
  size = 26,
  color = '#475569',
}: {
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.rowIconBox}>
      <Feather name={name} size={size} color={color} />
    </View>
  );
}

function McIcon({
  name,
  size = 28,
  color = '#475569',
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.rowIconBox}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

function PackageActionIcon({ type }: { type: 'failed' | 'delivered' }) {
  const isDelivered = type === 'delivered';

  return (
    <View style={styles.packageActionIconWrap}>
      <MaterialCommunityIcons
        name="package-variant-closed"
        size={31}
        color="#475569"
      />

      <View
        style={[
          styles.packageActionBadge,
          isDelivered ? styles.packageActionBadgeSuccess : styles.packageActionBadgeDanger,
        ]}
      >
        <Feather name={isDelivered ? 'check' : 'x'} size={11} color="#FFFFFF" />
      </View>
    </View>
  );
}


function normalizeRouteStatus(status?: string) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isReadyToStartStatus(status?: string) {
  return normalizeRouteStatus(status) === 'optimized';
}

function isInTransitStatus(status?: string) {
  return normalizeRouteStatus(status) === 'in_transit';
}


function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function DraggableRouteSheet({
  children,
  isWide,
  mode = 'default',
}: {
  children?: ReactNode;
  isWide: boolean;
  mode?: 'default' | 'large';
}) {
  const { height } = useWindowDimensions();

  const sheetBounds = useMemo(() => {
    const topSafeGap = isWide ? 72 : 62;
    const maxHeight = height - topSafeGap;

    if (mode === 'large') {
      return {
        min: isWide ? Math.min(420, maxHeight) : Math.min(height * 0.58, maxHeight),
        initial: isWide ? Math.min(620, maxHeight) : Math.min(height * 0.76, maxHeight),
        max: maxHeight,
      };
    }

    return {
      min: isWide ? Math.min(360, maxHeight) : Math.min(height * 0.44, maxHeight),
      initial: isWide ? Math.min(540, maxHeight) : Math.min(height * 0.58, maxHeight),
      max: isWide ? Math.min(720, maxHeight) : maxHeight,
    };
  }, [height, isWide, mode]);

  const [sheetHeight, setSheetHeight] = useState(sheetBounds.initial);
  const gestureStartHeight = useRef(sheetBounds.initial);

  useEffect(() => {
    setSheetHeight(currentHeight => clamp(currentHeight, sheetBounds.min, sheetBounds.max));
  }, [sheetBounds.max, sheetBounds.min]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          gestureStartHeight.current = sheetHeight;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextHeight = gestureStartHeight.current - gestureState.dy;
          setSheetHeight(clamp(nextHeight, sheetBounds.min, sheetBounds.max));
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentHeight = clamp(
            gestureStartHeight.current - gestureState.dy,
            sheetBounds.min,
            sheetBounds.max,
          );

          const midpoint = (sheetBounds.min + sheetBounds.max) / 2;
          const shouldExpand = gestureState.vy < -0.45 || currentHeight > midpoint;
          const shouldCollapse = gestureState.vy > 0.45 || currentHeight <= midpoint;

          if (shouldExpand) {
            setSheetHeight(sheetBounds.max);
          } else if (shouldCollapse) {
            setSheetHeight(sheetBounds.initial);
          } else {
            setSheetHeight(currentHeight);
          }
        },
      }),
    [sheetBounds.initial, sheetBounds.max, sheetBounds.min, sheetHeight],
  );

  return (
    <View
      style={[
        styles.draggableSheet,
        isWide && styles.draggableSheetWeb,
        { height: clamp(sheetHeight, sheetBounds.min, sheetBounds.max) },
      ]}
    >
      <View style={styles.dragHandleZone} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
      </View>

      {children}
    </View>
  );
}

function EmptyStopsPanel({
  isWide,
  onOpenSearch,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, isWide && styles.panelWeb]}>
      <View style={styles.dragHandle} />

      <Pressable style={styles.searchRow} onPress={onOpenSearch}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Tap to add stops</Text>
        <Text style={styles.searchSideIcon}>⌗</Text>
        <Text style={styles.searchSideIcon}>🎙</Text>
        <Text style={styles.moreText}>⋮</Text>
      </Pressable>

      <View style={styles.emptyBody}>
        <Text style={styles.emptyIcon}>▢</Text>
        <Text style={styles.emptyText}>
          Add your first stops to start{'\n'}creating your route
        </Text>
      </View>

      <View style={[styles.emptyFooter, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
        <Pressable style={styles.primaryFullButton} onPress={onOpenSearch}>
          <Text style={styles.primaryFullButtonText}>＋ Add stops</Text>
        </Pressable>

        <Pressable style={styles.secondaryFullButton}>
          <Text style={styles.secondaryFullButtonText}>Copy stops from a past route</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchPanel({
  isWide,
  searchText,
  suggestions,
  onSearchTextChange,
  onCloseSearch,
  onSelectSuggestion,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.panelLarge, isWide && styles.panelSearchWeb]}
    >
      <View style={styles.dragHandle} />

      <View style={styles.searchHeader}>
        <View style={[styles.searchInputBox, styles.searchFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholder="Type to add a stop"
            placeholderTextColor="#64748B"
            autoFocus
            style={styles.searchInput}
          />

          {searchText ? (
            <Pressable onPress={() => onSearchTextChange('')}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.searchSideIcon}>⌗</Text>
              <Text style={styles.searchSideIcon}>🎙</Text>
            </>
          )}
        </View>

        <Pressable onPress={onCloseSearch} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      {searchText.trim().length < 2 ? (
        <>
          <View style={styles.emptySearchBody}>
            <Text style={styles.emptyIcon}>▢</Text>
            <Text style={styles.emptyText}>
              Add your first stops to start{'\n'}creating your route
            </Text>
          </View>

          <View style={styles.quickActions}>
            <QuickAction icon="▱" label="Map" />
            <QuickAction icon="⌗" label="Scan" />
            <QuickAction icon="🎙" label="Voice" />
          </View>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.searchSectionTitle}>Add a new stop</Text>

          {suggestions.map(item => (
            <Pressable
              key={item.id}
              style={styles.suggestionRow}
              onPress={() => onSelectSuggestion(item)}
            >
              <Text style={styles.suggestionIcon}>▣</Text>

              <View style={styles.suggestionTextBox}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable style={styles.suggestionRow}>
            <Text style={styles.suggestionIcon}>▱</Text>
            <View style={styles.suggestionTextBox}>
              <Text style={styles.suggestionTitle}>Choose on map</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function StopDetailsPanel({
  isWide,
  selectedSuggestion,
  stopDetails,
  isAddingStop,
  onStopDetailsChange,
  onOpenSearch,
  onCloseSearch,
  onConfirmStopDetails,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const updateDetails = (patch: Partial<StopDetails>) => {
    onStopDetailsChange({
      ...stopDetails,
      ...patch,
    });
  };

  return (
    <View style={[styles.panelLarge, isWide && styles.panelDetailsWeb]}>
      <View style={styles.dragHandle} />

      <View style={styles.searchHeader}>
        <Pressable style={styles.searchInputBox} onPress={onOpenSearch}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>Type to add more stops</Text>
          <Text style={styles.searchSideIcon}>⌗</Text>
          <Text style={styles.searchSideIcon}>🎙</Text>
        </Pressable>

        <Pressable onPress={onCloseSearch} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>
        <View style={styles.stopCard}>
          <View style={styles.tagsRow}>
            <Tag label="Blue" dot />
            <Tag label="ID Pending" />
            <View style={styles.addedTag}>
              <Text style={styles.addedTagText}>✓ Added</Text>
            </View>
          </View>

          <Text style={styles.detailsTitle}>{selectedSuggestion?.title || 'Selected stop'}</Text>
          <Text style={styles.detailsSubtitle}>{selectedSuggestion?.subtitle}</Text>

          <Pressable style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>＋ Access instructions</Text>
          </Pressable>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsRowIcon}>▣</Text>
          <TextInput
            value={stopDetails.notes}
            onChangeText={value => updateDetails({ notes: value })}
            placeholder="Add notes"
            placeholderTextColor="#94A3B8"
            style={styles.notesInput}
          />
          <Text style={styles.detailsRowIcon}>📷</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>▧</Text>
          <Text style={styles.optionLabel}>Package finder</Text>
          <Text style={styles.optionValue}>Not set</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>▱</Text>
          <Text style={styles.optionLabel}>Packages</Text>

          <View style={styles.counter}>
            <Pressable
              style={styles.counterButton}
              onPress={() => updateDetails({ packages: Math.max(1, stopDetails.packages - 1) })}
            >
              <Text style={styles.counterText}>−</Text>
            </Pressable>

            <Text style={styles.counterNumber}>{stopDetails.packages}</Text>

            <Pressable
              style={styles.counterButton}
              onPress={() => updateDetails({ packages: stopDetails.packages + 1 })}
            >
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
        </View>

        <OptionSegment
          icon="≡"
          label="Order"
          value={stopDetails.order}
          options={[
            { label: 'First', value: 'first' },
            { label: 'Auto', value: 'auto' },
            { label: 'Last', value: 'last' },
          ]}
          onChange={value => updateDetails({ order: value as StopDetails['order'] })}
        />

        <OptionSegment
          icon="⌄"
          label="Type"
          value={stopDetails.stopType}
          options={[
            { label: 'Delivery', value: 'delivery' },
            { label: 'Pickup', value: 'pickup' },
          ]}
          onChange={value => updateDetails({ stopType: value as StopDetails['stopType'] })}
        />

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>◷</Text>
          <Text style={styles.optionLabel}>Arrival time</Text>
          <Text style={styles.optionValue}>Anytime</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>⏱</Text>
          <Text style={styles.optionLabel}>Estimated time at stop</Text>
          <Text style={styles.optionValue}>Default</Text>
        </View>

        <Pressable style={styles.actionRow} onPress={onOpenSearch}>
          <Text style={styles.optionIcon}>⌕</Text>
          <Text style={styles.optionLabel}>Change address</Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.actionRow}>
          <Text style={styles.optionIcon}>▣</Text>
          <Text style={styles.optionLabel}>Duplicate stop</Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.addStopConfirmButton, isAddingStop && styles.buttonDisabled]}
          onPress={onConfirmStopDetails}
          disabled={isAddingStop}
        >
          <Text style={styles.addStopConfirmText}>
            {isAddingStop ? 'Adding stop...' : 'Add stop'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function RouteSetupPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  onOpenSearch,
  onOptimizeRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

  return (
    <DraggableRouteSheet isWide={isWide}>
      <View style={styles.previewHeader}>
        <View style={styles.routeIconBox}>
          <Text style={styles.routeIconText}>↝</Text>
        </View>

        <View style={styles.previewTitleBox}>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {routeName || 'Route preview'}
            </Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>Active</Text>
            </View>
          </View>
          <Text style={styles.previewSubtitle}>{stopLabel} • Round trip</Text>
        </View>

        <Pressable style={styles.headerIconButton} onPress={onOpenSearch}>
          <Text style={styles.headerIconText}>⌕</Text>
        </Pressable>
        <Pressable style={styles.headerIconButton}>
          <Text style={styles.headerIconText}>⋮</Text>
        </Pressable>
      </View>

      <View style={[styles.summaryGrid, isWide && styles.summaryGridWeb]}>
        <SummaryCard tone="blue" icon="⌖" label="Stops" value={String(stops.length)} />
        <SummaryCard tone="green" icon="⌁" label="Distance" value={distanceLabel || '0 km'} />
        <SummaryCard tone="purple" icon="◷" label="Duration" value={durationLabel || '0 min'} />
        <SummaryCard tone="orange" icon="▣" label="Start time" value={startTime || 'Now'} />
      </View>

      <ScrollView
        style={styles.previewScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.previewScrollContent,
          { paddingBottom: Math.max(insets.bottom + 116, 130) },
        ]}
      >
        <View style={[styles.previewMain, isWide && styles.previewMainWeb]}>
          <View style={[styles.routeSetupCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Route setup</Text>
              <View style={styles.roundTripChip}>
                <Text style={styles.roundTripChipText}>↻ Round trip</Text>
              </View>
            </View>

            <LocationCard
              marker="start"
              title="Start location"
              subtitle={start.description || start.title || 'Use GPS position when optimizing'}
              time={startTime || 'Now'}
            />

            <View style={styles.locationConnector} />

            <LocationCard
              marker="end"
              title="End location"
              subtitle={end.description || end.title || 'Return to start location'}
              time={startTime || 'Now'}
            />
          </View>

          <View style={[styles.stopsCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Stops</Text>
              <Text style={styles.sectionMeta}>{stopLabel}</Text>
            </View>

            {stops.length ? (
              stops.map(stop => <StopListItem key={stop.id} stop={stop} />)
            ) : (
              <View style={styles.noStopsCard}>
                <Text style={styles.noStopsTitle}>No stops added yet</Text>
                <Text style={styles.noStopsSubtitle}>Add delivery or pickup stops to build this route.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.previewFooter,
          isWide && styles.previewFooterWeb,
          { paddingBottom: Math.max(insets.bottom + 10, 18) },
        ]}
      >
        <Pressable style={[styles.secondaryActionButton, isWide && styles.actionButtonWeb]} onPress={onOpenSearch}>
          <Text style={styles.secondaryActionText}>Refine</Text>
        </Pressable>

        <Pressable style={[styles.primaryActionButton, isWide && styles.actionButtonWeb]} onPress={onOptimizeRoute}>
          <Text style={styles.primaryActionText}>↻ Optimize route</Text>
        </Pressable>
      </View>
    </DraggableRouteSheet>
  );
}

function ConfirmedRoutePanel({
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
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

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

  return (
    <DraggableRouteSheet isWide={isWide}>
      <View style={styles.previewHeader}>
        <View style={styles.routeIconBox}>
          <Text style={styles.routeIconText}>✓</Text>
        </View>

        <View style={styles.previewTitleBox}>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {routeName || 'Optimized route'}
            </Text>

            <View style={[styles.statusChip, styles.optimizedChip]}>
              <Text style={[styles.statusChipText, styles.optimizedChipText]}>
                Optimized
              </Text>
            </View>
          </View>

          <Text style={styles.previewSubtitle}>
            {stopLabel} • {distanceLabel} • {durationLabel}
          </Text>
        </View>

        <Pressable style={styles.headerIconButton} onPress={onOpenSearch}>
          <Text style={styles.headerIconText}>⌕</Text>
        </Pressable>

        <Pressable style={styles.headerIconButton}>
          <Text style={styles.headerIconText}>⋮</Text>
        </Pressable>
      </View>

      <View style={[styles.summaryGrid, isWide && styles.summaryGridWeb]}>
        <SummaryCard tone="blue" icon="⌖" label="Stops" value={String(stops.length)} />
        <SummaryCard tone="green" icon="⌁" label="Distance" value={distanceLabel || '0 km'} />
        <SummaryCard tone="purple" icon="◷" label="Duration" value={durationLabel || '0 min'} />
        <SummaryCard tone="orange" icon="▣" label="Start time" value={startTime || 'Now'} />
      </View>

      <ScrollView
        style={styles.previewScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.previewScrollContent,
          { paddingBottom: Math.max(insets.bottom + 104, 118) },
        ]}
      >
        <View style={[styles.previewMain, isWide && styles.previewMainWeb]}>
          <View style={[styles.routeSetupCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Route setup</Text>

              <View style={styles.roundTripChip}>
                <Text style={styles.roundTripChipText}>↻ Round trip</Text>
              </View>
            </View>

            <LocationCard
              marker="start"
              title="Start location"
              subtitle={start.description || start.title || 'Used GPS position when optimizing'}
              time={startTime || 'Now'}
            />

            <View style={styles.locationConnector} />

            <LocationCard
              marker="end"
              title="End location"
              subtitle={end.description || end.title || 'Return to start location'}
              time="End"
            />
          </View>

          <View style={[styles.stopsCard, isWide && styles.previewColumn]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.previewSectionTitle}>Optimized stops</Text>
              <Text style={styles.sectionMeta}>{durationLabel}</Text>
            </View>

            {stops.map((stop) => (
              <StopListItem key={stop.id} stop={stop} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.previewFooter,
          isWide && styles.previewFooterWeb,
          { paddingBottom: Math.max(insets.bottom + 10, 18) },
        ]}
      >
        <View style={styles.confirmSummaryPill}>
          <Text style={styles.confirmSummaryLabel}>Total</Text>
          <Text style={styles.confirmSummaryValue}>{durationLabel || '0 min'}</Text>
        </View>

        <Pressable
          style={[styles.refineActionButton, isWide && styles.confirmActionWeb]}
          onPress={onRefine}
        >
          <Text style={styles.refineActionText}>
            {isReadyToStart ? 'Edit' : 'Refine'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.primaryActionButton,
            isWide && styles.confirmActionWeb,
            primaryButtonDisabled && styles.buttonDisabled,
          ]}
          onPress={handlePrimaryAction}
          disabled={primaryButtonDisabled}
        >
          <Text style={styles.primaryActionText}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </DraggableRouteSheet>
  );
}

function TransitStopPanel({
  isWide,
  activeStop,
  activeStopIndex = 0,
  totalActiveStops = 0,
  isUpdatingStopStatus,
  onNavigateActiveStop,
  onMarkStopDelivered,
  onMarkStopFailed,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const stop: any = activeStop || null;

  if (!stop) {
    return (
      <DraggableRouteSheet isWide={isWide} mode="large" variant="transit">
        <View style={styles.transitCompleteCard}>
          <View style={styles.transitCompleteIconBox}>
            <Feather name="check" size={32} color="#16A34A" />
          </View>

          <Text style={styles.transitCompleteTitle}>All orders completed</Text>

          <Text style={styles.transitCompleteText}>
            There are no pending stops left in this route.
          </Text>
        </View>
      </DraggableRouteSheet>
    );
  }

  const stopTitle =
    stop.title ||
    stop.address ||
    stop.description ||
    `Stop ${activeStopIndex + 1}`;

  const stopAddress =
    stop.subtitle ||
    stop.description ||
    stop.address ||
    'Address not available';

  const stopCode =
    stop.orderId ||
    stop.backendOrderId ||
    stop.id ||
    `A${activeStopIndex + 1}`;

  const stopTime = stop.eta || stop.time || '';
  const progressLabel = `${activeStopIndex + 1}/${totalActiveStops || 1}${
    stopTime ? `, ${stopTime}` : ''
  }`;

  return (
    <DraggableRouteSheet isWide={isWide} mode="large" variant="transit">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.transitSheetContent,
          { paddingBottom: Math.max(insets.bottom + 18, 28) },
        ]}
      >
        <View style={styles.transitHeader}>
          <View style={styles.transitHeaderTextBox}>
            <Text style={styles.transitTitle} numberOfLines={2}>
              {stopTitle}
            </Text>

            <View style={styles.transitProgressRow}>
              <View style={styles.transitBlueDot} />
              <Text style={styles.transitProgressText}>{progressLabel}</Text>
            </View>
          </View>

          <Pressable style={styles.transitCloseButton} hitSlop={10}>
            <Feather name="x" size={28} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.transitActionsRow}>
          <Pressable
            style={[styles.transitActionCard, styles.transitNavigateCard]}
            onPress={onNavigateActiveStop}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <MaterialCommunityIcons
              name="navigation-variant"
              size={35}
              color="#FFFFFF"
            />

            <Text style={[styles.transitActionText, styles.transitNavigateText]}>
              Navigate
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.transitActionCard,
              isUpdatingStopStatus && styles.buttonDisabled,
            ]}
            onPress={onMarkStopFailed}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="failed" />

            <Text style={styles.transitActionText}>
              {isUpdatingStopStatus ? 'Updating...' : 'Failed'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.transitActionCard,
              isUpdatingStopStatus && styles.buttonDisabled,
            ]}
            onPress={onMarkStopDelivered}
            disabled={Boolean(isUpdatingStopStatus)}
          >
            <PackageActionIcon type="delivered" />

            <Text style={styles.transitActionText}>
              {isUpdatingStopStatus ? 'Updating...' : 'Delivered'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stopRowsBlock}>
          <Pressable style={styles.stopDetailRow}>
            <McIcon name="note-text-outline" size={29} color="#475569" />

            <Text style={styles.stopMutedText}>Add notes</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.stopDetailRow}>
            <McIcon name="map-outline" size={30} color="#475569" />

            <Text style={styles.stopMainText} numberOfLines={2}>
              {stopAddress}
            </Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.stopDetailRow}>
            <View style={styles.rowIconBox}>
              <Text style={styles.stopIdIcon}>ID</Text>
            </View>

            <Text style={styles.stopMainText} numberOfLines={1}>
              {String(stopCode)}{' '}
              <Text style={styles.stopMutedInlineText}>
                Originally {activeStopIndex + 1}
              </Text>
            </Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>
        </View>

        <View style={styles.transitOptionsBlock}>
          <Pressable style={styles.transitOptionRow}>
            <RowIcon name="edit-3" size={28} color="#475569" />

            <Text style={styles.transitOptionText}>Edit stop</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>

          <Pressable style={styles.transitOptionRow}>
            <McIcon name="content-duplicate" size={30} color="#475569" />

            <Text style={styles.transitOptionText}>Duplicate stop</Text>

            <Feather name="chevron-right" size={28} color="#94A3B8" />
          </Pressable>
        </View>
      </ScrollView>
    </DraggableRouteSheet>
  );
}

function SummaryCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: 'blue' | 'green' | 'purple' | 'orange';
  icon: string;
  label: string;
  value: string;
}) {
  const toneStyle = {
    blue: styles.summaryIconBlue,
    green: styles.summaryIconGreen,
    purple: styles.summaryIconPurple,
    orange: styles.summaryIconOrange,
  }[tone];

  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconBox, toneStyle]}>
        <Text style={styles.summaryIconText}>{icon}</Text>
      </View>
      <View style={styles.summaryTextBox}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function LocationCard({
  marker,
  title,
  subtitle,
  time,
}: {
  marker: 'start' | 'end';
  title: string;
  subtitle: string;
  time: string;
}) {
  const isStart = marker === 'start';

  return (
    <View style={styles.locationCard}>
      <View style={[styles.locationMarker, isStart ? styles.startMarker : styles.endMarker]}>
        <Text style={styles.locationMarkerText}>{isStart ? '▲' : '●'}</Text>
      </View>

      <View style={styles.locationTextBox}>
        <Text style={styles.locationTitle}>{title}</Text>
        <Text style={styles.locationSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>

      <View style={styles.timePill}>
        <Text style={styles.timePillText}>{time}</Text>
      </View>
    </View>
  );
}

function StopListItem({ stop }: { stop: RouteStop }) {
  return (
    <Pressable style={styles.stopListItem}>
      <Text style={styles.stopDragDots}>⠿</Text>
      <View style={styles.stopNumberBadge}>
        <Text style={styles.stopNumberText}>{stop.sequence}</Text>
      </View>
      <View style={styles.stopListTextBox}>
        <Text style={styles.stopListTitle} numberOfLines={1}>{stop.title || 'Stop'}</Text>
        <Text style={styles.stopListSubtitle} numberOfLines={1}>{stop.description || stop.address || 'Address not available'}</Text>
      </View>
      <Text style={styles.stopEtaText}>#{stop.sequence}</Text>
      <Text style={styles.stopChevron}>›</Text>
    </Pressable>
  );
}

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable style={styles.quickAction}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function Tag({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={styles.tag}>
      {dot ? <View style={styles.tagDot} /> : null}
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function OptionSegment({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionIcon}>{icon}</Text>
      <Text style={styles.optionLabel}>{label}</Text>

      <View style={styles.segment}>
        {options.map(option => {
          const active = option.value === value;

          return (
            <Pressable
              key={option.value}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SetupItem({
  time,
  title,
  subtitle,
  icon,
  badge,
  dotOnly,
}: {
  time?: string;
  title: string;
  subtitle: string;
  icon?: string;
  badge?: string;
  dotOnly?: boolean;
}) {
  return (
    <View style={styles.setupItem}>
      <View style={styles.setupTimeBox}>
        {dotOnly ? <View style={styles.setupDot} /> : <Text style={styles.setupTime}>{time}</Text>}
      </View>

      <View style={styles.setupTextBox}>
        <Text style={styles.setupTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.setupSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <View style={styles.setupIconBox}>
          <Text style={styles.setupIconText}>{icon}</Text>
        </View>
      )}
    </View>
  );
}


export function RoutePreviewPanel(props: RoutePreviewPanelProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const normalizedStatus = normalizeRouteStatus(props.routeStatus);
  const resolvedMode: PanelMode =
    props.mode === 'transit' ||
    normalizedStatus === 'in_transit' ||
    normalizedStatus === 'completed'
      ? 'transit'
      : props.mode;

  if (resolvedMode === 'transit') {
    return <TransitStopPanel {...props} isWide={isWide} />;
  }

  if (resolvedMode === 'search') {
    return <SearchPanel {...props} isWide={isWide} />;
  }

  if (resolvedMode === 'details') {
    return <StopDetailsPanel {...props} isWide={isWide} />;
  }

  if (resolvedMode === 'setup') {
    return <RouteSetupPanel {...props} isWide={isWide} />;
  }

  if (resolvedMode === 'confirmed') {
    return <ConfirmedRoutePanel {...props} isWide={isWide} />;
  }

  return <EmptyStopsPanel {...props} isWide={isWide} />;
}

export default RoutePreviewPanel;

const styles = StyleSheet.create({
draggableTransitSheetWeb: {
  left: 24,
  right: undefined,
  bottom: 24,
  width: 460,
  maxWidth: 460,
  borderRadius: 30,
},

transitSheetContent: {
  paddingHorizontal: 30,
  paddingTop: 4,
  backgroundColor: '#FFFFFF',
},

transitHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 20,
},

transitHeaderTextBox: {
  flex: 1,
  paddingRight: 16,
  minWidth: 0,
},

transitTitle: {
  fontSize: 32,
  lineHeight: 39,
  fontWeight: '500',
  color: '#111827',
  letterSpacing: -0.4,
},

transitProgressRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
},

transitBlueDot: {
  width: 13,
  height: 13,
  borderRadius: 7,
  backgroundColor: '#2F76F6',
  marginRight: 9,
},

transitProgressText: {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '400',
  color: '#64748B',
},

transitCloseButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: '#EEF2F7',
  alignItems: 'center',
  justifyContent: 'center',
},

transitActionsRow: {
  flexDirection: 'row',
  gap: 14,
  marginBottom: 26,
},

transitActionCard: {
  flex: 1,
  minHeight: 108,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#D8E0EC',
  backgroundColor: '#F8FAFC',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 8,
},

transitNavigateCard: {
  backgroundColor: '#2F76F6',
  borderColor: '#2F76F6',
},

transitActionText: {
  marginTop: 7,
  fontSize: 18,
  lineHeight: 23,
  fontWeight: '500',
  color: '#111827',
  textAlign: 'center',
},

transitNavigateText: {
  color: '#FFFFFF',
},

packageActionIconWrap: {
  width: 40,
  height: 38,
  alignItems: 'center',
  justifyContent: 'center',
},

packageActionBadge: {
  position: 'absolute',
  right: 1,
  bottom: 0,
  width: 18,
  height: 18,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: '#F8FAFC',
},

packageActionBadgeSuccess: {
  backgroundColor: '#22C55E',
},

packageActionBadgeDanger: {
  backgroundColor: '#EF4444',
},

stopRowsBlock: {
  backgroundColor: '#FFFFFF',
  marginBottom: 0,
},

stopDetailRow: {
  minHeight: 78,
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '#EEF2F7',
},

rowIconBox: {
  width: 52,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 20,
},

stopMainText: {
  flex: 1,
  fontSize: 20,
  lineHeight: 27,
  fontWeight: '400',
  color: '#111827',
},

stopMutedText: {
  flex: 1,
  fontSize: 20,
  lineHeight: 27,
  fontWeight: '400',
  color: '#94A3B8',
},

stopMutedInlineText: {
  fontSize: 20,
  lineHeight: 27,
  fontWeight: '400',
  color: '#94A3B8',
},

stopIdIcon: {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '500',
  color: '#475569',
},

transitOptionsBlock: {
  backgroundColor: '#F1F5F9',
  marginHorizontal: -30,
  marginTop: 20,
  paddingHorizontal: 30,
  paddingVertical: 8,
},

transitOptionRow: {
  minHeight: 76,
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
},

transitOptionText: {
  flex: 1,
  fontSize: 23,
  lineHeight: 30,
  fontWeight: '400',
  color: '#111827',
},

transitCompleteCard: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},

transitCompleteIconBox: {
  width: 72,
  height: 72,
  borderRadius: 36,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#DCFCE7',
  marginBottom: 18,
},

transitCompleteTitle: {
  fontSize: 24,
  lineHeight: 30,
  fontWeight: '500',
  color: '#111827',
  textAlign: 'center',
},

transitCompleteText: {
  marginTop: 8,
  fontSize: 16,
  lineHeight: 22,
  fontWeight: '400',
  color: '#64748B',
  textAlign: 'center',
},
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 30,
    minHeight: '43%',
    maxHeight: '58%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelWeb: {
    minHeight: 330,
    maxHeight: '48%',
  },
  panelLarge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '15%',
    zIndex: 90,
    elevation: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelSearchWeb: {
    top: '18%',
  },
  panelDetailsWeb: {
    top: '12%',
  },
  draggableSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  draggableSheetWeb: {
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  dragHandleZone: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    alignSelf: 'center',
    width: 72,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginTop: 8,
    marginBottom: 10,
  },
  previewHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    flexShrink: 1,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#64748B',
  },
  statusChip: {
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  optimizedChip: {
    backgroundColor: '#DBEAFE',
  },
  optimizedChipText: {
    color: '#1D4ED8',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 24,
    color: '#334155',
  },
  summaryGrid: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryGridWeb: {
    paddingHorizontal: 28,
    gap: 14,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 155,
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  summaryIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  summaryIconPurple: {
    backgroundColor: '#F3E8FF',
  },
  summaryIconOrange: {
    backgroundColor: '#FFEDD5',
  },
  summaryIconText: {
    fontSize: 20,
    color: '#2563EB',
  },
  summaryTextBox: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  previewMain: {
    gap: 12,
  },
  previewMainWeb: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 16,
  },
  previewColumn: {
    flex: 1,
  },
  routeSetupCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  stopsCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  sectionTitleRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  roundTripChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
  },
  roundTripChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  locationCard: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMarker: {
    backgroundColor: '#22C55E',
  },
  endMarker: {
    backgroundColor: '#EF4444',
  },
  locationMarkerText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationTextBox: {
    flex: 1,
    minWidth: 0,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  timePill: {
    minWidth: 66,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  locationConnector: {
    width: 2,
    height: 18,
    marginLeft: 31,
    backgroundColor: '#CBD5E1',
  },
  stopListItem: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopDragDots: {
    fontSize: 17,
    color: '#94A3B8',
  },
  stopNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopListTextBox: {
    flex: 1,
    minWidth: 0,
  },
  stopListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  stopListSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  stopEtaText: {
    fontSize: 12,
    color: '#64748B',
  },
  stopChevron: {
    fontSize: 24,
    fontWeight: '300',
    color: '#94A3B8',
  },
  noStopsCard: {
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  noStopsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  noStopsSubtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
  },
  previewFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  previewFooterWeb: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  actionButtonWeb: {
    flex: 1,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmSummaryPill: {
    minWidth: 96,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmSummaryLabel: {
    fontSize: 11,
    color: '#16A34A',
  },
  confirmSummaryValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  refineActionButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  confirmActionWeb: {
    flex: 1,
  },
  searchRow: {
    marginHorizontal: 28,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  searchInputBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchFocused: {
    borderColor: '#2F76F6',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    fontSize: 22,
    color: '#94A3B8',
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#475569',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  searchSideIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginLeft: 14,
  },
  moreText: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 14,
  },
  closeButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#94A3B8',
  },
  clearText: {
    fontSize: 30,
    fontWeight: '300',
    color: '#94A3B8',
  },
  emptyBody: {
    flex: 1,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    color: '#94A3B8',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#94A3B8',
  },
  emptyFooter: {
    paddingHorizontal: 28,
    gap: 12,
  },
  primaryFullButton: {
    height: 56,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFullButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  secondaryFullButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryFullButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#2F76F6',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  quickAction: {
    flex: 1,
    height: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    color: '#2F76F6',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 16,
    color: '#2F76F6',
  },
  searchSectionTitle: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#475569',
  },
  suggestionRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  suggestionIcon: {
    width: 46,
    fontSize: 24,
    color: '#94A3B8',
  },
  suggestionTextBox: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
  },
  suggestionSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: '#64748B',
  },
  rowArrow: {
    fontSize: 30,
    fontWeight: '300',
    color: '#94A3B8',
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F76F6',
  },
  tagText: {
    fontSize: 13,
    color: '#111827',
  },
  addedTag: {
    marginLeft: 'auto',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
  },
  addedTagText: {
    fontSize: 13,
    color: '#15803D',
  },
  detailsTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  detailsSubtitle: {
    marginTop: 4,
    fontSize: 16,
    color: '#64748B',
  },
  disabledButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  disabledButtonText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  detailsRow: {
    marginTop: 16,
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsRowIcon: {
    fontSize: 22,
    color: '#64748B',
  },
  notesInput: {
    flex: 1,
    marginHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  optionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 42,
    fontSize: 22,
    color: '#475569',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  optionValue: {
    fontSize: 15,
    color: '#94A3B8',
  },
  counter: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  counterButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 22,
    color: '#64748B',
  },
  counterNumber: {
    width: 44,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: '#64748B',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  segment: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    flexDirection: 'row',
  },
  segmentItem: {
    minWidth: 74,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentItemActive: {
    backgroundColor: '#EFF6FF',
  },
  segmentText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#2F76F6',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  addStopConfirmButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  addStopConfirmText: {
    fontSize: 17,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  setupHeader: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupHeaderText: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
  },
  setupHeaderIcon: {
    fontSize: 26,
    color: '#64748B',
    marginLeft: 24,
  },
  sectionHeader: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#475569',
  },
  setupItem: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  setupTimeBox: {
    width: 74,
    alignItems: 'flex-start',
  },
  setupTime: {
    fontSize: 14,
    color: '#475569',
  },
  setupDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    marginLeft: 8,
  },
  setupTextBox: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
  },
  setupSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: '#475569',
  },
  setupIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupIconText: {
    fontSize: 20,
    color: '#2F76F6',
  },
  badge: {
    minWidth: 48,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 16,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  confirmFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerDuration: {
    width: 96,
    fontSize: 22,
    fontWeight: '600',
    color: '#16A34A',
  },
  refineButton: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineText: {
    fontSize: 16,
    color: '#111827',
  },
  confirmButton: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});