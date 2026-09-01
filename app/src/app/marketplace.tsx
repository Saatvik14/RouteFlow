import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ActionButton,
  OperationsShell,
  SkeletonRows,
  StatePanel,
  StatusBadge,
} from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { useUserRole } from '../hooks/useUserRole';
import {
  MarketplaceBid,
  MarketplaceRoute,
  marketplaceService,
} from '../services/api/marketplace';

type DriverTab = 'available' | 'my_bids';
const MARKETPLACE_POLL_INTERVAL_MS = 15_000;
type ConfirmAction =
  | { type: 'accept'; bid: MarketplaceBid }
  | { type: 'close'; route: MarketplaceRoute }
  | { type: 'withdraw'; bid: MarketplaceBid }
  | null;

const money = (currency: string, amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return 'Not set';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const dateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const duration = (start: string, end: string) => {
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return 'Unknown duration';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
};

const apiError = <T extends { success: boolean; error?: string }>(response: T, fallback: string): T => {
  if (!response.success) throw new Error(response.error || fallback);
  return response;
};

export default function MarketplaceScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const { isLoading: roleLoading, isIndependentDriver, isFleetDriver, isBusinessOwner } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState<MarketplaceRoute[]>([]);
  const [myBids, setMyBids] = useState<MarketplaceBid[]>([]);
  const [routeBids, setRouteBids] = useState<Record<number, MarketplaceBid[]>>({});
  const [loadingRouteId, setLoadingRouteId] = useState<number | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [driverTab, setDriverTab] = useState<DriverTab>('available');
  const [bidRoute, setBidRoute] = useState<MarketplaceRoute | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidError, setBidError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState('');
  const marketplaceRequestRef = useRef(false);
  const bidsRequestRef = useRef(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false, showRefreshIndicator = silent) => {
    if (roleLoading || marketplaceRequestRef.current) return;
    marketplaceRequestRef.current = true;
    if (showRefreshIndicator) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      if (isBusinessOwner) {
        const response = apiError(await marketplaceService.getBusinessRoutes(), 'Marketplace listings could not be loaded.');
        setRoutes(response.data?.routes || []);
      } else if (isIndependentDriver) {
        const [availableResponse, bidsResponse] = await Promise.all([
          marketplaceService.getAvailableRoutes(),
          marketplaceService.getMyBids(),
        ]);
        apiError(availableResponse, 'Public routes could not be loaded.');
        apiError(bidsResponse, 'Your bids could not be loaded.');
        setRoutes(availableResponse.data?.routes || []);
        setMyBids(bidsResponse.data?.bids || []);
      } else {
        setRoutes([]);
        setMyBids([]);
      }
      if (mountedRef.current) {
        setError('');
        setSyncError('');
        setLastUpdatedAt(new Date());
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Marketplace data could not be loaded.';
      if (mountedRef.current) {
        if (silent) setSyncError(message);
        else setError(message);
      }
    } finally {
      marketplaceRequestRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        if (showRefreshIndicator) setRefreshing(false);
      }
    }
  }, [isBusinessOwner, isIndependentDriver, roleLoading]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const refreshRouteBids = useCallback(async (routeId: number, silent = false) => {
    if (bidsRequestRef.current) return;
    bidsRequestRef.current = true;
    if (!silent) setLoadingRouteId(routeId);
    try {
      const response = apiError(await marketplaceService.getRouteBids(routeId), 'Bids could not be loaded.');
      if (mountedRef.current) {
        setRouteBids((current) => ({ ...current, [routeId]: response.data?.bids || [] }));
        setSyncError('');
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Bids could not be loaded.';
      if (mountedRef.current) {
        if (silent) setSyncError(message);
        else setError(message);
      }
    } finally {
      bidsRequestRef.current = false;
      if (mountedRef.current && !silent) setLoadingRouteId(null);
    }
  }, []);

  const loadBids = async (routeId: number) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null);
      return;
    }
    setExpandedRouteId(routeId);
    if (routeBids[routeId]) return;
    await refreshRouteBids(routeId);
  };

  const pollMarketplace = useCallback(async () => {
    if (AppState.currentState !== 'active' || roleLoading || busy) return;
    const requests: Promise<unknown>[] = [load(true, false)];
    if (isBusinessOwner && expandedRouteId) {
      requests.push(refreshRouteBids(expandedRouteId, true));
    }
    await Promise.all(requests);
  }, [busy, expandedRouteId, isBusinessOwner, load, refreshRouteBids, roleLoading]);

  useEffect(() => {
    if (roleLoading || isFleetDriver || (!isIndependentDriver && !isBusinessOwner)) return;
    const interval = setInterval(pollMarketplace, MARKETPLACE_POLL_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') pollMarketplace();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isBusinessOwner, isFleetDriver, isIndependentDriver, pollMarketplace, roleLoading]);

  const manualRefresh = async () => {
    const requests: Promise<unknown>[] = [load(true, true)];
    if (isBusinessOwner && expandedRouteId) {
      requests.push(refreshRouteBids(expandedRouteId, true));
    }
    await Promise.all(requests);
  };

  const openBid = (route: MarketplaceRoute) => {
    setBidRoute(route);
    setBidAmount(route.myBid ? String(route.myBid.amount) : '');
    setBidMessage(route.myBid?.message || '');
    setBidError('');
  };

  const submitBid = async () => {
    if (!bidRoute) return;
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > bidRoute.maxCost || Number(amount.toFixed(2)) !== amount) {
      setBidError(`Enter an amount from 0.01 to ${money(bidRoute.currency, bidRoute.maxCost)}, with at most two decimal places.`);
      return;
    }
    setBusy('bid');
    setBidError('');
    try {
      apiError(await marketplaceService.placeBid(bidRoute.routeId, amount, bidMessage.trim() || undefined), 'Your bid could not be submitted.');
      setBidRoute(null);
      await load(true);
    } catch (submitError) {
      setBidError(submitError instanceof Error ? submitError.message : 'Your bid could not be submitted.');
    } finally {
      setBusy('');
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setBusy(action.type);
    setError('');
    try {
      if (action.type === 'accept') {
        apiError(await marketplaceService.acceptBid(action.bid.bidId), 'The driver could not be selected.');
      } else if (action.type === 'close') {
        apiError(await marketplaceService.closeListing(action.route.routeId), 'The listing could not be closed.');
      } else {
        apiError(await marketplaceService.withdrawBid(action.bid.bidId), 'The bid could not be withdrawn.');
      }
      setConfirmAction(null);
      setRouteBids({});
      setExpandedRouteId(null);
      await load(true);
    } catch (actionError) {
      setConfirmAction(null);
      setError(actionError instanceof Error ? actionError.message : 'The action could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const availableWithoutBid = useMemo(() => routes.filter((route) => !route.myBid).length, [routes]);
  const pendingBidCount = useMemo(() => myBids.filter((bid) => bid.status === 'pending').length, [myBids]);

  if (roleLoading || loading) {
    return <OperationsShell active="marketplace" title="Driver marketplace" subtitle="Loading public routes and bids"><SkeletonRows count={5} /></OperationsShell>;
  }

  if (isFleetDriver || (!isIndependentDriver && !isBusinessOwner)) {
    return (
      <OperationsShell active="marketplace" title="Driver marketplace" subtitle="Public route bidding">
        <StatePanel icon="lock" title="Marketplace unavailable" message="Marketplace bidding is available to independent drivers, while listing management is available to business accounts." />
      </OperationsShell>
    );
  }

  return (
    <OperationsShell
      active="marketplace"
      title="Driver marketplace"
      subtitle={isBusinessOwner ? 'Review public routes, compare driver bids, and award work.' : 'Find public routes from business accounts and submit your price.'}
      actions={<View style={styles.headerActions}><View accessibilityLiveRegion="polite" style={[styles.liveStatus, syncError && styles.liveStatusWarning]}><View style={[styles.liveDot, syncError && styles.liveDotWarning]} /><Text style={[styles.liveText, syncError && styles.liveTextWarning]}>{syncError ? 'Sync delayed' : lastUpdatedAt ? `Live · ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live updates'}</Text></View><ActionButton compact variant="secondary" icon="refresh-cw" label="Refresh" loading={refreshing} onPress={manualRefresh} /></View>}
    >
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroIcon}><Feather name={isBusinessOwner ? 'briefcase' : 'truck'} size={24} color={C.primaryDark} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{isBusinessOwner ? 'Your public route listings' : 'Open routes near your schedule'}</Text>
          <Text style={styles.heroText}>{isBusinessOwner ? 'Only route timing and depot-level addresses are public. Customer and stop details stay private until assignment.' : 'A business can accept only one bid. Overlapping bids are allowed, but once one is awarded, conflicting awards are blocked.'}</Text>
        </View>
        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricValue}>{isBusinessOwner ? routes.filter((route) => route.marketplaceStatus === 'open').length : availableWithoutBid}</Text>
          <Text style={styles.heroMetricLabel}>{isBusinessOwner ? 'open listings' : 'new routes'}</Text>
        </View>
      </View>

      {error ? <View accessibilityRole="alert" style={styles.errorBanner}><Feather name="alert-circle" size={17} color={C.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}

      {isIndependentDriver ? (
        <View accessibilityRole="tablist" style={styles.tabs}>
          <Tab label="Available routes" count={routes.length} selected={driverTab === 'available'} onPress={() => setDriverTab('available')} />
          <Tab label="My bids" count={pendingBidCount} selected={driverTab === 'my_bids'} onPress={() => setDriverTab('my_bids')} />
        </View>
      ) : null}

      {isBusinessOwner ? (
        routes.length ? (
          <View style={styles.list}>
            {routes.map((route) => (
              <BusinessListingCard
                key={route.routeId}
                route={route}
                compact={compact}
                expanded={expandedRouteId === route.routeId}
                loadingBids={loadingRouteId === route.routeId}
                bids={routeBids[route.routeId] || []}
                onToggle={() => loadBids(route.routeId)}
                onAccept={(bid) => setConfirmAction({ type: 'accept', bid })}
                onClose={() => setConfirmAction({ type: 'close', route })}
              />
            ))}
          </View>
        ) : <StatePanel icon="globe" title="No public listings" message="Create a route, turn on “Make this route public,” set a maximum driver cost, and it will appear here." />
      ) : driverTab === 'available' ? (
        routes.length ? (
          <View style={styles.list}>{routes.map((route) => <DriverRouteCard key={route.routeId} route={route} compact={compact} onBid={() => openBid(route)} />)}</View>
        ) : <StatePanel icon="search" title="No open routes" message="There are no public routes accepting bids right now. Refresh later for new work." />
      ) : myBids.length ? (
        <View style={styles.list}>{myBids.map((bid) => <MyBidCard key={bid.bidId} bid={bid} compact={compact} onWithdraw={() => setConfirmAction({ type: 'withdraw', bid })} />)}</View>
      ) : <StatePanel icon="inbox" title="No bids yet" message="Your submitted bids and award decisions will appear here." />}

      <BidModal
        route={bidRoute}
        amount={bidAmount}
        message={bidMessage}
        error={bidError}
        busy={busy === 'bid'}
        onAmount={setBidAmount}
        onMessage={setBidMessage}
        onClose={() => !busy && setBidRoute(null)}
        onSubmit={submitBid}
      />
      <ConfirmationModal action={confirmAction} busy={Boolean(busy)} onClose={() => !busy && setConfirmAction(null)} onConfirm={runConfirmedAction} />
    </OperationsShell>
  );
}

function Tab({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.tabActive]}>
      <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabCount, selected && styles.tabCountActive]}><Text style={[styles.tabCountText, selected && styles.tabCountTextActive]}>{count}</Text></View>
    </Pressable>
  );
}

function RouteFacts({ route, compact }: { route: MarketplaceRoute; compact: boolean }) {
  return (
    <View style={[styles.facts, compact && styles.factsCompact]}>
      <Fact icon="calendar" label="Starts" value={dateTime(route.plannedStart)} />
      <Fact icon="clock" label="Window" value={duration(route.plannedStart, route.plannedEnd)} />
      <Fact icon="dollar-sign" label="Maximum cost" value={money(route.currency, route.maxCost)} highlight />
      <Fact icon="lock" label="Bidding closes" value={dateTime(route.biddingClosesAt)} />
    </View>
  );
}

function Fact({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return <View style={styles.fact}><Feather name={icon} size={15} color={highlight ? C.primaryDark : C.inkSubtle} /><View style={{ flex: 1 }}><Text style={styles.factLabel}>{label}</Text><Text style={[styles.factValue, highlight && styles.factValueHighlight]}>{value}</Text></View></View>;
}

function AddressPath({ route }: { route: MarketplaceRoute }) {
  return (
    <View style={styles.addressPath}>
      <View style={styles.addressRail}><View style={styles.startDot} /><View style={styles.addressLine} /><View style={styles.endDot} /></View>
      <View style={{ flex: 1, gap: 15 }}><Text numberOfLines={2} style={styles.addressText}>{route.startAddress}</Text><Text numberOfLines={2} style={styles.addressText}>{route.endAddress}</Text></View>
    </View>
  );
}

function DriverRouteCard({ route, compact, onBid }: { route: MarketplaceRoute; compact: boolean; onBid: () => void }) {
  const existing = route.myBid;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{route.organizationName}</Text><Text style={styles.cardTitle}>{route.name}</Text></View>{existing ? <StatusBadge compact status={existing.status} /> : <StatusBadge compact status="open" />}</View>
      <RouteFacts route={route} compact={compact} />
      <AddressPath route={route} />
      <View style={styles.cardFooter}>
        <Text style={styles.bidMeta}>{route.bidCount} bid{route.bidCount === 1 ? '' : 's'} submitted</Text>
        <ActionButton compact icon={existing ? 'edit-3' : 'send'} label={existing ? `Update ${money(route.currency, existing.amount)} bid` : 'Place bid'} onPress={onBid} />
      </View>
    </View>
  );
}

function MyBidCard({ bid, compact, onWithdraw }: { bid: MarketplaceBid; compact: boolean; onWithdraw: () => void }) {
  const route = bid.route;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{route?.organizationName}</Text><Text style={styles.cardTitle}>{route?.name || `Route #${bid.routeId}`}</Text></View><StatusBadge compact status={bid.status} /></View>
      <View style={[styles.bidSummary, compact && styles.bidSummaryCompact]}><View><Text style={styles.factLabel}>YOUR BID</Text><Text style={styles.bidAmount}>{money(bid.currency, bid.amount)}</Text></View><View><Text style={styles.factLabel}>ROUTE START</Text><Text style={styles.bidSummaryValue}>{dateTime(route?.plannedStart)}</Text></View><View><Text style={styles.factLabel}>MAXIMUM</Text><Text style={styles.bidSummaryValue}>{money(bid.currency, route?.maxCost)}</Text></View></View>
      {bid.message ? <Text style={styles.bidMessage}>“{bid.message}”</Text> : null}
      <View style={styles.cardFooter}><Text style={styles.bidMeta}>{bid.status === 'accepted' ? 'You won this route. It is now assigned to you.' : bid.status === 'pending' ? 'The business has not made a decision yet.' : 'This bid is no longer active.'}</Text>{bid.status === 'pending' ? <ActionButton compact variant="danger" icon="x" label="Withdraw" onPress={onWithdraw} /> : null}</View>
    </View>
  );
}

function BusinessListingCard({ route, compact, expanded, loadingBids, bids, onToggle, onAccept, onClose }: {
  route: MarketplaceRoute; compact: boolean; expanded: boolean; loadingBids: boolean; bids: MarketplaceBid[];
  onToggle: () => void; onAccept: (bid: MarketplaceBid) => void; onClose: () => void;
}) {
  const open = route.marketplaceStatus === 'open';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>ROUTE #{route.routeId}</Text><Text style={styles.cardTitle}>{route.name}</Text></View><StatusBadge compact status={route.marketplaceStatus} /></View>
      <RouteFacts route={route} compact={compact} />
      <AddressPath route={route} />
      <View style={styles.cardFooter}>
        <View><Text style={styles.bidCountStrong}>{route.pendingBidCount}</Text><Text style={styles.bidMeta}>pending driver bid{route.pendingBidCount === 1 ? '' : 's'}</Text></View>
        <View style={styles.actions}>{open ? <ActionButton compact variant="danger" icon="slash" label="Close listing" onPress={onClose} /> : null}<ActionButton compact variant="secondary" icon={expanded ? 'chevron-up' : 'users'} label={expanded ? 'Hide bids' : 'Review bids'} onPress={onToggle} /></View>
      </View>
      {expanded ? <View style={styles.bidPanel}>{loadingBids ? <View style={styles.inlineLoading}><ActivityIndicator color={C.primary} /><Text style={styles.bidMeta}>Loading bids…</Text></View> : bids.length ? bids.map((bid) => <BusinessBidRow key={bid.bidId} bid={bid} canAccept={open && bid.status === 'pending'} compact={compact} onAccept={() => onAccept(bid)} />) : <Text style={styles.emptyBids}>No drivers have bid on this route yet.</Text>}</View> : null}
    </View>
  );
}

function BusinessBidRow({ bid, canAccept, compact, onAccept }: { bid: MarketplaceBid; canAccept: boolean; compact: boolean; onAccept: () => void }) {
  const driver = bid.driver;
  return (
    <View style={[styles.bidRow, compact && styles.bidRowCompact]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{driver?.name?.trim().charAt(0).toUpperCase() || 'D'}</Text></View>
      <View style={styles.driverIdentity}><View style={styles.driverNameRow}><Text style={styles.driverName}>{driver?.name || 'Driver'}</Text><StatusBadge compact status={bid.status} /></View><Text style={styles.driverMeta}>{driver?.vehicleType || 'Vehicle not specified'} · {driver?.completedRoutes || 0} completed · {driver?.completionRate || 0}% completion</Text>{bid.message ? <Text style={styles.driverMessage}>{bid.message}</Text> : null}<Text style={styles.driverContact}>{driver?.email || driver?.phone || 'Contact details unavailable'}</Text></View>
      <View style={styles.bidDecision}><Text style={styles.bidPrice}>{money(bid.currency, bid.amount)}</Text><Text style={styles.bidMeta}>driver bid</Text>{canAccept ? <ActionButton compact icon="user-check" label="Choose driver" onPress={onAccept} /> : null}</View>
    </View>
  );
}

function BidModal({ route, amount, message, error, busy, onAmount, onMessage, onClose, onSubmit }: {
  route: MarketplaceRoute | null; amount: string; message: string; error: string; busy: boolean;
  onAmount: (value: string) => void; onMessage: (value: string) => void; onClose: () => void; onSubmit: () => void;
}) {
  return (
    <Modal visible={Boolean(route)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}><Pressable accessibilityLabel="Close bid form" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.modalCard}>
          <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalEyebrow}>SUBMIT YOUR PRICE</Text><Text style={styles.modalTitle}>{route?.name}</Text></View><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}><Feather name="x" size={20} color={C.inkMuted} /></Pressable></View>
          <Text style={styles.modalHint}>Maximum {route ? money(route.currency, route.maxCost) : ''} · closes {dateTime(route?.biddingClosesAt)}</Text>
          <Text style={styles.inputLabel}>Bid amount ({route?.currency})</Text>
          <TextInput accessibilityLabel="Bid amount" value={amount} onChangeText={(value) => onAmount(value.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.inkSubtle} style={styles.input} />
          <Text style={styles.inputLabel}>Message to business (optional)</Text>
          <TextInput accessibilityLabel="Message to business" value={message} onChangeText={onMessage} maxLength={500} multiline placeholder="Mention your vehicle, experience, or availability." placeholderTextColor={C.inkSubtle} style={[styles.input, styles.messageInput]} />
          <Text style={styles.characterCount}>{message.length}/500</Text>
          {error ? <Text accessibilityRole="alert" style={styles.modalError}>{error}</Text> : null}
          <View style={styles.modalActions}><ActionButton style={{ flex: 1 }} variant="secondary" label="Cancel" disabled={busy} onPress={onClose} /><ActionButton style={{ flex: 1 }} icon="send" label={route?.myBid ? 'Update bid' : 'Submit bid'} loading={busy} onPress={onSubmit} /></View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmationModal({ action, busy, onClose, onConfirm }: { action: ConfirmAction; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!action) return null;
  const content = action.type === 'accept'
    ? { icon: 'user-check', title: `Choose ${action.bid.driver?.name || 'this driver'}?`, message: `Their ${money(action.bid.currency, action.bid.amount)} bid will be accepted. Other bids are rejected and the route is assigned immediately. Time conflicts are checked again before assignment.`, label: 'Choose driver', danger: false }
    : action.type === 'close'
      ? { icon: 'slash', title: 'Close this listing?', message: 'Pending bids will expire and the route will remain unassigned. This cannot be reopened from this screen.', label: 'Close listing', danger: true }
      : { icon: 'x-circle', title: 'Withdraw this bid?', message: 'The business will no longer be able to choose it. You can submit a new bid only while the listing remains open.', label: 'Withdraw bid', danger: true };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><Pressable accessibilityLabel="Cancel" onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={styles.confirmCard}><View style={[styles.confirmIcon, content.danger && styles.confirmIconDanger]}><Feather name={content.icon as any} size={24} color={content.danger ? C.danger : C.primaryDark} /></View><Text style={styles.confirmTitle}>{content.title}</Text><Text style={styles.confirmMessage}>{content.message}</Text><View style={styles.modalActions}><ActionButton style={{ flex: 1 }} variant="secondary" label="Go back" disabled={busy} onPress={onClose} /><ActionButton style={{ flex: 1 }} variant={content.danger ? 'danger' : 'primary'} label={content.label} loading={busy} onPress={onConfirm} /></View></View></View></Modal>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: S.lg, padding: S.xl, borderWidth: 1, borderColor: '#CFE0FA', borderRadius: R.lg, backgroundColor: '#F6FAFF', marginBottom: S.xl },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: S.sm },
  liveStatus: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: S.md, borderRadius: R.pill, backgroundColor: C.successSoft },
  liveStatusWarning: { backgroundColor: C.warningSoft },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  liveDotWarning: { backgroundColor: C.warning },
  liveText: { color: C.success, fontSize: 10, fontWeight: '600' },
  liveTextWarning: { color: C.warning },
  heroCompact: { alignItems: 'flex-start', flexWrap: 'wrap', padding: S.lg },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  heroTitle: { color: C.ink, fontSize: 18, fontWeight: '600' },
  heroText: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 760 },
  heroMetric: { minWidth: 92, alignItems: 'center', padding: S.md, borderRadius: R.md, backgroundColor: C.surface },
  heroMetricValue: { color: C.primaryDark, fontSize: 24, fontWeight: '600' },
  heroMetricLabel: { color: C.inkMuted, fontSize: 10, marginTop: 2 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md, borderWidth: 1, borderColor: '#F1B8C1', borderRadius: R.md, backgroundColor: C.dangerSoft, marginBottom: S.lg },
  errorText: { flex: 1, color: C.danger, fontSize: 12, lineHeight: 18 },
  tabs: { alignSelf: 'flex-start', flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surfaceMuted, marginBottom: S.xl },
  tab: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.lg, borderRadius: 9 },
  tabActive: { backgroundColor: C.surface },
  tabText: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: C.primaryDark },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
  tabCountActive: { backgroundColor: C.primarySoft },
  tabCountText: { color: C.inkMuted, fontSize: 10, fontWeight: '600' },
  tabCountTextActive: { color: C.primaryDark },
  list: { gap: S.lg },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.lg },
  eyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { color: C.ink, fontSize: 18, fontWeight: '600', marginTop: 3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  factsCompact: { flexDirection: 'column' },
  fact: { minWidth: 190, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: S.md, borderRadius: R.md, backgroundColor: C.surfaceMuted },
  factLabel: { color: C.inkSubtle, fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { color: C.ink, fontSize: 11, fontWeight: '600', marginTop: 3 },
  factValueHighlight: { color: C.primaryDark },
  addressPath: { flexDirection: 'row', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.md },
  addressRail: { width: 12, alignItems: 'center', paddingVertical: 4 },
  startDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
  addressLine: { width: 1, flex: 1, minHeight: 20, backgroundColor: C.lineStrong },
  endDot: { width: 9, height: 9, borderRadius: 2, backgroundColor: C.danger },
  addressText: { color: C.inkMuted, fontSize: 12, lineHeight: 17 },
  cardFooter: { minHeight: 58, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: S.md, marginTop: S.lg },
  bidMeta: { color: C.inkMuted, fontSize: 11, lineHeight: 16 },
  bidCountStrong: { color: C.ink, fontSize: 20, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  bidSummary: { flexDirection: 'row', gap: S.xxl, padding: S.lg, borderRadius: R.md, backgroundColor: C.surfaceMuted },
  bidSummaryCompact: { flexDirection: 'column', gap: S.md },
  bidAmount: { color: C.primaryDark, fontSize: 20, fontWeight: '600', marginTop: 3 },
  bidSummaryValue: { color: C.ink, fontSize: 12, fontWeight: '600', marginTop: 4 },
  bidMessage: { color: C.inkMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginTop: S.md },
  bidPanel: { borderTopWidth: 1, borderTopColor: C.line, marginTop: S.lg, paddingTop: S.lg, gap: S.sm },
  inlineLoading: { minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: S.sm },
  emptyBids: { color: C.inkMuted, fontSize: 12, textAlign: 'center', padding: S.xl },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surfaceMuted },
  bidRowCompact: { alignItems: 'flex-start', flexWrap: 'wrap' },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  avatarText: { color: C.primaryDark, fontSize: 16, fontWeight: '600' },
  driverIdentity: { flex: 1, minWidth: 220 },
  driverNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.sm },
  driverName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  driverMeta: { color: C.inkMuted, fontSize: 10, marginTop: 4 },
  driverMessage: { color: C.ink, fontSize: 11, lineHeight: 16, marginTop: 7 },
  driverContact: { color: C.primaryDark, fontSize: 10, marginTop: 5 },
  bidDecision: { alignItems: 'flex-end', gap: 4 },
  bidPrice: { color: C.primaryDark, fontSize: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.lg, backgroundColor: 'rgba(15,23,42,0.64)' },
  modalCard: { width: '100%', maxWidth: 540, borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  modalEyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: '600', marginTop: 3 },
  modalHint: { color: C.inkMuted, fontSize: 11, marginTop: S.sm, marginBottom: S.xl },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  inputLabel: { color: C.inkMuted, fontSize: 11, fontWeight: '600', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, color: C.ink, fontSize: 14, paddingHorizontal: S.md, marginBottom: S.lg },
  messageInput: { minHeight: 100, paddingTop: S.md, textAlignVertical: 'top', marginBottom: 4 },
  characterCount: { color: C.inkSubtle, fontSize: 10, textAlign: 'right' },
  modalError: { color: C.danger, fontSize: 11, lineHeight: 16, marginTop: S.md },
  modalActions: { flexDirection: 'row', gap: S.md, marginTop: S.xl },
  confirmCard: { width: '100%', maxWidth: 480, alignItems: 'center', borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl },
  confirmIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  confirmIconDanger: { backgroundColor: C.dangerSoft },
  confirmTitle: { color: C.ink, fontSize: 19, fontWeight: '600', textAlign: 'center', marginTop: S.lg },
  confirmMessage: { color: C.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: S.sm },
});
