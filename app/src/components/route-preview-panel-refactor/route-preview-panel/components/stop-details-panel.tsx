import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

// type StopDetailsPanelMode = 'add' | 'edit';

type StopOrder = 'first' | 'auto' | 'last';
type StopType = 'delivery' | 'pickup';

type StopDetails = {
  notes: string;
  packages: number;
  order: StopOrder;
  stopType: StopType;
};

type PlaceSuggestion = {
  id?: string | number;
  title: string;
  subtitle?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
};

type StopLocationText = {
  title?: string;
  name?: string;
  address?: string;
  full_address?: string;
  fullAddress?: string;
  street?: string;
  city?: string;
  postcode?: string;
  postalCode?: string;
};

type EditableStop = StopLocationText & {
  id?: string | number;
  description?: string;
  subtitle?: string;
  location?: StopLocationText;
};

type StopDetailsPanelProps = Omit<
  RoutePreviewPanelProps,
  | 'selectedSuggestion'
  | 'editingStop'
  | 'stopDetails'
  | 'isAddingStop'
  | 'onStopDetailsChange'
  | 'onOpenSearch'
  | 'onCloseSearch'
  | 'onConfirmStopDetails'
> & {
  isWide: boolean;
  mode?: any;
  selectedSuggestion?: any;
  editingStop?: EditableStop | null;
  editingStopIndex?: number | null;
  stopDetails?: StopDetails | null;
  isAddingStop?: boolean;
  onStopDetailsChange: (details: StopDetails) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onConfirmStopDetails: () => void;
  onDoneEdit?: () => void;
  onChangeAddress?: () => void;
  onDuplicateStop?: () => void;
};

const COLOR_SWATCHES = [
  '#2F7BF6',
  '#0F8C8D',
  '#15803D',
  '#D97706',
  '#F97316',
  '#EF3B2D',
  '#EC4899',
  '#8B5CF6',
];

const defaultStopDetails = {
  notes: '',
  packages: 1,
  order: 'auto' as StopDetails['order'],
  stopType: 'delivery' as StopDetails['stopType'],
} as StopDetails;

function splitAddress(address?: string): { title: string; subtitle: string } | null {
  if (!address) {
    return null;
  }

  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  return {
    title: parts[0],
    subtitle: parts.slice(1).join(', '),
  };
}

function getStopText(stop?: EditableStop | null): { title: string; subtitle: string } | null {
  if (!stop) {
    return null;
  }

  const rawAddress =
    stop.address ||
    stop.full_address ||
    stop.fullAddress ||
    stop.location?.address ||
    stop.location?.full_address ||
    stop.location?.fullAddress;

  const parsed = splitAddress(rawAddress);

  const title =
    stop.title ||
    stop.name ||
    stop.location?.title ||
    stop.location?.name ||
    parsed?.title ||
    'Selected stop';

  const subtitleParts = [
    stop.description,
    stop.subtitle,
    parsed?.subtitle,
    stop.street || stop.location?.street,
    stop.city || stop.location?.city,
    stop.postcode || stop.postalCode || stop.location?.postcode || stop.location?.postalCode,
  ]
    .filter(Boolean)
    .map(String);

  return {
    title,
    subtitle: subtitleParts[0] || 'Address details not available',
  };
}

function Header({
  title,
  rightLabel,
  onRightPress,
}: {
  title: string;
  rightLabel: string;
  onRightPress: () => void;
}) {
  return (
    <View style={localStyles.header}>
      <Pressable style={localStyles.headerIconButton} hitSlop={10}>
        <Text style={localStyles.helpIcon}>?</Text>
      </Pressable>

      <Text style={localStyles.headerTitle}>{title}</Text>

      <Pressable style={localStyles.headerDoneButton} onPress={onRightPress} hitSlop={10}>
        <Text style={localStyles.headerDoneText}>{rightLabel}</Text>
      </Pressable>
    </View>
  );
}

function ColorPicker() {
  return (
    <View style={localStyles.colorRow}>
      {COLOR_SWATCHES.map((color, index) => (
        <Pressable
          key={color}
          style={[localStyles.colorChip, index === 0 && localStyles.colorChipActive]}
        >
          <View style={[localStyles.colorDot, { backgroundColor: color }]} />
        </Pressable>
      ))}
    </View>
  );
}

function OptionRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={localStyles.optionRow}>
      <Text style={localStyles.optionIcon}>{icon}</Text>
      <Text style={localStyles.optionLabel}>{label}</Text>
      <Text style={localStyles.optionValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={localStyles.actionRow} onPress={onPress}>
      <Text style={localStyles.actionIcon}>{icon}</Text>
      <Text style={localStyles.actionLabel}>{label}</Text>
      <Text style={localStyles.actionArrow}>›</Text>
    </Pressable>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={localStyles.segmentedControl}>
      {options.map(option => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[localStyles.segmentItem, active && localStyles.segmentItemActive]}
          >
            <Text style={[localStyles.segmentText, active && localStyles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SegmentedOptionRow<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={localStyles.optionRow}>
      <Text style={localStyles.optionIcon}>{icon}</Text>
      <Text style={localStyles.optionLabel}>{label}</Text>
      <SegmentedControl value={value} options={options} onChange={onChange} />
    </View>
  );
}

export function StopDetailsPanel({
  isWide,
  mode = "add",
  selectedSuggestion,
  editingStop,
  stopDetails,
  isAddingStop,
  onStopDetailsChange,
  onOpenSearch,
  onCloseSearch,
  onConfirmStopDetails,
  onDoneEdit,
  onChangeAddress,
  onDuplicateStop,
}: StopDetailsPanelProps) {
  const insets = useSafeAreaInsets();
  const panelAnim = useRef(new Animated.Value(0)).current;
  const details: any = stopDetails || defaultStopDetails;
  const packageCount = Math.max(1, Number(details.packages || 1));
  const isEditMode = mode === 'edit';
  const editingStopText = getStopText(editingStop);

  const title =
    editingStopText?.title ||
    selectedSuggestion?.title ||
    'Selected stop';

  const subtitle =
    editingStopText?.subtitle ||
    selectedSuggestion?.subtitle ||
    'Address details not available';

  const updateDetails = (patch: Partial<StopDetails>) => {
    onStopDetailsChange({
      ...details,
      ...patch,
    });
  };

  const handleHeaderRightPress = () => {
    if (isEditMode) {
      onDoneEdit?.();
      return;
    }

    onCloseSearch();
  };

  const handleChangeAddress = () => {
    if (onChangeAddress) {
      onChangeAddress();
      return;
    }

    onOpenSearch();
  };

  useEffect(() => {
    panelAnim.setValue(0);

    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [panelAnim, mode, selectedSuggestion?.id, editingStop?.id]);

  const animatedPanelStyle = {
    opacity: panelAnim,
    transform: [
      {
        translateY: panelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [26, 0],
        }),
      },
      {
        scale: panelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ] as any,
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <Animated.View style={[localStyles.panel, animatedPanelStyle, isWide && localStyles.panelWeb]}>
        <Header
          title={isEditMode ? 'Edit stop' : 'Add stop'}
          rightLabel={isEditMode ? 'Done' : 'Cancel'}
          onRightPress={handleHeaderRightPress}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 44) }}
        >
          <View style={localStyles.addressBlock}>
            <Text style={localStyles.detailsTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={localStyles.detailsSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>

            <ColorPicker />
          </View>

          <View style={localStyles.notesRow}>
            <TextInput
              value={details.notes ?? ''}
              onChangeText={value => updateDetails({ notes: value })}
              placeholder="Add notes"
              placeholderTextColor="#98A7BE"
              style={localStyles.notesInput}
              multiline
            />
            <Text style={localStyles.notesIcon}>⌘</Text>
            <Text style={localStyles.notesIcon}>▣</Text>
          </View>

          <View style={localStyles.optionsBlock}>
            <SegmentedOptionRow
              icon="⌑"
              label="Type"
              value={details.stopType}
              options={[
                { label: 'Delivery', value: 'delivery' },
                { label: 'Pickup', value: 'pickup' },
              ]}
              onChange={value => updateDetails({ stopType: value as StopDetails['stopType'] })}
            />

            <OptionRow icon="⌘" label="Package finder" value="Not set" />

            <View style={localStyles.optionRow}>
              <Text style={localStyles.optionIcon}>▰</Text>
              <Text style={localStyles.optionLabel}>Packages</Text>

              <View style={localStyles.counter}>
                <Pressable
                  style={localStyles.counterButton}
                  onPress={() => updateDetails({ packages: Math.max(1, packageCount - 1) })}
                >
                  <Text style={localStyles.counterText}>−</Text>
                </Pressable>

                <Text style={localStyles.counterNumber}>{packageCount}</Text>

                <Pressable
                  style={localStyles.counterButton}
                  onPress={() => updateDetails({ packages: packageCount + 1 })}
                >
                  <Text style={localStyles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* <SegmentedOptionRow
              icon="≡"
              label="Order"
              value={details.order}
              options={[
                { label: 'First', value: 'first' },
                { label: 'Auto', value: 'auto' },
                { label: 'Last', value: 'last' },
              ]}
              onChange={value => updateDetails({ order: value as StopDetails['order'] })}
            /> */}

            <OptionRow icon="◷" label="Arrival time" value="Anytime" />
            <OptionRow icon="⏱" label="Estimated time at stop" value="Default (1 min)" />
          </View>

          <View style={localStyles.actionBlock}>
            <ActionRow icon="⌕" label="Change address" onPress={handleChangeAddress} />
            <ActionRow icon="▣" label="Duplicate stop" onPress={onDuplicateStop} />
          </View>

          {!isEditMode && (
            <View style={localStyles.footerButtonBox}>
              <Pressable
                style={[localStyles.addStopButton, isAddingStop && localStyles.buttonDisabled]}
                onPress={onConfirmStopDetails}
                disabled={isAddingStop}
              >
                <Text style={localStyles.addStopButtonText}>
                  {isAddingStop ? 'Adding stop...' : 'Add stop'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </DraggableRouteSheet>
  );
}

const localStyles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelWeb: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
  },
  header: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  headerIconButton: {
    width: 34,
    height: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  helpIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#899AB3',
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#899AB3',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  headerDoneButton: {
    width: 66,
    minHeight: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerDoneText: {
    color: '#1269F3',
    fontSize: 15,
    fontWeight: '500',
  },
  addressBlock: {
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  detailsTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  detailsSubtitle: {
    color: '#51627E',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE6F1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  colorChipActive: {
    borderColor: '#2F7BF6',
    backgroundColor: '#EAF2FF',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  notesRow: {
    minHeight: 58,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7EDF5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesInput: {
    flex: 1,
    minHeight: 44,
    color: '#111827',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    paddingVertical: 10,
    paddingRight: 12,
  },
  notesIcon: {
    color: '#91A0B8',
    fontSize: 20,
    marginLeft: 14,
    fontWeight: '700',
  },
  optionsBlock: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 10,
  },
  optionRow: {
    minHeight: 54,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 34,
    color: '#4E607B',
    fontSize: 20,
    textAlign: 'center',
    marginRight: 8,
    fontWeight: '500',
  },
  optionLabel: {
    flex: 1,
    flexShrink: 1,
    color: '#182031',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  optionValue: {
    maxWidth: 148,
    flexShrink: 1,
    color: '#91A0B8',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'right',
  },
  segmentedControl: {
    minWidth: 198,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E0EC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentItemActive: {
    backgroundColor: '#EEF4FF',
  },
  segmentText: {
    color: '#91A0B8',
    fontSize: 15,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#176EF7',
    fontWeight: '600',
  },
  counter: {
    width: 132,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E0EC',
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  counterButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterText: {
    color: '#6F83A3',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '500',
  },
  counterNumber: {
    width: 44,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D7E0EC',
    color: '#91A0B8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 38,
  },
  actionBlock: {
    backgroundColor: '#F3F6FA',
    borderTopWidth: 1,
    borderTopColor: '#E7EDF5',
    paddingVertical: 12,
  },
  actionRow: {
    minHeight: 54,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 34,
    color: '#4E607B',
    fontSize: 20,
    textAlign: 'center',
    marginRight: 8,
    fontWeight: '500',
  },
  actionLabel: {
    flex: 1,
    color: '#182031',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  actionArrow: {
    color: '#8A9AB2',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },
  footerButtonBox: {
    backgroundColor: '#F3F6FA',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  addStopButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2876F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.58,
  },
});
