import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
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
  SkeletonRows,
  StatePanel,
  StatusBadge,
} from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { useUserRole } from '../hooks/useUserRole';
import { registerForPushNotificationsAsync } from '../services/notifications/pushNotificationService';
import {
  BusinessFleetListing,
  FleetPoolRoute,
  MarketplaceBid,
  MarketplaceRoute,
  RouteOptIn,
  RouteOptInsResponse,
  marketplaceService,
} from '../services/api/marketplace';

const MARKETPLACE_POLL_INTERVAL_MS = 15_000;

type ConfirmAction =
  | { type: 'select_driver'; routeId: number; routeName: string; driver: RouteOptIn }
  | { type: 'close_fleet'; routeId: number; routeName: string }
  | { type: 'accept_bid'; bid: MarketplaceBid }
  | { type: 'close_public'; route: MarketplaceRoute }
  | { type: 'withdraw_bid'; bid: MarketplaceBid }
  | null;

const dateTime = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeOnly = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDeadlineCountdown = (deadlineIso?: string | null) => {
  if (!deadlineIso) return { text: 'No deadline', isPassed: false, isUrgent: false };
  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return { text: 'No deadline', isPassed: false, isUrgent: false };
  const diffMs = deadline - Date.now();
  if (diffMs <= 0) {
    const passedMinutes = Math.floor(Math.abs(diffMs) / 60000);
    return {
      text: passedMinutes < 60 ? `Closed ${passedMinutes}m ago` : `Closed`,
      isPassed: true,
      isUrgent: false,
    };
  }
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return {
      text: `Closes in ${diffMinutes}m`,
      isPassed: false,
      isUrgent: diffMinutes <= 15,
    };
  }
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return {
    text: `Closes in ${diffHours}h ${remainingMins}m`,
    isPassed: false,
    isUrgent: false,
  };
};

const duration = (start: string, end: string) => {
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return 'Flexible';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
};

const money = (currency: string, amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return 'Not set';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const apiError = <T extends { success?: boolean; error?: string; message?: string }>(response: T, fallback: string): T => {
  if (response.success === false) throw new Error(response.error || response.message || fallback);
  return response;
};

export default function MarketplaceScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const { isLoading: roleLoading, isIndependentDriver, isFleetDriver, isBusinessOwner } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState('');

  // Fleet Driver State
  const [fleetRoutes, setFleetRoutes] = useState<FleetPoolRoute[]>([]);
  const [driverNoteModalRoute, setDriverNoteModalRoute] = useState<{ route: FleetPoolRoute; response: 'opt_in' | 'opt_out' } | null>(null);
  const [driverNoteText, setDriverNoteText] = useState('');

  // Business Owner State
  const [businessFleetRoutes, setBusinessFleetRoutes] = useState<BusinessFleetListing[]>([]);
  const [reviewModalRouteId, setReviewModalRouteId] = useState<number | null>(null);
  const [optInsData, setOptInsData] = useState<RouteOptInsResponse | null>(null);
  const [loadingOptIns, setLoadingOptIns] = useState(false);

  // Independent Driver State (Legacy / Public)
  const [publicRoutes, setPublicRoutes] = useState<MarketplaceRoute[]>([]);
  const [myBids, setMyBids] = useState<MarketplaceBid[]>([]);
  const [driverTab, setDriverTab] = useState<'available' | 'my_bids'>('available');

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const marketplaceRequestRef = useRef(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false, showRefreshIndicator = silent) => {
    if (roleLoading || marketplaceRequestRef.current) return;
    marketplaceRequestRef.current = true;
    if (showRefreshIndicator) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError('');

    try {
      if (isBusinessOwner) {
        const response = await marketplaceService.getBusinessFleetListings();
        apiError(response, 'Fleet listings could not be loaded.');
        if (mountedRef.current) {
          setBusinessFleetRoutes(response.data?.routes || []);
        }
      } else if (isFleetDriver) {
        const response = await marketplaceService.getFleetPoolRoutes();
        apiError(response, 'Fleet pool routes could not be loaded.');
        if (mountedRef.current) {
          setFleetRoutes(response.data?.routes || []);
        }
      } else if (isIndependentDriver) {
        const [availableResponse, bidsResponse] = await Promise.all([
          marketplaceService.getAvailableRoutes(),
          marketplaceService.getMyBids(),
        ]);
        apiError(availableResponse, 'Public routes could not be loaded.');
        apiError(bidsResponse, 'Your bids could not be loaded.');
        if (mountedRef.current) {
          setPublicRoutes(availableResponse.data?.routes || []);
          setMyBids(bidsResponse.data?.bids || []);
        }
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
  }, [isBusinessOwner, isFleetDriver, isIndependentDriver, roleLoading]);

  useEffect(() => {
    mountedRef.current = true;
    load();

    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync().catch(() => {});
    } else if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')) {
      // If opened on mobile browser (from email or link), attempt to launch native app automatically
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('openApp') !== 'false') {
          const isAndroid = /Android/i.test(navigator.userAgent || '');
          if (isAndroid) {
            window.location.href = 'routefloww://marketplace';
          } else {
            window.location.href = 'routefloww://marketplace';
          }
        }
      } catch {}
    }

    return () => { mountedRef.current = false; };
  }, [load]);

  const loadOptIns = useCallback(async (routeId: number) => {
    setReviewModalRouteId(routeId);
    setLoadingOptIns(true);
    try {
      const response = await marketplaceService.getRouteOptIns(routeId);
      apiError(response, 'Driver responses could not be loaded.');
      if (mountedRef.current) {
        setOptInsData(response.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Driver responses could not be loaded.');
    } finally {
      if (mountedRef.current) {
        setLoadingOptIns(false);
      }
    }
  }, []);

  const pollMarketplace = useCallback(async () => {
    if (AppState.currentState !== 'active' || roleLoading || busy) return;
    await load(true, false);
    if (reviewModalRouteId) {
      await loadOptIns(reviewModalRouteId);
    }
  }, [busy, load, loadOptIns, reviewModalRouteId, roleLoading]);

  useEffect(() => {
    if (roleLoading) return;
    const interval = setInterval(pollMarketplace, MARKETPLACE_POLL_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') pollMarketplace();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [pollMarketplace, roleLoading]);

  const manualRefresh = async () => {
    await load(true, true);
    if (reviewModalRouteId) {
      await loadOptIns(reviewModalRouteId);
    }
  };

  // Driver response handler (Opt In / Opt Out)
  const handleDriverResponse = async (routeId: number, response: 'opt_in' | 'opt_out', notes?: string) => {
    setBusy(`driver_respond_${routeId}`);
    setError('');
    try {
      const res = await marketplaceService.respondToFleetRoute(routeId, response, notes);
      apiError(res, 'Response could not be saved.');
      setDriverNoteModalRoute(null);
      setDriverNoteText('');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update response.');
    } finally {
      setBusy('');
    }
  };

  // Confirm and run assignment or closing
  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setBusy(action.type);
    setError('');
    try {
      if (action.type === 'select_driver') {
        const res = await marketplaceService.selectDriver(action.routeId, action.driver.driverUserId);
        apiError(res, 'Driver could not be assigned.');
        setReviewModalRouteId(null);
        setOptInsData(null);
      } else if (action.type === 'close_fleet') {
        const res = await marketplaceService.closeFleetListing(action.routeId);
        apiError(res, 'Fleet listing could not be closed.');
      } else if (action.type === 'accept_bid') {
        apiError(await marketplaceService.acceptBid(action.bid.bidId), 'Bid could not be accepted.');
      } else if (action.type === 'close_public') {
        apiError(await marketplaceService.closeListing(action.route.routeId), 'Listing could not be closed.');
      } else if (action.type === 'withdraw_bid') {
        apiError(await marketplaceService.withdrawBid(action.bid.bidId), 'Bid could not be withdrawn.');
      }
      setConfirmAction(null);
      await load(true);
    } catch (actionError) {
      setConfirmAction(null);
      setError(actionError instanceof Error ? actionError.message : 'The action could not be completed.');
    } finally {
      setBusy('');
    }
  };

  if (roleLoading || loading) {
    return (
      <OperationsShell active="marketplace" title="Fleet Driver Pool" subtitle="Loading available pool routes">
        <SkeletonRows count={5} />
      </OperationsShell>
    );
  }

  const isMobileBrowser =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

  const renderMobileAppBanner = () => {
    if (!isMobileBrowser) return null;
    return (
      <View
        style={{
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Feather name="smartphone" size={20} color="#2563EB" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF' }}>Open in RouteFloww App</Text>
            <Text style={{ fontSize: 11, color: '#3B82F6' }}>View and opt in with push alerts & live GPS</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (typeof window !== 'undefined') {
              const isAndroid = /Android/i.test(navigator.userAgent || '');
              if (isAndroid) {
                window.location.href = 'routefloww://marketplace';
                setTimeout(() => {
                  window.location.href = 'intent://marketplace#Intent;scheme=routefloww;package=com.vvdevill.app;end';
                }, 400);
              } else {
                window.location.href = 'routefloww://marketplace';
              }
            }
          }}
          style={{
            backgroundColor: '#2563EB',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Open App</Text>
        </Pressable>
      </View>
    );
  };

  // BUSINESS OWNER VIEW
  if (isBusinessOwner) {
    const activeListings = businessFleetRoutes.filter((r) => r.marketplaceStatus === 'open');
    const totalOptIns = businessFleetRoutes.reduce((acc, r) => acc + (r.optInCount || 0), 0);

    return (
      <OperationsShell
        active="marketplace"
        title="Fleet Driver Pool"
        subtitle="Manage pooled routes, review opted-in drivers, and assign routes after the deadline."
        actions={
          <View style={styles.headerActions}>
            <View accessibilityLiveRegion="polite" style={[styles.liveStatus, syncError && styles.liveStatusWarning]}>
              <View style={[styles.liveDot, syncError && styles.liveDotWarning]} />
              <Text style={[styles.liveText, syncError && styles.liveTextWarning]}>
                {syncError ? 'Sync delayed' : lastUpdatedAt ? `Live · ${formatTimeOnly(lastUpdatedAt.toISOString())}` : 'Live updates'}
              </Text>
            </View>
            <ActionButton compact variant="secondary" icon="refresh-cw" label="Refresh" loading={refreshing} onPress={manualRefresh} />
          </View>
        }
      >
        {renderMobileAppBanner()}
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <View style={styles.heroKicker}>
              <Feather name="users" size={13} color="#2867C7" />
              <Text style={styles.heroKickerText}>INTERNAL FLEET POOL</Text>
            </View>
            <Text style={styles.heroTitle}>Collect fleet availability & assign on your terms.</Text>
            <Text style={styles.heroText}>
              Post unassigned routes with an opt-in deadline. Fleet drivers mark their availability, and you choose the best driver with one click.
            </Text>
            <View style={styles.heroTrustRow}>
              <View style={styles.heroTrustItem}>
                <Feather name="clock" size={13} color="#5E7185" />
                <Text style={styles.heroTrustText}>Enforced deadlines</Text>
              </View>
              <View style={styles.heroTrustItem}>
                <Feather name="shield" size={13} color="#5E7185" />
                <Text style={styles.heroTrustText}>Fleet-only access</Text>
              </View>
              <View style={styles.heroTrustItem}>
                <Feather name="check-circle" size={13} color="#5E7185" />
                <Text style={styles.heroTrustText}>1-Click assignment</Text>
              </View>
            </View>
          </View>
          <View style={[styles.heroMetrics, compact && styles.heroMetricsCompact]}>
            <MarketplaceMetric value={activeListings.length} label="Active pool routes" />
            <MarketplaceMetric value={totalOptIns} label="Driver Opt-Ins" accent />
            <MarketplaceMetric value={businessFleetRoutes.length} label="Total published" />
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Feather name="alert-circle" size={17} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listKicker}>FLEET POOL POSTINGS</Text>
            <Text style={styles.listTitle}>Routes Posted for Fleet Drivers</Text>
          </View>
          <Text style={styles.listHint}>Click on any route to inspect driver responses and make an assignment.</Text>
        </View>

        {businessFleetRoutes.length ? (
          <View style={styles.list}>
            {businessFleetRoutes.map((listing) => (
              <BusinessFleetListingCard
                key={listing.routeId}
                listing={listing}
                compact={compact}
                onReviewOptIns={() => loadOptIns(listing.routeId)}
                onCloseListing={() => setConfirmAction({ type: 'close_fleet', routeId: listing.routeId, routeName: listing.routeName })}
              />
            ))}
          </View>
        ) : (
          <StatePanel
            icon="users"
            title="No fleet pool routes yet"
            message="When creating a route, toggle “Post to Fleet Driver Pool” to let your team drivers opt in or out."
          />
        )}

        {/* Business Owner Review Opt-Ins Modal */}
        <ReviewOptInsModal
          visible={Boolean(reviewModalRouteId)}
          loading={loadingOptIns}
          optInsData={optInsData}
          onClose={() => {
            setReviewModalRouteId(null);
            setOptInsData(null);
          }}
          onSelectDriver={(driver) => {
            if (!optInsData) return;
            setConfirmAction({
              type: 'select_driver',
              routeId: optInsData.route.routeId,
              routeName: optInsData.route.routeName,
              driver,
            });
          }}
        />

        <ConfirmationModal
          action={confirmAction}
          busy={Boolean(busy)}
          onClose={() => !busy && setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
      </OperationsShell>
    );
  }

  // FLEET DRIVER VIEW
  if (isFleetDriver) {
    const activeRoutes = fleetRoutes.filter((r) => r.marketplaceStatus === 'open');
    const myOptIns = fleetRoutes.filter((r) => r.myResponse?.response === 'opt_in');

    return (
      <OperationsShell
        active="marketplace"
        title="Fleet Route Pool"
        subtitle="View open routes from your organization and opt in or out before the deadline."
        actions={
          <View style={styles.headerActions}>
            <View accessibilityLiveRegion="polite" style={[styles.liveStatus, syncError && styles.liveStatusWarning]}>
              <View style={[styles.liveDot, syncError && styles.liveDotWarning]} />
              <Text style={[styles.liveText, syncError && styles.liveTextWarning]}>
                {syncError ? 'Sync delayed' : lastUpdatedAt ? `Live · ${formatTimeOnly(lastUpdatedAt.toISOString())}` : 'Live updates'}
              </Text>
            </View>
            <ActionButton compact variant="secondary" icon="refresh-cw" label="Refresh" loading={refreshing} onPress={manualRefresh} />
          </View>
        }
      >
        {renderMobileAppBanner()}
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <View style={styles.heroKicker}>
              <Feather name="navigation" size={13} color="#2867C7" />
              <Text style={styles.heroKickerText}>FLEET DRIVER POOL</Text>
            </View>
            <Text style={styles.heroTitle}>Select available routes that match your schedule.</Text>
            <Text style={styles.heroText}>
              Opt in to let dispatch know you are ready to take the route. If plans change, you can update your response before the deadline.
            </Text>
            <View style={styles.heroTrustRow}>
              <View style={styles.heroTrustItem}>
                <Feather name="clock" size={13} color="#5E7185" />
                <Text style={styles.heroTrustText}>Clear response deadlines</Text>
              </View>
              <View style={styles.heroTrustItem}>
                <Feather name="check-circle" size={13} color="#5E7185" />
                <Text style={styles.heroTrustText}>Instant notification when assigned</Text>
              </View>
            </View>
          </View>
          <View style={[styles.heroMetrics, compact && styles.heroMetricsCompact]}>
            <MarketplaceMetric value={activeRoutes.length} label="Available routes" />
            <MarketplaceMetric value={myOptIns.length} label="Your opt-ins" accent />
          </View>
        </View>

        {error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Feather name="alert-circle" size={17} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listKicker}>AVAILABLE TEAM ROUTES</Text>
            <Text style={styles.listTitle}>Open Pool Routes</Text>
          </View>
          <Text style={styles.listHint}>Respond before the deadline to be considered for assignment.</Text>
        </View>

        {fleetRoutes.length ? (
          <View style={styles.list}>
            {fleetRoutes.map((route) => (
              <FleetDriverRouteCard
                key={route.routeId}
                route={route}
                compact={compact}
                isBusy={busy === `driver_respond_${route.routeId}`}
                onOptIn={() => handleDriverResponse(route.routeId, 'opt_in')}
                onOptOut={() => handleDriverResponse(route.routeId, 'opt_out')}
                onOpenNote={(response) => {
                  setDriverNoteModalRoute({ route, response });
                  setDriverNoteText(route.myResponse?.notes || '');
                }}
              />
            ))}
          </View>
        ) : (
          <StatePanel
            icon="check-circle"
            title="No open pool routes"
            message="There are currently no pooled routes posted for your fleet. Check back later."
          />
        )}

        {/* Driver Optional Note Modal */}
        <DriverNoteModal
          target={driverNoteModalRoute}
          note={driverNoteText}
          busy={Boolean(busy)}
          onChangeNote={setDriverNoteText}
          onClose={() => setDriverNoteModalRoute(null)}
          onSubmit={() => {
            if (!driverNoteModalRoute) return;
            handleDriverResponse(driverNoteModalRoute.route.routeId, driverNoteModalRoute.response, driverNoteText);
          }}
        />
      </OperationsShell>
    );
  }

  // RESTRICTED VIEW FOR INDEPENDENT DRIVERS / NON-FLEET
  return (
    <OperationsShell
      active="marketplace"
      title="Fleet Route Pool"
      subtitle="Internal organization route pool"
    >
      <StatePanel
        icon="lock"
        title="Fleet Route Pool Restricted"
        message="The route pool is exclusively available for business organizations and their fleet team drivers."
      />
    </OperationsShell>
  );
}

// -------------------------------------------------------------
// COMPONENTS
// -------------------------------------------------------------

function MarketplaceMetric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <View style={[styles.heroMetric, accent && styles.heroMetricAccent]}>
      <Text style={[styles.heroMetricValue, accent && styles.heroMetricValueAccent]}>{value}</Text>
      <Text style={[styles.heroMetricLabel, accent && styles.heroMetricLabelAccent]}>{label}</Text>
    </View>
  );
}

function Tab({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.tabActive]}>
      <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabCount, selected && styles.tabCountActive]}>
        <Text style={[styles.tabCountText, selected && styles.tabCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

// Business Fleet Listing Card
function BusinessFleetListingCard({
  listing,
  compact,
  onReviewOptIns,
  onCloseListing,
}: {
  listing: BusinessFleetListing;
  compact: boolean;
  onReviewOptIns: () => void;
  onCloseListing: () => void;
}) {
  const deadlineInfo = formatDeadlineCountdown(listing.optInDeadline);
  const isOpen = listing.marketplaceStatus === 'open';
  const isAwarded = listing.marketplaceStatus === 'awarded';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.routeIdentityIcon}>
          <Feather name="users" size={18} color={C.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.eyebrow}>ROUTE #{listing.routeId}</Text>
            <View
              style={[
                styles.deadlineContainer,
                deadlineInfo.isPassed ? styles.deadlinePassed : deadlineInfo.isUrgent ? styles.deadlineUrgent : styles.deadlineActive,
              ]}
            >
              <Feather
                name={deadlineInfo.isPassed ? 'lock' : 'clock'}
                size={11}
                color={deadlineInfo.isPassed ? '#64748B' : deadlineInfo.isUrgent ? '#DC2626' : '#2563EB'}
              />
              <Text
                style={[
                  styles.deadlineText,
                  deadlineInfo.isPassed ? styles.deadlinePassedText : deadlineInfo.isUrgent ? styles.deadlineUrgentText : styles.deadlineActiveText,
                ]}
              >
                {deadlineInfo.text}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{listing.routeName}</Text>
        </View>
        <StatusBadge compact status={listing.marketplaceStatus} />
      </View>

      <View style={[styles.facts, compact && styles.factsCompact]}>
        <Fact icon="calendar" label="Planned Start" value={dateTime(listing.plannedStart)} />
        <Fact icon="clock" label="Est. Duration" value={duration(listing.plannedStart, listing.plannedEnd)} />
        <Fact icon="map-pin" label="Total Stops" value={`${listing.totalStops || 0} stops`} />
        <Fact icon="clock" label="Deadline" value={dateTime(listing.optInDeadline)} highlight={!deadlineInfo.isPassed} />
      </View>

      <View style={styles.addressPath}>
        <View style={styles.addressRail}>
          <View style={styles.startDot} />
          <View style={styles.addressLine} />
          <View style={styles.endDot} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <Text numberOfLines={2} style={styles.addressText}>{listing.startAddress || 'Start depot'}</Text>
          <Text numberOfLines={2} style={styles.addressText}>{listing.endAddress || 'End depot'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.optInCountPill}>
            <Feather name="user-check" size={14} color="#16A34A" />
            <Text style={styles.optInCountPillText}>
              <Text style={{ fontWeight: '700', color: '#15803D' }}>{listing.optInCount || 0}</Text> Opted In
            </Text>
          </View>
          {listing.optOutCount ? (
            <View style={[styles.optInCountPill, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
              <Feather name="user-x" size={14} color="#64748B" />
              <Text style={[styles.optInCountPillText, { color: '#475467' }]}>
                <Text style={{ fontWeight: '700', color: '#334155' }}>{listing.optOutCount}</Text> Opted Out
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {isOpen ? (
            <ActionButton compact variant="danger" icon="slash" label="Close pool" onPress={onCloseListing} />
          ) : null}
          {isAwarded ? (
            <View style={styles.awardedBadge}>
              <Feather name="check" size={14} color="#15803D" />
              <Text style={styles.awardedBadgeText}>Assigned: {listing.awardedDriverName || 'Driver'}</Text>
            </View>
          ) : (
            <ActionButton
              compact
              variant={listing.optInCount > 0 ? 'primary' : 'secondary'}
              icon="users"
              label={listing.optInCount > 0 ? `Review & Assign (${listing.optInCount})` : 'View responses'}
              onPress={onReviewOptIns}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// Fleet Driver Route Card
function FleetDriverRouteCard({
  route,
  compact,
  isBusy,
  onOptIn,
  onOptOut,
  onOpenNote,
}: {
  route: FleetPoolRoute;
  compact: boolean;
  isBusy: boolean;
  onOptIn: () => void;
  onOptOut: () => void;
  onOpenNote: (response: 'opt_in' | 'opt_out') => void;
}) {
  const deadlineInfo = formatDeadlineCountdown(route.optInDeadline);
  const myResp = route.myResponse?.response;
  const isOptedIn = myResp === 'opt_in';
  const isOptedOut = myResp === 'opt_out';
  const canRespond = route.marketplaceStatus === 'open' && !deadlineInfo.isPassed;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.routeIdentityIcon}>
          <Feather name="navigation" size={18} color={C.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.eyebrow}>{route.organizationName || 'FLEET ROUTE'}</Text>
            <View
              style={[
                styles.deadlineContainer,
                deadlineInfo.isPassed ? styles.deadlinePassed : deadlineInfo.isUrgent ? styles.deadlineUrgent : styles.deadlineActive,
              ]}
            >
              <Feather
                name={deadlineInfo.isPassed ? 'lock' : 'clock'}
                size={11}
                color={deadlineInfo.isPassed ? '#64748B' : deadlineInfo.isUrgent ? '#DC2626' : '#2563EB'}
              />
              <Text
                style={[
                  styles.deadlineText,
                  deadlineInfo.isPassed ? styles.deadlinePassedText : deadlineInfo.isUrgent ? styles.deadlineUrgentText : styles.deadlineActiveText,
                ]}
              >
                {deadlineInfo.text}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{route.routeName}</Text>
        </View>

        {isOptedIn ? (
          <View style={[styles.responseBadge, styles.responseOptIn]}>
            <Feather name="check-circle" size={13} color="#16A34A" />
            <Text style={styles.responseOptInText}>Opted In</Text>
          </View>
        ) : isOptedOut ? (
          <View style={[styles.responseBadge, styles.responseOptOut]}>
            <Feather name="x-circle" size={13} color="#64748B" />
            <Text style={styles.responseOptOutText}>Opted Out</Text>
          </View>
        ) : (
          <View style={[styles.responseBadge, styles.responsePending]}>
            <Feather name="help-circle" size={13} color="#2563EB" />
            <Text style={styles.responsePendingText}>Awaiting Reply</Text>
          </View>
        )}
      </View>

      <View style={[styles.facts, compact && styles.factsCompact]}>
        <Fact icon="calendar" label="Planned Start" value={dateTime(route.plannedStart)} />
        <Fact icon="clock" label="Est. Duration" value={duration(route.plannedStart, route.plannedEnd)} />
        <Fact icon="map-pin" label="Stops & Distance" value={`${route.totalStops || 0} stops · ${route.totalDistanceKm ? route.totalDistanceKm.toFixed(1) : 0} km`} />
        <Fact icon="clock" label="Deadline" value={dateTime(route.optInDeadline)} highlight={!deadlineInfo.isPassed} />
      </View>

      <View style={styles.addressPath}>
        <View style={styles.addressRail}>
          <View style={styles.startDot} />
          <View style={styles.addressLine} />
          <View style={styles.endDot} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <Text numberOfLines={2} style={styles.addressText}>{route.startAddress || 'Start depot'}</Text>
          <Text numberOfLines={2} style={styles.addressText}>{route.endAddress || 'End depot'}</Text>
        </View>
      </View>

      {route.myResponse?.notes ? (
        <View style={styles.driverNoteBubble}>
          <Feather name="message-square" size={13} color="#475467" />
          <Text style={styles.driverNoteText}>Your note: “{route.myResponse.notes}”</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.marketSignal}>
          <View style={styles.marketSignalDot} />
          <Text style={styles.bidMeta}>
            {route.optInCount || 0} fleet driver{route.optInCount === 1 ? '' : 's'} available
          </Text>
        </View>

        {canRespond ? (
          <View style={styles.actions}>
            <ActionButton
              compact
              variant={isOptedOut ? 'secondary' : 'secondary'}
              icon="x"
              label={isOptedOut ? 'Declined ✓' : 'Opt Out'}
              disabled={isBusy}
              onPress={() => onOpenNote('opt_out')}
            />
            <ActionButton
              compact
              variant={isOptedIn ? 'secondary' : 'primary'}
              icon="check"
              label={isOptedIn ? 'Available ✓ (Update Note)' : 'Opt In (I\'m Available)'}
              loading={isBusy}
              onPress={() => (isOptedIn ? onOpenNote('opt_in') : onOptIn())}
            />
          </View>
        ) : (
          <Text style={styles.bidMeta}>
            {deadlineInfo.isPassed ? 'Opt-in deadline has passed.' : 'Route pool is closed.'}
          </Text>
        )}
      </View>
    </View>
  );
}

function Fact({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.fact}>
      <Feather name={icon} size={15} color={highlight ? C.primaryDark : C.inkSubtle} />
      <View style={{ flex: 1 }}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={[styles.factValue, highlight && styles.factValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

// Review Driver Opt-Ins Modal
function ReviewOptInsModal({
  visible,
  loading,
  optInsData,
  onClose,
  onSelectDriver,
}: {
  visible: boolean;
  loading: boolean;
  optInsData: RouteOptInsResponse | null;
  onClose: () => void;
  onSelectDriver: (driver: RouteOptIn) => void;
}) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 580;

  const optedInDrivers = useMemo(
    () => (optInsData?.optIns || []).filter((d) => d.response === 'opt_in'),
    [optInsData]
  );
  const optedOutDrivers = useMemo(
    () => (optInsData?.optIns || []).filter((d) => d.response === 'opt_out'),
    [optInsData]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close candidate modal" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.reviewModalCard, isNarrow && { padding: 16, maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalEyebrow}>FLEET CANDIDATE SELECTION</Text>
              <Text style={styles.modalTitle}>{optInsData?.route?.routeName || 'Route Candidates'}</Text>
            </View>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={C.inkMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.bidMeta}>Loading driver responses…</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSectionHeading}>
                <Text style={styles.modalSectionTitle}>AVAILABLE DRIVERS ({optedInDrivers.length})</Text>
                <Text style={styles.modalSectionHint}>Select any candidate to immediately award and assign this route.</Text>
              </View>

              {optedInDrivers.length ? (
                <View style={{ gap: 10, marginBottom: 20 }}>
                  {optedInDrivers.map((driver) => {
                    const isSelected = optInsData?.route?.awardedDriverId === driver.driverUserId;
                    return (
                      <View
                        key={driver.optInId}
                        style={[
                          styles.candidateCard,
                          isSelected && styles.candidateCardSelected,
                          isNarrow && { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{driver.driverName?.charAt(0).toUpperCase() || 'D'}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.candidateName}>{driver.driverName}</Text>
                              <View style={styles.optInPill}>
                                <Text style={styles.optInPillText}>Available</Text>
                              </View>
                            </View>
                            <Text style={styles.candidateContact}>
                              {driver.driverPhone || driver.driverEmail || 'No contact provided'}
                            </Text>
                          </View>
                        </View>

                        {driver.notes ? (
                          <Text style={styles.candidateNote}>“{driver.notes}”</Text>
                        ) : null}
                        <Text style={styles.respondedTimeText}>
                          Responded: {dateTime(driver.respondedAt)}
                        </Text>

                        {isSelected ? (
                          <View style={styles.awardedBadge}>
                            <Feather name="check" size={14} color="#15803D" />
                            <Text style={styles.awardedBadgeText}>Assigned</Text>
                          </View>
                        ) : (
                          <ActionButton
                            compact
                            icon="user-check"
                            label="Select & Assign"
                            style={isNarrow ? { width: '100%' } : undefined}
                            onPress={() => onSelectDriver(driver)}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyOptInBox}>
                  <Feather name="users" size={24} color="#94A3B8" />
                  <Text style={styles.emptyOptInTitle}>No drivers have opted in yet</Text>
                  <Text style={styles.emptyOptInSubtitle}>
                    Fleet drivers will appear here as they express availability before the deadline.
                  </Text>
                </View>
              )}

              {optedOutDrivers.length ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.modalSectionTitle}>DECLINED / UNAVAILABLE ({optedOutDrivers.length})</Text>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {optedOutDrivers.map((driver) => (
                      <View key={driver.optInId} style={styles.optOutRow}>
                        <Text style={styles.optOutDriverName}>{driver.driverName}</Text>
                        {driver.notes ? <Text style={styles.optOutNote}>“{driver.notes}”</Text> : null}
                        <Text style={styles.optOutTime}>{dateTime(driver.respondedAt)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            <ActionButton style={{ flex: 1 }} variant="secondary" label="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Driver Note Modal
function DriverNoteModal({
  target,
  note,
  busy,
  onChangeNote,
  onClose,
  onSubmit,
}: {
  target: { route: FleetPoolRoute; response: 'opt_in' | 'opt_out' } | null;
  note: string;
  busy: boolean;
  onChangeNote: (text: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!target) return null;
  const isOptIn = target.response === 'opt_in';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close note modal" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalEyebrow}>{isOptIn ? 'CONFIRM AVAILABILITY' : 'DECLINE ROUTE'}</Text>
              <Text style={styles.modalTitle}>{target.route.routeName}</Text>
            </View>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={C.inkMuted} />
            </Pressable>
          </View>

          <Text style={styles.modalHint}>
            {isOptIn
              ? 'Let your business dispatcher know you are available to drive this route.'
              : 'Let dispatch know you are unable to take this route.'}
          </Text>

          <Text style={styles.inputLabel}>Add a note for dispatcher (optional)</Text>
          <TextInput
            accessibilityLabel="Note for dispatcher"
            value={note}
            onChangeText={onChangeNote}
            maxLength={300}
            multiline
            placeholder={isOptIn ? 'e.g. Can start at 9:00 AM, using large van.' : 'e.g. Scheduled for maintenance / other shift.'}
            placeholderTextColor={C.inkSubtle}
            style={[styles.input, styles.messageInput]}
          />
          <Text style={styles.characterCount}>{note.length}/300</Text>

          <View style={styles.modalActions}>
            <ActionButton style={{ flex: 1 }} variant="secondary" label="Cancel" disabled={busy} onPress={onClose} />
            <ActionButton
              style={{ flex: 1 }}
              variant={isOptIn ? 'primary' : 'danger'}
              icon={isOptIn ? 'check' : 'x'}
              label={isOptIn ? 'Confirm Opt-In' : 'Confirm Opt-Out'}
              loading={busy}
              onPress={onSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Confirmation Modal
function ConfirmationModal({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  let title = '';
  let message = '';
  let label = '';
  let icon = 'check-circle';
  let danger = false;

  if (action.type === 'select_driver') {
    title = `Assign to ${action.driver.driverName}?`;
    message = `This will assign "${action.routeName}" to ${action.driver.driverName} and update the route status to assigned. Other candidates will be notified.`;
    label = 'Assign Driver';
    icon = 'user-check';
  } else if (action.type === 'close_fleet') {
    title = `Close fleet pool for "${action.routeName}"?`;
    message = 'Drivers will no longer be able to opt in or out. The route will remain unassigned.';
    label = 'Close Pool';
    icon = 'slash';
    danger = true;
  } else if (action.type === 'accept_bid') {
    title = `Accept bid from ${action.bid.driver?.name || 'driver'}?`;
    message = 'This will accept their bid and assign the route.';
    label = 'Accept Bid';
  } else if (action.type === 'close_public') {
    title = 'Close public listing?';
    message = 'Pending bids will expire and the route will remain unassigned.';
    label = 'Close Listing';
    danger = true;
  } else if (action.type === 'withdraw_bid') {
    title = 'Withdraw this bid?';
    message = 'You will withdraw your offer on this route.';
    label = 'Withdraw';
    danger = true;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Cancel" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.confirmCard}>
          <View style={[styles.confirmIcon, danger && styles.confirmIconDanger]}>
            <Feather name={icon as any} size={24} color={danger ? C.danger : C.primaryDark} />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <ActionButton style={{ flex: 1 }} variant="secondary" label="Go back" disabled={busy} onPress={onClose} />
            <ActionButton
              style={{ flex: 1 }}
              variant={danger ? 'danger' : 'primary'}
              label={label}
              loading={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: S.xl,
    padding: S.xl,
    borderRadius: 20,
    backgroundColor: '#F1F6FC',
    borderWidth: 1,
    borderColor: '#DCE7F3',
    marginBottom: S.xl,
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: S.sm,
  },
  liveStatus: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: S.md,
    borderRadius: R.pill,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#D1FADF',
  },
  liveStatusWarning: { backgroundColor: C.warningSoft },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  liveDotWarning: { backgroundColor: C.warning },
  liveText: { color: C.success, fontSize: 10, fontWeight: '600' },
  liveTextWarning: { color: C.warning },
  heroCompact: { flexDirection: 'column', padding: S.lg },
  heroCopy: { flex: 1, minWidth: 260, justifyContent: 'center' },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: S.sm },
  heroKickerText: { color: '#2867C7', fontSize: 9, fontWeight: '600', letterSpacing: 1.1 },
  heroTitle: { color: '#18324D', fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.4, maxWidth: 620 },
  heroText: { color: '#5E7185', fontSize: 12, lineHeight: 19, marginTop: 8, maxWidth: 660 },
  heroTrustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.lg, marginTop: S.lg },
  heroTrustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTrustText: { color: '#5E7185', fontSize: 10, fontWeight: '500' },
  heroMetrics: { minWidth: 280, flexDirection: 'row', alignItems: 'stretch', gap: S.sm },
  heroMetricsCompact: { minWidth: 0, width: '100%' },
  heroMetric: {
    flex: 1,
    minWidth: 88,
    justifyContent: 'space-between',
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E4EF',
  },
  heroMetricAccent: { backgroundColor: '#E8F5EF', borderColor: '#CEE5D9' },
  heroMetricValue: { color: '#23405F', fontSize: 26, lineHeight: 30, fontWeight: '600' },
  heroMetricValueAccent: { color: '#176B51' },
  heroMetricLabel: { color: '#6A7D8F', fontSize: 9, lineHeight: 13, marginTop: S.md, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' },
  heroMetricLabelAccent: { color: '#39715E' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    borderWidth: 1,
    borderColor: '#F1B8C1',
    borderRadius: R.md,
    backgroundColor: C.dangerSoft,
    marginBottom: S.lg,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 12, lineHeight: 18 },
  tabs: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.pill,
    backgroundColor: C.surfaceMuted,
    marginBottom: S.xl,
  },
  tab: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.lg, borderRadius: R.pill },
  tabActive: { backgroundColor: C.surface, shadowColor: '#101828', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  tabText: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: C.primaryDark },
  tabCount: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
  tabCountActive: { backgroundColor: C.primarySoft },
  tabCountText: { color: C.inkMuted, fontSize: 10, fontWeight: '600' },
  tabCountTextActive: { color: C.primaryDark },
  listHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: S.lg, paddingBottom: S.md },
  listKicker: { color: C.primaryDark, fontSize: 9, fontWeight: '600', letterSpacing: 1.1 },
  listTitle: { color: C.ink, fontSize: 18, fontWeight: '600', marginTop: 4 },
  listHint: { color: C.inkMuted, fontSize: 11, lineHeight: 16 },
  list: { gap: S.md },
  card: {
    borderWidth: 1,
    borderColor: '#DEE6EC',
    borderRadius: 18,
    backgroundColor: C.surface,
    padding: S.xl,
    shadowColor: '#28425C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.025,
    shadowRadius: 12,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginBottom: S.lg },
  routeIdentityIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: '#D5E5FF',
  },
  eyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { color: C.ink, fontSize: 18, fontWeight: '600', marginTop: 3 },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  deadlineActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  deadlineUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  deadlinePassed: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  deadlineText: { fontSize: 11, fontWeight: '600' },
  deadlineActiveText: { color: '#1D4ED8' },
  deadlineUrgentText: { color: '#DC2626' },
  deadlinePassedText: { color: '#64748B' },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  responseOptIn: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  responseOptInText: { color: '#047857', fontSize: 11, fontWeight: '600' },
  responseOptOut: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  responseOptOutText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  responsePending: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  responsePendingText: { color: '#1D4ED8', fontSize: 11, fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg },
  factsCompact: { flexDirection: 'column' },
  fact: {
    minWidth: 180,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#EDF1F6',
  },
  factLabel: { color: C.inkSubtle, fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { color: C.ink, fontSize: 11, fontWeight: '600', marginTop: 3 },
  factValueHighlight: { color: C.primaryDark },
  addressPath: {
    flexDirection: 'row',
    gap: S.md,
    padding: S.lg,
    borderWidth: 1,
    borderColor: '#DCE7F5',
    borderRadius: R.md,
    backgroundColor: '#FBFDFF',
  },
  addressRail: { width: 12, alignItems: 'center', paddingVertical: 4 },
  startDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
  addressLine: { width: 1, flex: 1, minHeight: 20, backgroundColor: C.lineStrong },
  endDot: { width: 9, height: 9, borderRadius: 2, backgroundColor: C.danger },
  addressText: { color: C.inkMuted, fontSize: 12, lineHeight: 17 },
  driverNoteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: S.sm,
  },
  driverNoteText: { color: '#334155', fontSize: 12, fontStyle: 'italic' },
  cardFooter: {
    minHeight: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: S.md,
    marginTop: S.lg,
  },
  marketSignal: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  marketSignalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  bidMeta: { color: C.inkMuted, fontSize: 11, lineHeight: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  optInCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.pill,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  optInCountPillText: { fontSize: 12, color: '#166534' },
  awardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.pill,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  awardedBadgeText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  bidAmount: { color: C.primaryDark, fontSize: 18, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.lg,
    backgroundColor: 'rgba(24,50,77,0.36)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    padding: S.xl,
  },
  reviewModalCard: {
    width: '100%',
    maxWidth: 620,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    padding: S.xl,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  modalEyebrow: { color: C.primaryDark, fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: '600', marginTop: 3 },
  modalHint: { color: C.inkMuted, fontSize: 12, marginTop: S.sm, marginBottom: S.lg },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  modalSectionHeading: { marginBottom: 12 },
  modalSectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  modalSectionHint: { color: '#64748B', fontSize: 12, marginTop: 2 },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  candidateCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  avatarText: { color: C.primaryDark, fontSize: 15, fontWeight: '600' },
  candidateName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  optInPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optInPillText: { color: '#166534', fontSize: 10, fontWeight: '600' },
  candidateContact: { color: '#64748B', fontSize: 11, marginTop: 2 },
  candidateNote: { color: '#334155', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  respondedTimeText: { color: '#94A3B8', fontSize: 10, marginTop: 3 },
  emptyOptInBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  emptyOptInTitle: { color: '#334155', fontSize: 14, fontWeight: '600', marginTop: 8 },
  emptyOptInSubtitle: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 4, maxWidth: 320 },
  optOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  optOutDriverName: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  optOutNote: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic' },
  optOutTime: { color: '#94A3B8', fontSize: 10 },
  inlineLoading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: S.sm },
  inputLabel: { color: C.inkMuted, fontSize: 11, fontWeight: '600', marginBottom: 7 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.lineStrong,
    borderRadius: R.md,
    color: C.ink,
    fontSize: 14,
    paddingHorizontal: S.md,
    marginBottom: S.lg,
  },
  messageInput: { minHeight: 80, paddingTop: S.md, textAlignVertical: 'top', marginBottom: 4 },
  characterCount: { color: C.inkSubtle, fontSize: 10, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: S.md, marginTop: S.lg },
  confirmCard: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    borderRadius: R.lg,
    backgroundColor: C.surface,
    padding: S.xl,
  },
  confirmIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  confirmIconDanger: { backgroundColor: C.dangerSoft },
  confirmTitle: { color: C.ink, fontSize: 19, fontWeight: '600', textAlign: 'center', marginTop: S.lg },
  confirmMessage: { color: C.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: S.sm },
});
