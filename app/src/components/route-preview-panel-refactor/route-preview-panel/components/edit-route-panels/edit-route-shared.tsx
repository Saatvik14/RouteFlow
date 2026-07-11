import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type EditTarget = 'start' | 'end';
export type StopOrder = 'early' | 'auto' | 'last';
export type StopType = 'delivery' | 'pickup';

export type StopDetails = {
  notes?: string;
  packages?: number;
  order_preference?: StopOrder;
  stop_type?: StopType;
  timeAtStopMinutes?: number;
  arrivalTime?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PlaceSuggestion = {
  id?: string | number;
  title: string;
  subtitle?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
};

export type BaseEditProps = {
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
  isDuplicatingStop?: boolean;
  onSearchTextChange?: (value: string) => void;
  onCancelEditRoute?: () => void;
  onBackFromEditStop ?: () => void;
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
  onDuplicateEditedStop?: (stopId: string) => void | Promise<void>;
  onSaveStopAddress?: (suggestion: PlaceSuggestion) => void;
  onSaveStopPriority?: (stopId: string, priority: number | null) => Promise<void>;
};

export const COLORS = {
  primary: '#0B6BFF',
  title: '#0B132B',
  text: '#1E293B',
  muted: '#64748B',
  softMuted: '#7182A3',
  border: '#DDE5F0',
  divider: '#E7EDF5',
  blueBackground: '#EFF6FF',
  danger: '#DC2626',
  dangerBackground: '#FEF2F2',
  white: '#FFFFFF',
};

export function getAddress(item: any) {
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

export function getTitle(item: any, fallback: string) {
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

export function getStopSubtitle(stop: any) {
  const type = stop?.stop_type || 'Delivery';
  const packages = Number(
    stop?.packages || stop?.packageCount || stop?.package_count || 1,
  );

  return `${capitalize(type)} · ${packages} ${
    packages === 1 ? 'package' : 'packages'
  }`;
}

export function capitalize(value: any) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function getStatusLabel(status?: string) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'pending') return 'Needs re-optimization';
  if (normalized === 'optimized' || normalized === 'confirmed') return 'Optimized';
  if (normalized === 'in_transit') return 'In transit';

  return 'Optimized';
}

export function formatTime(value?: string) {
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

export function buildIsoDateTime(
  dateChoice: 'today' | 'tomorrow',
  hour: number,
  minute: number,
  ampm: 'am' | 'pm',
) {
  const date = new Date();

  if (dateChoice === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  }

  let normalizedHour = hour % 12;
  if (ampm === 'pm') normalizedHour += 12;

  date.setHours(normalizedHour, minute, 0, 0);
  return date.toISOString();
}

export function Header({
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
    <View style={sharedStyles.header}>
      <Pressable style={sharedStyles.headerIcon} onPress={onBack} hitSlop={10}>
        <Feather name="arrow-left" size={24} color={COLORS.title} />
      </Pressable>

      <Text style={sharedStyles.headerTitle}>{title}</Text>

      {rightLabel ? (
        <Pressable
          style={sharedStyles.headerRight}
          onPress={onRightPress}
          hitSlop={10}
        >
          <Text style={sharedStyles.headerRightText}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={sharedStyles.headerIcon} />
      )}
    </View>
  );
}

export function Row({
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
        sharedStyles.row,
        pressed && onPress ? sharedStyles.rowPressed : null,
        danger ? sharedStyles.dangerRow : null,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          sharedStyles.rowIcon,
          danger ? sharedStyles.dangerIcon : null,
        ]}
      >
        {icon}
      </View>

      <View style={sharedStyles.rowTextWrap}>
        <Text
          style={[
            sharedStyles.rowTitle,
            danger ? sharedStyles.dangerText : null,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text style={sharedStyles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={sharedStyles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {onPress ? (
        <Feather name="chevron-right" size={22} color={COLORS.muted} />
      ) : null}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={sharedStyles.card}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={sharedStyles.sectionTitle}>{children}</Text>;
}

export function Segmented<T extends string>({
  value,
  values,
  onChange,
}: {
  value: T;
  values: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={sharedStyles.segmented}>
      {values.map((item) => {
        const active = item.value === value;

        return (
          <Pressable
            key={item.value}
            style={[
              sharedStyles.segment,
              active ? sharedStyles.segmentActive : null,
            ]}
            onPress={() => onChange(item.value)}
          >
            <Text
              style={[
                sharedStyles.segmentText,
                active ? sharedStyles.segmentTextActive : null,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TimePickerColumn({
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
    <View style={[sharedStyles.timeColumn, { width }]}>
      <Pressable onPress={onIncrement} hitSlop={10}>
        <Feather name="chevron-up" size={22} color="#94A3B8" />
      </Pressable>

      <Text style={sharedStyles.timeValue}>{value}</Text>

      <Pressable onPress={onDecrement} hitSlop={10}>
        <Feather name="chevron-down" size={22} color="#94A3B8" />
      </Pressable>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  header: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
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
    color: COLORS.title,
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
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  routeTitle: {
    color: COLORS.title,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    marginHorizontal: 22,
    marginTop: 18,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginHorizontal: 22,
    marginTop: 6,
  },
  sectionTitle: {
    color: COLORS.softMuted,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 22,
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.blueBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: COLORS.title,
    fontSize: 14,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  rowValue: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 90,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
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
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 14,
    paddingHorizontal: 22,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonWide: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.55,
  },
  dangerRow: {
    borderColor: '#FECACA',
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  dangerText: {
    color: COLORS.danger,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.blueBackground,
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.primary,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 10,
  },
  timeValue: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '600',
  },
});
