import { Pressable, Text, View } from 'react-native';

import type { RouteStop } from '../../../maps/RouteMap.native';

import { styles } from '../styles';

export function SummaryCard({
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
export function LocationCard({
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
export function StopListItem({ stop }: { stop: RouteStop }) {
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
export function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable style={styles.quickAction}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}
export function Tag({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={styles.tag}>
      {dot ? <View style={styles.tagDot} /> : null}
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}
export function OptionSegment({
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
export function SetupItem({
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
