import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DateOption = 'today' | 'tomorrow' | 'custom';

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

export default function SetupLocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [routeName, setRouteName] = useState('Sunday');
  const [selectedDate, setSelectedDate] = useState<DateOption>('today');
  const [carryPastStops, setCarryPastStops] = useState(false);

  const dates = useMemo(() => {
    const today = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    return {
      today: formatDate(today),
      tomorrow: formatDate(tomorrow),
    };
  }, []);

  const handleConfirm = () => {
    router.push({
      pathname: '/route-points',
      params: {
        routeName,
        selectedDate,
        carryPastStops: String(carryPastStops),
      },
    } as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: insets.top + 22,
              paddingBottom: 120 + insets.bottom,
            },
          ]}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <Text style={styles.title}>Create route</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Route name (optional)</Text>

            <TextInput
              style={styles.input}
              placeholder="Sunday"
              placeholderTextColor="#98A2B3"
              value={routeName}
              onChangeText={setRouteName}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Select date</Text>

            <DateCard
              title="Today"
              date={dates.today.replace('Sun, ', '').replace('Mon, ', '')}
              selected={selectedDate === 'today'}
              onPress={() => setSelectedDate('today')}
            />

            <DateCard
              title="Tomorrow"
              date={dates.tomorrow.replace('Sun, ', '').replace('Mon, ', '')}
              selected={selectedDate === 'tomorrow'}
              onPress={() => setSelectedDate('tomorrow')}
            />

            <Pressable
              style={styles.optionCard}
              onPress={() => setSelectedDate('custom')}>
              <View style={styles.optionLeft}>
                <CalendarIcon />
                <Text style={styles.optionTitle}>Pick a date</Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Quick start options</Text>

            <Pressable
              style={styles.optionCard}
              onPress={() => setCarryPastStops(prev => !prev)}>
              <View style={styles.optionLeft}>
                <StopsIcon />
                <Text style={styles.optionTitle}>Pick past stops to carry over</Text>
              </View>

              <View
                style={[
                  styles.checkbox,
                  carryPastStops && styles.checkboxSelected,
                ]}>
                {carryPastStops ? <Text style={styles.checkText}>✓</Text> : null}
              </View>
            </Pressable>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 14, 24),
            },
          ]}>
          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function DateCard({
  title,
  date,
  selected,
  onPress,
}: {
  title: string;
  date: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.optionCard} onPress={onPress}>
      <View style={styles.optionLeft}>
        <CalendarIcon />

        <View style={styles.dateTextRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDate}>{date}</Text>
        </View>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

function CalendarIcon() {
  return (
    <View style={styles.calendarIcon}>
      <View style={styles.calendarTop} />
      <View style={styles.calendarDot} />
    </View>
  );
}

function StopsIcon() {
  return (
    <View style={styles.stopsIcon}>
      <View style={styles.stopBox} />
      <View style={styles.stopLine} />
      <View style={styles.stopPin} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 26,
  },

  closeText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    color: '#667085',
  },

  title: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 22,
  },

  fieldBlock: {
    marginBottom: 22,
  },

  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#475467',
    marginBottom: 8,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 3,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  optionCard: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  dateTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#111827',
  },

  optionDate: {
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    color: '#8A97AA',
  },

  chevron: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    color: '#8A97AA',
    marginTop: -2,
  },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: '#C9D3E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: '#2F76F6',
    backgroundColor: '#2F76F6',
  },

  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#C9D3E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#2F76F6',
    borderColor: '#2F76F6',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },

  calendarIcon: {
    width: 18,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#53657D',
    marginRight: 14,
    overflow: 'hidden',
    alignItems: 'center',
  },

  calendarTop: {
    width: '100%',
    height: 5,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
    marginTop: 3,
  },

  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 3,
  },

  stopsIcon: {
    width: 19,
    height: 19,
    marginRight: 13,
    position: 'relative',
  },

  stopBox: {
    position: 'absolute',
    left: 2,
    top: 1,
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#53657D',
  },

  stopLine: {
    position: 'absolute',
    left: 8,
    top: 12,
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#53657D',
  },

  stopPin: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#53657D',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },

  confirmButton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
});