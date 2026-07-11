import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableRouteSheet } from './../draggable-route-sheet';
import {
  BaseEditProps,
  COLORS,
  getAddress,
  getTitle,
  Header,
  StopDetails,
  StopOrder,
  StopType,
  sharedStyles,
} from './edit-route-shared';

type ArrivalMode = 'anytime' | 'scheduled';

type Choice<T extends string> = {
  label: string;
  value: T;
};

function getStopId(stop: any) {
  return String(
    stop?.id ||
      stop?._id ||
      stop?.stop_id ||
      stop?.stopId ||
      stop?.order_id ||
      stop?.orderId ||
      '',
  );
}

function getCoordinate(stop: any, key: 'latitude' | 'longitude') {
  const shortKey = key === 'latitude' ? 'lat' : 'lng';
  const value =
    stop?.[key] ??
    stop?.[shortKey] ??
    stop?.location?.[key] ??
    stop?.location?.[shortKey] ??
    null;

  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeArrivalTime(value: unknown) {
  if (!value) return '';

  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'anytime') return '';

  const hhmmMatch = text.match(/^(\d{1,2}):(\d{2})/);
  if (hhmmMatch) {
    return `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(
      parsed.getMinutes(),
    ).padStart(2, '0')}`;
  }

  return text;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function buildInitialDetails(
  editingStop: any,
  stopDetails?: StopDetails,
): StopDetails {
  return {
    notes: String(stopDetails?.notes ?? editingStop?.notes ?? ''),
    packages: Math.max(
      1,
      Number(
        stopDetails?.packages ??
          editingStop?.packages ??
          editingStop?.package_count ??
          editingStop?.packageCount ??
          1,
      ),
    ),
    order_preference: (
      stopDetails?.order_preference ??
      editingStop?.order_preference ??
      editingStop?.orderPreference ??
      'auto'
    ) as StopOrder,
    stop_type: (
      stopDetails?.stop_type ??
      editingStop?.stop_type ??
      editingStop?.stopType ??
      'delivery'
    ) as StopType,
    arrivalTime: normalizeArrivalTime(
      stopDetails?.arrivalTime ??
        editingStop?.arrivalTime ??
        editingStop?.arrival_time,
    ),
    timeAtStopMinutes: Math.max(
      1,
      Number(
        stopDetails?.timeAtStopMinutes ??
          editingStop?.timeAtStopMinutes ??
          editingStop?.time_at_stop_minutes ??
          editingStop?.service_time_minutes ??
          1,
      ),
    ),
    address: getAddress(editingStop),
    latitude: getCoordinate(editingStop, 'latitude'),
    longitude: getCoordinate(editingStop, 'longitude'),
  };
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

export function EditStopPanel({
  isWide,
  editingStop,
  stopDetails,
  isSavingRouteEdit,
  isDuplicatingStop,
  onBackFromEditStop ,
  onStopDetailsChange,
  onSaveEditedStop,
  onRemoveEditedStop,
  onDuplicateEditedStop,
  onOpenEditStopAddress,
}: BaseEditProps) {
  const insets = useSafeAreaInsets();
  const stopId = getStopId(editingStop);

  const incomingNotes = String(stopDetails?.notes ?? editingStop?.notes ?? '');
  const incomingPackages = Number(
    stopDetails?.packages ??
      editingStop?.packages ??
      editingStop?.package_count ??
      editingStop?.packageCount ??
      1,
  );
  const incomingOrder = String(
    stopDetails?.order_preference ??
      editingStop?.order_preference ??
      editingStop?.orderPreference ??
      'auto',
  );
  const incomingType = String(
    stopDetails?.stop_type ??
      editingStop?.stop_type ??
      editingStop?.stopType ??
      'delivery',
  );
  const incomingArrival = normalizeArrivalTime(
    stopDetails?.arrivalTime ??
      editingStop?.arrivalTime ??
      editingStop?.arrival_time,
  );
  const incomingDuration = Number(
    stopDetails?.timeAtStopMinutes ??
      editingStop?.timeAtStopMinutes ??
      editingStop?.time_at_stop_minutes ??
      editingStop?.service_time_minutes ??
      1,
  );
  const incomingAddress = getAddress(editingStop);
  const incomingLatitude = getCoordinate(editingStop, 'latitude');
  const incomingLongitude = getCoordinate(editingStop, 'longitude');

  const [details, setDetails] = useState<StopDetails>(() =>
    buildInitialDetails(editingStop, stopDetails),
  );
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>(() =>
    normalizeArrivalTime(
      stopDetails?.arrivalTime ??
        editingStop?.arrivalTime ??
        editingStop?.arrival_time,
    )
      ? 'scheduled'
      : 'anytime',
  );

  useEffect(() => {
    const next = buildInitialDetails(editingStop, stopDetails);
    setDetails(next);
    setArrivalMode(next.arrivalTime ? 'scheduled' : 'anytime');
  }, [
    stopId,
    incomingNotes,
    incomingPackages,
    incomingOrder,
    incomingType,
    incomingArrival,
    incomingDuration,
    incomingAddress,
    incomingLatitude,
    incomingLongitude,
  ]);

  const patchDetails = (patch: StopDetails) => {
    setDetails((current) => {
      const next = { ...current, ...patch };
      onStopDetailsChange?.(next);
      return next;
    });
  };

  const packages = Math.max(1, Number(details.packages || 1));
  const timeAtStopMinutes = Math.max(
    1,
    Number(details.timeAtStopMinutes || 1),
  );
  const address = details.address || getAddress(editingStop);

  const handleArrivalModeChange = (mode: ArrivalMode) => {
    setArrivalMode(mode);

    if (mode === 'anytime') {
      patchDetails({ arrivalTime: '' });
      return;
    }

    if (!details.arrivalTime) {
      patchDetails({ arrivalTime: '09:00' });
    }
  };

  const handleSave = () => {
    const payload: StopDetails = {
      ...details,
      notes: String(details.notes || '').trim(),
      packages,
      order_preference: details.order_preference || 'auto',
      stop_type: details.stop_type || 'delivery',
      arrivalTime:
        arrivalMode === 'scheduled'
          ? normalizeArrivalTime(details.arrivalTime)
          : '',
      timeAtStopMinutes,
      address,
      latitude: getCoordinate(editingStop, 'latitude'),
      longitude: getCoordinate(editingStop, 'longitude'),
    };

    onSaveEditedStop?.(payload);
  };

  const handleDuplicate = () => {
    if (!stopId || isDuplicatingStop) return;
    onDuplicateEditedStop?.(stopId);
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={sharedStyles.panel}>
        <Header
          title="Edit stop"
          rightLabel="Cancel"
          onBack={onBackFromEditStop}
          onRightPress={onBackFromEditStop}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 132, 164) },
          ]}
        >
          <View style={styles.stopSummary}>
            <Text style={styles.stopTitle} numberOfLines={1}>
              {getTitle(editingStop, 'Stop')}
            </Text>
            <Text style={styles.stopAddress} numberOfLines={2}>
              {address || 'No address added'}
            </Text>
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
                value={packages}
                onDecrease={() =>
                  patchDetails({ packages: Math.max(1, packages - 1) })
                }
                onIncrease={() => patchDetails({ packages: packages + 1 })}
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
            onPress={() => onOpenEditStopAddress?.(editingStop)}
          >
            <View style={styles.addressContent}>
              <Feather name="map-pin" size={19} color={COLORS.text} />
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressTitle}>Stop address</Text>
                <Text style={styles.addressValue} numberOfLines={2}>
                  {address || 'Add an address'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={21} color={COLORS.muted} />
          </Pressable>

          <Text style={styles.sectionTitle}>Notes</Text>

          <View style={styles.notesCard}>
            <TextInput
              value={details.notes || ''}
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

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.duplicateButton,
                (!stopId || isDuplicatingStop) ? styles.disabledAction : null,
                pressed && stopId ? styles.cardPressed : null,
              ]}
              disabled={!stopId || isDuplicatingStop}
              onPress={handleDuplicate}
            >
              <Feather name="copy" size={18} color={COLORS.primary} />
              <Text style={styles.duplicateButtonText}>
                {isDuplicatingStop ? 'Duplicating...' : 'Duplicate stop'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.removeButton,
                pressed ? styles.removeButtonPressed : null,
              ]}
              onPress={onRemoveEditedStop}
            >
              <Feather name="trash-2" size={18} color={COLORS.danger} />
              <Text style={styles.removeButtonText}>Remove stop</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View
          style={[
            sharedStyles.singleFooter,
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 10, 16) },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              sharedStyles.primaryButtonWide,
              styles.saveButton,
              isSavingRouteEdit ? sharedStyles.disabledButton : null,
              pressed && !isSavingRouteEdit ? styles.saveButtonPressed : null,
            ]}
            disabled={isSavingRouteEdit}
            onPress={handleSave}
          >
            <Feather name="check" size={18} color={COLORS.white} />
            <Text style={sharedStyles.primaryButtonText}>
              {isSavingRouteEdit ? 'Saving...' : 'Save stop'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 16,
  },
  stopSummary: {
    marginHorizontal: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
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
  timeInputWrap: {
    minHeight: 46,
    marginTop: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 9,
  },
  timeInput: {
    width: 62,
    color: COLORS.title,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  timeHint: {
    marginLeft: 'auto',
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '400',
  },
  addressCard: {
    marginHorizontal: 18,
    minHeight: 74,
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
  actionsRow: {
    marginHorizontal: 18,
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  duplicateButton: {
    borderColor: '#BFD4F3',
    backgroundColor: '#F8FBFF',
  },
  duplicateButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  removeButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  removeButtonPressed: {
    backgroundColor: '#FEF2F2',
  },
  removeButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  disabledAction: {
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
});
