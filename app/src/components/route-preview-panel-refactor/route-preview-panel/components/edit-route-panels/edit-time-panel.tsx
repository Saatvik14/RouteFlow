import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableRouteSheet } from './../draggable-route-sheet';
import {
  BaseEditProps,
  buildIsoDateTime,
  capitalize,
  Card,
  COLORS,
  EditTarget,
  Header,
  sharedStyles,
  TimePickerColumn,
} from './edit-route-shared';

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
      const hour24 = parsed.getHours();

      return {
        hour: hour24 % 12 || 12,
        minute: parsed.getMinutes(),
        ampm: hour24 >= 12 ? ('pm' as const) : ('am' as const),
      };
    }

    return { hour: 7, minute: 55, ampm: 'pm' as const };
  }, [startTime]);

  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState<'am' | 'pm'>(initial.ampm);

  const save = () => {
    onSaveRouteTime?.(
      target,
      buildIsoDateTime(dateChoice, hour, minute, ampm),
    );
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={sharedStyles.panel}>
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
          <Text style={sharedStyles.routeTitle}>{routeName || 'Route'}</Text>
          <Text style={sharedStyles.helperText}>
            This will update the route window after re-optimization.
          </Text>

          <Card>
            <Text style={styles.cardTitle}>Date</Text>

            <View style={styles.dateRow}>
              {(['today', 'tomorrow'] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.datePill,
                    dateChoice === item ? styles.datePillActive : null,
                  ]}
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

          <View style={styles.cardGap} />

          <Card>
            <Text style={styles.cardTitle}>Time</Text>

            <View style={styles.timePickerBox}>
              <TimePickerColumn
                value={String(hour).padStart(2, '0')}
                onIncrement={() => setHour((value) => (value >= 12 ? 1 : value + 1))}
                onDecrement={() => setHour((value) => (value <= 1 ? 12 : value - 1))}
              />

              <Text style={styles.timeColon}>:</Text>

              <TimePickerColumn
                value={String(minute).padStart(2, '0')}
                onIncrement={() => setMinute((value) => (value + 5) % 60)}
                onDecrement={() => setMinute((value) => (value - 5 + 60) % 60)}
              />

              <TimePickerColumn
                value={ampm}
                width={84}
                onIncrement={() => setAmpm((value) => (value === 'am' ? 'pm' : 'am'))}
                onDecrement={() => setAmpm((value) => (value === 'am' ? 'pm' : 'am'))}
              />
            </View>
          </Card>

          <View style={styles.infoBox}>
            <Feather name="info" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Changing the time may affect stop sequence and ETA.
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            sharedStyles.footer,
            { paddingBottom: Math.max(insets.bottom + 10, 16) },
          ]}
        >
          <Pressable
            style={sharedStyles.secondaryButton}
            onPress={onCancelEditRoute}
          >
            <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[
              sharedStyles.primaryButton,
              isSavingRouteEdit ? sharedStyles.disabledButton : null,
            ]}
            onPress={save}
            disabled={isSavingRouteEdit}
          >
            <Text style={sharedStyles.primaryButtonText}>
              {isSavingRouteEdit ? 'Saving...' : 'Save time'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  cardGap: {
    height: 16,
  },
  cardTitle: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '600',
    margin: 16,
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
    backgroundColor: COLORS.blueBackground,
    borderColor: '#93C5FD',
  },
  datePillText: {
    color: COLORS.title,
    fontSize: 14,
    fontWeight: '500',
  },
  datePillTextActive: {
    color: COLORS.primary,
  },
  timePickerBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 148,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeColon: {
    color: COLORS.title,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBox: {
    marginHorizontal: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: COLORS.blueBackground,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
});
