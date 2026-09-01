import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ActionButton,
  OperationsShell,
  ProgressBar,
  SkeletonRows,
  StatePanel,
  StatusBadge,
} from '../components/operations/operations-ui';
import { AiAssignmentModal } from '../components/operations/ai-assignment-modal';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { DashboardRoute, DriverProfile, enterpriseService } from '../services/api/enterprise';

type RangePreset = 'today' | 'past7';
type DateFieldName = 'from' | 'to';

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const shiftedDate = (date: Date, days: number) => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
};
const rangeForPreset = (preset: RangePreset) => {
  const now = new Date();
  if (preset === 'today') return { from: toDateInput(now), to: toDateInput(now) };
  return { from: toDateInput(shiftedDate(now, -6)), to: toDateInput(now) };
};
const validDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && toDateInput(parsed) === value;
};
const formatRangeDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
const formatRange = (from: string, to: string) => {
  if (!validDateInput(from) || !validDateInput(to)) return 'your custom date range';
  return from === to ? formatRangeDate(from) : `${formatRangeDate(from)} – ${formatRangeDate(to)}`;
};

const rangePresets: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'past7', label: 'Past 7 days' },
];
const formatTime = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const relativeTime = (value?: string | null) => {
  if (!value) return 'No location received';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [routes, setRoutes] = useState<DashboardRoute[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [initialRange] = useState(() => rangeForPreset('past7'));
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [rangePreset, setRangePreset] = useState<RangePreset | null>('past7');
  const [datePicker, setDatePicker] = useState<DateFieldName | null>(null);
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState<number | undefined>();
  const [filterMenu, setFilterMenu] = useState<'status' | 'driver' | null>(null);
  const [assigningRoute, setAssigningRoute] = useState<DashboardRoute | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [aiAssignmentOpen, setAiAssignmentOpen] = useState(false);

  const rangeError = useMemo(() => {
    if (!validDateInput(fromDate) || !validDateInput(toDate)) return 'Enter both dates in YYYY-MM-DD format.';
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T00:00:00`).getTime();
    const today = new Date(`${toDateInput(new Date())}T00:00:00`).getTime();
    if (to < from) return 'The end date must be on or after the start date.';
    if (from > today || to > today) return 'Future dates are not available.';
    return '';
  }, [fromDate, toDate]);

  const applyRangePreset = (preset: RangePreset) => {
    const range = rangeForPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
    setRangePreset(preset);
  };

  const load = useCallback(async (background = false) => {
    if (rangeError) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');
    const [dashboard, team] = await Promise.all([
      enterpriseService.getDashboard({ from: fromDate, to: toDate, status: status || undefined, driverId, search: search.trim() || undefined }),
      enterpriseService.getTeam({ status: 'active' }),
    ]);
    if (!dashboard.success || !dashboard.data) {
      setError(dashboard.error || 'Dispatch data could not be loaded.');
    } else {
      setRoutes(dashboard.data.routes || []);
      setSummary(dashboard.data.summary || {});
      setAlerts(dashboard.data.alerts || []);
    }
    if (team.success && team.data) setDrivers(team.data.drivers || []);
    setLoading(false);
    setRefreshing(false);
  }, [driverId, fromDate, rangeError, search, status, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    const timer = setInterval(() => load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const selectedDriver = drivers.find((driver) => driver.driverId === driverId);
  const operationalRoutes = useMemo(
    () => routes.filter((route) => ['in_progress', 'accepted', 'assigned'].includes(route.status)),
    [routes],
  );

  const assign = async (selected: DriverProfile) => {
    if (!assigningRoute || assigning) return;
    setAssigning(true);
    setActionError('');
    const response = await enterpriseService.assignRoute(
      assigningRoute.routeId,
      selected.driverId,
      assigningRoute.assignmentVersion,
    );
    if (!response.success) {
      setActionError(response.error || 'The route could not be assigned.');
      setAssigning(false);
      return;
    }
    setAssigningRoute(null);
    setAssigning(false);
    await load(true);
  };

  return (
    <OperationsShell
      active="dashboard"
      title="Delivery Operations"
      subtitle={`Plan, monitor, and resolve route activity across ${formatRange(fromDate, toDate)}.`}
      actions={(
        <>
          <ActionButton compact variant="secondary" icon="refresh-cw" label={refreshing ? 'Refreshing' : 'Refresh'} disabled={refreshing} onPress={() => load(true)} />
          <ActionButton compact variant="secondary" icon="zap" label="AI assign" onPress={() => setAiAssignmentOpen(true)} />
          <ActionButton compact icon="plus" label="Create route" onPress={() => router.push('/setup-locations')} />
        </>
      )}
    >
      <View style={[styles.rangeOverview, compact && styles.rangeOverviewCompact]}>
        <View style={styles.rangeSummary}>
          <View style={styles.rangeIcon}><Feather name="calendar" size={20} color={C.primaryDark} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rangeEyebrow}>Selected operating window</Text>
            <Text style={styles.rangeTitle}>{formatRange(fromDate, toDate)}</Text>
            <Text style={styles.rangeHint}>All route totals, alerts, and cards below use this date range. Choose any past date when you need a wider history.</Text>
          </View>
        </View>
        <View accessibilityRole="tablist" style={styles.rangePresets}>
          {rangePresets.map((preset) => (
            <Pressable
              key={preset.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: rangePreset === preset.value }}
              onPress={() => applyRangePreset(preset.value)}
              style={[styles.rangePreset, rangePreset === preset.value && styles.rangePresetActive]}
            >
              <Text style={[styles.rangePresetText, rangePreset === preset.value && styles.rangePresetTextActive]}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.filters}>
        <View style={[styles.searchWrap, compact && { minWidth: '100%' as any }]}>
          <Feather name="search" size={17} color={C.inkSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search routes"
            placeholder="Search route name or ID"
            placeholderTextColor={C.inkSubtle}
            style={styles.searchInput}
          />
          {search ? <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')}><Feather name="x-circle" size={17} color={C.inkSubtle} /></Pressable> : null}
        </View>
        <View style={[styles.rangeFields, compact && { width: '100%' }]}>
          <DateField label="From" value={fromDate} onPress={() => setDatePicker('from')} />
          <View style={styles.rangeArrow}><Feather name="arrow-right" size={15} color={C.inkSubtle} /></View>
          <DateField label="To" value={toDate} onPress={() => setDatePicker('to')} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter by route status" onPress={() => setFilterMenu('status')} style={styles.filterButton}>
          <Feather name="filter" size={16} color={C.inkMuted} />
          <Text style={styles.filterButtonText}>{statusOptions.find((item) => item.value === status)?.label}</Text>
          <Feather name="chevron-down" size={15} color={C.inkSubtle} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter by driver" onPress={() => setFilterMenu('driver')} style={styles.filterButton}>
          <Feather name="user" size={16} color={C.inkMuted} />
          <Text numberOfLines={1} style={styles.filterButtonText}>{selectedDriver?.name || 'All drivers'}</Text>
          <Feather name="chevron-down" size={15} color={C.inkSubtle} />
        </Pressable>
      </View>
      {rangeError ? <View accessibilityRole="alert" style={styles.rangeError}><Feather name="alert-circle" size={16} color={C.danger} /><Text style={styles.rangeErrorText}>{rangeError}</Text></View> : null}

      {loading ? <SkeletonRows count={5} /> : error ? (
        <StatePanel icon="wifi-off" title="Dispatch data is unavailable" message={`${error} Check your connection, then try again.`} actionLabel="Try again" onAction={() => load()} />
      ) : (
        <>
          {alerts.length > 0 ? (
            <View style={styles.alertStack}>
              {alerts.map((alert) => (
                <View key={alert.type} style={[styles.alert, alert.severity === 'critical' && styles.alertCritical]}>
                  <Feather name={alert.severity === 'critical' ? 'alert-triangle' : 'alert-circle'} size={18} color={alert.severity === 'critical' ? C.danger : C.warning} />
                  <Text style={styles.alertText}>{alert.message}</Text>
                  {alert.type === 'unassigned_routes' ? <ActionButton compact variant="quiet" label="Review" onPress={() => setStatus('draft')} /> : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.metrics}>
            <Metric icon="navigation" label="In progress" value={summary.activeRoutes || 0} tone="primary" />
            <Metric icon="user-x" label="Unassigned" value={summary.unassignedRoutes || 0} tone={summary.unassignedRoutes ? 'warning' : 'neutral'} />
            <Metric icon="clock" label="Delayed" value={summary.delayedRoutes || 0} tone={summary.delayedRoutes ? 'danger' : 'neutral'} />
            <Metric icon="check-circle" label="Completed in range" value={summary.completedRoutes || 0} tone="success" />
            <Metric icon="alert-circle" label="Failed stops" value={summary.failedStops || 0} tone={summary.failedStops ? 'danger' : 'neutral'} />
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Routes in this window</Text>
              <Text style={styles.sectionSubtitle}>{operationalRoutes.length} active or awaiting a start in the selected range</Text>
            </View>
            <Text style={styles.routeCount}>{routes.length} total</Text>
          </View>

          {routes.length === 0 ? (
            <StatePanel
              icon="map"
              title="No routes match these filters"
              message="Try another date range or clear a filter. New routes will appear here as soon as they are created."
              actionLabel="Clear filters"
              onAction={() => { setSearch(''); setStatus(''); setDriverId(undefined); applyRangePreset('past7'); }}
            />
          ) : (
            <View style={styles.routeList}>
              {routes.map((route) => (
                <RouteRow
                  key={route.routeId}
                  route={route}
                  compact={compact}
                  onOpen={() => router.push({ pathname: '/route-detail', params: { id: String(route.routeId) } } as any)}
                  onHistory={() => router.push({ pathname: '/route-history-detail', params: { id: String(route.routeId), routeId: String(route.routeId) } } as any)}
                  onMap={() => router.push({ pathname: '/route-preview', params: { id: String(route.routeId), routeId: String(route.routeId) } } as any)}
                  onAssign={() => { setActionError(''); setAssigningRoute(route); }}
                />
              ))}
            </View>
          )}
        </>
      )}

      <ChoiceModal
        visible={filterMenu !== null}
        title={filterMenu === 'status' ? 'Route status' : 'Driver'}
        onClose={() => setFilterMenu(null)}
      >
        {filterMenu === 'status' ? statusOptions.map((item) => (
          <ChoiceRow key={item.value || 'all'} label={item.label} selected={status === item.value} onPress={() => { setStatus(item.value); setFilterMenu(null); }} />
        )) : (
          <>
            <ChoiceRow label="All drivers" selected={!driverId} onPress={() => { setDriverId(undefined); setFilterMenu(null); }} />
            {drivers.map((driver) => <ChoiceRow key={driver.driverId} label={driver.name} detail={driver.currentAssignment?.name || 'Available'} selected={driverId === driver.driverId} onPress={() => { setDriverId(driver.driverId); setFilterMenu(null); }} />)}
          </>
        )}
      </ChoiceModal>

      <ChoiceModal visible={Boolean(assigningRoute)} title={assigningRoute?.driver ? 'Reassign route' : 'Assign route'} onClose={() => !assigning && setAssigningRoute(null)}>
        <Text style={styles.modalIntro}>{assigningRoute?.name}. Only active drivers who accepted their invitation are shown.</Text>
        {actionError ? <Text accessibilityRole="alert" style={styles.modalError}>{actionError}</Text> : null}
        {drivers.length === 0 ? <StatePanel icon="users" title="No active drivers" message="Invite a driver from Team before assigning this route." /> : drivers.map((driver) => (
          <ChoiceRow key={driver.driverId} label={driver.name} detail={driver.currentAssignment ? `Currently on ${driver.currentAssignment.name}` : 'Available'} selected={assigningRoute?.driver?.id === driver.driverId} disabled={assigning} onPress={() => assign(driver)} />
        ))}
      </ChoiceModal>

      <CalendarModal
        visible={datePicker !== null}
        label={datePicker === 'to' ? 'To' : 'From'}
        value={datePicker === 'to' ? toDate : fromDate}
        minDate={datePicker === 'to' ? fromDate : undefined}
        maxDate={datePicker === 'from' ? toDate : toDateInput(new Date())}
        onClose={() => setDatePicker(null)}
        onSelect={(value) => {
          if (datePicker === 'to') setToDate(value);
          else setFromDate(value);
          setRangePreset(null);
          setDatePicker(null);
        }}
      />

      <AiAssignmentModal
        visible={aiAssignmentOpen}
        routes={routes}
        onClose={() => setAiAssignmentOpen(false)}
        onConfirmed={() => load(true)}
      />
    </OperationsShell>
  );
}

function DateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${label.toLowerCase()} date. Current date ${formatRangeDate(value)}`}
      onPress={onPress}
      style={({ pressed, focused }: any) => [styles.dateField, focused && styles.dateFieldFocused, pressed && styles.dateFieldPressed]}
    >
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateValueRow}>
        <Feather name="calendar" size={14} color={C.primaryDark} />
        <Text style={styles.dateValue}>{formatRangeDate(value)}</Text>
        <Feather name="chevron-down" size={14} color={C.inkSubtle} />
      </View>
    </Pressable>
  );
}

function CalendarModal({ visible, label, value, minDate, maxDate, onClose, onSelect }: {
  visible: boolean;
  label: string;
  value: string;
  minDate?: string;
  maxDate: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const selectedDate = useMemo(() => new Date(`${value}T12:00:00`), [value]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    if (visible) setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate, visible]);

  const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const minimum = minDate ? new Date(`${minDate}T12:00:00`) : null;
  const maximum = new Date(`${maxDate}T12:00:00`);
  const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1)),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };
  const canGoBack = !minimum || monthKey(visibleMonth) > monthKey(minimum);
  const canGoForward = monthKey(visibleMonth) < monthKey(maximum);
  const monthTitle = visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.calendarCard}>
          <View style={styles.calendarTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.calendarEyebrow}>Select {label.toLowerCase()} date</Text>
              <Text style={styles.calendarRange}>{minDate ? `Available ${formatRange(minDate, maxDate)}` : `Choose any date up to ${formatRangeDate(maxDate)}`}</Text>
            </View>
            <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={styles.closeButton}><Feather name="x" size={20} color={C.inkMuted} /></Pressable>
          </View>
          <View style={styles.calendarHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => changeMonth(-1)} style={[styles.calendarNav, !canGoBack && styles.calendarNavDisabled]}>
              <Feather name="chevron-left" size={20} color={canGoBack ? C.primaryDark : C.inkSubtle} />
            </Pressable>
            <Text style={styles.calendarTitle}>{monthTitle}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: !canGoForward }} disabled={!canGoForward} onPress={() => changeMonth(1)} style={[styles.calendarNav, !canGoForward && styles.calendarNavDisabled]}>
              <Feather name="chevron-right" size={20} color={canGoForward ? C.primaryDark : C.inkSubtle} />
            </Pressable>
          </View>
          <View style={styles.calendarWeekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.calendarWeekday}>{day}</Text>)}
          </View>
          <View style={styles.calendarGrid}>
            {days.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.calendarDaySlot} />;
              const dateValue = toDateInput(date);
              const disabled = (minDate ? dateValue < minDate : false) || dateValue > maxDate;
              const selected = dateValue === value;
              const today = dateValue === toDateInput(new Date());
              return (
                <View key={dateValue} style={styles.calendarDaySlot}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    accessibilityState={{ disabled, selected }}
                    disabled={disabled}
                    onPress={() => onSelect(dateValue)}
                    style={({ pressed }) => [styles.calendarDay, today && styles.calendarDayToday, selected && styles.calendarDaySelected, pressed && !disabled && styles.calendarDayPressed]}
                  >
                    <Text style={[styles.calendarDayText, disabled && styles.calendarDayTextDisabled, today && styles.calendarDayTextToday, selected && styles.calendarDayTextSelected]}>{date.getDate()}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.calendarLegend}><View style={styles.calendarLegendDot} /><Text style={styles.calendarLegendText}>Any past date can be selected. Future dates are unavailable.</Text></View>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  const colors = {
    primary: [C.primarySoft, C.primaryDark],
    success: [C.successSoft, C.success],
    warning: [C.warningSoft, C.warning],
    danger: [C.dangerSoft, C.danger],
    neutral: ['#EDF1F6', C.inkMuted],
  }[tone];
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: colors[0] }]}><Feather name={icon} size={17} color={colors[1]} /></View>
      <View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
    </View>
  );
}

function RouteRow({ route, compact, onOpen, onHistory, onMap, onAssign }: {
  route: DashboardRoute;
  compact: boolean;
  onOpen: () => void;
  onHistory: () => void;
  onMap: () => void;
  onAssign: () => void;
}) {
  const progress = route.totalStops ? Math.round(((route.completedStops + route.failedStops) / route.totalStops) * 100) : 0;
  return (
    <View style={styles.routeCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${route.name}`} onPress={onOpen} style={({ pressed, focused }: any) => [styles.routeCardMain, focused && styles.focused, pressed && { opacity: 0.88 }]}>
        <View style={styles.routeTop}>
          <View style={styles.routeIdentity}>
            <View style={styles.routeIcon}><Feather name="truck" size={18} color={C.primaryDark} /></View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.routeName}>{route.name}</Text>
              <Text style={styles.routeId}>Route #{route.routeId} · {formatTime(route.plannedStart)}</Text>
            </View>
          </View>
          <View style={styles.routeBadges}><StatusBadge status={route.status} />{route.delayed ? <StatusBadge status="failed" compact /> : null}</View>
        </View>
        <View style={[styles.routeBody, compact && styles.routeBodyCompact]}>
          <View style={styles.routeProgress}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressPrimary}>{route.completedStops + route.failedStops} of {route.totalStops} stops resolved</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <ProgressBar completed={route.completedStops + route.failedStops} total={route.totalStops} tone={route.failedStops ? 'danger' : 'primary'} />
            <Text numberOfLines={compact ? 2 : 1} style={styles.currentStop}>{route.currentStop ? `Current: ${route.currentStop.name || route.currentStop.address}` : route.status === 'completed' ? 'Route finished' : 'No current stop'}</Text>
          </View>
          <View style={styles.routeFacts}>
            <Fact icon="user" label="Driver" value={route.driver?.name || 'Unassigned'} warning={!route.driver} />
            <Fact icon="package" label="Delivered / failed" value={`${route.deliveredStops} / ${route.failedStops}`} warning={route.failedStops > 0} />
            <Fact icon={route.locationState === 'current' ? 'radio' : 'wifi-off'} label="Last location" value={relativeTime(route.lastLocation?.receivedAt)} warning={route.locationState !== 'current' && route.status === 'in_progress'} />
            <Fact icon="flag" label="Est. finish" value={formatTime(route.estimatedCompletion)} warning={route.delayed} />
          </View>
        </View>
      </Pressable>
      <View style={styles.routeFooter}>
        {!route.driver || ['draft', 'assigned', 'accepted'].includes(route.status) ? <ActionButton compact variant="secondary" icon="user-plus" label={route.driver ? 'Reassign' : 'Assign driver'} onPress={onAssign} /> : null}
        <View style={styles.routeFooterActions}>
          <ActionButton compact variant="secondary" icon="archive" label="Route history" onPress={onHistory} />
          <ActionButton compact icon="map" label="Map workspace" onPress={onMap} />
          {/* <ActionButton compact variant="quiet" icon="arrow-right" label="View details" onPress={onOpen} /> */}
        </View>
      </View>
    </View>
  );
}

function Fact({ icon, label, value, warning }: { icon: any; label: string; value: string; warning?: boolean }) {
  return <View style={styles.fact}><Feather name={icon} size={15} color={warning ? C.warning : C.inkSubtle} /><View style={{ flex: 1 }}><Text style={styles.factLabel}>{label}</Text><Text numberOfLines={1} style={[styles.factValue, warning && { color: C.warning }]}>{value}</Text></View></View>;
}

function ChoiceModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.modalCard}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}><Feather name="x" size={20} color={C.inkMuted} /></Pressable></View>
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 6 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceRow({ label, detail, selected, disabled, onPress }: { label: string; detail?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected, disabled && { opacity: 0.5 }]}><View style={{ flex: 1 }}><Text style={[styles.choiceLabel, selected && { color: C.primaryDark }]}>{label}</Text>{detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}</View>{selected ? <Feather name="check" size={18} color={C.primaryDark} /> : null}</Pressable>;
}

const styles = StyleSheet.create({
  rangeOverview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.lg, padding: S.lg, marginBottom: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: '#CFE0FF', backgroundColor: '#F7FAFF' },
  rangeOverviewCompact: { alignItems: 'stretch', flexDirection: 'column' },
  rangeSummary: { minWidth: 280, flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md },
  rangeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  rangeEyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  rangeTitle: { color: C.ink, fontSize: 17, lineHeight: 24, fontWeight: '600', marginTop: 2 },
  rangeHint: { color: C.inkMuted, fontSize: 11, lineHeight: 17, marginTop: 2 },
  rangePresets: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs, padding: 4, borderRadius: R.md, backgroundColor: C.surface },
  rangePreset: { minHeight: 34, justifyContent: 'center', paddingHorizontal: S.md, borderRadius: R.sm },
  rangePresetActive: { backgroundColor: C.primary },
  rangePresetText: { color: C.inkMuted, fontSize: 12, fontWeight: '500' },
  rangePresetTextActive: { color: '#FFFFFF' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  searchWrap: { minHeight: 44, minWidth: 260, flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, paddingHorizontal: S.md },
  searchInput: { flex: 1, minWidth: 120, color: C.ink, fontSize: 14, outlineStyle: 'none' } as any,
  rangeFields: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.xs, paddingHorizontal: S.sm, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, backgroundColor: C.surface },
  rangeArrow: { width: 22, alignItems: 'center' },
  dateField: { minWidth: 150, gap: 3, paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: R.sm },
  dateFieldFocused: { backgroundColor: C.primarySoft },
  dateFieldPressed: { opacity: 0.76 },
  dateLabel: { color: C.inkSubtle, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateValue: { flex: 1, color: C.ink, fontSize: 12, fontWeight: '600' },
  rangeError: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: -S.sm, marginBottom: S.lg, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: C.dangerSoft },
  rangeErrorText: { flex: 1, color: C.danger, fontSize: 12 },
  filterButton: { minHeight: 44, maxWidth: 190, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, backgroundColor: C.surface },
  filterButtonText: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '500' },
  alertStack: { gap: S.sm, marginBottom: S.lg },
  alert: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 1, borderColor: '#F2D39A', backgroundColor: C.warningSoft, borderRadius: R.md, paddingHorizontal: S.lg },
  alertCritical: { borderColor: '#F3BBC4', backgroundColor: C.dangerSoft },
  alertText: { flex: 1, color: C.ink, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.xl },
  metric: { flexGrow: 1, minWidth: 150, minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface },
  metricIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: C.ink, fontSize: 21, fontWeight: '600' },
  metricLabel: { color: C.inkMuted, fontSize: 12, marginTop: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: S.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: C.ink },
  sectionSubtitle: { color: C.inkMuted, fontSize: 12, marginTop: 3 },
  routeCount: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  routeList: { gap: S.md },
  routeCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, overflow: 'hidden' },
  routeCardMain: { overflow: 'hidden' },
  focused: { borderColor: C.focus, borderWidth: 2 },
  routeTop: { minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line },
  routeIdentity: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: S.md },
  routeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  routeName: { color: C.ink, fontSize: 16, fontWeight: '600' },
  routeId: { color: C.inkMuted, fontSize: 12, marginTop: 3 },
  routeBadges: { flexDirection: 'row', gap: S.sm },
  routeBody: { flexDirection: 'row', gap: S.xl, padding: S.lg },
  routeBodyCompact: { flexDirection: 'column' },
  routeProgress: { flex: 1.1, minWidth: 230, gap: S.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: S.sm },
  progressPrimary: { color: C.ink, fontSize: 13, fontWeight: '600' },
  progressPercent: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  currentStop: { color: C.inkMuted, fontSize: 12, lineHeight: 18 },
  routeFacts: { flex: 2, minWidth: 280, flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md },
  fact: { width: '50%', minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingRight: S.sm },
  factLabel: { color: C.inkSubtle, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  factValue: { color: C.ink, fontSize: 12, fontWeight: '600', marginTop: 2 },
  routeFooter: { minHeight: 58, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surfaceMuted },
  routeFooterActions: { flex: 1, minWidth: 280, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: S.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23,32,51,0.52)', justifyContent: 'center', alignItems: 'center', padding: S.lg },
  modalCard: { width: '100%', maxWidth: 520, maxHeight: '85%', backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md },
  modalTitle: { color: C.ink, fontSize: 18, fontWeight: '600' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalIntro: { color: C.inkMuted, fontSize: 13, lineHeight: 19, marginBottom: S.md },
  modalError: { color: C.danger, fontSize: 13, lineHeight: 19, backgroundColor: C.dangerSoft, padding: S.md, borderRadius: R.md, marginBottom: S.sm },
  choice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: 'transparent' },
  choiceSelected: { backgroundColor: C.primarySoft, borderColor: '#C9DCFF' },
  choiceLabel: { color: C.ink, fontSize: 14, fontWeight: '600' },
  choiceDetail: { color: C.inkMuted, fontSize: 12, marginTop: 2 },
  calendarCard: { width: '100%', maxWidth: 420, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line },
  calendarTopRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.sm },
  calendarEyebrow: { color: C.primaryDark, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  calendarRange: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  calendarHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNav: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill, backgroundColor: C.primarySoft },
  calendarNavDisabled: { backgroundColor: C.surfaceMuted, opacity: 0.55 },
  calendarTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  calendarWeekRow: { flexDirection: 'row', marginTop: S.sm, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: S.xs },
  calendarWeekday: { width: `${100 / 7}%`, color: C.inkSubtle, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: S.xs },
  calendarDaySlot: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  calendarDay: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  calendarDayToday: { borderWidth: 1, borderColor: C.primary },
  calendarDaySelected: { backgroundColor: C.primary, borderColor: C.primary },
  calendarDayPressed: { backgroundColor: C.primarySoft },
  calendarDayText: { color: C.ink, fontSize: 13, fontWeight: '500' },
  calendarDayTextDisabled: { color: '#C6CEDA' },
  calendarDayTextToday: { color: C.primaryDark, fontWeight: '700' },
  calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.primarySoft },
  calendarLegendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  calendarLegendText: { flex: 1, color: C.inkMuted, fontSize: 11, lineHeight: 16 },
});
