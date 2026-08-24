import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  LayoutChangeEvent,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RouteMap from '../components/maps/RouteMap';
import { ActionButton, FormField, ProgressBar, SkeletonRows, StatePanel, StatusBadge } from '../components/operations/operations-ui';
import { DraggableRouteSheet } from '../components/route-preview-panel-refactor/route-preview-panel/components/draggable-route-sheet';
import { Sidebar } from '../components/sidebar';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { enterpriseService } from '../services/api/enterprise';
import { ExpoFileSystem } from '../utils/expoFileSystem';

const FAILURE_REASONS = [
  ['customer_unavailable', 'Customer unavailable'],
  ['incorrect_address', 'Incorrect address'],
  ['access_problem', 'Access problem'],
  ['customer_refused', 'Customer refused'],
  ['damaged_item', 'Damaged item'],
  ['reschedule_required', 'Reschedule required'],
  ['other', 'Other'],
] as const;
const terminalStops = new Set(['delivered', 'failed', 'skipped', 'reschedule_required']);
const time = (value?: string | null) => value ? new Date(value).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not recorded';
const orderDetails = (stop: any) => {
  if (stop?.order_details && typeof stop.order_details === 'object') return stop.order_details;
  if (typeof stop?.order_details === 'string') {
    try { return JSON.parse(stop.order_details); } catch { return {}; }
  }
  return {};
};

export default function DriverRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmAction, setConfirmAction] = useState<'reject' | 'start' | 'finish' | null>(null);
  const [completionMode, setCompletionMode] = useState<'delivered' | 'failed' | null>(null);
  const [problemOpen, setProblemOpen] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'sharing' | 'denied' | 'paused' | 'offline'>('idle');
  const [lastLocationSent, setLastLocationSent] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [centerSignal, setCenterSignal] = useState(0);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!Number.isInteger(routeId)) { setError('This route link is invalid.'); setLoading(false); return; }
    if (!quiet) setLoading(true);
    const response = await enterpriseService.getRouteDetail(routeId);
    if (!response.success) setError(response.error || 'Route details could not be loaded.');
    else { setData(response.data); setError(''); }
    setLoading(false);
  }, [routeId]);
  useEffect(() => { load(); }, [load]);

  const stopTracking = useCallback(() => {
    locationWatcher.current?.remove();
    locationWatcher.current = null;
  }, []);
  const startTracking = useCallback(async () => {
    if (locationWatcher.current || data?.route?.status !== 'in_progress') return;
    setLocationState('requesting');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { setLocationState('denied'); return; }
    try {
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 25 },
        async (position) => {
          const recordedAt = new Date(position.timestamp).toISOString();
          const response = await enterpriseService.updateLocation(routeId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            recordedAt,
          });
          if (response.success) { setLastLocationSent(new Date().toISOString()); setLocationState('sharing'); }
          else setLocationState('offline');
        },
      );
      setLocationState('sharing');
    } catch { setLocationState('offline'); }
  }, [data?.route?.status, routeId]);

  useEffect(() => {
    if (data?.route?.status !== 'in_progress') { stopTracking(); setLocationState('idle'); return; }
    startTracking();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') startTracking();
      else { stopTracking(); setLocationState('paused'); }
    });
    return () => { subscription.remove(); stopTracking(); };
  }, [data?.route?.status, startTracking, stopTracking]);

  const route = data?.route;
  const stops = data?.stops || [];
  const currentStop = stops.find((stop: any) => ['pending', 'arrived'].includes(stop.status));
  const resolved = stops.filter((stop: any) => terminalStops.has(stop.status)).length;
  const mapRoute = useMemo(() => buildMapRoute(data), [data]);

  const routeAction = async (action: 'accept' | 'reject' | 'start' | 'finish') => {
    setBusy(action); setError('');
    const response = action === 'accept' ? await enterpriseService.acceptRoute(routeId)
      : action === 'reject' ? await enterpriseService.rejectRoute(routeId, 'Driver declined the assignment')
        : action === 'start' ? await enterpriseService.startRoute(routeId)
          : await enterpriseService.completeRoute(routeId);
    setBusy(''); setConfirmAction(null);
    if (!response.success) { setError(response.error || `Unable to ${action} this route.`); return; }
    await load(true);
  };

  const arrive = async () => {
    if (!currentStop) return;
    setBusy('arrive');
    const response = await enterpriseService.arriveAtStop(currentStop.orderId);
    setBusy('');
    if (!response.success) setError(response.error || 'Arrival could not be recorded.');
    else load(true);
  };

  const navigate = () => {
    if (!currentStop) return;
    const destination = Number.isFinite(currentStop.latitude) && Number.isFinite(currentStop.longitude)
      ? `${currentStop.latitude},${currentStop.longitude}`
      : currentStop.full_address;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`);
  };

  const callCustomer = () => {
    const details = orderDetails(currentStop);
    const phone = details.phone || details.customer_phone;
    if (phone) Linking.openURL(`tel:${String(phone).replace(/[^+\d]/g, '')}`);
  };

  return (
    <View style={styles.root}>
      <RouteMap
        confirmedRoute={(mapRoute as any) || undefined}
        mapType={mapType}
        centerSignal={centerSignal}
      />

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

      <View style={[styles.mapControls, { top: insets.top + 16 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to assigned routes" onPress={() => router.back()} style={styles.mapControlButton}>
          <Feather name="arrow-left" size={22} color={C.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Change map style" onPress={() => setMapType((value) => value === 'standard' ? 'satellite' : 'standard')} style={styles.mapControlButton}>
          <Feather name="map" size={21} color={C.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Center route on map" onPress={() => setCenterSignal((value) => value + 1)} style={styles.mapControlButton}>
          <Feather name="crosshair" size={21} color={C.primary} />
        </Pressable>
      </View>

      <DraggableRouteSheet key={route?.status || 'loading'} isWide={wide} initialSnap={route?.status === 'in_progress' ? 'top' : 'middle'} collapsedHeight={98}>
        <View style={styles.sheetInner}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderCopy}>
              <Text numberOfLines={1} style={styles.panelTitle}>{route?.name || 'Assigned route'}</Text>
              <Text style={styles.panelSubtitle}>{route ? `Route #${routeId}` : 'Preparing route details…'}</Text>
            </View>
            {route ? <StatusBadge compact status={route.status} /> : null}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 36) }]}
          >
            {loading ? <SkeletonRows count={5} /> : error && !data ? <StatePanel icon="alert-circle" title="Route unavailable" message={error} actionLabel="Try again" onAction={() => load()} /> : route ? (
              <>
                {error ? <View accessibilityRole="alert" style={styles.errorBanner}><Feather name="alert-circle" size={17} color={C.danger} /><Text style={styles.errorBannerText}>{error}</Text><Pressable accessibilityLabel="Dismiss" onPress={() => setError('')}><Feather name="x" size={18} color={C.danger} /></Pressable></View> : null}
                {route.status === 'assigned' ? <AssignmentOverview route={route} data={data} onAccept={() => routeAction('accept')} onReject={() => setConfirmAction('reject')} busy={busy} /> : null}
                {route.status === 'accepted' ? <AcceptedOverview route={route} data={data} onStart={() => setConfirmAction('start')} /> : null}
                {route.status === 'in_progress' ? (
                  <>
                    <LocationBanner state={locationState} lastSent={lastLocationSent} onRetry={startTracking} />
                    <View style={styles.progressCard}><View style={styles.progressHeader}><Text style={styles.cardEyebrow}>Route progress</Text><Text style={styles.progressPercent}>{stops.length ? Math.round((resolved / stops.length) * 100) : 0}%</Text></View><ProgressBar completed={resolved} total={stops.length} tone={stops.some((stop: any) => stop.status === 'failed') ? 'danger' : 'primary'} /><View style={styles.progressNumbers}><View><Text style={styles.number}>{resolved}</Text><Text style={styles.numberLabel}>Resolved</Text></View><View><Text style={styles.number}>{Math.max(0, stops.length - resolved)}</Text><Text style={styles.numberLabel}>Remaining</Text></View><View><Text style={[styles.number, { color: C.danger }]}>{stops.filter((stop: any) => stop.status === 'failed').length}</Text><Text style={styles.numberLabel}>Failed</Text></View></View></View>
                    {currentStop ? <CurrentStopCard stop={currentStop} index={stops.indexOf(currentStop) + 1} total={stops.length} busy={busy} canCall={Boolean(orderDetails(currentStop).phone || orderDetails(currentStop).customer_phone)} onNavigate={navigate} onCall={callCustomer} onArrive={arrive} onDelivered={() => setCompletionMode('delivered')} onFailed={() => setCompletionMode('failed')} onProblem={() => setProblemOpen(true)} /> : <RouteReadyToFinish delivered={stops.filter((stop: any) => stop.status === 'delivered').length} failed={stops.filter((stop: any) => stop.status === 'failed').length} onFinish={() => setConfirmAction('finish')} />}
                    <StopQueue stops={stops} currentId={currentStop?.orderId} />
                  </>
                ) : null}
                {['completed', 'failed', 'cancelled'].includes(route.status) ? <CompletedSummary route={route} stops={stops} /> : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </DraggableRouteSheet>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <ConfirmActionModal action={confirmAction} busy={Boolean(busy)} onCancel={() => setConfirmAction(null)} onConfirm={() => confirmAction && routeAction(confirmAction)} />
      <StopCompletionModal mode={completionMode} stop={currentStop} routeId={routeId} onClose={() => setCompletionMode(null)} onCompleted={async () => { setCompletionMode(null); await load(true); }} />
      <ProblemModal visible={problemOpen} routeId={routeId} onClose={() => setProblemOpen(false)} />
    </View>
  );
}

function AssignmentOverview({ route, data, onAccept, onReject, busy }: any) { return <><View style={styles.hero}><Text style={styles.eyebrow}>New assignment</Text><Text style={styles.heroTitle}>{route.name}</Text><Text style={styles.heroText}>Review the route on the map before accepting. Dispatch will see your response immediately.</Text></View><RouteFacts route={route} data={data} /><View style={styles.stickyActionsInline}><ActionButton style={{ flex: 1 }} variant="secondary" icon="x" label="Reject" loading={busy === 'reject'} onPress={onReject} /><ActionButton style={{ flex: 2 }} icon="check" label="Accept route" loading={busy === 'accept'} onPress={onAccept} /></View></>; }
function AcceptedOverview({ route, data, onStart }: any) { return <><View style={styles.hero}><Text style={styles.eyebrow}>Ready to start</Text><Text style={styles.heroTitle}>{route.name}</Text><Text style={styles.heroText}>Start only when you are safely parked. Location sharing begins after confirmation.</Text></View><RouteFacts route={route} data={data} /><ActionButton icon="navigation" label="Start route" onPress={onStart} style={{ minHeight: 54 }} /></>; }
function RouteFacts({ route, data }: any) { return <View style={styles.facts}><Fact icon="calendar" label="Scheduled start" value={time(route.plannedStart)} /><Fact icon="map-pin" label="Stops" value={`${route.totalStops} deliveries`} /><Fact icon="clock" label="Estimated duration" value={data.routeInfo?.plannedDurationSeconds ? `${Math.round(data.routeInfo.plannedDurationSeconds / 60)} minutes` : 'Not available'} /><Fact icon="navigation" label="Distance" value={data.routeInfo?.distance === null ? 'Not available' : `${Number(data.routeInfo?.distance || 0).toFixed(1)} route units`} /><View style={styles.routeAddresses}><Address label="Start" value={data.routeInfo?.startAddress} /><Address label="Finish" value={data.routeInfo?.endAddress} /></View></View>; }
function Fact({ icon, label, value }: any) { return <View style={styles.fact}><View style={styles.factIcon}><Feather name={icon} size={17} color={C.primaryDark} /></View><View><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View></View>; }
function Address({ label, value }: any) { return <View style={styles.address}><Text style={styles.addressLabel}>{label}</Text><Text style={styles.addressValue}>{value}</Text></View>; }

function LocationBanner({ state, lastSent, onRetry }: { state: string; lastSent: string | null; onRetry: () => void }) { const meta: any = { requesting: ['map-pin', 'Requesting location permission…', C.info], sharing: ['radio', lastSent ? `Location shared · ${time(lastSent)}` : 'Location sharing is active', C.success], denied: ['slash', 'Location permission denied. Dispatch cannot see live progress.', C.warning], paused: ['pause-circle', 'Location sharing paused while the app is in the background.', C.warning], offline: ['wifi-off', 'Location update failed. Route progress is still available.', C.danger], idle: ['map-pin', 'Location sharing will start with the route.', C.inkMuted] }[state]; return <View style={[styles.locationBanner, state === 'sharing' && styles.locationBannerSuccess, ['denied', 'paused'].includes(state) && styles.locationBannerWarning, state === 'offline' && styles.locationBannerError]}><Feather name={meta[0]} size={17} color={meta[2]} /><Text style={styles.locationBannerText}>{meta[1]}</Text>{['denied', 'offline'].includes(state) ? <ActionButton compact variant="quiet" label="Retry" onPress={onRetry} /> : null}</View>; }

function CurrentStopCard({ stop, index, total, busy, canCall, onNavigate, onCall, onArrive, onDelivered, onFailed, onProblem }: any) { const details = orderDetails(stop); return <View style={styles.currentCard}><View style={styles.currentHeader}><View><Text style={styles.cardEyebrow}>Current stop · {index} of {total}</Text><Text style={styles.currentTitle}>{stop.customer_name || `Stop ${index}`}</Text></View><StatusBadge status={stop.status} /></View><Text style={styles.currentAddress}>{stop.full_address}</Text><View style={styles.quickInfo}>{details.phone || details.customer_phone ? <View style={styles.quickItem}><Feather name="phone" size={15} color={C.inkMuted} /><Text style={styles.quickText}>{details.phone || details.customer_phone}</Text></View> : null}<View style={styles.quickItem}><Feather name="package" size={15} color={C.inkMuted} /><Text style={styles.quickText}>{stop.packages || 1} package{Number(stop.packages || 1) === 1 ? '' : 's'}</Text></View>{stop.notes ? <View style={styles.note}><Feather name="file-text" size={15} color={C.warning} /><Text style={styles.noteText}>{stop.notes}</Text></View> : null}</View><View style={styles.primaryStopActions}><ActionButton style={{ flex: 1 }} icon="navigation" label="Navigate" onPress={onNavigate} /><ActionButton style={{ flex: 1 }} variant="secondary" icon="phone" label="Call" disabled={!canCall} onPress={onCall} /></View>{stop.status === 'pending' ? <ActionButton icon="map-pin" label="I’ve arrived" loading={busy === 'arrive'} onPress={onArrive} style={{ minHeight: 58 }} /> : <View style={styles.outcomeActions}><ActionButton style={{ flex: 1 }} icon="check-circle" label="Delivered" onPress={onDelivered} /><ActionButton style={{ flex: 1 }} variant="danger" icon="alert-circle" label="Failed" onPress={onFailed} /></View>}<Pressable accessibilityRole="button" onPress={onProblem} style={styles.problemButton}><Feather name="message-square" size={16} color={C.inkMuted} /><Text style={styles.problemText}>Report a route problem</Text></Pressable></View>; }
function RouteReadyToFinish({ delivered, failed, onFinish }: { delivered: number; failed: number; onFinish: () => void }) { return <View style={styles.finishCard}><View style={styles.finishIcon}><Feather name="flag" size={24} color={C.success} /></View><Text style={styles.finishTitle}>All stops are resolved</Text><Text style={styles.finishText}>{delivered} delivered · {failed} failed. Review the totals, then finish the route.</Text><ActionButton icon="check-circle" label="Finish route" onPress={onFinish} style={{ minHeight: 58, width: '100%' }} /></View>; }
function StopQueue({ stops, currentId }: any) { return <View style={styles.queue}><Text style={styles.sectionTitle}>Route stops</Text>{stops.map((stop: any, index: number) => <View key={stop.orderId} style={[styles.queueRow, stop.orderId === currentId && styles.queueRowCurrent]}><View style={styles.queueSequence}><Text style={styles.queueSequenceText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.queueName}>{stop.customer_name || `Stop ${index + 1}`}</Text><Text numberOfLines={1} style={styles.queueAddress}>{stop.full_address}</Text></View><StatusBadge compact status={stop.status} /></View>)}</View>; }
function CompletedSummary({ route, stops }: any) { const delivered = stops.filter((stop: any) => stop.status === 'delivered').length; const failed = stops.filter((stop: any) => stop.status === 'failed').length; return <View style={styles.summaryCard}><View style={[styles.finishIcon, route.status !== 'completed' && { backgroundColor: C.dangerSoft }]}><Feather name={route.status === 'completed' ? 'check-circle' : 'flag'} size={26} color={route.status === 'completed' ? C.success : C.danger} /></View><StatusBadge status={route.status} /><Text style={styles.finishTitle}>{route.status === 'completed' ? 'Route complete' : `Route ${route.status}`}</Text><Text style={styles.finishText}>Finished {time(route.actualEnd)}. Proof files are available to your dispatcher.</Text><View style={styles.summaryStats}><Fact icon="check" label="Delivered" value={String(delivered)} /><Fact icon="alert-circle" label="Failed" value={String(failed)} /><Fact icon="clock" label="Actual duration" value="Recorded in report" /></View></View>; }

function StopCompletionModal({ mode, stop, routeId, onClose, onCompleted }: { mode: 'delivered' | 'failed' | null; stop: any; routeId: number; onClose: () => void; onCompleted: () => void }) {
  const [recipient, setRecipient] = useState(''); const [notes, setNotes] = useState(''); const [reason, setReason] = useState(''); const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null); const [paths, setPaths] = useState<string[]>([]); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (mode) { setRecipient(''); setNotes(''); setReason(''); setPhoto(null); setPaths([]); setError(''); } }, [mode, stop?.orderId]);
  if (!mode || !stop) return null;
  const capturePhoto = async () => { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setError('Camera permission was denied. Enable it in device settings or use a signature.'); return; } const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 }); if (!result.canceled) setPhoto(result.assets[0]); };
  const submit = async () => {
    if (mode === 'delivered' && recipient.trim().length < 2) return setError('Enter the recipient’s name.');
    if (mode === 'delivered' && !photo && paths.length === 0) return setError('Add a delivery photo or signature.');
    if (mode === 'failed' && !reason) return setError('Select a failure reason.');
    setSubmitting(true); setError('');
    const form = new FormData(); form.append('status', mode); form.append('submissionKey', `${Date.now()}-${Math.random().toString(36).slice(2)}`); form.append('deviceCompletedAt', new Date().toISOString()); if (recipient) form.append('recipientName', recipient.trim()); if (notes) form.append('notes', notes.trim()); if (reason) form.append('failureReason', reason);
    try { const location = await Location.getLastKnownPositionAsync(); if (location) { form.append('latitude', String(location.coords.latitude)); form.append('longitude', String(location.coords.longitude)); } } catch {}
    if (photo) { if (Platform.OS === 'web' && (photo as any).file) form.append('photo', (photo as any).file); else form.append('photo', { uri: photo.uri, name: photo.fileName || 'delivery-photo.jpg', type: photo.mimeType || 'image/jpeg' } as any); }
    if (paths.length) { const svg = signatureSvg(paths); if (Platform.OS === 'web') form.append('signature', new File([svg], 'signature.svg', { type: 'image/svg+xml' })); else { const file = new ExpoFileSystem.File(ExpoFileSystem.Paths.cache, `routefloww-signature-${routeId}-${stop.orderId}.svg`); file.write(svg); form.append('signature', { uri: file.uri, name: 'signature.svg', type: 'image/svg+xml' } as any); } }
    try { const response = await enterpriseService.completeStop(stop.orderId, form); if (!response.success) throw new Error(response.error || 'Stop completion failed.'); await onCompleted(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Stop completion failed.'); } finally { setSubmitting(false); }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View accessibilityViewIsModal style={styles.completionSheet}><View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>Stop {mode === 'delivered' ? 'completion' : 'outcome'}</Text><Text style={styles.modalTitle}>{mode === 'delivered' ? 'Confirm delivery' : 'Delivery failed'}</Text></View><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Feather name="x" size={22} color={C.inkMuted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: S.lg, paddingBottom: S.xl }}>{mode === 'delivered' ? <FormField label="Recipient name" value={recipient} onChangeText={setRecipient} placeholder="Who received the delivery?" /> : <View><Text style={styles.inputLabel}>Failure reason</Text><View style={styles.reasonList}>{FAILURE_REASONS.map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: reason === value }} onPress={() => setReason(value)} style={[styles.reasonChoice, reason === value && styles.reasonChoiceSelected]}><Text style={[styles.reasonText, reason === value && { color: C.primaryDark }]}>{label}</Text>{reason === value ? <Feather name="check" size={17} color={C.primaryDark} /> : null}</Pressable>)}</View></View>}<FormField label="Driver notes" value={notes} onChangeText={setNotes} multiline placeholder={mode === 'delivered' ? 'Optional delivery notes' : 'Add details that will help dispatch'} /><View><Text style={styles.inputLabel}>{mode === 'delivered' ? 'Delivery photo' : 'Evidence photo (optional)'}</Text>{photo ? <View style={styles.photoPreview}><Image source={{ uri: photo.uri }} style={styles.photo} /><Pressable accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} style={styles.removePhoto}><Feather name="x" size={18} color="#FFFFFF" /></Pressable></View> : <Pressable accessibilityRole="button" onPress={capturePhoto} style={styles.captureButton}><Feather name="camera" size={22} color={C.primaryDark} /><Text style={styles.captureTitle}>Take a photo</Text><Text style={styles.captureText}>JPEG, PNG or WebP · maximum 8 MB</Text></Pressable>}</View>{mode === 'delivered' ? <View><View style={styles.signatureHeading}><Text style={styles.inputLabel}>Signature</Text>{paths.length ? <Pressable onPress={() => setPaths([])}><Text style={styles.clearSignature}>Clear</Text></Pressable> : null}</View><SignaturePad paths={paths} setPaths={setPaths} /></View> : null}{error ? <View accessibilityRole="alert" style={styles.errorBanner}><Feather name="alert-circle" size={17} color={C.danger} /><Text style={styles.errorBannerText}>{error}</Text></View> : null}<ActionButton icon={mode === 'delivered' ? 'check-circle' : 'alert-circle'} variant={mode === 'delivered' ? 'primary' : 'danger'} label={mode === 'delivered' ? 'Complete delivery' : 'Record failed delivery'} loading={submitting} onPress={submit} style={{ minHeight: 58 }} /></ScrollView></View></View></Modal>;
}

function SignaturePad({ paths, setPaths }: { paths: string[]; setPaths: React.Dispatch<React.SetStateAction<string[]>> }) { const [size, setSize] = useState({ width: 1, height: 1 }); const current = useRef(''); const responder = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderGrant: (event) => { current.current = `M ${event.nativeEvent.locationX.toFixed(1)} ${event.nativeEvent.locationY.toFixed(1)}`; setPaths((items) => [...items, current.current]); }, onPanResponderMove: (event) => { current.current += ` L ${event.nativeEvent.locationX.toFixed(1)} ${event.nativeEvent.locationY.toFixed(1)}`; setPaths((items) => [...items.slice(0, -1), current.current]); } }), [setPaths]); const onLayout = (event: LayoutChangeEvent) => setSize(event.nativeEvent.layout); return <View accessible accessibilityLabel="Signature pad. Draw a signature with one finger." onLayout={onLayout} {...responder.panHandlers} style={styles.signaturePad}><Svg width={size.width} height={size.height}>{paths.map((path, index) => <Path key={index} d={path} stroke={C.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</Svg>{!paths.length ? <View pointerEvents="none" style={styles.signaturePlaceholder}><Feather name="edit-3" size={20} color={C.inkSubtle} /><Text style={styles.signaturePlaceholderText}>Sign here</Text></View> : null}</View>; }
const signatureSvg = (paths: string[]) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260"><rect width="100%" height="100%" fill="white"/>${paths.map((path) => `<path d="${path.replace(/[^ML0-9.\s-]/g, '')}" stroke="#172033" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;

function ConfirmActionModal({ action, busy, onCancel, onConfirm }: { action: 'reject' | 'start' | 'finish' | null; busy: boolean; onCancel: () => void; onConfirm: () => void }) { if (!action) return null; const content = { reject: ['Reject this assignment?', 'Dispatch will be notified and can reassign the route.', 'Reject route', 'x-circle'], start: ['Start this route?', 'Live location sharing begins while the app is active. Make sure you are safely parked.', 'Start route', 'navigation'], finish: ['Finish this route?', 'All stop outcomes will be locked into the route report.', 'Finish route', 'check-circle'] }[action]; return <Modal visible transparent animationType="fade"><View style={styles.modalOverlay}><View accessibilityViewIsModal style={styles.confirmCard}><View style={[styles.finishIcon, action === 'reject' && { backgroundColor: C.dangerSoft }]}><Feather name={content[3] as any} size={24} color={action === 'reject' ? C.danger : C.success} /></View><Text style={styles.confirmTitle}>{content[0]}</Text><Text style={styles.confirmMessage}>{content[1]}</Text><View style={styles.confirmActions}><ActionButton style={{ flex: 1 }} variant="secondary" label="Go back" disabled={busy} onPress={onCancel} /><ActionButton style={{ flex: 1 }} variant={action === 'reject' ? 'danger' : 'primary'} label={content[2]} loading={busy} onPress={onConfirm} /></View></View></View></Modal>; }
function ProblemModal({ visible, routeId, onClose }: { visible: boolean; routeId: number; onClose: () => void }) { const [details, setDetails] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const submit = async () => { if (details.trim().length < 5) return setError('Describe the change or problem.'); setBusy(true); const response = await enterpriseService.requestRouteChange(routeId, { requestType: 'driver_problem', details: details.trim() }); setBusy(false); if (!response.success) setError(response.error || 'Request could not be sent.'); else { setDetails(''); setError(''); onClose(); } }; return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.confirmCard}><Text style={styles.modalTitle}>Report a route problem</Text><Text style={styles.confirmMessage}>Dispatch will see your request in the route activity timeline.</Text><FormField label="What needs attention?" value={details} onChangeText={setDetails} multiline placeholder="Describe the problem or requested change" error={error || undefined} /><View style={styles.confirmActions}><ActionButton style={{ flex: 1 }} variant="secondary" label="Cancel" onPress={onClose} /><ActionButton style={{ flex: 1 }} icon="send" label="Send" loading={busy} onPress={submit} /></View></View></View></Modal>; }

function buildMapRoute(data: any) { if (!data?.routeInfo) return null; const start = data.routeInfo.startLocation; const end = data.routeInfo.endLocation; const validStops = (data.stops || []).filter((stop: any) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)); const fallback = validStops[0]; if ((!Number.isFinite(start?.latitude) || !Number.isFinite(start?.longitude)) && !fallback) return null; const startPoint = { latitude: Number.isFinite(start?.latitude) ? start.latitude : fallback.latitude, longitude: Number.isFinite(start?.longitude) ? start.longitude : fallback.longitude, title: 'Start', address: start?.address, markerType: 'start' }; const endPoint = { latitude: Number.isFinite(end?.latitude) ? end.latitude : startPoint.latitude, longitude: Number.isFinite(end?.longitude) ? end.longitude : startPoint.longitude, title: 'Finish', address: end?.address, markerType: 'end' }; const stops = validStops.map((stop: any, index: number) => ({ id: String(stop.orderId), sequence: stop.sequence_no || index + 1, latitude: stop.latitude, longitude: stop.longitude, title: stop.customer_name, address: stop.full_address, markerType: 'stop', status: stop.status || 'pending' })); return { start: startPoint, end: endPoint, stops, coordinates: [startPoint, ...stops, endPoint] }; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  menuButton: { position: 'absolute', left: 24, zIndex: 80, elevation: 12, width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14 },
  hamburger: { width: 24, gap: 5 },
  hamburgerBar: { width: 24, height: 3, borderRadius: 999, backgroundColor: '#111827' },
  mapControls: { position: 'absolute', right: 24, zIndex: 80, gap: 12 },
  mapControlButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14 },
  sheetInner: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF' },
  panelHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  panelHeaderCopy: { flex: 1, minWidth: 0 },
  panelTitle: { color: C.ink, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  panelSubtitle: { color: C.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, gap: S.lg },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, padding: S.md, borderWidth: 1, borderColor: '#F0B5C0', backgroundColor: C.dangerSoft, borderRadius: R.md }, errorBannerText: { flex: 1, color: C.danger, fontSize: 12, lineHeight: 18 },
  hero: { paddingVertical: S.md }, eyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 }, heroTitle: { color: C.ink, fontSize: 22, lineHeight: 29, fontWeight: '600', marginTop: S.sm }, heroText: { color: C.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 5 }, facts: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface }, fact: { minWidth: 140, flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md }, factIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft }, factLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 }, factValue: { color: C.ink, fontSize: 12, fontWeight: '500', marginTop: 3 }, routeAddresses: { width: '100%', gap: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.line }, address: { gap: 3 }, addressLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase' }, addressValue: { color: C.ink, fontSize: 12, lineHeight: 18, fontWeight: '500' }, stickyActionsInline: { flexDirection: 'row', gap: S.md },
  locationBanner: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surface }, locationBannerSuccess: { backgroundColor: C.successSoft, borderColor: '#A8DECA' }, locationBannerWarning: { backgroundColor: C.warningSoft, borderColor: '#F0D29A' }, locationBannerError: { backgroundColor: C.dangerSoft, borderColor: '#F0B5C0' }, locationBannerText: { flex: 1, color: C.ink, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  progressCard: { padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md }, cardEyebrow: { color: C.inkSubtle, fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 }, progressPercent: { color: C.primaryDark, fontSize: 19, fontWeight: '600' }, progressNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.lg }, number: { color: C.ink, fontSize: 19, fontWeight: '600' }, numberLabel: { color: C.inkMuted, fontSize: 10, marginTop: 2 },
  currentCard: { padding: S.lg, borderWidth: 1, borderColor: '#AFCBFF', borderLeftWidth: 3, borderLeftColor: C.primary, borderRadius: R.lg, backgroundColor: C.surface }, currentHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.md }, currentTitle: { color: C.ink, fontSize: 20, lineHeight: 26, fontWeight: '600', marginTop: 4 }, currentAddress: { color: C.inkMuted, fontSize: 14, lineHeight: 21, marginTop: S.md }, quickInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.md }, quickItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, quickText: { color: C.inkMuted, fontSize: 11, fontWeight: '500' }, note: { width: '100%', flexDirection: 'row', gap: S.sm, padding: S.md, backgroundColor: C.warningSoft, borderRadius: R.md }, noteText: { flex: 1, color: C.ink, fontSize: 11, lineHeight: 17 }, primaryStopActions: { flexDirection: 'row', gap: S.md, marginVertical: S.lg }, outcomeActions: { flexDirection: 'row', gap: S.md, marginTop: S.lg }, problemButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm, marginTop: S.md }, problemText: { color: C.inkMuted, fontSize: 12, fontWeight: '500' },
  finishCard: { alignItems: 'center', padding: S.xl, borderWidth: 1, borderColor: '#A8DECA', borderRadius: R.lg, backgroundColor: C.surface }, finishIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: C.successSoft, marginBottom: S.md }, finishTitle: { color: C.ink, fontSize: 20, fontWeight: '600', textAlign: 'center', marginTop: S.sm }, finishText: { color: C.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginVertical: S.md }, queue: { gap: S.sm }, sectionTitle: { color: C.ink, fontSize: 17, fontWeight: '600', marginBottom: S.sm }, queueRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surface }, queueRowCurrent: { borderColor: '#AFCBFF', backgroundColor: C.primarySoft }, queueSequence: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceMuted }, queueSequenceText: { color: C.ink, fontSize: 11, fontWeight: '600' }, queueName: { color: C.ink, fontSize: 13, fontWeight: '500' }, queueAddress: { color: C.inkMuted, fontSize: 10, marginTop: 3 }, summaryCard: { alignItems: 'center', padding: S.xl, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface }, summaryStats: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: S.lg, marginTop: S.xl, paddingTop: S.xl, borderTopWidth: 1, borderTopColor: C.line },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23,32,51,0.58)', justifyContent: 'flex-end', alignItems: 'center' }, completionSheet: { width: '100%', maxWidth: 680, maxHeight: '94%', backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: S.xl }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.xl }, modalEyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.7 }, modalTitle: { color: C.ink, fontSize: 21, fontWeight: '600', marginTop: 4 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, inputLabel: { color: C.ink, fontSize: 13, fontWeight: '500' }, reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.sm }, reasonChoice: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.pill }, reasonChoiceSelected: { borderColor: '#AFCBFF', backgroundColor: C.primarySoft }, reasonText: { color: C.inkMuted, fontSize: 12, fontWeight: '500' }, captureButton: { minHeight: 112, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: C.lineStrong, borderRadius: R.md, backgroundColor: C.surfaceMuted, marginTop: S.sm }, captureTitle: { color: C.ink, fontSize: 13, fontWeight: '600', marginTop: S.sm }, captureText: { color: C.inkMuted, fontSize: 10, marginTop: 3 }, photoPreview: { height: 190, marginTop: S.sm, borderRadius: R.md, overflow: 'hidden' }, photo: { width: '100%', height: '100%' }, removePhoto: { position: 'absolute', right: S.sm, top: S.sm, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,32,51,0.72)' }, signatureHeading: { flexDirection: 'row', justifyContent: 'space-between' }, clearSignature: { color: C.primaryDark, fontSize: 12, fontWeight: '500' }, signaturePad: { height: 150, marginTop: S.sm, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, backgroundColor: '#FFFFFF', overflow: 'hidden' }, signaturePlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: S.sm }, signaturePlaceholderText: { color: C.inkSubtle, fontSize: 12 }, confirmCard: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: S.xl, alignItems: 'center' }, confirmTitle: { color: C.ink, fontSize: 20, fontWeight: '600', textAlign: 'center' }, confirmMessage: { color: C.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: S.md }, confirmActions: { width: '100%', flexDirection: 'row', gap: S.md, marginTop: S.md },
});
