import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePoint, RouteStop } from '@/app/(MapScreen)/MapScreen';

export type PanelMode = 'empty' | 'search' | 'details' | 'setup' | 'confirmed';

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
  stops: RouteStop[];
  durationLabel: string;
  distanceLabel: string;

  searchText: string;
  suggestions: PlaceSuggestion[];
  selectedSuggestion: PlaceSuggestion | null;
  stopDetails: StopDetails;
  isAddingStop?: boolean;

  onSearchTextChange: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  onStopDetailsChange: (details: StopDetails) => void;
  onConfirmStopDetails: () => void | Promise<void>;
  onOptimizeRoute: () => void;
  onRefine: () => void;
  onConfirm: () => void;
};

export function RoutePreviewPanel(props: RoutePreviewPanelProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  if (props.mode === 'search') {
    return <SearchPanel {...props} isWide={isWide} />;
  }

  if (props.mode === 'details') {
    return <StopDetailsPanel {...props} isWide={isWide} />;
  }

  if (props.mode === 'setup') {
    return <RouteSetupPanel {...props} isWide={isWide} />;
  }

  if (props.mode === 'confirmed') {
    return <ConfirmedRoutePanel {...props} isWide={isWide} />;
  }

  return <EmptyStopsPanel {...props} isWide={isWide} />;
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
  start,
  end,
  stops,
  startTime,
  onOpenSearch,
  onOptimizeRoute,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, isWide && styles.panelWeb]}>
      <View style={styles.dragHandle} />

      <View style={styles.setupHeader}>
        <Text style={styles.setupHeaderText}>
          {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
        </Text>

        <Pressable onPress={onOpenSearch}>
          <Text style={styles.setupHeaderIcon}>⌕</Text>
        </Pressable>

        <Text style={styles.setupHeaderIcon}>⋮</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 158, 174) }}
      >
        <Text style={styles.sectionHeader}>Route setup</Text>

        <SetupItem
          time={startTime || 'Now'}
          title="Start from current location"
          subtitle={start.description || 'Use GPS position when optimizing'}
          icon="⌂"
        />

        <SetupItem
          dotOnly
          title="Round trip"
          subtitle={end.description || 'Return to start location'}
          icon="⚑"
        />

        <SetupItem
          dotOnly
          title="No break"
          subtitle="Tap to plan a break"
          icon="☕"
        />

        {stops.length ? <Text style={styles.sectionHeader}>Stop</Text> : null}

        {stops.map(stop => (
          <SetupItem
            key={stop.id}
            time={`0${stop.sequence}`}
            title={stop.title || 'Stop'}
            subtitle={stop.description || stop.address || ''}
            badge={`A${stop.sequence}`}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
        <Pressable style={styles.secondaryFullButton} onPress={onOpenSearch}>
          <Text style={styles.secondaryFullButtonText}>＋ Add another stop</Text>
        </Pressable>

        <Pressable style={styles.primaryFullButton} onPress={onOptimizeRoute}>
          <Text style={styles.primaryFullButtonText}>↻ Optimize route</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConfirmedRoutePanel({
  isWide,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  onOpenSearch,
  onRefine,
  onConfirm,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, isWide && styles.panelWeb]}>
      <View style={styles.dragHandle} />

      <View style={styles.setupHeader}>
        <Text style={styles.setupHeaderText}>
          {durationLabel} • {stops.length} {stops.length === 1 ? 'stop' : 'stops'} • {distanceLabel}
        </Text>

        <Pressable onPress={onOpenSearch}>
          <Text style={styles.setupHeaderIcon}>⌕</Text>
        </Pressable>

        <Text style={styles.setupHeaderIcon}>⋮</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 96, 110) }}
      >
        <SetupItem dotOnly title="No break" subtitle="Tap to plan a break" icon="☕" />

        <SetupItem
          time={startTime || 'Now'}
          title="Start location"
          subtitle={start.description || 'Used GPS position when optimizing'}
          icon="⌂"
        />

        {stops.map(stop => (
          <SetupItem
            key={stop.id}
            time={`0${stop.sequence}`}
            title={stop.title || 'Stop'}
            subtitle={stop.description || stop.address || ''}
            badge={`A${stop.sequence}`}
          />
        ))}

        <SetupItem
          time="End"
          title={end.title || 'End location'}
          subtitle={end.description || 'Return to start location'}
          icon="⚑"
        />
      </ScrollView>

      <View style={[styles.confirmFooter, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
        <Text style={styles.footerDuration}>{durationLabel}</Text>

        <Pressable style={styles.refineButton} onPress={onRefine}>
          <Text style={styles.refineText}>Refine</Text>
        </Pressable>

        <Pressable style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
      </View>
    </View>
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

const styles = StyleSheet.create({
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
  dragHandle: {
    alignSelf: 'center',
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    marginTop: 8,
    marginBottom: 14,
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