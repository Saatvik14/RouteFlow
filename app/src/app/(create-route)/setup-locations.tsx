import { useConfigStore } from '@/src/store/useConfigStore';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function getDayName(date: Date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
  });
}

function buildRouteName(date: Date) {
  const day = getDayName(date);
  const shortDate = formatShortDate(date);

  return `${day} Route - ${shortDate}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startWeekDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days: (Date | null)[] = [];

  for (let index = 0; index < startWeekDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

export default function SetupLocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const [routeDate, setRouteDate] = useState<Date>(today);
  const [routeName, setRouteName] = useState(buildRouteName(today));
  const [carryPastStops, setCarryPastStops] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const isConfirmDisabled = !routeDate || !routeName.trim();

  const handleSelectDate = (date: Date) => {
    setRouteDate(date);
    setRouteName(buildRouteName(date));
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;

    if (carryPastStops) {
      router.push({
        pathname: '/carry-over-stops',
        params: {
          routeName: routeName.trim(),
          routeDate: toISODate(routeDate),
          routeDateLabel: formatDateLabel(routeDate),
          routeDay: getDayName(routeDate),
        },
      } as never);
    } else {
      router.push({
        pathname: '/route-points',
        params: {
          routeName: routeName.trim(),
          routeDate: toISODate(routeDate),
          routeDateLabel: formatDateLabel(routeDate),
          routeDay: getDayName(routeDate),
          carryPastStops: 'false',
        },
      } as never);
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <KeyboardAvoidingView
      style={[styles.root, isWeb && styles.webRoot]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, isWeb && styles.webRoot]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            isWeb
              ? styles.webScrollContainer
              : {
                  paddingTop: insets.top + 22,
                  paddingBottom: 130 + insets.bottom,
                },
          ]}
        >
          <View style={isWeb ? styles.webCard : null}>
            {isWeb ? (
              <View style={styles.webHeader}>
                <View style={styles.webHeaderLeft}>
                  <Pressable style={styles.webBackButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={15} color="#475569" />
                    <Text style={styles.webBackText}>Back</Text>
                  </Pressable>
                  <View style={styles.webBadge}>
                    <Feather name="map-pin" size={12} color="#2563EB" />
                    <Text style={styles.webBadgeText}>Route Setup</Text>
                  </View>
                </View>
                <Pressable style={styles.webCloseBtn} onPress={() => router.back()}>
                  <Feather name="x" size={16} color="#64748B" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.closeButton} onPress={() => router.back()}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            )}

            <Text style={[styles.title, isWeb && styles.webTitle]}>Create route</Text>
            {isWeb && (
              <Text style={styles.webSubtitle}>
                Set your route name and delivery schedule. You can also import incomplete stops from previous routes.
              </Text>
            )}

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, isWeb && styles.webLabel]}>
                {isWeb ? 'ROUTE NAME' : 'Route name'}
              </Text>

              <TextInput
                style={[styles.input, isWeb && styles.webInput]}
                placeholder="Sunday Route - 09 Jun"
                placeholderTextColor="#98A2B3"
                value={routeName}
                onChangeText={setRouteName}
              />

              <Text style={styles.helperText}>
                Route name is generated using selected date and day.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, isWeb && styles.webLabel]}>
                {isWeb ? 'SELECT ROUTE DATE' : 'Select route date'}
              </Text>

              {isWeb ? (
                <View style={styles.webDateGrid}>
                  <Pressable
                    style={[
                      styles.webDateTile,
                      isSameDate(routeDate, today) && styles.webDateTileSelected,
                    ]}
                    onPress={() => handleSelectDate(today)}
                  >
                    <View style={styles.webDateTileTop}>
                      <View
                        style={[
                          styles.webDateIconBox,
                          isSameDate(routeDate, today) && styles.webDateIconBoxSelected,
                        ]}
                      >
                        <Feather
                          name="calendar"
                          size={15}
                          color={isSameDate(routeDate, today) ? '#2563EB' : '#64748B'}
                        />
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSameDate(routeDate, today) && styles.radioOuterSelected,
                        ]}
                      >
                        {isSameDate(routeDate, today) ? <View style={styles.radioInner} /> : null}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.webDateTileTitle,
                        isSameDate(routeDate, today) && styles.webDateTileTitleSelected,
                      ]}
                    >
                      Today
                    </Text>
                    <Text style={styles.webDateTileDate}>{formatDateLabel(today)}</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.webDateTile,
                      isSameDate(routeDate, tomorrow) && styles.webDateTileSelected,
                    ]}
                    onPress={() => handleSelectDate(tomorrow)}
                  >
                    <View style={styles.webDateTileTop}>
                      <View
                        style={[
                          styles.webDateIconBox,
                          isSameDate(routeDate, tomorrow) && styles.webDateIconBoxSelected,
                        ]}
                      >
                        <Feather
                          name="sun"
                          size={15}
                          color={isSameDate(routeDate, tomorrow) ? '#2563EB' : '#64748B'}
                        />
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSameDate(routeDate, tomorrow) && styles.radioOuterSelected,
                        ]}
                      >
                        {isSameDate(routeDate, tomorrow) ? <View style={styles.radioInner} /> : null}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.webDateTileTitle,
                        isSameDate(routeDate, tomorrow) && styles.webDateTileTitleSelected,
                      ]}
                    >
                      Tomorrow
                    </Text>
                    <Text style={styles.webDateTileDate}>{formatDateLabel(tomorrow)}</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.webDateTile,
                      !isSameDate(routeDate, today) &&
                        !isSameDate(routeDate, tomorrow) &&
                        styles.webDateTileSelected,
                    ]}
                    onPress={() => setShowCalendar(true)}
                  >
                    <View style={styles.webDateTileTop}>
                      <View
                        style={[
                          styles.webDateIconBox,
                          !isSameDate(routeDate, today) &&
                            !isSameDate(routeDate, tomorrow) &&
                            styles.webDateIconBoxSelected,
                        ]}
                      >
                        <Feather
                          name="calendar"
                          size={15}
                          color={
                            !isSameDate(routeDate, today) && !isSameDate(routeDate, tomorrow)
                              ? '#2563EB'
                              : '#64748B'
                          }
                        />
                      </View>
                      <Feather name="chevron-right" size={16} color="#64748B" />
                    </View>
                    <Text
                      style={[
                        styles.webDateTileTitle,
                        !isSameDate(routeDate, today) &&
                          !isSameDate(routeDate, tomorrow) &&
                          styles.webDateTileTitleSelected,
                      ]}
                    >
                      Pick a date
                    </Text>
                    <Text style={styles.webDateTileDate}>{formatDateLabel(routeDate)}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <DateCard
                    title="Today"
                    date={formatDateLabel(today)}
                    selected={isSameDate(routeDate, today)}
                    onPress={() => handleSelectDate(today)}
                  />

                  <DateCard
                    title="Tomorrow"
                    date={formatDateLabel(tomorrow)}
                    selected={isSameDate(routeDate, tomorrow)}
                    onPress={() => handleSelectDate(tomorrow)}
                  />

                  <Pressable
                    style={styles.optionCard}
                    onPress={() => setShowCalendar(true)}
                  >
                    <View style={styles.optionLeft}>
                      <CalendarIcon />

                      <View style={styles.dateTextBox}>
                        <Text style={styles.optionTitle}>Pick a date</Text>
                        <Text style={styles.optionDate}>{formatDateLabel(routeDate)}</Text>
                      </View>
                    </View>

                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, isWeb && styles.webLabel]}>
                {isWeb ? 'QUICK OPTION' : 'Quick option'}
              </Text>

              {isWeb ? (
                <Pressable
                  style={[styles.webOptionCard, carryPastStops && styles.webOptionCardSelected]}
                  onPress={() => setCarryPastStops(prev => !prev)}
                >
                  <View style={styles.webOptionLeft}>
                    <View
                      style={[
                        styles.webOptionIconBox,
                        carryPastStops && styles.webOptionIconBoxSelected,
                      ]}
                    >
                      <Feather
                        name="repeat"
                        size={18}
                        color={carryPastStops ? '#2563EB' : '#64748B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.webOptionTitle}>Carry past stops</Text>
                      <Text style={styles.webOptionDesc}>
                        Transfer incomplete or pending stops from your previous route to this new route.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      carryPastStops && styles.checkboxSelected,
                    ]}
                  >
                    {carryPastStops ? <Text style={styles.checkText}>✓</Text> : null}
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.optionCard}
                  onPress={() => setCarryPastStops(prev => !prev)}
                >
                  <View style={styles.optionLeft}>
                    <StopsIcon />
                    <Text style={styles.optionTitle}>Carry past stops</Text>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      carryPastStops && styles.checkboxSelected,
                    ]}
                  >
                    {carryPastStops ? <Text style={styles.checkText}>✓</Text> : null}
                  </View>
                </Pressable>
              )}
            </View>

            {/* Web Inline Action Buttons */}
            {isWeb && (
              <View style={styles.webActionRow}>
                <Pressable style={styles.webCancelBtn} onPress={() => router.back()}>
                  <Text style={styles.webCancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.webConfirmBtn,
                    isConfirmDisabled && styles.disabledButton,
                  ]}
                  disabled={isConfirmDisabled}
                  onPress={handleConfirm}
                >
                  <Text style={styles.webConfirmBtnText}>
                    {carryPastStops ? 'Proceed to copy' : 'Confirm'}
                  </Text>
                  <Feather name="arrow-right" size={15} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Mobile Fixed Screen-Bottom Footer */}
        {!isWeb && (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom + 14, 24),
              },
            ]}
          >
            <Pressable
              style={[
                styles.confirmButton,
                isConfirmDisabled && styles.disabledButton,
              ]}
              disabled={isConfirmDisabled}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>
                {carryPastStops ? 'Proceed to copy' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        )}

        <CalendarModal
          visible={showCalendar}
          selectedDate={routeDate}
          onClose={() => setShowCalendar(false)}
          onSelectDate={date => {
            handleSelectDate(date);
            setShowCalendar(false);
          }}
        />
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
    <Pressable
      style={[styles.optionCard, selected && styles.selectedOptionCard]}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <CalendarIcon />

        <View style={styles.dateTextBox}>
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

function CalendarModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const [visibleMonth, setVisibleMonth] = useState(selectedDate);
  const isWeb = Platform.OS === 'web';

  const days = getCalendarDays(visibleMonth);

  const monthTitle = visibleMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalRoot, isWeb && styles.webModalRoot]}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.calendarSheet,
            isWeb
              ? styles.webCalendarSheet
              : {
                  paddingBottom: Math.max(insets.bottom + 20, 32),
                },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setVisibleMonth(prev => addMonths(prev, -1))}>
              <Text style={styles.calendarNav}>‹</Text>
            </Pressable>

            <Text style={styles.calendarTitle}>{monthTitle}</Text>

            <Pressable onPress={() => setVisibleMonth(prev => addMonths(prev, 1))}>
              <Text style={styles.calendarNav}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((date, index) => {
              const selected = date ? isSameDate(date, selectedDate) : false;

              return (
                <Pressable
                  key={date ? toISODate(date) : `empty-${index}`}
                  style={[
                    styles.dayCell,
                    selected && styles.selectedDayCell,
                  ]}
                  disabled={!date}
                  onPress={() => date && onSelectDate(date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.selectedDayText,
                    ]}
                  >
                    {date ? date.getDate() : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.calendarCancelButton} onPress={onClose}>
            <Text style={styles.calendarCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    fontWeight: '600',
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
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  helperText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: '#8A97AA',
  },

  optionCard: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedOptionCard: {
    borderColor: '#2F76F6',
    backgroundColor: '#F6FAFF',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  dateTextBox: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#111827',
  },

  optionDate: {
    marginTop: 2,
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
    fontWeight: '600',
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
    borderRadius: 8,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    backgroundColor: '#CBD5E1',
  },

  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },

  calendarSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  calendarHeader: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },

  calendarNav: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
    color: '#2F76F6',
    paddingHorizontal: 12,
  },

  weekRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 6,
  },

  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },

  selectedDayCell: {
    backgroundColor: '#2F76F6',
  },

  dayText: {
    fontSize: 14,
    color: '#111827',
  },

  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  calendarCancelButton: {
    height: 46,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },

  // Web Specific Styles
  webRoot: {
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
  },
  webScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCard: {
    maxWidth: 700,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 36,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  webBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  webBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  webCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  webSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 26,
  },
  webLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  webInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  webDateGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  webDateTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  webDateTileSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  webDateTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  webDateIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDateIconBoxSelected: {
    backgroundColor: '#DBEAFE',
  },
  webDateTileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  webDateTileTitleSelected: {
    color: '#1D4ED8',
  },
  webDateTileDate: {
    fontSize: 12,
    color: '#64748B',
  },
  webOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  webOptionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  webOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 16,
  },
  webOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webOptionIconBoxSelected: {
    backgroundColor: '#DBEAFE',
  },
  webOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  webOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  webActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  webCancelBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  webCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  webConfirmBtn: {
    height: 46,
    paddingHorizontal: 26,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#2F76F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  webConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  webModalRoot: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webCalendarSheet: {
    maxWidth: 400,
    width: '100%',
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
});