import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActionButton, OperationsShell, SkeletonRows, StatePanel, StatusBadge } from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { DriverProfile, enterpriseService } from '../services/api/enterprise';

const initialDate = () => new Date().toISOString().slice(0, 10);
const number = (value: unknown) => new Intl.NumberFormat().format(Number(value || 0));
const duration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) return 'Not available';
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [from, setFrom] = useState(initialDate());
  const [to, setTo] = useState(initialDate());
  const [driverId, setDriverId] = useState<number | undefined>();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverMenu, setDriverMenu] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [reportResponse, teamResponse] = await Promise.all([
      enterpriseService.getReport({ from, to, driverId }),
      enterpriseService.getTeam(),
    ]);
    if (!reportResponse.success) setError(reportResponse.error || 'The report could not be generated.');
    else setReport(reportResponse.data);
    if (teamResponse.success) setDrivers(teamResponse.data?.drivers || []);
    setLoading(false);
  }, [driverId, from, to]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  const exportCsv = async () => {
    setExporting(true); setNotice('');
    try {
      await enterpriseService.downloadReport({ from, to, driverId });
      setNotice('CSV export is ready.');
    } catch (exportError) {
      setNotice(exportError instanceof Error ? exportError.message : 'CSV export failed.');
    } finally { setExporting(false); }
  };

  const summary = report?.summary || {};
  const statusDistribution = useMemo(() => {
    const statuses = new Map<string, number>();
    for (const route of report?.routes || []) statuses.set(route.status, (statuses.get(route.status) || 0) + 1);
    return [...statuses.entries()].sort((a, b) => b[1] - a[1]);
  }, [report]);
  const maxStatus = Math.max(1, ...statusDistribution.map(([, count]) => count));
  const selectedDriver = drivers.find((driver) => driver.driverId === driverId);

  return (
    <OperationsShell
      active="reports"
      title="Delivery reports"
      subtitle="Actual outcomes are separated from planned route values."
      actions={<ActionButton compact icon="download" label="Export CSV" loading={exporting} disabled={!report?.routes?.length} onPress={exportCsv} />}
    >
      {notice ? <View accessibilityRole="alert" style={[styles.notice, /failed/i.test(notice) && styles.noticeError]}><Feather name={/failed/i.test(notice) ? 'alert-circle' : 'check-circle'} size={17} color={/failed/i.test(notice) ? C.danger : C.success} /><Text style={styles.noticeText}>{notice}</Text><Pressable accessibilityLabel="Dismiss" onPress={() => setNotice('')}><Feather name="x" size={18} color={C.inkMuted} /></Pressable></View> : null}
      <View style={styles.filters}>
        <DateField label="From" value={from} onChange={setFrom} />
        <DateField label="To" value={to} onChange={setTo} />
        <View style={styles.driverFilterWrap}>
          <Text style={styles.filterLabel}>Driver</Text>
          <Pressable accessibilityRole="button" onPress={() => setDriverMenu((value) => !value)} style={styles.driverFilter}><Feather name="user" size={16} color={C.inkMuted} /><Text numberOfLines={1} style={styles.driverFilterText}>{selectedDriver?.name || 'All drivers'}</Text><Feather name="chevron-down" size={15} color={C.inkSubtle} /></Pressable>
          {driverMenu ? <View style={styles.dropdown}><ScrollView style={{ maxHeight: 260 }}><DriverOption label="All drivers" selected={!driverId} onPress={() => { setDriverId(undefined); setDriverMenu(false); }} />{drivers.map((driver) => <DriverOption key={driver.driverId} label={driver.name} selected={driverId === driver.driverId} onPress={() => { setDriverId(driver.driverId); setDriverMenu(false); }} />)}</ScrollView></View> : null}
        </View>
      </View>

      {loading ? <SkeletonRows count={5} /> : error ? <StatePanel icon="bar-chart-2" title="Report unavailable" message={error} actionLabel="Try again" onAction={load} /> : !report?.routes?.length ? (
        <StatePanel icon="calendar" title="No delivery activity" message="There are no routes in this date range. Change the filters to review another period." />
      ) : (
        <>
          <View style={styles.metrics}>
            <ReportMetric label="Routes assigned" value={number(summary.routesAssigned)} icon="send" />
            <ReportMetric label="Routes completed" value={number(summary.routesCompleted)} icon="check-circle" tone="success" />
            <ReportMetric label="Total stops" value={number(summary.totalStops)} icon="map-pin" />
            <ReportMetric label="Successful deliveries" value={number(summary.successfulDeliveries)} icon="package" tone="success" />
            <ReportMetric label="Failed deliveries" value={number(summary.failedDeliveries)} icon="alert-circle" tone={summary.failedDeliveries ? 'danger' : 'neutral'} />
            <ReportMetric label="Success rate" value={summary.successRate === null ? 'Not available' : `${summary.successRate}%`} icon="trending-up" tone="success" />
          </View>

          <View style={[styles.analysisGrid, mobile && styles.analysisGridMobile]}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Status distribution</Text>
              <Text style={styles.panelHint}>Routes in the selected period</Text>
              <View style={styles.distribution}>
                {statusDistribution.map(([status, count]) => <View key={status} style={styles.distributionRow}><View style={styles.distributionLabel}><StatusBadge compact status={status} /><Text style={styles.distributionCount}>{count}</Text></View><View style={styles.barTrack}><View style={[styles.barFill, { width: `${(count / maxStatus) * 100}%` }]} /></View></View>)}
              </View>
            </View>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Time performance</Text>
              <Text style={styles.panelHint}>Totals for routes with recorded durations</Text>
              <View style={styles.timeCompare}><View><Text style={styles.compareLabel}>Planned</Text><Text style={styles.compareValue}>{duration(summary.plannedDurationSeconds)}</Text></View><Feather name="arrow-right" size={20} color={C.inkSubtle} /><View><Text style={styles.compareLabel}>Actual</Text><Text style={styles.compareValue}>{duration(summary.actualDurationSeconds)}</Text></View></View>
              <View style={styles.dataNote}><Feather name="info" size={15} color={C.info} /><Text style={styles.dataNoteText}>Actual distance is not shown until reliable route telemetry is available. Planned distance is labeled in the route table.</Text></View>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Driver performance</Text>
            <Text style={styles.panelHint}>Delivery outcomes grouped by assigned driver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.table}>
              <TableHeader columns={['Driver', 'Routes', 'Completed', 'Stops', 'Delivered', 'Failed / skipped', 'Success rate']} />
              {(report.byDriver || []).map((driver: any) => <View key={driver.driverId ?? 'unassigned'} style={styles.tableRow}><Cell value={driver.driverName} strong /><Cell value={number(driver.routes)} /><Cell value={number(driver.completedRoutes)} /><Cell value={number(driver.totalStops)} /><Cell value={number(driver.deliveredStops)} success /><Cell value={`${driver.failedStops} / ${driver.skippedStops}`} danger={driver.failedStops > 0} /><Cell value={driver.successRate === null ? '—' : `${driver.successRate}%`} strong /></View>)}
            </ScrollView>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Route results</Text>
            <Text style={styles.panelHint}>Planned and recorded results are shown separately</Text>
            {mobile ? <View style={styles.routeCards}>{report.routes.map((route: any) => <View key={route.routeId} style={styles.routeCard}><View style={styles.routeCardHeader}><View style={{ flex: 1 }}><Text style={styles.routeName}>{route.routeName}</Text><Text style={styles.routeMeta}>{route.driverName} · #{route.routeId}</Text></View><StatusBadge compact status={route.status} /></View><View style={styles.routeStats}><SmallStat label="Stops" value={route.totalStops} /><SmallStat label="Delivered" value={route.deliveredStops} success /><SmallStat label="Failed" value={route.failedStops} danger /><SmallStat label="Actual time" value={duration(route.actualDurationSeconds)} /></View></View>)}</View> : <ScrollView horizontal contentContainerStyle={styles.table}><TableHeader columns={['Route', 'Driver', 'Status', 'Stops', 'Delivered', 'Failed', 'Planned time', 'Actual time']} />{report.routes.map((route: any) => <View key={route.routeId} style={styles.tableRow}><Cell value={`${route.routeName} · #${route.routeId}`} strong /><Cell value={route.driverName} /><View style={styles.cell}><StatusBadge compact status={route.status} /></View><Cell value={number(route.totalStops)} /><Cell value={number(route.deliveredStops)} success /><Cell value={number(route.failedStops)} danger={route.failedStops > 0} /><Cell value={duration(route.plannedDurationSeconds)} /><Cell value={duration(route.actualDurationSeconds)} /></View>)}</ScrollView>}
          </View>
        </>
      )}
    </OperationsShell>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View><Text style={styles.filterLabel}>{label}</Text><View style={styles.dateField}><Feather name="calendar" size={16} color={C.inkMuted} /><TextInput accessibilityLabel={`${label} date, YYYY-MM-DD`} value={value} onChangeText={onChange} style={styles.dateInput} /></View></View>; }
function DriverOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.driverOption, selected && styles.driverOptionSelected]}><Text style={[styles.driverOptionText, selected && { color: C.primaryDark }]}>{label}</Text>{selected ? <Feather name="check" size={17} color={C.primaryDark} /> : null}</Pressable>; }
function ReportMetric({ label, value, icon, tone = 'neutral' }: { label: string; value: string; icon: any; tone?: 'neutral' | 'success' | 'danger' }) { const color = tone === 'success' ? C.success : tone === 'danger' ? C.danger : C.primaryDark; const bg = tone === 'success' ? C.successSoft : tone === 'danger' ? C.dangerSoft : C.primarySoft; return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: bg }]}><Feather name={icon} size={17} color={color} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function TableHeader({ columns }: { columns: string[] }) { return <View style={[styles.tableRow, styles.tableHeader]}>{columns.map((column) => <View key={column} style={styles.cell}><Text style={styles.tableHeaderText}>{column}</Text></View>)}</View>; }
function Cell({ value, strong, success, danger }: { value: string; strong?: boolean; success?: boolean; danger?: boolean }) { return <View style={styles.cell}><Text numberOfLines={2} style={[styles.cellText, strong && { fontWeight: '600', color: C.ink }, success && { color: C.success }, danger && { color: C.danger }]}>{value}</Text></View>; }
function SmallStat({ label, value, success, danger }: { label: string; value: any; success?: boolean; danger?: boolean }) { return <View style={styles.smallStat}><Text style={styles.smallLabel}>{label}</Text><Text style={[styles.smallValue, success && { color: C.success }, danger && Number(value) > 0 && { color: C.danger }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  notice: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.successSoft, borderWidth: 1, borderColor: '#ACDCCB', borderRadius: R.md, paddingHorizontal: S.lg, marginBottom: S.lg },
  noticeError: { backgroundColor: C.dangerSoft, borderColor: '#F0B5C0' },
  noticeText: { flex: 1, color: C.ink, fontSize: 13 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, alignItems: 'flex-end', marginBottom: S.xl, zIndex: 10 },
  filterLabel: { color: C.ink, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dateField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, paddingHorizontal: S.md },
  dateInput: { width: 102, color: C.ink, fontSize: 13 },
  driverFilterWrap: { position: 'relative', minWidth: 220 },
  driverFilter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, backgroundColor: C.surface },
  driverFilterText: { flex: 1, color: C.ink, fontSize: 13, fontWeight: '500' },
  dropdown: { position: 'absolute', top: 68, left: 0, right: 0, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 5, zIndex: 50, shadowColor: '#172033', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  driverOption: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.md, borderRadius: 9 },
  driverOptionSelected: { backgroundColor: C.primarySoft },
  driverOptionText: { color: C.ink, fontSize: 13, fontWeight: '500' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.xl },
  metric: { minWidth: 155, flex: 1, minHeight: 116, padding: S.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg },
  metricIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: S.md },
  metricValue: { color: C.ink, fontSize: 22, fontWeight: '600' },
  metricLabel: { color: C.inkMuted, fontSize: 12, marginTop: 3 },
  analysisGrid: { flexDirection: 'row', gap: S.md, marginBottom: S.md },
  analysisGridMobile: { flexDirection: 'column' },
  panel: { flex: 1, minWidth: 0, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  panelTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  panelHint: { color: C.inkMuted, fontSize: 12, marginTop: 3, marginBottom: S.lg },
  distribution: { gap: S.md },
  distributionRow: { gap: 7 },
  distributionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distributionCount: { color: C.ink, fontSize: 12, fontWeight: '600' },
  barTrack: { height: 7, backgroundColor: '#E8EDF4', borderRadius: R.pill, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.primary, borderRadius: R.pill },
  timeCompare: { minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: C.surfaceMuted, borderRadius: R.md, padding: S.md },
  compareLabel: { color: C.inkSubtle, fontSize: 11, textTransform: 'uppercase' },
  compareValue: { color: C.ink, fontSize: 19, fontWeight: '600', marginTop: 5 },
  dataNote: { flexDirection: 'row', gap: S.sm, marginTop: S.md, padding: S.md, backgroundColor: C.infoSoft, borderRadius: R.md },
  dataNoteText: { flex: 1, color: C.info, fontSize: 11, lineHeight: 16 },
  table: { minWidth: 920 },
  tableRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line },
  tableHeader: { minHeight: 42, backgroundColor: C.surfaceMuted, borderTopLeftRadius: R.md, borderTopRightRadius: R.md },
  cell: { width: 130, paddingHorizontal: S.md },
  tableHeaderText: { color: C.inkMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.45 },
  cellText: { color: C.inkMuted, fontSize: 12, lineHeight: 17 },
  routeCards: { gap: S.sm },
  routeCard: { padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md },
  routeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  routeName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  routeMeta: { color: C.inkMuted, fontSize: 11, marginTop: 3 },
  routeStats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.line },
  smallStat: { minWidth: 68 },
  smallLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase' },
  smallValue: { color: C.ink, fontSize: 12, fontWeight: '600', marginTop: 3 },
});

