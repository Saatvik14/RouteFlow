import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RouteMap from '../components/maps/RouteMap';
import { StatusBadge } from '../components/operations/operations-ui';
import { DraggableRouteSheet } from '../components/route-preview-panel-refactor/route-preview-panel/components/draggable-route-sheet';
import { Sidebar } from '../components/sidebar';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { DriverAssignment, enterpriseService } from '../services/api/enterprise';

const sameDay = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
const dateLabel = (value: string) => new Date(value).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const duration = (seconds: number | null) => seconds === null ? 'Estimate unavailable' : `${Math.max(1, Math.round(seconds / 60))} min estimated`;

export default function DriverAssignmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [routes, setRoutes] = useState<DriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    const response = await enterpriseService.getMyAssignments();
    if (!response.success || !response.data) setError(response.error || 'Your assignments could not be loaded.');
    else setRoutes(response.data.routes || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => {
    const now = new Date();
    return {
      active: routes.filter((route) => route.status === 'in_progress'),
      today: routes.filter((route) => route.status !== 'in_progress' && !['completed', 'failed', 'cancelled'].includes(route.status) && sameDay(new Date(route.plannedStart), now)),
      upcoming: routes.filter((route) => !['in_progress', 'completed', 'failed', 'cancelled'].includes(route.status) && !sameDay(new Date(route.plannedStart), now)),
      recent: routes.filter((route) => ['completed', 'failed', 'cancelled'].includes(route.status)).slice(0, 5),
    };
  }, [routes]);

  const openRoute = (route: DriverAssignment) => router.push({ pathname: '/driver-route', params: { id: String(route.routeId) } } as any);

  return (
    <View style={styles.root}>
      <RouteMap />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation"
        onPress={() => setIsSidebarOpen(true)}
        style={[styles.menuButton, { top: insets.top + 16 }]}
      >
        <View style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </View>
      </Pressable>

      <DraggableRouteSheet isWide={isWide} initialSnap="middle" collapsedHeight={112}>
        <View style={styles.sheetInner}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderCopy}>
              <Text style={styles.title}>My routes</Text>
              <Text style={styles.subtitle}>Assigned routes from your dispatcher</Text>
            </View>
            {!loading ? <View style={styles.countPill}><Text style={styles.countText}>{routes.length}</Text></View> : null}
          </View>

          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
          >
            {loading ? (
              <DriverPanelState icon="loader" title="Loading assignments" message="Checking for routes from dispatch…" loading />
            ) : error ? (
              <DriverPanelState icon="wifi-off" title="Assignments unavailable" message={error} actionLabel="Try again" onAction={() => load()} />
            ) : routes.length === 0 ? (
              <DriverPanelState icon="truck" title="No routes assigned" message="New assignments will appear here after your dispatcher assigns a route." actionLabel="Refresh" onAction={() => load()} />
            ) : (
              <>
                {groups.active.length ? <RouteSection title="Active now" detail="Continue from your current stop" routes={groups.active} accent onOpen={openRoute} /> : null}
                {groups.today.length ? <RouteSection title="Today" detail={`${groups.today.length} assignment${groups.today.length === 1 ? '' : 's'}`} routes={groups.today} onOpen={openRoute} /> : null}
                {groups.upcoming.length ? <RouteSection title="Upcoming" detail="Future scheduled routes" routes={groups.upcoming} onOpen={openRoute} /> : null}
                {groups.recent.length ? <RouteSection title="Recently finished" detail="Your latest route outcomes" routes={groups.recent} muted onOpen={openRoute} /> : null}
              </>
            )}
          </ScrollView>
        </View>
      </DraggableRouteSheet>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </View>
  );
}

function DriverPanelState({ icon, title, message, actionLabel, onAction, loading }: { icon: any; title: string; message: string; actionLabel?: string; onAction?: () => void; loading?: boolean }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}><Feather name={icon} size={22} color={C.primary} /></View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.stateAction}><Feather name="refresh-cw" size={15} color={C.primaryDark} /><Text style={styles.stateActionText}>{actionLabel}</Text></Pressable> : null}
      {loading ? <View style={styles.loadingTrack}><View style={styles.loadingFill} /></View> : null}
    </View>
  );
}

function RouteSection({ title, detail, routes, accent, muted, onOpen }: { title: string; detail: string; routes: DriverAssignment[]; accent?: boolean; muted?: boolean; onOpen: (route: DriverAssignment) => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDetail}>{detail}</Text></View>
        {accent ? <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View> : null}
      </View>
      <View style={styles.list}>
        {routes.map((route) => (
          <Pressable
            key={route.routeId}
            accessibilityRole="button"
            accessibilityLabel={`Open ${route.name}`}
            onPress={() => onOpen(route)}
            style={({ pressed }) => [styles.routeCard, accent && styles.routeCardActive, muted && styles.routeCardMuted, pressed && styles.pressed]}
          >
            <View style={styles.routeHeader}>
              <View style={styles.routeIcon}><Feather name={route.status === 'in_progress' ? 'navigation' : 'truck'} size={19} color={C.primaryDark} /></View>
              <View style={styles.routeHeadingCopy}><Text numberOfLines={1} style={styles.routeName}>{route.name}</Text><Text style={styles.routeDate}>{dateLabel(route.plannedStart)}</Text></View>
              <StatusBadge compact status={route.status} />
            </View>
            <View style={styles.locationPair}>
              <LocationLine icon="play-circle" label="Start" value={route.startAddress} />
              <View style={styles.locationConnector} />
              <LocationLine icon="flag" label="Finish" value={route.endAddress} />
            </View>
            <View style={styles.routeInfo}>
              <View style={styles.infoItem}><Feather name="map-pin" size={14} color={C.inkSubtle} /><Text style={styles.infoText}>{route.totalStops} stops</Text></View>
              <View style={styles.infoItem}><Feather name="clock" size={14} color={C.inkSubtle} /><Text style={styles.infoText}>{duration(route.estimatedDurationSeconds)}</Text></View>
            </View>
            <View style={styles.openRow}><Text style={styles.openText}>{route.status === 'in_progress' ? 'Continue route' : ['completed', 'failed', 'cancelled'].includes(route.status) ? 'View summary' : 'Review assignment'}</Text><Feather name="chevron-right" size={18} color={C.primaryDark} /></View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LocationLine({ icon, label, value }: { icon: any; label: string; value: string }) {
  return <View style={styles.locationLine}><Feather name={icon} size={14} color={C.primaryDark} /><View style={styles.locationCopy}><Text style={styles.locationLabel}>{label}</Text><Text numberOfLines={2} style={styles.locationValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  menuButton: { position: 'absolute', left: 24, zIndex: 80, elevation: 12, width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14 },
  hamburger: { width: 24, gap: 5 },
  hamburgerBar: { width: 24, height: 3, borderRadius: 999, backgroundColor: '#111827' },
  sheetInner: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF' },
  panelHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  panelHeaderCopy: { flex: 1, minWidth: 0 },
  title: { color: C.ink, fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { color: C.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  countPill: { minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  countText: { color: C.primaryDark, fontSize: 12, fontWeight: '600' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18 },
  state: { minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stateIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  stateTitle: { color: C.ink, fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 14 },
  stateMessage: { maxWidth: 380, color: C.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  stateAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md },
  stateActionText: { color: C.primaryDark, fontSize: 13, fontWeight: '500' },
  loadingTrack: { width: 120, height: 4, borderRadius: 2, backgroundColor: C.primarySoft, marginTop: 18, overflow: 'hidden' },
  loadingFill: { width: '65%', height: '100%', borderRadius: 2, backgroundColor: C.primary },
  section: { marginBottom: S.xl },
  sectionHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: '600' },
  sectionDetail: { color: C.inkMuted, fontSize: 11, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.successSoft, paddingHorizontal: S.sm, minHeight: 26, borderRadius: R.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  liveText: { color: C.success, fontSize: 11, fontWeight: '500' },
  list: { gap: S.sm },
  routeCard: { padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.surface },
  routeCardActive: { borderColor: '#A9C8FF', borderLeftWidth: 3 },
  routeCardMuted: { opacity: 0.76 },
  pressed: { opacity: 0.84 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  routeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  routeHeadingCopy: { flex: 1, minWidth: 0 },
  routeName: { color: C.ink, fontSize: 15, fontWeight: '600' },
  routeDate: { color: C.inkMuted, fontSize: 11, marginTop: 3 },
  locationPair: { marginTop: S.md, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.surfaceMuted },
  locationLine: { minHeight: 34, flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  locationCopy: { flex: 1, minWidth: 0 },
  locationConnector: { width: 1, height: 10, backgroundColor: C.lineStrong, marginLeft: 7, marginVertical: -1 },
  locationLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  locationValue: { color: C.ink, fontSize: 12, lineHeight: 17, fontWeight: '400', marginTop: 1 },
  routeInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: S.lg, marginTop: S.sm },
  infoItem: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { color: C.inkMuted, fontSize: 11, fontWeight: '400' },
  openRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.line },
  openText: { color: C.primaryDark, fontSize: 12, fontWeight: '500' },
});
