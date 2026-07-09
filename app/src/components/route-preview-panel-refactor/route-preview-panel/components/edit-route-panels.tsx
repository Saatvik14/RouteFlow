import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableRouteSheet } from './draggable-route-sheet';

type EditTarget = 'start' | 'end';
type StopOrder = 'first' | 'auto' | 'last';
type StopType = 'delivery' | 'pickup';

type StopDetails = {
  notes?: string;
  packages?: number;
  order?: StopOrder;
  stopType?: StopType;
  stop_type?: StopType;
  timeAtStopMinutes?: number;
  arrivalTime?: string;
  priority?: number | null;
};

type PlaceSuggestion = {
  id?: string | number;
  title: string;
  subtitle?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
};

type BaseEditProps = {
  isWide: boolean;
  routeName?: string;
  start?: any;
  end?: any;
  stops?: any[];
  startTime?: string;
  durationLabel?: string;
  distanceLabel?: string;
  routeStatus?: string;
  searchText?: string;
  suggestions?: PlaceSuggestion[];
  editingStop?: any | null;
  stopDetails?: StopDetails;
  isOptimizing?: boolean;
  isAddingStop?: boolean;
  isSavingRouteEdit?: boolean;
  onSearchTextChange?: (value: string) => void;
  onCancelEditRoute?: () => void;
  onOpenEditStartLocation?: () => void;
  onOpenEditEndLocation?: () => void;
  onOpenEditStartTime?: () => void;
  onOpenEditStop?: (stop: any) => void;
  onOpenEditStopAddress?: (stop?: any) => void;
  onAddAnotherStop?: () => void;
  onReOptimizeEditedRoute?: () => void;
  onSaveRouteLocation?: (target: EditTarget, suggestion: PlaceSuggestion) => void;
  onSaveRouteTime?: (target: EditTarget, isoDateTime: string) => void;
  onStopDetailsChange?: (details: StopDetails) => void;
  onSaveEditedStop?: (details: StopDetails) => void;
  onRemoveEditedStop?: () => void;
  onSaveStopAddress?: (suggestion: PlaceSuggestion) => void;
  onSaveStopPriority?: (stopId: string, priority: number | null) => Promise<void>;
};

function getAddress(item: any) {
  return String(
    item?.fullAddress ||
      item?.full_address ||
      item?.description ||
      item?.address ||
      item?.location?.fullAddress ||
      item?.location?.full_address ||
      item?.location?.address ||
      '',
  );
}

function getTitle(item: any, fallback: string) {
  const address = getAddress(item);

  return String(
    item?.title ||
      item?.name ||
      item?.location?.title ||
      item?.location?.name ||
      address.split(',')[0] ||
      fallback,
  );
}

function getStopSubtitle(stop: any) {
  const type = stop?.stopType || stop?.stop_type || 'Delivery';
  const packages = Number(stop?.packages || stop?.packageCount || stop?.package_count || 1);

  return `${capitalize(type)} · ${packages} ${packages === 1 ? 'package' : 'packages'}`;
}

function capitalize(value: any) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function getStatusLabel(status?: string) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'pending') return 'Needs re-optimization';
  if (normalized === 'optimized' || normalized === 'confirmed') return 'Optimized';
  if (normalized === 'in_transit') return 'In transit';

  return 'Optimized';
}

function formatTime(value?: string) {
  if (!value) return '';

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed
      .toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();
  }

  return value;
}

function Header({
  title,
  rightLabel,
  onBack,
  onRightPress,
}: {
  title: string;
  rightLabel?: string;
  onBack?: () => void;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerIcon} onPress={onBack} hitSlop={10}>
        <Feather name="arrow-left" size={24} color="#0B132B" />
      </Pressable>

      <Text style={styles.headerTitle}>{title}</Text>

      {rightLabel ? (
        <Pressable style={styles.headerRight} onPress={onRightPress} hitSlop={10}>
          <Text style={styles.headerRightText}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.headerIcon} />
      )}
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.rowPressed : null,
        danger ? styles.dangerRow : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, danger ? styles.dangerIcon : null]}>{icon}</View>

      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, danger ? styles.dangerText : null]} numberOfLines={2}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {onPress ? <Feather name="chevron-right" size={22} color="#64748B" /> : null}
    </Pressable>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function EditRoutePanel({
  isWide,
  routeName,
  start,
  end,
  stops = [],
  startTime,
  routeStatus,
  isOptimizing,
  onCancelEditRoute,
  onOpenEditStartLocation,
  onOpenEditEndLocation,
  onOpenEditStartTime,
  onOpenEditStop,
  onAddAnotherStop,
  onReOptimizeEditedRoute,
  onSaveStopPriority,
}: BaseEditProps) {
  const insets = useSafeAreaInsets();
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={styles.panel}>
        <Header title="Edit route" onBack={onCancelEditRoute} rightLabel="⋮" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 120, 150),
          }}
        >
          <Text style={styles.routeTitle}>{routeName || 'Route'}</Text>

          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{getStatusLabel(routeStatus)}</Text>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={20} color="#0B6BFF" />
            <Text style={styles.infoText}>
              Any change will require re-optimization before starting the route.
            </Text>
          </View>

          <SectionTitle>Route setup</SectionTitle>

          <Card>
            <Row
              icon={<Feather name="navigation" size={20} color="#0B6BFF" />}
              title="Start location"
              subtitle={getAddress(start)}
              value={formatTime(startTime)}
              onPress={onOpenEditStartLocation}
            />

            <Row
              icon={<MaterialCommunityIcons name="flag" size={21} color="#0B6BFF" />}
              title="End location"
              subtitle={getAddress(end)}
              onPress={onOpenEditEndLocation}
            />

            <Row
              icon={<Feather name="clock" size={20} color="#0B6BFF" />}
              title="Start time"
              value={formatTime(startTime) || 'Set time'}
              onPress={onOpenEditStartTime}
            />

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name="coffee-outline" size={21} color="#0B6BFF" />
              </View>

              {/* <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Break</Text>
                <Text style={styles.rowSubtitle}>Tap to plan a break</Text>
              </View> */}

              <Switch value={false} />
            </View>

            <Row
              icon={<Feather name="star" size={20} color="#0B6BFF" />}
              title="Set priority"
              subtitle="Set custom priorities for stops"
              value={stops && stops.some((s: any) => s.priority) ? `${stops.filter((s: any) => s.priority).length} prioritized` : 'Auto'}
              onPress={() => setIsPriorityModalOpen(true)}
            />
          </Card>

          <SectionTitle>Stops</SectionTitle>

          <Card>
            {stops.map((stop, index) => (
              <Pressable
                key={String(stop?.id || stop?.orderId || stop?.order_id || index)}
                style={({ pressed }) => [styles.stopRow, pressed ? styles.rowPressed : null]}
                onPress={() => onOpenEditStop?.(stop)}
              >
                <View style={styles.stopNumberPill}>
                  <Text style={styles.stopNumberText}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>

                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {getTitle(stop, `Stop ${index + 1}`)}
                    {stop.priority ? ` ★ P${stop.priority}` : ''}
                  </Text>

                  <Text style={styles.rowSubtitle}>{getStopSubtitle(stop)}</Text>
                </View>

                <Text style={styles.rowValue}>
                  {formatTime(stop?.arrival_time || stop?.eta || stop?.estimatedArrivalTime)}
                </Text>

                <Feather name="more-vertical" size={21} color="#64748B" />
              </Pressable>
            ))}
          </Card>

          <Pressable style={styles.addStopButton} onPress={onAddAnotherStop}>
            <Feather name="plus" size={22} color="#0B6BFF" />
            <Text style={styles.addStopText}>Add another stop</Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 10, 16),
            },
          ]}
        >
          <Pressable style={styles.secondaryButton} onPress={onCancelEditRoute}>
            <Text style={styles.secondaryButtonText}>Cancel edit</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, isOptimizing ? styles.disabledButton : null]}
            onPress={onReOptimizeEditedRoute}
            disabled={isOptimizing}
          >
            <Feather name="refresh-cw" size={19} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {isOptimizing ? 'Optimizing...' : 'Re-optimize'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isPriorityModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPriorityModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.42)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setIsPriorityModalOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom + 20, 30),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
                Set stops priority
              </Text>
              <Pressable onPress={() => setIsPriorityModalOpen(false)} style={{ padding: 4 }}>
                <Feather name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              Prioritized stops are kept at their set positions and are skipped during route optimization.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(stops ?? []).map((stop, index) => {
                const maxPriority = (stops ?? []).length;
                return (
                  <View
                    key={stop.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
                        {stop.title || `Stop ${index + 1}`}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }} numberOfLines={1}>
                        {stop.address || 'No address'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 4 }}>
                      <Pressable
                        onPress={() => {
                          const currentPriority = stop.priority;
                          if (currentPriority === null || currentPriority === undefined) {
                            // Already Auto
                          } else if (currentPriority === 1) {
                            onSaveStopPriority?.(stop.id, null);
                          } else {
                            onSaveStopPriority?.(stop.id, currentPriority - 1);
                          }
                        }}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>−</Text>
                      </Pressable>

                      <Text style={{ fontSize: 13, fontWeight: '600', color: stop.priority ? '#2F76F6' : '#64748B', minWidth: 40, textAlign: 'center' }}>
                        {stop.priority ? `P${stop.priority}` : 'Auto'}
                      </Text>

                      <Pressable
                        onPress={() => {
                          const currentPriority = stop.priority;
                          if (currentPriority === null || currentPriority === undefined) {
                            onSaveStopPriority?.(stop.id, 1);
                          } else if (currentPriority < maxPriority) {
                            onSaveStopPriority?.(stop.id, currentPriority + 1);
                          }
                        }}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setIsPriorityModalOpen(false)}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: '#2F76F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </DraggableRouteSheet>
  );
}

export function EditLocationPanel({
  isWide,
  target,
  currentLocation,
  routeName,
  searchText = '',
  suggestions = [],
  isSavingRouteEdit,
  onSearchTextChange,
  onCancelEditRoute,
  onSaveRouteLocation,
  onSaveStopAddress,
}: BaseEditProps & {
  target: 'start' | 'end' | 'stop';
  currentLocation?: any;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);

  const isStop = target === 'stop';

  const title = isStop
    ? 'Change stop address'
    : target === 'start'
      ? 'Edit start location'
      : 'Edit end location';

  const currentTitle = isStop ? 'Current stop address' : 'Current selected address';

  const handleSave = () => {
    if (!selected) return;

    if (isStop) {
      onSaveStopAddress?.(selected);
      return;
    }

    onSaveRouteLocation?.(target, selected);
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={styles.panel}>
        <Header title={title} rightLabel="Save" onBack={onCancelEditRoute} onRightPress={handleSave} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 120, 150),
          }}
        >
          {routeName && target !== 'stop' ? (
            <Text style={styles.smallRouteName}>{routeName}</Text>
          ) : null}

          <SectionTitle>Search address</SectionTitle>

          <View style={styles.searchBox}>
            <TextInput
              value={searchText}
              onChangeText={onSearchTextChange}
              placeholder="Search address"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />

            <Feather name="search" size={23} color="#475569" />
          </View>

          <View style={[styles.currentAddressBox, isStop ? styles.stopAddressBox : null]}>
            <View style={[styles.currentAddressIcon, isStop ? styles.stopAddressIcon : null]}>
              <Feather name="map-pin" size={23} color={isStop ? '#F59E0B' : '#0B6BFF'} />
            </View>

            <View style={styles.rowTextWrap}>
              <Text style={[styles.currentAddressTitle, isStop ? styles.stopCurrentText : null]}>
                {currentTitle}
              </Text>

              <Text style={styles.currentAddressText}>
                {getAddress(currentLocation) || 'No address selected'}
              </Text>
            </View>
          </View>

          <SectionTitle>Suggestions</SectionTitle>

          <Card>
            {suggestions.length ? (
              suggestions.map((item, index) => {
                const active = selected?.id === item.id && selected?.fullAddress === item.fullAddress;

                return (
                  <Pressable
                    key={String(item.id || item.fullAddress || index)}
                    style={[styles.suggestionRow, active ? styles.suggestionRowActive : null]}
                    onPress={() => setSelected(item)}
                  >
                    <View style={styles.rowIcon}>
                      <Feather
                        name={isStop ? 'search' : 'map-pin'}
                        size={20}
                        color="#0B6BFF"
                      />
                    </View>

                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      {item.subtitle ? (
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>

                    {active ? (
                      <Feather name="check" size={20} color="#0B6BFF" />
                    ) : (
                      <Feather name="chevron-right" size={22} color="#64748B" />
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptySuggestionBox}>
                <Text style={styles.emptySuggestionText}>
                  Type at least 2 letters to search addresses.
                </Text>
              </View>
            )}
          </Card>

          <SectionTitle>Other options</SectionTitle>

          <Card>
            <Row
              icon={<Feather name="crosshair" size={20} color="#0B6BFF" />}
              title="Use current location"
              onPress={() => {}}
            />

            <Row
              icon={<Feather name="map" size={20} color="#0B6BFF" />}
              title="Choose on map"
              onPress={() => {}}
            />
          </Card>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 10, 16),
            },
          ]}
        >
          <Pressable style={styles.secondaryButton} onPress={onCancelEditRoute}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, !selected || isSavingRouteEdit ? styles.disabledButton : null]}
            onPress={handleSave}
            disabled={!selected || isSavingRouteEdit}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingRouteEdit ? 'Saving...' : isStop ? 'Save address' : 'Save location'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

function buildIsoDateTime(
  dateChoice: 'today' | 'tomorrow',
  hour: number,
  minute: number,
  ampm: 'am' | 'pm',
) {
  const date = new Date();

  if (dateChoice === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  }

  let h = hour % 12;

  if (ampm === 'pm') {
    h += 12;
  }

  date.setHours(h, minute, 0, 0);

  return date.toISOString();
}

function TimePickerColumn({
  value,
  onIncrement,
  onDecrement,
  width = 70,
}: {
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
  width?: number;
}) {
  return (
    <View style={[styles.timeColumn, { width }]}>
      <Pressable onPress={onIncrement} hitSlop={10}>
        <Feather name="chevron-up" size={22} color="#94A3B8" />
      </Pressable>

      <Text style={styles.timeValue}>{value}</Text>

      <Pressable onPress={onDecrement} hitSlop={10}>
        <Feather name="chevron-down" size={22} color="#94A3B8" />
      </Pressable>
    </View>
  );
}

export function EditTimePanel({
  isWide,
  target = 'start',
  routeName,
  startTime,
  isSavingRouteEdit,
  onCancelEditRoute,
  onSaveRouteTime,
}: BaseEditProps & {
  target?: EditTarget;
}) {
  const insets = useSafeAreaInsets();

  const [dateChoice, setDateChoice] = useState<'today' | 'tomorrow'>('today');

  const initial = useMemo(() => {
    const parsed = startTime ? new Date(startTime) : null;

    if (parsed && !Number.isNaN(parsed.getTime())) {
      const h24 = parsed.getHours();

      return {
        hour: h24 % 12 || 12,
        minute: parsed.getMinutes(),
        ampm: h24 >= 12 ? ('pm' as const) : ('am' as const),
      };
    }

    return {
      hour: 7,
      minute: 55,
      ampm: 'pm' as const,
    };
  }, [startTime]);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState<'am' | 'pm'>(initial.ampm);

  const save = () => {
    onSaveRouteTime?.(target, buildIsoDateTime(dateChoice, hour, minute, ampm));
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={styles.panel}>
        <Header
          title={target === 'start' ? 'Edit start time' : 'Edit end time'}
          rightLabel="Save"
          onBack={onCancelEditRoute}
          onRightPress={save}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 120, 150),
          }}
        >
          <Text style={styles.routeTitle}>{routeName || 'Route'}</Text>
          <Text style={styles.helperText}>
            This will update the route window after re-optimization.
          </Text>

          <Card>
            <Text style={styles.cardTitle}>Date</Text>

            <View style={styles.dateRow}>
              {(['today', 'tomorrow'] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[styles.datePill, dateChoice === item ? styles.datePillActive : null]}
                  onPress={() => setDateChoice(item)}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      dateChoice === item ? styles.datePillTextActive : null,
                    ]}
                  >
                    {capitalize(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Time</Text>

            <View style={styles.timePickerBox}>
              <TimePickerColumn
                value={String(hour).padStart(2, '0')}
                onIncrement={() => setHour((prev) => (prev >= 12 ? 1 : prev + 1))}
                onDecrement={() => setHour((prev) => (prev <= 1 ? 12 : prev - 1))}
              />

              <Text style={styles.timeColon}>:</Text>

              <TimePickerColumn
                value={String(minute).padStart(2, '0')}
                onIncrement={() => setMinute((prev) => (prev + 5) % 60)}
                onDecrement={() => setMinute((prev) => (prev - 5 + 60) % 60)}
              />

              <TimePickerColumn
                value={ampm}
                width={84}
                onIncrement={() => setAmpm((prev) => (prev === 'am' ? 'pm' : 'am'))}
                onDecrement={() => setAmpm((prev) => (prev === 'am' ? 'pm' : 'am'))}
              />
            </View>
          </Card>

          <View style={styles.infoBox}>
            <Feather name="info" size={20} color="#0B6BFF" />
            <Text style={styles.infoText}>
              Changing the time may affect stop sequence and ETA.
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 10, 16),
            },
          ]}
        >
          <Pressable style={styles.secondaryButton} onPress={onCancelEditRoute}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, isSavingRouteEdit ? styles.disabledButton : null]}
            onPress={save}
            disabled={isSavingRouteEdit}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingRouteEdit ? 'Saving...' : 'Save time'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

function Segmented<T extends string>({
  value,
  values,
  onChange,
}: {
  value: T;
  values: {
    label: string;
    value: T;
  }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {values.map((item) => {
        const active = item.value === value;

        return (
          <Pressable
            key={item.value}
            style={[styles.segment, active ? styles.segmentActive : null]}
            onPress={() => onChange(item.value)}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EditStopPanel({
  isWide,
  editingStop,
  stopDetails,
  isSavingRouteEdit,
  onCancelEditRoute,
  onStopDetailsChange,
  onSaveEditedStop,
  onRemoveEditedStop,
  onOpenEditStopAddress,
  stops,
}: BaseEditProps) {
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<StopDetails>({
    notes: stopDetails?.notes || '',
    packages: Number(stopDetails?.packages || 1),
    order: stopDetails?.order || 'auto',
    stopType: stopDetails?.stopType || stopDetails?.stop_type || 'delivery',
    priority: stopDetails?.priority !== undefined ? stopDetails.priority : (editingStop?.priority ?? null),
  });

  const patchDetails = (patch: StopDetails) => {
    const next = {
      ...details,
      ...patch,
    };

    setDetails(next);
    onStopDetailsChange?.(next);
  };

  const packages = Math.max(1, Number(details.packages || 1));

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={styles.panel}>
        <Header
          title="Edit stop"
          rightLabel="Cancel"
          onBack={onCancelEditRoute}
          onRightPress={onCancelEditRoute}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 126, 160),
          }}
        >
          <Text style={styles.routeTitle}>{getTitle(editingStop, 'Stop')}</Text>
          <Text style={styles.helperText}>{getAddress(editingStop)}</Text>

          <View style={styles.colorRow}>
            {[
              '#0B6BFF',
              '#0891B2',
              '#16A34A',
              '#D97706',
              '#F97316',
              '#EF4444',
              '#EC4899',
              '#8B5CF6',
            ].map((color, index) => (
              <View
                key={color}
                style={[styles.colorChip, index === 0 ? styles.colorChipActive : null]}
              >
                <View style={[styles.colorDot, { backgroundColor: color }]} />
              </View>
            ))}
          </View>

          <Card>
            <View style={styles.notesBox}>
              <View style={styles.rowIcon}>
                <Feather name="file-text" size={20} color="#0B6BFF" />
              </View>

              <TextInput
                value={details.notes || ''}
                onChangeText={(text) => patchDetails({ notes: text })}
                placeholder="Add notes"
                placeholderTextColor="#94A3B8"
                style={styles.notesInput}
                multiline
              />
            </View>
          </Card>

          <Card>
            <View style={styles.formRow}>
              <View style={styles.rowIcon}>
                <Feather name="briefcase" size={20} color="#0B6BFF" />
              </View>

              <Text style={styles.rowTitle}>Type</Text>

              <Segmented
                value={(details.stopType || 'delivery') as StopType}
                values={[
                  {
                    label: 'Delivery',
                    value: 'delivery',
                  },
                  {
                    label: 'Pickup',
                    value: 'pickup',
                  },
                ]}
                onChange={(value) => patchDetails({ stopType: value })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.rowIcon}>
                <Feather name="box" size={20} color="#0B6BFF" />
              </View>

              <Text style={styles.rowTitle}>Packages</Text>

              <View style={styles.counter}>
                <Pressable
                  style={styles.counterButton}
                  onPress={() =>
                    patchDetails({
                      packages: Math.max(1, packages - 1),
                    })
                  }
                >
                  <Text style={styles.counterText}>−</Text>
                </Pressable>

                <Text style={styles.counterValue}>{packages}</Text>

                <Pressable
                  style={styles.counterButton}
                  onPress={() =>
                    patchDetails({
                      packages: packages + 1,
                    })
                  }
                >
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.rowIcon}>
                <Feather name="star" size={20} color="#0B6BFF" />
              </View>

              <Text style={styles.rowTitle}>Set priority</Text>

              <View style={styles.counter}>
                <Pressable
                  style={styles.counterButton}
                  onPress={() => {
                    const currentPriority = details.priority;
                    if (currentPriority === null || currentPriority === undefined) {
                      // Do nothing
                    } else if (currentPriority === 1) {
                      patchDetails({ priority: null });
                    } else {
                      patchDetails({ priority: currentPriority - 1 });
                    }
                  }}
                >
                  <Text style={styles.counterText}>−</Text>
                </Pressable>

                <Text style={styles.counterValue}>
                  {details.priority === null || details.priority === undefined ? 'Auto' : details.priority}
                </Text>

                <Pressable
                  style={styles.counterButton}
                  onPress={() => {
                    const currentPriority = details.priority;
                    const maxPriority = (stops ?? []).length;
                    if (currentPriority === null || currentPriority === undefined) {
                      patchDetails({ priority: 1 });
                    } else if (currentPriority < maxPriority) {
                      patchDetails({ priority: currentPriority + 1 });
                    }
                  }}
                >
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.rowIcon}>
                <Feather name="list" size={20} color="#0B6BFF" />
              </View>

              <Text style={styles.rowTitle}>Order preference</Text>

              <Segmented
                value={(details.order || 'auto') as StopOrder}
                values={[
                  {
                    label: 'First',
                    value: 'first',
                  },
                  {
                    label: 'Auto',
                    value: 'auto',
                  },
                  {
                    label: 'Last',
                    value: 'last',
                  },
                ]}
                onChange={(value) => patchDetails({ order: value })}
              />
            </View>

            <Row
              icon={<Feather name="clock" size={20} color="#0B6BFF" />}
              title="Arrival time"
              value="Anytime"
              onPress={() => {}}
            />

            <Row
              icon={<Feather name="watch" size={20} color="#0B6BFF" />}
              title="Time at stop"
              value="Default 1 min"
              onPress={() => {}}
            />

            <Row
              icon={<Feather name="map-pin" size={20} color="#0B6BFF" />}
              title="Address"
              value={getTitle(editingStop, 'Address')}
              onPress={() => onOpenEditStopAddress?.(editingStop)}
            />
          </Card>

          <Pressable style={styles.removeButton} onPress={onRemoveEditedStop}>
            <View style={styles.dangerIcon}>
              <Feather name="trash-2" size={21} color="#DC2626" />
            </View>

            <Text style={styles.removeButtonText}>Remove stop</Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.singleFooter,
            {
              paddingBottom: Math.max(insets.bottom + 10, 16),
            },
          ]}
        >
          <Pressable
            style={[styles.primaryButtonWide, isSavingRouteEdit ? styles.disabledButton : null]}
            disabled={isSavingRouteEdit}
            onPress={() => onSaveEditedStop?.(details)}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingRouteEdit ? 'Saving...' : 'Save stop'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  header: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerIcon: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0B132B',
    fontSize: 17,
    fontWeight: '500',
  },

  headerRight: {
    width: 64,
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  headerRightText: {
    color: '#0B6BFF',
    fontSize: 16,
    fontWeight: '500',
  },

  routeTitle: {
    color: '#0B132B',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    marginHorizontal: 22,
    marginTop: 18,
  },

  smallRouteName: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 22,
    marginTop: 18,
  },

  helperText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginHorizontal: 22,
    marginTop: 6,
  },

  statusChip: {
    marginLeft: 22,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  statusChipText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '500',
  },

  infoBox: {
    marginHorizontal: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  infoText: {
    flex: 1,
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },

  sectionTitle: {
    color: '#7182A3',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 22,
    marginTop: 22,
    marginBottom: 10,
  },

  card: {
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  cardTitle: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    margin: 16,
  },

  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    gap: 12,
  },

  rowPressed: {
    backgroundColor: '#F8FAFC',
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: '#0B132B',
    fontSize: 14,
    fontWeight: '500',
  },

  rowSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },

  rowValue: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 80,
  },

  stopRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    gap: 12,
  },

  stopNumberPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopNumberText: {
    color: '#0B6BFF',
    fontSize: 14,
    fontWeight: '600',
  },

  addStopButton: {
    marginHorizontal: 22,
    marginTop: 16,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  addStopText: {
    color: '#0B6BFF',
    fontSize: 14,
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7EDF5',
    paddingTop: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    gap: 14,
  },

  singleFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7EDF5',
    paddingTop: 14,
    paddingHorizontal: 22,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: '#0B6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#0B6BFF',
    fontSize: 14,
    fontWeight: '500',
  },

  primaryButton: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#0B6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryButtonWide: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#0B6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  disabledButton: {
    opacity: 0.55,
  },

  searchBox: {
    marginHorizontal: 22,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  searchInput: {
    flex: 1,
    color: '#0B132B',
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 12,
  },

  currentAddressBox: {
    marginHorizontal: 22,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },

  stopAddressBox: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },

  currentAddressIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopAddressIcon: {
    backgroundColor: '#FFEDD5',
  },

  currentAddressTitle: {
    color: '#0B6BFF',
    fontSize: 14,
    fontWeight: '500',
  },

  stopCurrentText: {
    color: '#D97706',
  },

  currentAddressText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginTop: 4,
  },

  suggestionRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    gap: 12,
  },

  suggestionRowActive: {
    backgroundColor: '#EFF6FF',
  },

  emptySuggestionBox: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  emptySuggestionText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },

  dateRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  datePill: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  datePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },

  datePillText: {
    color: '#0B132B',
    fontSize: 14,
    fontWeight: '500',
  },

  datePillTextActive: {
    color: '#0B6BFF',
  },

  timePickerBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 148,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  timeColumn: {
    alignItems: 'center',
    gap: 10,
  },

  timeValue: {
    color: '#0B132B',
    fontSize: 24,
    fontWeight: '600',
  },

  timeColon: {
    color: '#0B132B',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },

  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 22,
    marginVertical: 18,
  },

  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorChipActive: {
    borderColor: '#0B6BFF',
    backgroundColor: '#EFF6FF',
  },

  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },

  notesBox: {
    minHeight: 74,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  notesInput: {
    flex: 1,
    minHeight: 50,
    color: '#0B132B',
    fontSize: 14,
    fontWeight: '400',
  },

  formRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF5',
    gap: 12,
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    overflow: 'hidden',
    marginLeft: 'auto',
  },

  segment: {
    minWidth: 62,
    minHeight: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentActive: {
    backgroundColor: '#EFF6FF',
  },

  segmentText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },

  segmentTextActive: {
    color: '#0B6BFF',
  },

  counter: {
    marginLeft: 'auto',
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    overflow: 'hidden',
  },

  counterButton: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  counterText: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '500',
  },

  counterValue: {
    width: 42,
    height: 38,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 38,
    color: '#0B132B',
    fontSize: 15,
    fontWeight: '500',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#DDE5F0',
  },

  removeButton: {
    marginHorizontal: 22,
    marginTop: 22,
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  removeButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '500',
  },

  dangerRow: {
    borderColor: '#FECACA',
  },

  dangerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerText: {
    color: '#DC2626',
  },
});