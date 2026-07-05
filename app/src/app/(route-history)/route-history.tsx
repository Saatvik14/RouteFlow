import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteHistoryActionSheet } from "./../../components/route-history/RouteHistoryActionSheet";
import { RouteHistoryCard } from "./../../components/route-history/RouteHistoryCard";
import {
  deleteRouteHistory,
  duplicateRouteHistory,
  filterRouteHistory,
  getRouteHistory,
  groupRoutesByDate,
} from "./../../services/route-history.adapter";
import type {
  RouteHistoryRoute,
  RouteHistoryStatus,
} from "./../../components/route-history/route-history";

const FILTERS: { key: RouteHistoryStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const normalizeDistance = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 10000 ? value / 1000 : value;
};

function OverviewMetric({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  hint: string;
  accent: "blue" | "green" | "amber" | "slate";
}) {
  const accentStyle =
    accent === "green"
      ? styles.metricIconGreen
      : accent === "amber"
        ? styles.metricIconAmber
        : accent === "slate"
          ? styles.metricIconSlate
          : styles.metricIconBlue;

  const accentColor =
    accent === "green"
      ? "#15803D"
      : accent === "amber"
        ? "#B45309"
        : accent === "slate"
          ? "#475569"
          : "#2563EB";

  return (
    <View style={styles.overviewMetric}>
      <View style={[styles.metricIcon, accentStyle]}>
        <Feather name={icon} size={17} color={accentColor} />
      </View>
      <View style={styles.metricTextBox}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text numberOfLines={1} style={styles.metricHint}>
          {hint}
        </Text>
      </View>
    </View>
  );
}

export default function RouteHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [routes, setRoutes] = useState<RouteHistoryRoute[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<RouteHistoryStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteHistoryRoute | null>(
    null,
  );

  const loadRoutes = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const history = await getRouteHistory(80, 0);
      setRoutes(history);
    } catch (error: any) {
      Alert.alert(
        "Route history",
        error?.message || "Unable to load route history.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutes(false);
    }, [loadRoutes]),
  );

  const filteredRoutes = useMemo(
    () => filterRouteHistory(routes, activeFilter, query),
    [activeFilter, query, routes],
  );

  const groups = useMemo(
    () => groupRoutesByDate(filteredRoutes),
    [filteredRoutes],
  );

  const overview = useMemo(() => {
    const completed = routes.filter((route) => route.status === "completed").length;
    const pending = routes.filter((route) =>
      ["pending", "active", "optimized"].includes(route.status),
    ).length;
    const cancelled = routes.filter((route) => route.status === "cancelled").length;
    const totalDistance = routes.reduce(
      (total, route) => total + normalizeDistance(route.distanceKm),
      0,
    );

    return { completed, pending, cancelled, totalDistance };
  }, [routes]);

  const filterCounts = useMemo(
    () => ({
      all: routes.length,
      completed: overview.completed,
      pending: overview.pending,
      cancelled: overview.cancelled,
    }),
    [overview, routes.length],
  );

  const handleBack = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  };

  const openDetail = (routeId: string, tab?: string) => {
    router.push({
      pathname: "/route-history-detail",
      params: { id: routeId, tab },
    } as never);
  };

  const handleDuplicate = async () => {
    if (!selectedRoute) return;

    try {
      const result = await duplicateRouteHistory(selectedRoute.id);
      const sourceId = selectedRoute.id;
      setSelectedRoute(null);

      router.push({
        pathname: "/setup-locations",
        params: {
          duplicateFrom: String(result?.route_id || result?.id || sourceId),
        },
      } as never);
    } catch (error: any) {
      Alert.alert(
        "Duplicate route",
        error?.message || "Unable to duplicate this route.",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;

    Alert.alert("Delete route?", "This will remove the route from history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const routeId = selectedRoute.id;
            await deleteRouteHistory(routeId);
            setRoutes((previous) =>
              previous.filter((route) => route.id !== routeId),
            );
            setSelectedRoute(null);
          } catch (error: any) {
            Alert.alert(
              "Delete route",
              error?.message || "Unable to delete this route.",
            );
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!selectedRoute) return;

    await Share.share({
      message: `${selectedRoute.title}\n${selectedRoute.fullDateLabel}\nStops: ${selectedRoute.stopsCount}\nDistance: ${normalizeDistance(selectedRoute.distanceKm).toFixed(1)} km\nDuration: ${selectedRoute.durationText}`,
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.pageShell}>
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton} onPress={handleBack}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </Pressable>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Route history</Text>
            <Text style={styles.headerSubtitle}>
              Review completed runs, active routes and delivery records
            </Text>
          </View>

          <Pressable
            style={styles.iconButton}
            onPress={() =>
              Alert.alert(
                "More filters",
                "Connect date range, driver and vehicle filters here.",
              )
            }
          >
            <Feather name="sliders" size={18} color="#0F172A" />
          </Pressable>
        </View>

        <View style={[styles.overviewGrid, isWide && styles.overviewGridWide]}>
          <OverviewMetric
            icon="archive"
            label="Total routes"
            value={routes.length}
            hint="All route records"
            accent="blue"
          />
          <OverviewMetric
            icon="check-circle"
            label="Completed"
            value={overview.completed}
            hint="Successfully finished"
            accent="green"
          />
          <OverviewMetric
            icon="clock"
            label="Pending"
            value={overview.pending}
            hint="Active or awaiting start"
            accent="amber"
          />
          <OverviewMetric
            icon="navigation"
            label="Distance"
            value={`${overview.totalDistance.toFixed(1)} km`}
            hint="Across loaded routes"
            accent="slate"
          />
        </View>

        <View style={[styles.controlsRow, isWide && styles.controlsRowWide]}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search route, location or driver"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x" size={16} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabsScroll}
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {filter.label}
                  </Text>
                  <View
                    style={[
                      styles.tabCount,
                      isActive && styles.tabCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        isActive && styles.tabCountTextActive,
                      ]}
                    >
                      {filterCounts[filter.key]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.centerText}>Loading route history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadRoutes(true)}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          <View style={styles.listShell}>
            {groups.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Feather name="archive" size={22} color="#2563EB" />
                </View>
                <Text style={styles.emptyTitle}>No routes found</Text>
                <Text style={styles.emptyText}>
                  Change the status filter or try a different search.
                </Text>
              </View>
            ) : null}

            {groups.map((group) => (
              <View key={group.key} style={styles.groupBlock}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupCount}>
                    {group.count} route{group.count === 1 ? "" : "s"}
                  </Text>
                </View>

                <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                  {group.routes.map((route) => (
                    <View
                      key={route.id}
                      style={[styles.cardWrap, isWide && styles.cardWrapWide]}
                    >
                      <RouteHistoryCard
                        route={route}
                        onPress={() => openDetail(route.id)}
                        onMorePress={() => setSelectedRoute(route)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <RouteHistoryActionSheet
        visible={Boolean(selectedRoute)}
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onDuplicate={handleDuplicate}
        onDownloadReport={() =>
          Alert.alert(
            "Download report",
            "Connect this action to your route report endpoint.",
          )
        }
        onShareSummary={handleShare}
        onViewProof={() => {
          if (!selectedRoute) return;
          const routeId = selectedRoute.id;
          setSelectedRoute(null);
          openDetail(routeId, "summary");
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F9FD",
  },
  pageShell: {
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
    lineHeight: 17,
    fontWeight: "400",
    color: "#64748B",
  },
  overviewGrid: {
    marginTop: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  overviewGridWide: {
    flexWrap: "nowrap",
  },
  overviewMetric: {
    minWidth: 155,
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 84,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  metricIconBlue: { backgroundColor: "#EFF6FF" },
  metricIconGreen: { backgroundColor: "#ECFDF5" },
  metricIconAmber: { backgroundColor: "#FFFBEB" },
  metricIconSlate: { backgroundColor: "#F1F5F9" },
  metricTextBox: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  metricValue: {
    marginTop: 1,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "600",
    color: "#0F172A",
  },
  metricHint: {
    marginTop: 1,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#94A3B8",
  },
  controlsRow: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  controlsRowWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBox: {
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAF3",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: 9,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: "#0F172A",
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    gap: 7,
  },
  tabButton: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAF3",
  },
  tabButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  tabText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  tabCount: {
    minWidth: 21,
    height: 21,
    borderRadius: 10.5,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  tabCountActive: {
    backgroundColor: "#DBEAFE",
  },
  tabCountText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabCountTextActive: {
    color: "#1D4ED8",
  },
  list: {
    flex: 1,
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  listShell: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
  },
  groupBlock: {
    marginBottom: 20,
  },
  groupHeader: {
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  groupTitle: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#334155",
  },
  groupCount: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  cardsGrid: {
    gap: 10,
  },
  cardsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cardWrap: {
    width: "100%",
  },
  cardWrapWide: {
    width: "49.55%",
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
    fontWeight: "400",
    color: "#64748B",
  },
  emptyCard: {
    marginTop: 24,
    minHeight: 200,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAF3",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  emptyIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "400",
    color: "#64748B",
  },
});
