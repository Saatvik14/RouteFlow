import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type StopOrder = 'early' | 'first' | 'auto' | 'last';
type StopType = 'delivery' | 'pickup';

type StopDetails = {
  notes?: string;
  packages?: number;
  order?: StopOrder;
  order_preference?: StopOrder;
  stopType?: StopType;
  stop_type?: StopType;
  arrivalTime?: string;
  timeAtStopMinutes?: number;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  latitude?: number;
  longitude?: number;
};

type EditableStop = StopLocationText & {
  id?: string | number;
  _id?: string | number;
  order_id?: string | number;
  orderId?: string | number;
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
  mode?: unknown;
  selectedSuggestion?: any;
  editingStop?: EditableStop | null;
  stopDetails?: StopDetails | null;
  isAddingStop?: boolean;
  onStopDetailsChange: (details: any) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onConfirmStopDetails: () => void;
  onDoneEdit?: () => void;
  onChangeAddress?: () => void;
  onDuplicateStop?: () => void;
};

type Choice<T extends string> = {
  label: string;
  value: T;
};

const COLORS = {
  primary: '#2F76F6',
  title: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  softMuted: '#7C8BA1',
  border: '#DCE4EE',
  divider: '#EEF2F7',
  white: '#FFFFFF',
  surface: '#F8FAFC',
};

const DEFAULT_DETAILS: Required<
  Pick<
    StopDetails,
    | 'notes'
    | 'packages'
    | 'order_preference'
    | 'stop_type'
    | 'arrivalTime'
    | 'timeAtStopMinutes'
  >
> = {
  notes: '',
  packages: 1,
  order_preference: 'auto',
  stop_type: 'delivery',
  arrivalTime: '',
  timeAtStopMinutes: 1,
};

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function getStopTitle(stop?: EditableStop | null, suggestion?: any) {
  const address = getStopAddress(stop, suggestion);
  const firstAddressPart = address.split(',')[0]?.trim();

  return firstText(
    stop?.title,
    stop?.name,
    stop?.location?.title,
    stop?.location?.name,
    suggestion?.title,
    firstAddressPart,
    'Selected stop',
  );
}

function getStopAddress(stop?: EditableStop | null, suggestion?: any) {
  return firstText(
    stop?.address,
    stop?.full_address,
    stop?.fullAddress,
    stop?.location?.address,
    stop?.location?.full_address,
    stop?.location?.fullAddress,
    stop?.description,
    stop?.subtitle,
    suggestion?.fullAddress,
    suggestion?.subtitle,
  );
}

function getStopIdentity(stop?: EditableStop | null) {
  return firstText(stop?.id, stop?._id, stop?.order_id, stop?.orderId);
}

function FieldLabel({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <View style={styles.fieldIcon}>
        <Feather name={icon} size={18} color={COLORS.text} />
      </View>

      <View style={styles.fieldLabelText}>
        <Text style={styles.fieldTitle}>{title}</Text>
        {description ? (
          <Text style={styles.fieldDescription}>{description}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.choiceButton,
              active ? styles.choiceButtonActive : null,
              pressed ? styles.choiceButtonPressed : null,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                active ? styles.choiceTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Counter({
  value,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.counter}>
      <Pressable
        style={({ pressed }) => [
          styles.counterButton,
          pressed ? styles.counterButtonPressed : null,
        ]}
        onPress={onDecrease}
        hitSlop={8}
      >
        <Feather name="minus" size={18} color={COLORS.text} />
      </Pressable>

      <Text style={styles.counterValue}>{value}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.counterButton,
          pressed ? styles.counterButtonPressed : null,
        ]}
        onPress={onIncrease}
        hitSlop={8}
      >
        <Feather name="plus" size={18} color={COLORS.text} />
      </Pressable>
    </View>
  );
}

export function StopDetailsPanel({
  isWide,
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
  onOpenEditStopAddress,
}: StopDetailsPanelProps) {
  const insets = useSafeAreaInsets();
  const panelAnim = useRef(new Animated.Value(0)).current;
  const isExistingStop = Boolean(editingStop);
  const stopIdentity = getStopIdentity(editingStop);

  const details = useMemo<StopDetails>(
    () => ({
      ...DEFAULT_DETAILS,
      ...(stopDetails || {}),
      order_preference:
        stopDetails?.order_preference || stopDetails?.order || 'auto',
      stop_type:
        stopDetails?.stop_type || stopDetails?.stopType || 'delivery',
      timeAtStopMinutes: Math.max(
        1,
        Number(stopDetails?.timeAtStopMinutes || 1),
      ),
      packages: Math.max(1, Number(stopDetails?.packages || 1)),
    }),
    [stopDetails],
  );

  const packageCount = Math.max(1, Number(details.packages || 1));
  const timeAtStopMinutes = Math.max(
    1,
    Number(details.timeAtStopMinutes || 1),
  );
  const stopTitle = getStopTitle(editingStop, selectedSuggestion);
  const stopAddress =
    firstText(details.address) || getStopAddress(editingStop, selectedSuggestion);

  const patchDetails = (patch: StopDetails) => {
    const next = {
      ...details,
      ...patch,
    };

    if (patch.order_preference) {
      next.order = patch.order_preference;
    }

    if (patch.stop_type) {
      next.stopType = patch.stop_type;
    }

    onStopDetailsChange(next);
  };

  const handleClose = () => {
    if (onDoneEdit) {
      onDoneEdit();
      return;
    }

    onCloseSearch();
  };

  const handleChangeAddress = () => {
    if (isExistingStop && onOpenEditStopAddress) {
      onOpenEditStopAddress(editingStop as any);
      return;
    }

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
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [panelAnim, stopIdentity, selectedSuggestion?.id]);

  const animatedPanelStyle = {
    opacity: panelAnim,
    transform: [
      {
        translateY: panelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
    ],
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <Animated.View
        style={[
          styles.panel,
          animatedPanelStyle,
          isWide ? styles.panelWeb : null,
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? styles.headerButtonPressed : null,
            ]}
            onPress={handleClose}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={21} color={COLORS.text} />
          </Pressable>

          <Text style={styles.headerTitle}>
            {isExistingStop ? 'Stop details' : 'Add stop'}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.headerAction,
              pressed ? styles.headerButtonPressed : null,
            ]}
            onPress={handleClose}
            hitSlop={8}
          >
            <Text style={styles.headerActionText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 132, 164) },
          ]}
        >
          <View style={styles.stopSummary}>
            <View style={styles.summaryIcon}>
              <Feather name="map-pin" size={19} color={COLORS.primary} />
            </View>

            <View style={styles.summaryText}>
              <Text style={styles.stopTitle} numberOfLines={1}>
                {stopTitle}
              </Text>
              <Text style={styles.stopAddress} numberOfLines={3}>
                {stopAddress || 'No address added'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Stop details</Text>

          <View style={styles.card}>
            <View style={styles.fieldBlock}>
              <FieldLabel icon="briefcase" title="Type" />
              <ChoiceGroup<StopType>
                value={(details.stop_type || 'delivery') as StopType}
                options={[
                  { label: 'Delivery', value: 'delivery' },
                  { label: 'Pickup', value: 'pickup' },
                ]}
                onChange={(value) => patchDetails({ stop_type: value })}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.compactFieldRow}>
              <FieldLabel
                icon="package"
                title="Packages"
                description="Number of packages at this stop"
              />
              <Counter
                value={packageCount}
                onDecrease={() =>
                  patchDetails({ packages: Math.max(1, packageCount - 1) })
                }
                onIncrease={() =>
                  patchDetails({ packages: packageCount + 1 })
                }
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldBlock}>
              <FieldLabel
                icon="list"
                title="Order preference"
                description="Choose where this stop should appear"
              />
              <ChoiceGroup<StopOrder>
                value={(details.order_preference || 'auto') as StopOrder}
                options={[
                  { label: 'Early', value: 'early' },
                  { label: 'Automatic', value: 'auto' },
                  { label: 'Last', value: 'last' },
                ]}
                onChange={(value) =>
                  patchDetails({ order_preference: value })
                }
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.compactFieldRow}>
              <FieldLabel
                icon="watch"
                title="Time at stop"
                description="Estimated service time"
              />
              <View style={styles.durationControl}>
                <Counter
                  value={timeAtStopMinutes}
                  onDecrease={() =>
                    patchDetails({
                      timeAtStopMinutes: Math.max(
                        1,
                        timeAtStopMinutes - 1,
                      ),
                    })
                  }
                  onIncrease={() =>
                    patchDetails({
                      timeAtStopMinutes: timeAtStopMinutes + 1,
                    })
                  }
                />
                <Text style={styles.minutesText}>min</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Address</Text>

          <Pressable
            style={({ pressed }) => [
              styles.addressCard,
              pressed ? styles.cardPressed : null,
            ]}
            onPress={handleChangeAddress}
          >
            <View style={styles.addressContent}>
              <Feather name="map-pin" size={19} color={COLORS.text} />
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressTitle}>Stop address</Text>
                <Text style={styles.addressValue} numberOfLines={3}>
                  {stopAddress || 'Add an address'}
                </Text>
                <Text style={styles.addressHint}>
                  Tap to search and update this address
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={21} color={COLORS.muted} />
          </Pressable>

          <Text style={styles.sectionTitle}>Notes</Text>

          <View style={styles.notesCard}>
            <TextInput
              value={String(details.notes || '')}
              onChangeText={(text) => patchDetails({ notes: text })}
              placeholder="Add delivery instructions, access codes, or other notes"
              placeholderTextColor="#94A3B8"
              style={styles.notesInput}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {String(details.notes || '').length}/500
            </Text>
          </View>

          {isExistingStop && onDuplicateStop ? (
            <Pressable
              style={({ pressed }) => [
                styles.duplicateButton,
                pressed ? styles.cardPressed : null,
              ]}
              onPress={onDuplicateStop}
            >
              <Feather name="copy" size={18} color={COLORS.primary} />
              <Text style={styles.duplicateButtonText}>Duplicate stop</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 10, 16) },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              isAddingStop ? styles.disabledButton : null,
              pressed && !isAddingStop ? styles.saveButtonPressed : null,
            ]}
            disabled={isAddingStop}
            onPress={onConfirmStopDetails}
          >
            <Feather name="check" size={18} color={COLORS.white} />
            <Text style={styles.saveButtonText}>
              {isAddingStop
                ? isExistingStop
                  ? 'Saving...'
                  : 'Adding stop...'
                : isExistingStop
                  ? 'Save stop'
                  : 'Add stop'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  panelWeb: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
  },
  header: {
    height: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  headerButton: {
    width: 42,
    height: 38,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    opacity: 0.62,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.title,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  },
  headerAction: {
    width: 68,
    height: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerActionText: {
    color: COLORS.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  scrollContent: {
    paddingTop: 16,
  },
  stopSummary: {
    marginHorizontal: 18,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  stopTitle: {
    color: COLORS.title,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  stopAddress: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    marginTop: 4,
  },
  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 9,
    color: COLORS.softMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  card: {
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: COLORS.surface,
  },
  fieldBlock: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  compactFieldRow: {
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  fieldIcon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelText: {
    flex: 1,
    minWidth: 0,
  },
  fieldTitle: {
    color: COLORS.title,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  fieldDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  choiceGroup: {
    marginTop: 12,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 3,
  },
  choiceButton: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceButtonActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#C9D7EB',
  },
  choiceButtonPressed: {
    opacity: 0.72,
  },
  choiceText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  choiceTextActive: {
    color: COLORS.primary,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  counterButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  counterValue: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 38,
    color: COLORS.title,
    fontSize: 14,
    fontWeight: '600',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  durationControl: {
    alignItems: 'flex-end',
  },
  minutesText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginRight: 2,
  },
  addressCard: {
    marginHorizontal: 18,
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  addressContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  addressTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  addressTitle: {
    color: COLORS.title,
    fontSize: 14,
    fontWeight: '500',
  },
  addressValue: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    marginTop: 3,
  },
  addressHint: {
    color: COLORS.primary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 5,
  },
  notesCard: {
    marginHorizontal: 18,
    minHeight: 118,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  notesInput: {
    minHeight: 78,
    color: COLORS.title,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    padding: 0,
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 6,
  },
  duplicateButton: {
    marginHorizontal: 18,
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFD4F3',
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  duplicateButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
