import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteHistoryActionSheet } from "./../../components/route-history/RouteHistoryActionSheet";
import { RouteHistoryMap } from "./../../components/route-history/RouteHistoryMap";
import { RouteStopDetailsSheet } from "./../../components/route-history/RouteStopDetailsSheet";
import {
  deleteRouteHistory,
  duplicateRouteHistory,
  getRouteHistoryDetail,
} from "./../../services/route-history.adapter";
import type {
  RouteHistoryRoute,
  RouteHistoryStop,
} from "./../../components/route-history/route-history";

type DetailTab = "summary" | "map";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "summary", label: "Summary" },
  // { key: "map", label: "Map" },
];

const normalizeDistanceValue = (value?: number) => {
  if (!Number.isFinite(value) || !value || value <= 0) return 0;
  return value > 10000 ? value * 0.000621371 : value;
};

const formatDistance = (value?: number) => {
  const distance = normalizeDistanceValue(value);
  if (!distance) return "--";
  return `${distance.toFixed(1)} mi`;
};

const formatSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const totalMinutes = Math.round(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const normalizeDurationText = (route: RouteHistoryRoute) => {
  if (route.durationSeconds && route.durationSeconds > 0) {
    return formatSeconds(route.durationSeconds);
  }

  const text = route.durationText || "--";
  const hoursMatch = text.match(/([\d.]+)\s*h/i);
  const minutesMatch = text.match(/([\d.]+)\s*m/i);
  const hours = Number(hoursMatch?.[1] || 0);
  const minutes = Number(minutesMatch?.[1] || 0);

  // Defensive fix for APIs that formatted seconds as minutes.
  if (hours > 96) {
    const incorrectlyFormattedMinutes = hours * 60 + minutes;
    return formatSeconds(incorrectlyFormattedMinutes);
  }

  return text;
};

const isDeliveredStop = (stop: RouteHistoryStop) =>
  ["completed", "delivered", "on_time", "delayed"].includes(stop.status);

const getStopVisual = (stop: RouteHistoryStop, isCurrent: boolean) => {
  if (isCurrent) {
    return {
      marker: "#2563EB",
      badgeBackground: "#EFF6FF",
      badgeBorder: "#BFDBFE",
      badgeText: "#1D4ED8",
      icon: "navigation" as const,
    };
  }
  if (stop.status === "failed") {
    return {
      marker: "#EF4444",
      badgeBackground: "#FEF2F2",
      badgeBorder: "#FECACA",
      badgeText: "#DC2626",
      icon: "x" as const,
    };
  }
  if (stop.status === "delayed") {
    return {
      marker: "#F59E0B",
      badgeBackground: "#FFFBEB",
      badgeBorder: "#FDE68A",
      badgeText: "#B45309",
      icon: "clock" as const,
    };
  }
  if (isDeliveredStop(stop)) {
    return {
      marker: "#16A34A",
      badgeBackground: "#ECFDF5",
      badgeBorder: "#BBF7D0",
      badgeText: "#15803D",
      icon: "check" as const,
    };
  }
  return {
    marker: "#CBD5E1",
    badgeBackground: "#F8FAFC",
    badgeBorder: "#E2E8F0",
    badgeText: "#64748B",
    icon: "circle" as const,
  };
};

const getRouteStatusVisual = (status: RouteHistoryRoute["status"]) => {
  if (status === "completed") {
    return {
      icon: "check" as const,
      color: "#15803D",
      background: "#16A34A",
      soft: "#ECFDF5",
    };
  }
  if (status === "cancelled") {
    return {
      icon: "x" as const,
      color: "#DC2626",
      background: "#EF4444",
      soft: "#FEF2F2",
    };
  }
  if (status === "active") {
    return {
      icon: "navigation" as const,
      color: "#1D4ED8",
      background: "#2563EB",
      soft: "#EFF6FF",
    };
  }
  return {
    icon: "clock" as const,
    color: "#B45309",
    background: "#F59E0B",
    soft: "#FFFBEB",
  };
};

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Feather name={icon} size={15} color="#64748B" />
      </View>
      <View style={styles.metricTextBox}>
        <Text numberOfLines={1} style={styles.metricValue}>
          {value}
        </Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CountItem({
  label,
  value,
  color,
  showDivider,
}: {
  label: string;
  value: number;
  color: string;
  showDivider?: boolean;
}) {
  return (
    <View style={[styles.countItem, showDivider && styles.countItemBorder]}>
      <Text style={styles.countLabel}>{label}</Text>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={15} color="#64748B" />
      </View>
      <View style={styles.infoTextBox}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text selectable style={styles.infoValue}>
          {value || "--"}
        </Text>
      </View>
    </View>
  );
}

function JourneyEndpoint({
  type,
  time,
  title,
  address,
  isLast,
}: {
  type: "start" | "end";
  time: string;
  title: string;
  address: string;
  isLast?: boolean;
}) {
  const isStart = type === "start";

  return (
    <View style={styles.stopOuterRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.stopTime}>{time || "--"}</Text>
        <Text style={styles.stopTimeLabel}>{isStart ? "Start" : "End"}</Text>
      </View>

      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.endpointMarker,
            isStart ? styles.startMarker : styles.endMarker,
          ]}
        >
          <Feather
            name={isStart ? "navigation" : "flag"}
            size={12}
            color="#FFFFFF"
          />
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>

      <View style={[styles.stopBody, styles.endpointBody]}>
        <Text style={styles.stopTitle}>{title}</Text>
        <Text style={styles.stopAddress}>{address}</Text>
      </View>
    </View>
  );
}

function StopTimelineRow({
  stop,
  isCurrent,
  isLast,
  onPress,
}: {
  stop: RouteHistoryStop;
  isCurrent: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const visual = getStopVisual(stop, isCurrent);
  const orderLabel = stop.orderNumber || stop.orderId || `Order ${stop.sequence}`;
  const displayTime = stop.actualTime || stop.eta || "--";

  return (
    <View style={styles.stopOuterRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.stopTime}>{displayTime}</Text>
        <Text style={styles.stopTimeLabel}>
          {stop.actualTime ? "Arrived" : "ETA"}
        </Text>
      </View>

      <View style={styles.timelineColumn}>
        <View style={[styles.stopMarker, { backgroundColor: visual.marker }]}>
          {isCurrent || isDeliveredStop(stop) || stop.status === "failed" ? (
            <Feather name={visual.icon} size={11} color="#FFFFFF" />
          ) : (
            <Text style={styles.stopMarkerText}>{stop.sequence}</Text>
          )}
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.stopBody,
          isCurrent && styles.currentStopBody,
          pressed && styles.stopBodyPressed,
        ]}
        onPress={onPress}
      >
        <View style={styles.stopHeaderRow}>
          <Text numberOfLines={1} style={styles.stopTitle}>
            {stop.title}
          </Text>
          <View
            style={[
              styles.stopBadge,
              {
                backgroundColor: visual.badgeBackground,
                borderColor: visual.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.stopBadgeText, { color: visual.badgeText }]}>
              {isCurrent ? "Current" : stop.statusLabel}
            </Text>
          </View>
          <Feather name="chevron-right" size={17} color="#CBD5E1" />
        </View>

        <Text style={styles.stopAddress}>{stop.address}</Text>

        <View style={styles.stopChipsRow}>
          <View style={styles.orderChip}>
            <Feather name="package" size={12} color="#475569" />
            <Text style={styles.orderChipText}>{orderLabel}</Text>
          </View>
          {stop.proofCount ? (
            <View style={styles.proofChip}>
              <Feather name="image" size={12} color="#2563EB" />
              <Text style={styles.proofChipText}>{stop.proofCount} proof</Text>
            </View>
          ) : null}
          {stop.delayMinutes ? (
            <View style={styles.delayChip}>
              <Feather name="clock" size={12} color="#B45309" />
              <Text style={styles.delayChipText}>+{stop.delayMinutes} min</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export default function RouteHistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; tab?: DetailTab }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [route, setRoute] = useState<RouteHistoryRoute | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>(
    params.tab === "map" ? "map" : "summary",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<RouteHistoryStop | null>(null);

  const routeId = String(params.id || "");

  useEffect(() => {
    if (params.tab === "map" || params.tab === "summary") {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    let isActive = true;

    const loadRoute = async () => {
      try {
        setIsLoading(true);
        const detail = await getRouteHistoryDetail(routeId);
        if (isActive) setRoute(detail);
      } catch (error: any) {
        Alert.alert(
          "Route history",
          error?.message || "Unable to load route details.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    if (routeId) loadRoute();
    else setIsLoading(false);

    return () => {
      isActive = false;
    };
  }, [routeId]);

  const routeTime = useMemo(() => {
    if (!route) return "";
    return `${route.fullDateLabel} · ${route.startTime} - ${route.endTime}`;
  }, [route]);

  const duration = useMemo(
    () => (route ? normalizeDurationText(route) : "--"),
    [route],
  );

  const stopSummary = useMemo(() => {
    if (!route) return { delivered: 0, failed: 0, pending: 0 };

    const delivered = route.stops.filter(isDeliveredStop).length;
    const failed = route.stops.filter((stop) => stop.status === "failed").length;
    const pending = route.stops.filter(
      (stop) => !isDeliveredStop(stop) && stop.status !== "failed",
    ).length;

    return { delivered, failed, pending };
  }, [route]);

  const currentStop = useMemo(() => {
    if (!route) return null;
    if (route.currentStopId) {
      const explicit = route.stops.find((stop) => stop.id === route.currentStopId);
      if (explicit) return explicit;
    }
    return route.stops.find(
      (stop) => !isDeliveredStop(stop) && stop.status !== "failed",
    ) || null;
  }, [route]);

  const handleBack = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/route-history" as never);
  };

  const handleDuplicate = async () => {
    if (!route) return;
    try {
      const result = await duplicateRouteHistory(route.id);
      setIsSheetOpen(false);
      router.push({
        pathname: "/setup-locations",
        params: {
          duplicateFrom: String(result?.route_id || result?.id || route.id),
        },
      } as never);
    } catch (error: any) {
      Alert.alert(
        "Duplicate route",
        error?.message || "Unable to duplicate route.",
      );
    }
  };

  const handleDelete = async () => {
    if (!route) return;

    Alert.alert("Delete route?", "This will remove the route from history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRouteHistory(route.id);
            setIsSheetOpen(false);
            router.replace("/route-history" as never);
          } catch (error: any) {
            Alert.alert(
              "Delete route",
              error?.message || "Unable to delete route.",
            );
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!route) return;

    await Share.share({
      message: `${route.title}\n${routeTime}\nStops: ${route.stopsCount}\nDistance: ${formatDistance(route.distanceKm)}\nDuration: ${duration}\nDelivered: ${stopSummary.delivered}\nFailed: ${stopSummary.failed}\nPending: ${stopSummary.pending}`,
    });
  };

  const renderStatusOverview = () => {
    if (!route) return null;
    const visual = getRouteStatusVisual(route.status);
    const progress = route.stopsCount
      ? Math.round(
          ((stopSummary.delivered + stopSummary.failed) / route.stopsCount) * 100,
        )
      : 0;

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <View
            style={[styles.statusIcon, { backgroundColor: visual.background }]}
          >
            <Feather name={visual.icon} size={17} color="#FFFFFF" />
          </View>
          <View style={styles.statusTextBox}>
            <Text style={[styles.statusTitle, { color: visual.color }]}>
              {route.statusLabel}
            </Text>
            <Text numberOfLines={1} style={styles.statusSubtitle}>
              {routeTime}
            </Text>
          </View>
          <View style={[styles.progressPill, { backgroundColor: visual.soft }]}>
            <Text style={[styles.progressPillText, { color: visual.color }]}>
              {route.status === "completed" ? "Complete" : `${progress}% done`}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard icon="map-pin" label="Stops" value={route.stopsCount} />
          <MetricCard
            icon="navigation"
            label="Distance"
            value={formatDistance(route.distanceKm)}
          />
          <MetricCard icon="clock" label="Duration" value={duration} />
          <MetricCard
            icon="activity"
            label="On-time"
            value={`${route.onTimePercentage || 0}%`}
          />
        </View>
      </View>
    );
  };

  const renderProgressCard = () => {
    if (!route) return null;
    const isActive = route.status === "active";

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>ROUTE PROGRESS</Text>
            <Text style={styles.sectionTitle}>
              {isActive ? "Current progress" : "Delivery result"}
            </Text>
          </View>
          <Feather name="activity" size={18} color="#2563EB" />
        </View>

        <View style={styles.remainingRow}>
          <View style={styles.remainingItem}>
            <Text style={styles.remainingLabel}>
              {isActive ? "Remaining" : "Total time"}
            </Text>
            <Text style={styles.remainingValue}>
              {isActive && route.remainingDurationText
                ? route.remainingDurationText
                : duration}
            </Text>
          </View>
          <View style={styles.remainingDivider} />
          <View style={styles.remainingItem}>
            <Text style={styles.remainingLabel}>
              {isActive ? "Distance left" : "Distance"}
            </Text>
            <Text style={styles.remainingValue}>
              {formatDistance(
                isActive && route.remainingDistanceKm
                  ? route.remainingDistanceKm
                  : route.distanceKm,
              )}
            </Text>
          </View>
        </View>

        <View style={styles.countsRow}>
          <CountItem label="Delivered" value={stopSummary.delivered} color="#16A34A" />
          <CountItem
            label="Failed"
            value={stopSummary.failed}
            color="#EF4444"
            showDivider
          />
          <CountItem
            label="Pending"
            value={stopSummary.pending}
            color="#0F172A"
            showDivider
          />
        </View>

        {currentStop ? (
          <Pressable
            style={styles.currentStopCard}
            onPress={() => setSelectedStop(currentStop)}
          >
            <View style={styles.currentStopIcon}>
              <Feather name="navigation" size={17} color="#2563EB" />
            </View>
            <View style={styles.currentStopTextBox}>
              <Text style={styles.currentStopLabel}>Current stop</Text>
              <Text numberOfLines={1} style={styles.currentStopTitle}>
                {currentStop.title}
              </Text>
              <Text numberOfLines={1} style={styles.currentStopAddress}>
                {currentStop.address}
              </Text>
            </View>
            <View style={styles.currentStopEtaBox}>
              <Text style={styles.currentStopEtaLabel}>ETA</Text>
              <Text style={styles.currentStopEta}>{currentStop.eta || "--"}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#93C5FD" />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderStopsCard = () => {
    if (!route) return null;

    return (
      <View style={styles.stopsCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>STOP SUMMARY</Text>
            <Text style={styles.sectionTitle}>Route stops</Text>
          </View>
          <Text style={styles.sectionCount}>{route.stopsCount} stops</Text>
        </View>

        <View style={styles.timelineList}>
          <JourneyEndpoint
            type="start"
            time={route.startTime}
            title="Start location"
            address={route.startLocation}
          />

          {route.stops.map((stop, index) => (
            <StopTimelineRow
              key={stop.id}
              stop={stop}
              isCurrent={currentStop?.id === stop.id && route.status === "active"}
              isLast={false}
              onPress={() => setSelectedStop(stop)}
            />
          ))}

          <JourneyEndpoint
            type="end"
            time={route.endTime}
            title="End location"
            address={route.endLocation}
            isLast
          />
        </View>
      </View>
    );
  };

  const renderDetailsCard = () => {
    if (!route) return null;

    return (
      <View style={styles.detailsCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>ROUTE INFORMATION</Text>
            <Text style={styles.sectionTitle}>Route details</Text>
          </View>
          <Feather name="info" size={18} color="#64748B" />
        </View>

        <View style={styles.infoRowsBox}>
          <InfoRow icon="user" label="Driver" value={route.driverName || "Not assigned"} />
          <InfoRow icon="truck" label="Vehicle" value={route.vehicleName || "Not assigned"} />
          <InfoRow icon="play-circle" label="Start location" value={route.startLocation} />
          <InfoRow icon="map-pin" label="End location" value={route.endLocation} />
          {route.notes ? <InfoRow icon="file-text" label="Notes" value={route.notes} /> : null}
        </View>
      </View>
    );
  };

  const renderSummary = () => {
    if (!route) return null;

    if (isWide) {
      return (
        <View style={styles.summaryWideGrid}>
          <View style={styles.summaryMainColumn}>
            {renderProgressCard()}
            {renderStopsCard()}
          </View>
          <View style={styles.summarySideColumn}>
            <RouteHistoryMap route={route} height={330} />
            {renderDetailsCard()}
          </View>
        </View>
      );
    }

    return (
      <View>
        {renderProgressCard()}
        {/* <View style={styles.mobileSectionSpacing}>
          <RouteHistoryMap route={route} height={250} />
        </View> */}
        {renderStopsCard()}
        {renderDetailsCard()}
      </View>
    );
  };

  const renderMap = () => {
    if (!route) return null;

    return (
      <View style={styles.mapTabContent}>
        <RouteHistoryMap route={route} height={isWide ? 540 : 390} />
        <View style={styles.mapInfoGrid}>
          <View style={styles.mapEndpointCard}>
            <View style={[styles.mapEndpointIcon, styles.mapStartIcon]}>
              <Feather name="navigation" size={15} color="#FFFFFF" />
            </View>
            <View style={styles.mapEndpointTextBox}>
              <Text style={styles.mapEndpointLabel}>Start</Text>
              <Text numberOfLines={2} style={styles.mapEndpointValue}>
                {route.startLocation}
              </Text>
            </View>
          </View>
          <View style={styles.mapEndpointCard}>
            <View style={[styles.mapEndpointIcon, styles.mapEndIcon]}>
              <Feather name="flag" size={15} color="#FFFFFF" />
            </View>
            <View style={styles.mapEndpointTextBox}>
              <Text style={styles.mapEndpointLabel}>End</Text>
              <Text numberOfLines={2} style={styles.mapEndpointValue}>
                {route.endLocation}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerShell}>
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton} onPress={handleBack}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleBox}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {route?.title || "Route history"}
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {routeTime || "Loading route details"}
            </Text>
          </View>

          <Pressable
            style={styles.iconButton}
            onPress={() => setIsSheetOpen(true)}
            disabled={!route}
          >
            <Feather name="more-vertical" size={20} color="#0F172A" />
          </Pressable>
        </View>

        {/* <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {isActive ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </View> */}
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.centerText}>Loading route details...</Text>
        </View>
      ) : route ? (
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 94 },
          ]}
        >
          <View style={styles.contentShell}>
            {renderStatusOverview()}
            <View style={styles.mainContentSpacing}>
              {activeTab === "summary" ? renderSummary() : renderMap()}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.centerBox}>
          <View style={styles.emptyIcon}>
            <Feather name="alert-circle" size={22} color="#2563EB" />
          </View>
          <Text style={styles.emptyTitle}>Route not found</Text>
          <Pressable style={styles.returnButton} onPress={handleBack}>
            <Text style={styles.returnButtonText}>Return to history</Text>
          </Pressable>
        </View>
      )}

      {route ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.bottomBarShell}>
            <Pressable style={styles.primaryButton} onPress={handleDuplicate}>
              <Feather name="copy" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Duplicate route</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <RouteHistoryActionSheet
        visible={isSheetOpen}
        route={route}
        onClose={() => setIsSheetOpen(false)}
        onDuplicate={handleDuplicate}
        onDownloadReport={() =>
          Alert.alert(
            "Download report",
            "Connect this action to your route report endpoint.",
          )
        }
        onShareSummary={handleShare}
        onViewProof={() => {
          setIsSheetOpen(false);
          setActiveTab("summary");
        }}
        onDelete={handleDelete}
      />

      <RouteStopDetailsSheet
        visible={Boolean(selectedStop)}
        stop={selectedStop}
        onClose={() => setSelectedStop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F9FD",
  },
  headerShell: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },
  headerRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAF3",
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "600",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
  },
  tabBar: {
    marginTop: 14,
    paddingHorizontal: 16,
    height: 44,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
  },
  tabButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#2563EB",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  contentShell: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },
  statusCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAF3",
    padding: 14,
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statusTextBox: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
  },
  statusSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  progressPill: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  progressPillText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  metricsGrid: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    minWidth: 135,
    flexGrow: 1,
    flexBasis: "22%",
    minHeight: 62,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  metricIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  metricTextBox: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  mainContentSpacing: {
    marginTop: 14,
  },
  summaryWideGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  summaryMainColumn: {
    flex: 1.15,
    minWidth: 0,
    gap: 14,
  },
  summarySideColumn: {
    flex: 0.85,
    minWidth: 0,
    gap: 14,
  },
  mobileSectionSpacing: {
    marginTop: 14,
    marginBottom: 14,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 0.7,
    color: "#64748B",
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#0F172A",
  },
  sectionCount: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#64748B",
  },
  remainingRow: {
    marginTop: 13,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  remainingItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 15,
  },
  remainingLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  remainingValue: {
    marginTop: 5,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: "#0F172A",
  },
  remainingDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E2E8F0",
  },
  countsRow: {
    marginTop: 12,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  countItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
  },
  countLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  countValue: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  currentStopCard: {
    marginTop: 12,
    minHeight: 74,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  currentStopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  currentStopTextBox: {
    flex: 1,
    minWidth: 0,
  },
  currentStopLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  currentStopTitle: {
    marginTop: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  currentStopAddress: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#475569",
  },
  currentStopEtaBox: {
    alignItems: "flex-end",
    marginHorizontal: 10,
  },
  currentStopEtaLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    color: "#64748B",
  },
  currentStopEta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
  stopsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginTop: 14,
  },
  timelineList: {
    marginTop: 15,
  },
  stopOuterRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timeColumn: {
    width: 60,
    alignItems: "flex-end",
    paddingTop: 10,
    paddingRight: 8,
  },
  stopTime: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#334155",
  },
  stopTimeLabel: {
    marginTop: 2,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "400",
    color: "#94A3B8",
  },
  timelineColumn: {
    width: 30,
    alignItems: "center",
  },
  stopMarker: {
    marginTop: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  stopMarkerText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: "#475569",
  },
  endpointMarker: {
    marginTop: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  startMarker: { backgroundColor: "#2563EB" },
  endMarker: { backgroundColor: "#EF4444" },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 24,
    backgroundColor: "#DBEAFE",
    marginVertical: 4,
  },
  stopBody: {
    flex: 1,
    minWidth: 0,
    borderRadius: 15,
    padding: 11,
    marginLeft: 6,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "transparent",
  },
  endpointBody: {
    paddingTop: 9,
    paddingBottom: 18,
  },
  currentStopBody: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },
  stopBodyPressed: {
    backgroundColor: "#F8FAFC",
  },
  stopHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  stopTitle: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  stopAddress: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "400",
    color: "#475569",
  },
  stopBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderWidth: 1,
  },
  stopBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  stopChipsRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  orderChip: {
    minHeight: 25,
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
  },
  orderChipText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#475569",
  },
  proofChip: {
    minHeight: 25,
    borderRadius: 12.5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
  },
  proofChipText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#2563EB",
  },
  delayChip: {
    minHeight: 25,
    borderRadius: 12.5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
  },
  delayChipText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#B45309",
  },
  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginTop: 14,
  },
  infoRowsBox: {
    marginTop: 10,
  },
  infoRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoTextBox: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  infoValue: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#0F172A",
  },
  mapTabContent: {
    gap: 14,
  },
  mapInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mapEndpointCard: {
    minWidth: 260,
    flex: 1,
    minHeight: 76,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  mapEndpointIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  mapStartIcon: { backgroundColor: "#16A34A" },
  mapEndIcon: { backgroundColor: "#EF4444" },
  mapEndpointTextBox: {
    flex: 1,
    minWidth: 0,
  },
  mapEndpointLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  mapEndpointValue: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#0F172A",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: "#64748B",
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    color: "#0F172A",
  },
  returnButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  returnButtonText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 11,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2EAF3",
  },
  bottomBarShell: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryButtonText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
