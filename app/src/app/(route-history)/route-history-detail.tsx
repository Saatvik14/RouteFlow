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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteHistoryActionSheet } from "./../../components/route-history/RouteHistoryActionSheet";
import {
  deleteRouteHistory,
  duplicateRouteHistory,
  getRouteHistoryDetail,
} from "./../../services/route-history.adapter";
import type {
  RouteHistoryRoute,
  RouteHistoryStop,
} from "./../../components/route-history/route-history";

type DetailTab = "summary" | "stops" | "map" | "analytics";

const TABS: { key: DetailTab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "stops", label: "Stops" },
  { key: "map", label: "Map" },
  { key: "analytics", label: "Analytics" },
];

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function BigMapPreview({ route }: { route: RouteHistoryRoute }) {
  const dots = Array.from({
    length: Math.min(Math.max(route.stopsCount, 5), 10),
  });

  return (
    <View style={styles.bigMapCard}>
      <View style={styles.bigMapRouteLine} />
      <View style={styles.bigMapStartPin}>
        <Feather name="play" size={10} color="#FFFFFF" />
      </View>
      {dots.map((_, index) => (
        <View
          key={index}
          style={[
            styles.bigMapDot,
            {
              left: 42 + index * 24,
              top: index % 3 === 0 ? 58 : index % 3 === 1 ? 35 : 72,
            },
          ]}
        >
          <Text style={styles.bigMapDotText}>{index + 1}</Text>
        </View>
      ))}
      <View style={styles.bigMapEndPin}>
        <Feather name="map-pin" size={12} color="#FFFFFF" />
      </View>
    </View>
  );
}

function StopTimelineRow({
  stop,
  isLast,
}: {
  stop: RouteHistoryStop;
  isLast: boolean;
}) {
  const isDelayed = stop.status === "delayed" || stop.status === "failed";

  return (
    <View style={styles.stopRow}>
      <View style={styles.timelineRailBox}>
        <View
          style={[styles.stopNumber, isDelayed && styles.stopNumberWarning]}
        >
          <Text style={styles.stopNumberText}>{stop.sequence}</Text>
        </View>
        {!isLast ? <View style={styles.timelineRail} /> : null}
      </View>

      <View style={styles.stopContent}>
        <View style={styles.stopTitleRow}>
          <Text numberOfLines={1} style={styles.stopTitle}>
            {stop.title}
          </Text>
          <View
            style={[
              styles.stopBadge,
              isDelayed ? styles.stopBadgeWarning : styles.stopBadgeOk,
            ]}
          >
            <Text
              style={[
                styles.stopBadgeText,
                isDelayed
                  ? styles.stopBadgeTextWarning
                  : styles.stopBadgeTextOk,
              ]}
            >
              {stop.statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.stopMeta}>
          {stop.eta} • {stop.address}
        </Text>
        {stop.proofCount ? (
          <View style={styles.proofChip}>
            <Feather name="image" size={12} color="#2563EB" />
            <Text style={styles.proofChipText}>{stop.proofCount} proof</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function RouteHistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; tab?: DetailTab }>();
  const insets = useSafeAreaInsets();

  const [route, setRoute] = useState<RouteHistoryRoute | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>(
    params.tab || "summary",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const routeId = String(params.id || "");

  useEffect(() => {
    if (params.tab) setActiveTab(params.tab);
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

    return () => {
      isActive = false;
    };
  }, [routeId]);

  const routeTime = useMemo(() => {
    if (!route) return "";
    return `${route.fullDateLabel} • ${route.startTime} - ${route.endTime}`;
  }, [route]);

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
      message: `${route.title}\n${routeTime}\nStops: ${route.stopsCount}\nDistance: ${route.distanceKm} km\nDuration: ${route.durationText}\nOn-time: ${route.onTimePercentage}%`,
    });
  };

  const renderSummary = () => {
    if (!route) return null;

    return (
      <View>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIcon}>
              <Feather name="check" size={17} color="#FFFFFF" />
            </View>
            <View style={styles.statusTextBox}>
              <Text style={styles.statusTitle}>{route.statusLabel}</Text>
              <Text style={styles.statusSubtitle}>{routeTime}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard label="Stops" value={route.stopsCount} />
            <MetricCard
              label="Distance"
              value={`${route.distanceKm || "--"} km`}
            />
            <MetricCard label="Duration" value={route.durationText} />
            <MetricCard label="On-time" value={`${route.onTimePercentage}%`} />
          </View>
        </View>

        <BigMapPreview route={route} />

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Route Details</Text>
          <InfoRow label="Driver" value={route.driverName} />
          <InfoRow label="Vehicle" value={route.vehicleName} />
          <InfoRow label="Start Location" value={route.startLocation} />
          <InfoRow label="End Location" value={route.endLocation} />
          <InfoRow label="Notes" value={route.notes || "-"} />
        </View>
      </View>
    );
  };

  const renderStops = () => {
    if (!route) return null;

    return (
      <View style={styles.timelineCard}>
        <StopTimelineRow
          stop={{
            id: "start",
            sequence: 0,
            title: "Start",
            address: route.startLocation,
            eta: route.startTime,
            status: "on_time",
            statusLabel: "On-time",
          }}
          isLast={false}
        />

        {route.stops.map((stop, index) => (
          <StopTimelineRow key={stop.id} stop={stop} isLast={false} />
        ))}

        <View style={styles.endRow}>
          <View style={styles.timelineRailBox}>
            <View style={styles.endPin}>
              <Feather name="flag" size={12} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.stopContent}>
            <Text style={styles.stopTitle}>End</Text>
            <Text style={styles.stopMeta}>
              {route.endTime} • {route.endLocation}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMap = () => {
    if (!route) return null;

    return (
      <View>
        <BigMapPreview route={route} />
        <Pressable
          style={styles.replayButton}
          onPress={() =>
            Alert.alert(
              "Route replay",
              "Connect this to saved route geometry/playback data.",
            )
          }
        >
          <Feather name="play-circle" size={18} color="#FFFFFF" />
          <Text style={styles.replayButtonText}>Replay route</Text>
        </Pressable>
      </View>
    );
  };

  const renderAnalytics = () => {
    if (!route) return null;

    const delayedStops = route.stops.filter(
      (stop) => stop.status === "delayed",
    ).length;
    const proofCoverage =
      route.stopsCount > 0
        ? Math.round((route.proofCount / route.stopsCount) * 100)
        : 0;

    return (
      <View style={styles.analyticsGrid}>
        <MetricCard
          label="On-time delivery"
          value={`${route.onTimePercentage}%`}
        />
        <MetricCard label="Delayed stops" value={delayedStops} />
        <MetricCard label="Proof coverage" value={`${proofCoverage}%`} />
        <MetricCard
          label="Avg km / stop"
          value={
            route.stopsCount
              ? `${(route.distanceKm / route.stopsCount).toFixed(1)}`
              : "--"
          }
        />
      </View>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "summary") return renderSummary();
    if (activeTab === "stops") return renderStops();
    if (activeTab === "map") return renderMap();
    return renderAnalytics();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
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

      <View style={styles.tabBar}>
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
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.centerText}>Loading details...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 92 },
          ]}
        >
          {renderActiveTab()}
        </ScrollView>
      )}

      {route ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setActiveTab("analytics")}
          >
            <Feather name="bar-chart-2" size={16} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>View Analytics</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={handleDuplicate}>
            <Feather name="copy" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Duplicate Route</Text>
          </Pressable>
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
            "Connect this button to your backend PDF report endpoint.",
          )
        }
        onShareSummary={handleShare}
        onViewProof={() => {
          setIsSheetOpen(false);
          setActiveTab("stops");
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FBFF",
  },
  headerRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },
  tabBar: {
    marginTop: 16,
    paddingHorizontal: 16,
    height: 42,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EDF8",
    backgroundColor: "#FFFFFF",
  },
  tabButton: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: 42,
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
  statusCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    padding: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statusTextBox: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#16A34A",
  },
  statusSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  metricsGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  metricValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  bigMapCard: {
    height: 190,
    borderRadius: 20,
    backgroundColor: "#EEF7EA",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    overflow: "hidden",
    marginTop: 14,
  },
  bigMapRouteLine: {
    position: "absolute",
    left: 38,
    right: 38,
    top: 84,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2F76F6",
    transform: [{ rotate: "-12deg" }],
  },
  bigMapStartPin: {
    position: "absolute",
    left: 22,
    top: 100,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  bigMapEndPin: {
    position: "absolute",
    right: 22,
    top: 54,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  bigMapDot: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bigMapDotText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  detailsCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  infoRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    width: 112,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  timelineCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    padding: 14,
  },
  stopRow: {
    flexDirection: "row",
    minHeight: 76,
  },
  endRow: {
    flexDirection: "row",
    minHeight: 46,
  },
  timelineRailBox: {
    width: 34,
    alignItems: "center",
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberWarning: {
    backgroundColor: "#F59E0B",
  },
  stopNumberText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  timelineRail: {
    flex: 1,
    width: 2,
    backgroundColor: "#DBEAFE",
    marginVertical: 5,
  },
  endPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  stopContent: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 8,
    paddingBottom: 16,
  },
  stopTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  stopMeta: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#64748B",
  },
  stopBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderWidth: 1,
  },
  stopBadgeOk: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  stopBadgeWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  stopBadgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
  },
  stopBadgeTextOk: {
    color: "#16A34A",
  },
  stopBadgeTextWarning: {
    color: "#D97706",
  },
  proofChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
  },
  proofChipText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
  replayButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  replayButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#64748B",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5EDF8",
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  secondaryButtonText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "800",
    color: "#2563EB",
  },
  primaryButton: {
    flex: 1,
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
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
