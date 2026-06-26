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

export default function RouteHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [routes, setRoutes] = useState<RouteHistoryRoute[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<RouteHistoryStatus>("completed");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteHistoryRoute | null>(
    null,
  );

  const loadRoutes = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

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
      setSelectedRoute(null);

      router.push({
        pathname: "/setup-locations",
        params: {
          duplicateFrom: String(
            result?.route_id || result?.id || selectedRoute.id,
          ),
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
            await deleteRouteHistory(selectedRoute.id);
            setRoutes((prev) =>
              prev.filter((route) => route.id !== selectedRoute.id),
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
      message: `${selectedRoute.title}\n${selectedRoute.fullDateLabel}\nStops: ${selectedRoute.stopsCount}\nDistance: ${selectedRoute.distanceKm} km\nDuration: ${selectedRoute.durationText}`,
    });
  };

  const handleReport = () => {
    Alert.alert(
      "Download report",
      "Connect this button to your backend PDF report endpoint.",
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Route History</Text>
          <Text style={styles.headerSubtitle}>
            Completed routes, proofs and reusable plans
          </Text>
        </View>

        <Pressable
          style={styles.iconButton}
          onPress={() =>
            Alert.alert("Filters", "Add date range and driver filters here.")
          }
        >
          <Feather name="sliders" size={18} color="#0F172A" />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#94A3B8" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search routes"
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

      <View style={styles.tabsRow}>
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
            </Pressable>
          );
        })}
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
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {groups.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Feather name="archive" size={22} color="#2563EB" />
              </View>
              <Text style={styles.emptyTitle}>No routes found</Text>
              <Text style={styles.emptyText}>
                Try changing the tab or search text.
              </Text>
            </View>
          ) : null}

          {groups.map((group) => (
            <View key={group.key} style={styles.groupBlock}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupCount}>{group.count}</Text>
              </View>

              {group.routes.map((route) => (
                <RouteHistoryCard
                  key={route.id}
                  route={route}
                  onPress={() => openDetail(route.id)}
                  onMorePress={() => setSelectedRoute(route)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <RouteHistoryActionSheet
        visible={Boolean(selectedRoute)}
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onDuplicate={handleDuplicate}
        onDownloadReport={handleReport}
        onShareSummary={handleShare}
        onViewProof={() => {
          if (!selectedRoute) return;
          setSelectedRoute(null);
          openDetail(selectedRoute.id, "stops");
        }}
        onDelete={handleDelete}
      />
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
    fontSize: 18,
    lineHeight: 23,
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
  searchBox: {
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 9,
    fontSize: 13.5,
    lineHeight: 18,
    color: "#0F172A",
  },
  tabsRow: {
    marginTop: 12,
    marginHorizontal: 16,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    flexDirection: "row",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#EFF6FF",
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
  list: {
    flex: 1,
    marginTop: 14,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  groupBlock: {
    marginBottom: 14,
  },
  groupHeader: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  groupTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: "#334155",
  },
  groupCount: {
    minWidth: 24,
    textAlign: "center",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  emptyCard: {
    marginTop: 34,
    minHeight: 180,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#64748B",
  },
});
