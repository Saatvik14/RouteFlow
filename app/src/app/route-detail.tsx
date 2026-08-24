import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import RouteMap from '../components/maps/RouteMap';
import { ActionButton, OperationsShell, ProgressBar, SkeletonRows, StatePanel, StatusBadge } from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { getAuthToken } from '../services/api/client';
import { enterpriseService } from '../services/api/enterprise';

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not recorded';
const titleCase = (value: string) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Number(id);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const stacked = width < 940;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [timelineMode, setTimelineMode] = useState<'activity' | 'assignments'>('activity');

  const load = useCallback(async (quiet = false) => {
    if (!Number.isInteger(routeId)) { setError('This route link is invalid.'); setLoading(false); return; }
    if (!quiet) setLoading(true);
    const response = await enterpriseService.getRouteDetail(routeId);
    if (!response.success) setError(response.error || 'Route details could not be loaded.');
    else { setData(response.data); setError(''); }
    setLoading(false);
  }, [routeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (data?.route?.status !== 'in_progress') return;
    const timer = setInterval(() => load(true), 15_000);
    return () => clearInterval(timer);
  }, [data?.route?.status, load]);

  const mapRoute = useMemo(() => {
    if (!data?.routeInfo) return null;
    const start = data.routeInfo.startLocation;
    const end = data.routeInfo.endLocation;
    const fallback = data.stops?.find((stop: any) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));
    if ((!Number.isFinite(start?.latitude) || !Number.isFinite(start?.longitude)) && !fallback) return null;
    const startPoint = { latitude: Number.isFinite(start?.latitude) ? start.latitude : fallback.latitude, longitude: Number.isFinite(start?.longitude) ? start.longitude : fallback.longitude, title: 'Start', address: start?.address, markerType: 'start' as const };
    const endPoint = { latitude: Number.isFinite(end?.latitude) ? end.latitude : startPoint.latitude, longitude: Number.isFinite(end?.longitude) ? end.longitude : startPoint.longitude, title: 'End', address: end?.address, markerType: 'end' as const };
    const stops = (data.stops || []).filter((stop: any) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)).map((stop: any, index: number) => ({ id: String(stop.orderId), sequence: stop.sequence_no || index + 1, latitude: stop.latitude, longitude: stop.longitude, title: stop.customer_name || `Stop ${index + 1}`, address: stop.full_address, markerType: 'stop' as const, status: 'pending' as const }));
    return { start: startPoint, end: endPoint, stops, coordinates: [startPoint, ...stops, endPoint] };
  }, [data]);

  const route = data?.route;
  const resolved = route ? route.completedStops + route.failedStops : 0;
  const timeline = timelineMode === 'activity' ? data?.activity || [] : data?.assignments || [];

  return (
    <OperationsShell
      active="dashboard"
      title={route?.name || 'Route details'}
      subtitle={route ? `Route #${route.routeId} · ${route.driver?.name || 'Unassigned'}` : 'Loading route information'}
      actions={<><ActionButton compact variant="secondary" icon="arrow-left" label="Back" onPress={() => router.back()} /><ActionButton compact variant="secondary" icon="refresh-cw" label="Refresh" onPress={() => load(true)} /></>}
    >
      {loading ? <SkeletonRows count={5} /> : error ? <StatePanel icon={/permission|access/i.test(error) ? 'lock' : 'alert-circle'} title={/permission|access/i.test(error) ? 'Permission denied' : 'Route unavailable'} message={error} actionLabel="Try again" onAction={() => load()} /> : route ? (
        <>
          <View style={styles.statusStrip}>
            <StatusBadge status={route.status} />
            {route.delayed ? <View style={styles.statusAlert}><Feather name="clock" size={15} color={C.danger} /><Text style={styles.statusAlertText}>Past planned finish</Text></View> : null}
            <View style={styles.statusSpacer} />
            <Text style={styles.lastRefresh}>Live data refreshes every 15 seconds</Text>
          </View>

          <View style={[styles.overview, stacked && styles.overviewStacked]}>
            <View style={[styles.mapCard, stacked && { minHeight: 330 }]}>
              {mapRoute ? <RouteMap confirmedRoute={mapRoute as any} userLocation={route.lastLocation ? { latitude: route.lastLocation.latitude, longitude: route.lastLocation.longitude, heading: null } : null} /> : <StatePanel icon="map" title="Map unavailable" message="This route does not have enough valid coordinates to render a map." />}
              <View style={[styles.liveLocation, route.locationState !== 'current' && styles.liveLocationStale]}>
                <Feather name={route.locationState === 'current' ? 'radio' : 'wifi-off'} size={15} color={route.locationState === 'current' ? C.success : C.warning} />
                <Text style={styles.liveLocationText}>{route.locationState === 'current' ? `Driver location updated ${dateTime(route.lastLocation?.receivedAt)}` : route.locationState === 'stale' ? `Location is stale · last received ${dateTime(route.lastLocation?.receivedAt)}` : 'Waiting for the first driver location'}</Text>
              </View>
            </View>
            <View style={styles.progressPanel}>
              <View style={styles.progressHeader}><Text style={styles.panelTitle}>Route progress</Text><Text style={styles.progressLarge}>{route.totalStops ? Math.round((resolved / route.totalStops) * 100) : 0}%</Text></View>
              <ProgressBar completed={resolved} total={route.totalStops} tone={route.failedStops ? 'danger' : 'primary'} />
              <View style={styles.progressStats}><ProgressStat label="Delivered" value={route.deliveredStops} tone="success" /><ProgressStat label="Failed" value={route.failedStops} tone="danger" /><ProgressStat label="Remaining" value={route.remainingStops} /></View>
              <View style={styles.divider} />
              <InfoRow icon="map-pin" label="Current stop" value={route.currentStop?.name || route.currentStop?.address || 'No remaining stop'} />
              <InfoRow icon="clock" label="Planned start" value={dateTime(route.plannedStart)} />
              <InfoRow icon="play-circle" label="Actual start" value={dateTime(route.actualStart)} />
              <InfoRow icon="flag" label="Estimated finish" value={dateTime(route.estimatedCompletion)} warning={route.delayed} />
              <InfoRow icon="navigation" label="Planned distance" value={data.routeInfo.distance === null ? 'Not available' : `${Number(data.routeInfo.distance).toFixed(1)} route units`} />
            </View>
          </View>

          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Stops</Text><Text style={styles.sectionHint}>Ordered execution status and proof of delivery</Text></View><Text style={styles.sectionCount}>{data.stops.length} stops</Text></View>
          <View style={styles.stopList}>
            {data.stops.map((stop: any, index: number) => (
              <View key={stop.orderId} style={[styles.stopRow, stop.status === 'failed' && styles.stopFailed]}>
                <View style={styles.sequence}><Text style={styles.sequenceText}>{stop.sequence_no || index + 1}</Text></View>
                <View style={styles.stopIdentity}><View style={styles.stopTitleRow}><Text numberOfLines={1} style={styles.stopTitle}>{stop.customer_name || `Stop ${index + 1}`}</Text><StatusBadge compact status={stop.status} /></View><Text numberOfLines={2} style={styles.stopAddress}>{stop.full_address}</Text>{stop.failure_reason ? <Text style={styles.failureReason}>Reason: {titleCase(stop.failure_reason)}</Text> : null}</View>
                <View style={styles.stopMeta}><Text style={styles.metaLabel}>Completed</Text><Text style={styles.metaValue}>{dateTime(stop.server_completed_at || stop.arrived_at)}</Text>{stop.recipient_name ? <Text style={styles.recipient}>Recipient: {stop.recipient_name}</Text> : null}</View>
                <View style={styles.proofActions}>{stop.proofs?.length ? stop.proofs.map((proof: any) => <Pressable key={proof.proofId} accessibilityRole="button" accessibilityLabel={`Open ${titleCase(proof.type)} proof`} onPress={() => setSelectedProof(proof)} style={styles.proofButton}><Feather name={proof.type === 'signature' ? 'edit-3' : 'image'} size={15} color={C.primaryDark} /><Text style={styles.proofButtonText}>{proof.type === 'signature' ? 'Signature' : 'Photo'}</Text></Pressable>) : <Text style={styles.noProof}>{['delivered', 'failed'].includes(stop.status) ? 'No file proof' : '—'}</Text>}</View>
              </View>
            ))}
          </View>

          <View style={styles.timelinePanel}>
            <View style={styles.timelineHeader}><View><Text style={styles.sectionTitle}>Route timeline</Text><Text style={styles.sectionHint}>Assignment and operational activity</Text></View><View style={styles.tabs}>{(['activity', 'assignments'] as const).map((mode) => <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: timelineMode === mode }} onPress={() => setTimelineMode(mode)} style={[styles.tab, timelineMode === mode && styles.tabActive]}><Text style={[styles.tabText, timelineMode === mode && styles.tabTextActive]}>{titleCase(mode)}</Text></Pressable>)}</View></View>
            {timeline.length ? timeline.map((item: any, index: number) => <View key={item.event_id || item.assignment_id || index} style={styles.timelineRow}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineContent}><Text style={styles.timelineTitle}>{timelineMode === 'activity' ? titleCase(item.event_type) : `${item.driver_name || 'Driver'} · ${titleCase(item.status)}`}</Text><Text style={styles.timelineMeta}>{timelineMode === 'activity' ? `${item.actor_name || 'System'} · ${dateTime(item.created_at)}` : `Assigned by ${item.assigned_by_name || 'System'} · ${dateTime(item.assigned_at)}`}</Text>{item.from_state && item.to_state ? <Text style={styles.timelineChange}>{titleCase(item.from_state)} → {titleCase(item.to_state)}</Text> : null}</View></View>) : <Text style={styles.emptyTimeline}>No activity has been recorded yet.</Text>}
          </View>
        </>
      ) : null}

      <Modal visible={Boolean(selectedProof)} transparent animationType="fade" onRequestClose={() => setSelectedProof(null)}>
        <View style={styles.proofOverlay}><Pressable accessibilityLabel="Close proof viewer" onPress={() => setSelectedProof(null)} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={styles.proofViewer}><View style={styles.proofHeader}><View><Text style={styles.proofTitle}>{titleCase(selectedProof?.type || 'Proof')}</Text><Text style={styles.proofMeta}>{selectedProof?.fileName}</Text></View><Pressable accessibilityLabel="Close" onPress={() => setSelectedProof(null)} style={styles.close}><Feather name="x" size={21} color={C.inkMuted} /></Pressable></View>{selectedProof ? <Image resizeMode="contain" accessibilityLabel={`${titleCase(selectedProof.type)} proof image`} source={{ uri: enterpriseService.proofUrl(selectedProof.proofId), headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} }} style={styles.proofImage} /> : null}</View></View>
      </Modal>
    </OperationsShell>
  );
}

function ProgressStat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) { return <View style={styles.progressStat}><Text style={[styles.progressStatValue, tone === 'success' && { color: C.success }, tone === 'danger' && { color: C.danger }]}>{value}</Text><Text style={styles.progressStatLabel}>{label}</Text></View>; }
function InfoRow({ icon, label, value, warning }: { icon: any; label: string; value: string; warning?: boolean }) { return <View style={styles.infoRow}><Feather name={icon} size={16} color={warning ? C.danger : C.inkSubtle} /><View style={{ flex: 1 }}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, warning && { color: C.danger }]}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  statusStrip: { minHeight: 48, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.md, marginBottom: S.md },
  statusAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.dangerSoft, borderRadius: R.pill, paddingHorizontal: S.md, minHeight: 28 },
  statusAlertText: { color: C.danger, fontSize: 11, fontWeight: '600' },
  statusSpacer: { flex: 1 },
  lastRefresh: { color: C.inkSubtle, fontSize: 11 },
  overview: { flexDirection: 'row', gap: S.md, marginBottom: S.xxl },
  overviewStacked: { flexDirection: 'column' },
  mapCard: { flex: 2, minHeight: 430, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.surface },
  liveLocation: { position: 'absolute', left: S.md, right: S.md, bottom: S.md, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: 'rgba(232,247,240,0.96)', borderWidth: 1, borderColor: '#A7DDCA' },
  liveLocationStale: { backgroundColor: 'rgba(255,244,216,0.97)', borderColor: '#F0D296' },
  liveLocationText: { flex: 1, color: C.ink, fontSize: 11, fontWeight: '500' },
  progressPanel: { flex: 1, minWidth: 300, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md },
  panelTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  progressLarge: { color: C.primaryDark, fontSize: 20, fontWeight: '600' },
  progressStats: { flexDirection: 'row', marginVertical: S.lg },
  progressStat: { flex: 1 },
  progressStatValue: { color: C.ink, fontSize: 19, fontWeight: '600' },
  progressStatLabel: { color: C.inkMuted, fontSize: 10, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.line, marginBottom: S.md },
  infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: S.md },
  infoLabel: { color: C.inkSubtle, fontSize: 10, textTransform: 'uppercase' },
  infoValue: { color: C.ink, fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.md, marginBottom: S.md },
  sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '600' },
  sectionHint: { color: C.inkMuted, fontSize: 12, marginTop: 3 },
  sectionCount: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  stopList: { gap: S.sm, marginBottom: S.xxl },
  stopRow: { minHeight: 82, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface },
  stopFailed: { borderLeftWidth: 4, borderLeftColor: C.danger },
  sequence: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  sequenceText: { color: C.primaryDark, fontSize: 12, fontWeight: '600' },
  stopIdentity: { flex: 2.2, minWidth: 230 },
  stopTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.sm },
  stopTitle: { color: C.ink, fontSize: 14, fontWeight: '600', maxWidth: 250 },
  stopAddress: { color: C.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  failureReason: { color: C.danger, fontSize: 11, fontWeight: '500', marginTop: 4 },
  stopMeta: { flex: 1, minWidth: 150 },
  metaLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase' },
  metaValue: { color: C.ink, fontSize: 11, fontWeight: '600', marginTop: 3 },
  recipient: { color: C.inkMuted, fontSize: 10, marginTop: 3 },
  proofActions: { minWidth: 105, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  proofButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.sm, borderRadius: R.md, backgroundColor: C.primarySoft },
  proofButtonText: { color: C.primaryDark, fontSize: 11, fontWeight: '600' },
  noProof: { color: C.inkSubtle, fontSize: 11 },
  timelinePanel: { padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface },
  timelineHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: S.md, marginBottom: S.xl },
  tabs: { flexDirection: 'row', backgroundColor: C.surfaceMuted, padding: 3, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  tab: { minHeight: 34, justifyContent: 'center', paddingHorizontal: S.md, borderRadius: 9 },
  tabActive: { backgroundColor: C.surface },
  tabText: { color: C.inkMuted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: C.primaryDark },
  timelineRow: { flexDirection: 'row', gap: S.md, minHeight: 66 },
  timelineRail: { width: 18, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 3 },
  timelineContent: { flex: 1, paddingBottom: S.lg },
  timelineTitle: { color: C.ink, fontSize: 13, fontWeight: '600' },
  timelineMeta: { color: C.inkMuted, fontSize: 11, marginTop: 3 },
  timelineChange: { color: C.primaryDark, fontSize: 10, marginTop: 5 },
  emptyTimeline: { color: C.inkMuted, fontSize: 13, paddingVertical: S.xl, textAlign: 'center' },
  proofOverlay: { flex: 1, backgroundColor: 'rgba(23,32,51,0.7)', alignItems: 'center', justifyContent: 'center', padding: S.lg },
  proofViewer: { width: '100%', maxWidth: 760, height: '82%', backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg },
  proofHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.md },
  proofTitle: { color: C.ink, fontSize: 18, fontWeight: '600' },
  proofMeta: { color: C.inkMuted, fontSize: 11, marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  proofImage: { flex: 1, width: '100%', borderRadius: R.md, backgroundColor: C.surfaceMuted },
});

