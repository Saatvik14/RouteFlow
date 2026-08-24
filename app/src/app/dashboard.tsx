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

const today = () => new Date().toISOString().slice(0, 10);
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
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState<number | undefined>();
  const [filterMenu, setFilterMenu] = useState<'status' | 'driver' | null>(null);
  const [assigningRoute, setAssigningRoute] = useState<DashboardRoute | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [aiAssignmentOpen, setAiAssignmentOpen] = useState(false);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');
    const [dashboard, team] = await Promise.all([
      enterpriseService.getDashboard({ date, status: status || undefined, driverId, search: search.trim() || undefined }),
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
  }, [date, driverId, search, status]);

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
      title="Dispatch overview"
      subtitle={`Live delivery operations for ${new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}`}
      actions={(
        <>
          <ActionButton compact variant="secondary" icon="refresh-cw" label={refreshing ? 'Refreshing' : 'Refresh'} disabled={refreshing} onPress={() => load(true)} />
          <ActionButton compact variant="secondary" icon="zap" label="AI assign" onPress={() => setAiAssignmentOpen(true)} />
          <ActionButton compact icon="plus" label="Create route" onPress={() => router.push('/setup-locations')} />
        </>
      )}
    >
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
        <View style={styles.dateField}>
          <Feather name="calendar" size={16} color={C.inkMuted} />
          <TextInput value={date} onChangeText={setDate} accessibilityLabel="Dispatch date, YYYY-MM-DD" style={styles.dateInput} />
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
            <Metric icon="navigation" label="Active routes" value={summary.activeRoutes || 0} tone="primary" />
            <Metric icon="user-x" label="Need assignment" value={summary.unassignedRoutes || 0} tone={summary.unassignedRoutes ? 'warning' : 'neutral'} />
            <Metric icon="clock" label="Delayed" value={summary.delayedRoutes || 0} tone={summary.delayedRoutes ? 'danger' : 'neutral'} />
            <Metric icon="check-circle" label="Completed" value={summary.completedToday || 0} tone="success" />
            <Metric icon="alert-circle" label="Failed stops" value={summary.failedStops || 0} tone={summary.failedStops ? 'danger' : 'neutral'} />
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Routes</Text>
              <Text style={styles.sectionSubtitle}>{operationalRoutes.length} currently need dispatcher attention</Text>
            </View>
            <Text style={styles.routeCount}>{routes.length} total</Text>
          </View>

          {routes.length === 0 ? (
            <StatePanel
              icon="map"
              title="No routes match these filters"
              message="Try another date or clear a filter. New routes will appear here as soon as they are created."
              actionLabel="Clear filters"
              onAction={() => { setSearch(''); setStatus(''); setDriverId(undefined); setDate(today()); }}
            />
          ) : (
            <View style={styles.routeList}>
              {routes.map((route) => (
                <RouteRow
                  key={route.routeId}
                  route={route}
                  compact={compact}
                  onOpen={() => router.push({ pathname: '/route-detail', params: { id: String(route.routeId) } } as any)}
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

      <AiAssignmentModal
        visible={aiAssignmentOpen}
        routes={routes}
        onClose={() => setAiAssignmentOpen(false)}
        onConfirmed={() => load(true)}
      />
    </OperationsShell>
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

function RouteRow({ route, compact, onOpen, onAssign }: { route: DashboardRoute; compact: boolean; onOpen: () => void; onAssign: () => void }) {
  const progress = route.totalStops ? Math.round(((route.completedStops + route.failedStops) / route.totalStops) * 100) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${route.name}`} onPress={onOpen} style={({ pressed, focused }: any) => [styles.routeCard, focused && styles.focused, pressed && { opacity: 0.88 }]}>
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
      <View style={styles.routeFooter}>
        {!route.driver || ['draft', 'assigned', 'accepted'].includes(route.status) ? <ActionButton compact variant="secondary" icon="user-plus" label={route.driver ? 'Reassign' : 'Assign driver'} onPress={onAssign} /> : <View />}
        <View style={styles.openDetail}><Text style={styles.openDetailText}>View route</Text><Feather name="arrow-right" size={16} color={C.primaryDark} /></View>
      </View>
    </Pressable>
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  searchWrap: { minHeight: 44, minWidth: 260, flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, paddingHorizontal: S.md },
  searchInput: { flex: 1, minWidth: 120, color: C.ink, fontSize: 14, outlineStyle: 'none' } as any,
  dateField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, paddingHorizontal: S.md },
  dateInput: { width: 96, fontSize: 13, color: C.ink },
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
  routeFooter: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, paddingHorizontal: S.lg, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surfaceMuted },
  openDetail: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm },
  openDetailText: { color: C.primaryDark, fontSize: 13, fontWeight: '600' },
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
});
