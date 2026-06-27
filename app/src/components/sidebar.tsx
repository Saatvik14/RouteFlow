import { useAuth } from "./../app/_layout";
import { restoreAuthToken } from "./../services/api";
import { routesService } from "./../services/api/routes";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TokenUserPayload = {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  user?: {
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
  };
};

type SidebarUser = {
  name: string;
  email: string;
  phone?: string;
  initial: string;
};

type BackendRoute = {
  id?: string | number;
  route_id?: string | number;
  routeId?: string | number;
  name?: string;
  route_name?: string;
  status?: string;
  route_status?: string;
  state?: string;
  start_datetime?: string;
  end_datetime?: string;
  created_at?: string;
  updated_at?: string;
  routeDate?: string;
  distance?: number | string;
  total_distance?: number | string;
  distance_meters?: number | string;
  duration?: number | string;
  total_duration?: number | string;
  duration_seconds?: number | string;
  stops_count?: number | string;
  total_stops?: number | string;
  orders_count?: number | string;
  stops?: unknown[];
  orders?: unknown[];
};

type RouteStatusTone = "blue" | "green" | "amber" | "purple" | "red" | "slate";
type FeatherIconName = ComponentProps<typeof Feather>["name"];
type RouteActionMode = "menu" | "confirmCancel";

type RouteHistoryItem = {
  id: string;
  title: string;
  dateLabel: string;
  dateDay: string;
  dateMonth: string;
  timeLabel: string;
  statusLabel: string;
  statusTone: RouteStatusTone;
  stopCount: number;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  sortDate: number;
};

const getUserFromToken = (token: string): SidebarUser => {
  const decoded = jwtDecode<TokenUserPayload>(token);
  const tokenUser = decoded.user || decoded;

  const name = tokenUser.fullName || tokenUser.name || "Driver";
  const email = tokenUser.email || "driver@routeflow.com";
  const phone = tokenUser.phone || tokenUser.mobile || "";
  const initial = name.trim().charAt(0).toUpperCase() || "D";

  return {
    name,
    email,
    phone,
    initial,
  };
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTitleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getRouteStatusMeta = (
  status?: string,
): { label: string; tone: RouteStatusTone } => {
  const normalized = String(status || "draft")
    .toLowerCase()
    .trim();

  if (["completed", "complete", "done", "closed"].includes(normalized)) {
    return { label: "Completed", tone: "green" };
  }

  if (
    ["active", "in_transit", "in-transit", "started", "running"].includes(
      normalized,
    )
  ) {
    return {
      label: normalized.includes("transit") ? "In transit" : "Active",
      tone: "blue",
    };
  }

  if (["optimized", "optimised", "ready"].includes(normalized)) {
    return { label: "Optimized", tone: "purple" };
  }

  if (["pending", "new", "created", "scheduled"].includes(normalized)) {
    return { label: toTitleCase(normalized), tone: "amber" };
  }

  if (["failed", "cancelled", "canceled", "error"].includes(normalized)) {
    return { label: toTitleCase(normalized), tone: "red" };
  }

  return { label: toTitleCase(normalized || "Draft"), tone: "slate" };
};

const getRouteDate = (route: BackendRoute) => {
  const value =
    route.start_datetime ||
    route.routeDate ||
    route.created_at ||
    route.updated_at;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const formatDateLabel = (date: Date | null) => {
  if (!date) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTile = (date: Date | null) => {
  if (!date) {
    return {
      day: "--",
      month: "",
    };
  }

  return {
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: date.toLocaleDateString("en-IN", { month: "short" }),
  };
};

const formatTime = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeRange = (route: BackendRoute) => {
  const start = formatTime(route.start_datetime);
  const end = formatTime(route.end_datetime);

  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return "Time not set";
};

const getRouteDistanceKm = (route: BackendRoute) => {
  const distanceMeters = toNumber(route.distance_meters);
  if (distanceMeters > 0) return distanceMeters / 1000;

  const rawDistance = toNumber(route.total_distance || route.distance);
  if (rawDistance <= 0) return 0;

  // Your backend may send distance either in meters or km. Large values are treated as meters.
  return rawDistance > 1000 ? rawDistance / 1000 : rawDistance;
};

const getRouteDurationMinutes = (route: BackendRoute) => {
  const durationSeconds = toNumber(route.duration_seconds);
  if (durationSeconds > 0) return Math.round(durationSeconds / 60);

  const rawDuration = toNumber(route.total_duration || route.duration);
  if (rawDuration <= 0) return 0;

  // Large values are usually seconds. Small values are usually minutes.
  return rawDuration > 300
    ? Math.round(rawDuration / 60)
    : Math.round(rawDuration);
};

const formatDistance = (distanceKm: number) => {
  if (!distanceKm) return "0 km";
  return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
};

const formatDuration = (minutes: number) => {
  if (!minutes) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${remainingMinutes}m`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const getStopCount = (route: BackendRoute) => {
  const explicitCount = toNumber(
    route.stops_count || route.total_stops || route.orders_count,
  );
  if (explicitCount > 0) return explicitCount;

  if (Array.isArray(route.stops)) return route.stops.length;
  if (Array.isArray(route.orders)) return route.orders.length;

  return 0;
};

const normalizeRoutes = (response: any): RouteHistoryItem[] => {
  const list: BackendRoute[] = Array.isArray(response)
    ? response
    : response?.routes || response?.data?.routes || response?.data || [];

  if (!Array.isArray(list)) return [];

  return list
    .map((route, index) => {
      const id = route.route_id ?? route.routeId ?? route.id ?? index + 1;
      const status = route.status || route.route_status || route.state;
      const statusMeta = getRouteStatusMeta(status);
      const date = getRouteDate(route);
      const dateTile = formatDateTile(date);
      const distanceKm = getRouteDistanceKm(route);
      const durationMinutes = getRouteDurationMinutes(route);

      return {
        id: String(id),
        title: route.name || route.route_name || `Route ${index + 1}`,
        dateLabel: formatDateLabel(date),
        dateDay: dateTile.day,
        dateMonth: dateTile.month,
        timeLabel: formatTimeRange(route),
        statusLabel: statusMeta.label,
        statusTone: statusMeta.tone,
        stopCount: getStopCount(route),
        distanceKm,
        distanceLabel: formatDistance(distanceKm),
        durationMinutes,
        durationLabel: formatDuration(durationMinutes),
        sortDate: date?.getTime() || 0,
      };
    })
    .sort((a, b) => b.sortDate - a.sortDate);
};

function getStatusBadgeStyle(tone: RouteStatusTone) {
  switch (tone) {
    case "blue":
      return styles.statusBadgeBlue;
    case "green":
      return styles.statusBadgeGreen;
    case "amber":
      return styles.statusBadgeAmber;
    case "purple":
      return styles.statusBadgePurple;
    case "red":
      return styles.statusBadgeRed;
    default:
      return styles.statusBadgeSlate;
  }
}

function getStatusTextStyle(tone: RouteStatusTone) {
  switch (tone) {
    case "blue":
      return styles.statusTextBlue;
    case "green":
      return styles.statusTextGreen;
    case "amber":
      return styles.statusTextAmber;
    case "purple":
      return styles.statusTextPurple;
    case "red":
      return styles.statusTextRed;
    default:
      return styles.statusTextSlate;
  }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [user, setUser] = useState<SidebarUser>({
    name: "Driver",
    email: "driver@routeflow.com",
    phone: "",
    initial: "D",
  });

  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState("");
  const [mounted, setMounted] = useState(isOpen);
  const [actionRoute, setActionRoute] = useState<RouteHistoryItem | null>(null);
  const [actionMode, setActionMode] = useState<RouteActionMode>("menu");
  const [actionError, setActionError] = useState("");
  const [isCancellingRoute, setIsCancellingRoute] = useState(false);

  const translateX = useSharedValue(-450);
  const opacity = useSharedValue(0);

  const sidebarWidth = useMemo(() => {
    if (width < 640) {
      return Math.min(Math.max(width * 0.94, 330), 420);
    }

    return Math.min(Math.max(width * 0.3, 350), 400);
  }, [width]);

  const completedRoutes = useMemo(
    () =>
      routes.filter((route) => route.statusLabel.toLowerCase() === "completed"),
    [routes],
  );

  const sidebarStats = useMemo(() => {
    const totalDistance = completedRoutes.reduce(
      (sum, route) => sum + route.distanceKm,
      0,
    );
    const totalDuration = completedRoutes.reduce(
      (sum, route) => sum + route.durationMinutes,
      0,
    );

    return {
      completedCount: completedRoutes.length,
      totalDistanceLabel: totalDistance
        ? `${Math.round(totalDistance)} km`
        : "0 km",
      totalDurationLabel: formatDuration(totalDuration),
    };
  }, [completedRoutes]);

  const recentRoutes = useMemo(() => routes.slice(0, 3), [routes]);
  const isHistoryActive = pathname?.includes("route-history");

  useEffect(() => {
    setSelectedRouteId((params.id as string) || null);
  }, [params.id]);

  useEffect(() => {
    if (!isOpen) {
      setActionRoute(null);
      setActionMode("menu");
      setActionError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadSidebarData = async () => {
      try {
        setRouteError("");
        setIsLoadingRoutes(true);

        const token = await restoreAuthToken();

        if (token) {
          setUser(getUserFromToken(token));
        }

        if (!token) {
          setRoutes([]);
          return;
        }

        const response = await routesService.getRoutes(20, 0);

        if (!response.success) {
          throw new Error(response.error || "Unable to fetch routes");
        }

        setRoutes(normalizeRoutes(response.data));
      } catch (error) {
        console.log("Sidebar load error:", error);
        setRouteError("Unable to load routes");
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    loadSidebarData();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      translateX.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 220 });
      translateX.value = withTiming(
        -sidebarWidth,
        { duration: 280 },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
          }
        },
      );
    }
  }, [isOpen, sidebarWidth, opacity, translateX]);

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleHome = () => {
    onClose();
    router.replace("/" as never);
  };

  const handleCreateRoute = () => {
    onClose();
    router.push("/setup-locations" as never);
  };

  const handleSettings = () => {
    onClose();
    router.push("/settings" as never);
  };

  const handleSupport = () => {
    onClose();
    router.push("/support" as never);
  };

  const handleRouteHistory = () => {
    onClose();
    router.push("/route-history" as never);
  };

  const handleRoutePress = (routeId: string) => {
    setActionRoute(null);
    onClose();

    router.push({
      pathname: "/route-preview",
      params: {
        id: String(routeId),
        routeId: String(routeId),
      },
    } as never);
  };

  const handleOpenRouteActions = (route: RouteHistoryItem) => {
    setActionRoute(route);
    setActionMode("menu");
    setActionError("");
  };

  const handleCloseRouteActions = () => {
    if (isCancellingRoute) return;
    setActionRoute(null);
    setActionMode("menu");
    setActionError("");
  };

  const handleRouteHistoryOption = () => {
    if (!actionRoute) return;

    const routeId = actionRoute.id;
    setActionRoute(null);
    setActionMode("menu");
    setActionError("");
    onClose();

    router.push({
      pathname: "/route-history-detail",
      params: {
        id: String(routeId),
        routeId: String(routeId),
      },
    } as never);
  };

  const isRouteCancellable = (route?: RouteHistoryItem | null) => {
    const status = route?.statusLabel.toLowerCase() || "";
    return !["completed", "cancelled", "canceled"].includes(status);
  };

  const cancelRouteRequest = async (routeId: string) => {
    const routeApi = routesService as any;

    if (typeof routeApi.cancelRoute === "function") {
      return routeApi.cancelRoute(routeId);
    }

    if (typeof routeApi.updateRouteStatus === "function") {
      return routeApi.updateRouteStatus(routeId, "cancelled");
    }

    if (typeof routeApi.updateRoute === "function") {
      return routeApi.updateRoute(routeId, { status: "cancelled" });
    }

    throw new Error(
      "Add cancelRoute(routeId) in routesService before using this option.",
    );
  };

  const handleConfirmCancelRoute = async () => {
    if (!actionRoute || isCancellingRoute || !isRouteCancellable(actionRoute))
      return;

    try {
      setIsCancellingRoute(true);
      setActionError("");

      const response = await cancelRouteRequest(actionRoute.id);

      if (response?.success === false) {
        throw new Error(
          response.error || response.message || "Unable to cancel route",
        );
      }

      const cancelledStatus = getRouteStatusMeta("cancelled");

      setRoutes((previousRoutes) =>
        previousRoutes.map((route) =>
          route.id === actionRoute.id
            ? {
                ...route,
                statusLabel: cancelledStatus.label,
                statusTone: cancelledStatus.tone,
              }
            : route,
        ),
      );

      setActionRoute(null);
      setActionMode("menu");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to cancel route",
      );
    } finally {
      setIsCancellingRoute(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const renderQuickAction = (
    icon: FeatherIconName,
    label: string,
    onPress: () => void,
    isActive?: boolean,
  ) => (
    <Pressable
      style={[
        styles.quickActionButton,
        isActive && styles.quickActionButtonActive,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.quickActionIconBox,
          isActive && styles.quickActionIconBoxActive,
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={isActive ? "#2563EB" : "#334155"}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.quickActionText,
          isActive && styles.quickActionTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderMetric = (
    value: string | number,
    label: string,
    tone: "green" | "blue" | "orange",
  ) => {
    const textStyle =
      tone === "green"
        ? styles.metricValueGreen
        : tone === "orange"
          ? styles.metricValueOrange
          : styles.metricValueBlue;

    return (
      <View style={styles.metricItem}>
        <Text numberOfLines={1} style={[styles.metricValue, textStyle]}>
          {value}
        </Text>
        <Text numberOfLines={1} style={styles.metricLabel}>
          {label}
        </Text>
      </View>
    );
  };

  const renderRouteItem = (route: RouteHistoryItem) => {
    const isActive = selectedRouteId === route.id;

    return (
      <View
        key={route.id}
        style={[styles.routeItem, isActive && styles.routeItemActive]}
      >
        <Pressable
          style={styles.routeMainPressable}
          onPress={() => handleRoutePress(route.id)}
        >
          <View
            style={[
              styles.routeDatePill,
              isActive && styles.routeDatePillActive,
            ]}
          >
            <Text
              style={[
                styles.routeDateDay,
                isActive && styles.routeDateDayActive,
              ]}
            >
              {route.dateDay}
            </Text>
            <Text
              style={[
                styles.routeDateMonth,
                isActive && styles.routeDateMonthActive,
              ]}
            >
              {route.dateMonth}
            </Text>
          </View>

          <View style={styles.routeInfoBox}>
            <View style={styles.routeTopRow}>
              <Text
                numberOfLines={1}
                style={[styles.routeTitle, isActive && styles.routeTitleActive]}
              >
                {route.title}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  getStatusBadgeStyle(route.statusTone),
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    getStatusTextStyle(route.statusTone),
                  ]}
                >
                  {route.statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.routeMetaRow}>
              <View style={styles.routeMetaItem}>
                <Feather name="clock" size={11} color="#64748B" />
                <Text numberOfLines={1} style={styles.routeMetaText}>
                  {route.timeLabel}
                </Text>
              </View>
            </View>

            <View style={styles.routeMetaRowBottom}>
              <View style={styles.routeMetaItemCompact}>
                <Feather name="map-pin" size={11} color="#64748B" />
                <Text numberOfLines={1} style={styles.routeMetaText}>
                  {route.stopCount} stops
                </Text>
              </View>

              <View style={styles.routeMetaItemCompact}>
                <Feather name="navigation" size={11} color="#64748B" />
                <Text numberOfLines={1} style={styles.routeMetaText}>
                  {route.distanceLabel}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.routeMoreButton,
            isActive && styles.routeMoreButtonActive,
          ]}
          onPress={() => handleOpenRouteActions(route)}
          hitSlop={8}
        >
          <Feather
            name="more-vertical"
            size={18}
            color={isActive ? "#2563EB" : "#64748B"}
          />
        </Pressable>
      </View>
    );
  };

  const renderRouteActionPanel = () => {
    if (!actionRoute) return null;

    const cancelDisabled = !isRouteCancellable(actionRoute);

    return (
      <View style={styles.routeActionOverlay} pointerEvents="box-none">
        <Pressable
          style={styles.routeActionBackdrop}
          onPress={handleCloseRouteActions}
        />

        <View
          style={[
            styles.routeActionSheet,
            { paddingBottom: Math.max(insets.bottom + 14, 20) },
          ]}
        >
          <View style={styles.routeActionHandle} />

          <View style={styles.routeActionHeaderRow}>
            {/* <View style={styles.routeActionIconBox}>
              <Feather name="map" size={17} color="#2563EB" />
            </View> */}

            {/* <View style={styles.routeActionTitleBox}>
              <Text numberOfLines={1} style={styles.routeActionTitle}>
                {actionRoute.title}
              </Text>
              <Text numberOfLines={1} style={styles.routeActionSubtitle}>
                {actionRoute.dateLabel} • {actionRoute.timeLabel}
              </Text>
            </View> */}

            {/* <Pressable
              style={styles.routeActionCloseButton}
              onPress={handleCloseRouteActions}
              hitSlop={8}
            >
              <Feather name="x" size={17} color="#64748B" />
            </Pressable> */}
          </View>

          {/* <View style={styles.routeActionStatusRow}>
            <View
              style={[
                styles.statusBadge,
                getStatusBadgeStyle(actionRoute.statusTone),
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  getStatusTextStyle(actionRoute.statusTone),
                ]}
              >
                {actionRoute.statusLabel}
              </Text>
            </View>

            <Text style={styles.routeActionSmallMeta}>
              {actionRoute.stopCount} stops • {actionRoute.distanceLabel}
            </Text>
          </View> */}

          {actionMode === "confirmCancel" ? (
            <View style={styles.cancelConfirmBox}>
              <Text style={styles.cancelConfirmTitle}>Cancel this route?</Text>
              <Text style={styles.cancelConfirmText}>
                This will stop the route and mark it as cancelled. You can still
                see it later from route history.
              </Text>

              {actionError ? (
                <View style={styles.actionErrorBox}>
                  <Feather name="alert-circle" size={14} color="#DC2626" />
                  <Text style={styles.actionErrorText}>{actionError}</Text>
                </View>
              ) : null}

              <View style={styles.confirmButtonRow}>
                <Pressable
                  style={styles.keepRouteButton}
                  disabled={isCancellingRoute}
                  onPress={() => {
                    setActionMode("menu");
                    setActionError("");
                  }}
                >
                  <Text style={styles.keepRouteText}>Keep route</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.confirmCancelButton,
                    isCancellingRoute && styles.actionOptionDisabled,
                  ]}
                  disabled={isCancellingRoute}
                  onPress={handleConfirmCancelRoute}
                >
                  {isCancellingRoute ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmCancelText}>Cancel route</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.routeActionOptionsBox}>
              <Pressable
                style={styles.routeActionOption}
                onPress={handleRouteHistoryOption}
              >
                <View style={styles.routeActionOptionIconBox}>
                  <Feather name="archive" size={17} color="#2563EB" />
                </View>

                <View style={styles.routeActionOptionTextBox}>
                  <Text style={styles.routeActionOptionTitle}>
                    Route History
                  </Text>
                  <Text style={styles.routeActionOptionSubtitle}>
                    View completed actions and route details
                  </Text>
                </View>

                <Feather name="chevron-right" size={17} color="#94A3B8" />
              </Pressable>

              <Pressable
                style={[
                  styles.routeActionOption,
                  cancelDisabled && styles.actionOptionDisabled,
                ]}
                disabled={cancelDisabled}
                onPress={() => {
                  setActionMode("confirmCancel");
                  setActionError("");
                }}
              >
                <View
                  style={[
                    styles.routeActionOptionIconBox,
                    styles.cancelOptionIconBox,
                  ]}
                >
                  <Feather
                    name="x-circle"
                    size={17}
                    color={cancelDisabled ? "#94A3B8" : "#DC2626"}
                  />
                </View>

                <View style={styles.routeActionOptionTextBox}>
                  <Text
                    style={[
                      styles.routeActionOptionTitle,
                      styles.cancelOptionTitle,
                      cancelDisabled && styles.disabledOptionText,
                    ]}
                  >
                    Cancel the route
                  </Text>
                  <Text
                    style={[
                      styles.routeActionOptionSubtitle,
                      cancelDisabled && styles.disabledOptionText,
                    ]}
                  >
                    {cancelDisabled
                      ? "Completed/cancelled routes cannot be cancelled"
                      : "Stop this route and update its status"}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!mounted) return null;

  return (
    <>
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          animatedSidebarStyle,
          {
            width: sidebarWidth,
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom + 8, 16),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.initial}</Text>
          </View>

          <View style={styles.profileTextBox}>
            <Text numberOfLines={1} style={styles.userName}>
              {user.name}
            </Text>
            <Text numberOfLines={1} style={styles.userEmail}>
              {user.email}
            </Text>
            {user.phone ? (
              <Text numberOfLines={1} style={styles.userPhone}>
                {user.phone}
              </Text>
            ) : null}
          </View>

          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={18} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentScrollInner}
        >
          <View style={styles.planCard}>
            <View style={styles.planIconCircle}>
              <Feather name="user" size={16} color="#2563EB" />
            </View>

            <View style={styles.planTextBox}>
              <Text style={styles.planTitle}>Free plan</Text>
              <Text style={styles.planSubtitle}>No subscription</Text>
            </View>

            <View style={styles.planRouteCountPill}>
              <Text style={styles.planRouteCountText}>
                {routes.length} routes
              </Text>
            </View>
          </View>

          <Pressable style={styles.subscribeButton}>
            <View style={styles.subscribeIconBox}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={15}
                color="#F59E0B"
              />
            </View>
            <Text style={styles.subscribeText}>Upgrade subscription</Text>
          </Pressable>

          <View style={styles.quickActions}>
            {/* {renderQuickAction('home', 'Home', handleHome, pathname === '/')} */}
            {renderQuickAction(
              "settings",
              "Settings",
              handleSettings,
              pathname?.includes("settings"),
            )}
            {renderQuickAction(
              "help-circle",
              "Support",
              handleSupport,
              pathname?.includes("support"),
            )}
          </View>

          <Pressable
            style={[
              styles.historyEntry,
              isHistoryActive && styles.historyEntryActive,
            ]}
            onPress={handleRouteHistory}
          >
            <View
              style={[
                styles.historyIconBox,
                isHistoryActive && styles.historyIconBoxActive,
              ]}
            >
              <Feather name="archive" size={16} color="#2563EB" />
            </View>

            <Text
              style={[
                styles.historyTitle,
                isHistoryActive && styles.historyTitleActive,
              ]}
            >
              Route history
            </Text>

            <View style={styles.historyCountPill}>
              <Text style={styles.historyCountText}>
                {completedRoutes.length || routes.length}
              </Text>
            </View>
          </Pressable>

          {/* <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Completed this month</Text>
            <View style={styles.metricsRow}>
              {renderMetric(sidebarStats.completedCount, 'Routes', 'green')}
              <View style={styles.metricDivider} />
              {renderMetric(sidebarStats.totalDistanceLabel, 'Distance', 'blue')}
              <View style={styles.metricDivider} />
              {renderMetric(sidebarStats.totalDurationLabel, 'Duration', 'orange')}
            </View>
          </View> */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{recentRoutes.length}</Text>
            </View>
          </View>

          {isLoadingRoutes ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && routeError ? (
            <View style={styles.emptyCard}>
              <Feather name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.emptyText}>{routeError}</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && !routeError && routes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="map" size={18} color="#64748B" />
              <Text style={styles.emptyText}>No routes created yet.</Text>
            </View>
          ) : null}

          {!isLoadingRoutes && !routeError && recentRoutes.map(renderRouteItem)}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.createRouteButton}
            onPress={handleCreateRoute}
          >
            <Feather name="plus" size={19} color="#FFFFFF" />
            <Text style={styles.createRouteText}>Create route</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={16} color="#64748B" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {renderRouteActionPanel()}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
  },

  overlayPressable: {
    flex: 1,
  },

  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 210,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    borderRightWidth: 1,
    borderRightColor: "#DDE8F7",
    elevation: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },

  headerRow: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "600",
  },

  profileTextBox: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: -0.2,
  },

  userEmail: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
  },

  userPhone: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E1E8F2",
    marginLeft: 8,
  },

  contentScroll: {
    flex: 1,
    marginTop: 14,
  },

  contentScrollInner: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },

  planCard: {
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DDE8F7",
    backgroundColor: "#F8FBFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  planIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  planTextBox: {
    flex: 1,
    minWidth: 0,
  },

  planTitle: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: "600",
    color: "#2563EB",
  },

  planSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },

  planRouteCountPill: {
    minHeight: 25,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E8F2",
  },

  planRouteCountText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  subscribeButton: {
    height: 43,
    marginTop: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE6F4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  subscribeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    marginRight: 8,
  },

  subscribeText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#2563EB",
  },

  quickActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 9,
  },

  quickActionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E1E8F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  quickActionButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },

  quickActionIconBox: {
    width: 25,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },

  quickActionIconBoxActive: {
    backgroundColor: "#DBEAFE",
    borderRadius: 11,
  },

  quickActionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#334155",
  },

  quickActionTextActive: {
    color: "#2563EB",
  },

  historyEntry: {
    minHeight: 55,
    marginTop: 13,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E8F2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  historyEntryActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#CFE2FF",
  },

  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  historyIconBoxActive: {
    backgroundColor: "#DBEAFE",
  },

  historyTitle: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
    color: "#1E293B",
  },

  historyTitleActive: {
    color: "#2563EB",
  },

  historyCountPill: {
    minWidth: 31,
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },

  historyCountText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    color: "#2563EB",
  },

  statsCard: {
    marginTop: 13,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E8F2",
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 12,
  },

  statsTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metricItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  metricValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  metricValueGreen: {
    color: "#16A34A",
  },

  metricValueBlue: {
    color: "#2563EB",
  },

  metricValueOrange: {
    color: "#F97316",
  },

  metricLabel: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#64748B",
  },

  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5EAF3",
  },

  sectionHeader: {
    marginTop: 17,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },

  sectionCountPill: {
    minWidth: 27,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF6FF",
  },

  sectionCountText: {
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: "600",
    color: "#2563EB",
  },

  routeItem: {
    minHeight: 82,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EDF6",
  },

  routeMainPressable: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  routeMoreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E7EDF6",
    marginLeft: 8,
  },

  routeMoreButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BFDBFE",
  },

  routeItemActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#CFE2FF",
  },

  routeDatePill: {
    width: 51,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E7EDF6",
    marginRight: 10,
  },

  routeDatePillActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BFDBFE",
  },

  routeDateDay: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    color: "#2563EB",
  },

  routeDateDayActive: {
    color: "#1D4ED8",
  },

  routeDateMonth: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  routeDateMonthActive: {
    color: "#2563EB",
  },

  routeInfoBox: {
    flex: 1,
    minWidth: 0,
  },

  routeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  routeTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.15,
    marginRight: 7,
  },

  routeTitleActive: {
    color: "#2563EB",
  },

  routeMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  routeMetaRowBottom: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  routeMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    flex: 1,
  },

  routeMetaItemCompact: {
    flexDirection: "row",
    alignItems: "center",
  },

  routeMetaText: {
    marginLeft: 4,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#64748B",
  },

  statusBadge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  statusBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },

  statusBadgeBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },

  statusTextBlue: {
    color: "#2563EB",
  },

  statusBadgeGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },

  statusTextGreen: {
    color: "#16A34A",
  },

  statusBadgeAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  statusTextAmber: {
    color: "#D97706",
  },

  statusBadgePurple: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },

  statusTextPurple: {
    color: "#7C3AED",
  },

  statusBadgeRed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  statusTextRed: {
    color: "#DC2626",
  },

  statusBadgeSlate: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },

  statusTextSlate: {
    color: "#64748B",
  },

  loadingBox: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E7EDF6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 10,
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
  },

  emptyCard: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E7EDF6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },

  emptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 8,
  },

  routeActionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    justifyContent: "flex-end",
  },

  routeActionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },

  routeActionSheet: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE8F7",
    paddingHorizontal: 14,
    paddingTop: 9,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 16,
  },

  routeActionHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 13,
  },

  routeActionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  routeActionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  routeActionTitleBox: {
    flex: 1,
    minWidth: 0,
  },

  routeActionTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
    color: "#0F172A",
  },

  routeActionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
  },

  routeActionCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginLeft: 8,
  },

  routeActionStatusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  routeActionSmallMeta: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },

  routeActionOptionsBox: {
    marginTop: 13,
    gap: 10,
  },

  routeActionOption: {
    minHeight: 62,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7EDF6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  routeActionOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 10,
  },

  cancelOptionIconBox: {
    backgroundColor: "#FEF2F2",
  },

  routeActionOptionTextBox: {
    flex: 1,
    minWidth: 0,
  },

  routeActionOptionTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },

  routeActionOptionSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },

  cancelOptionTitle: {
    color: "#DC2626",
  },

  disabledOptionText: {
    color: "#94A3B8",
  },

  actionOptionDisabled: {
    opacity: 0.65,
  },

  cancelConfirmBox: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 13,
  },

  cancelConfirmTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
    color: "#991B1B",
  },

  cancelConfirmText: {
    marginTop: 5,
    fontSize: 12.3,
    lineHeight: 17,
    fontWeight: "400",
    color: "#7F1D1D",
  },

  actionErrorBox: {
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  actionErrorText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#DC2626",
  },

  confirmButtonRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 9,
  },

  keepRouteButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },

  keepRouteText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#991B1B",
  },

  confirmCancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCancelText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    backgroundColor: "#FFFFFF",
  },

  createRouteButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },

  createRouteText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    marginLeft: 8,
  },

  logoutButton: {
    height: 41,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 7,
  },

  logoutText: {
    color: "#64748B",
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    marginLeft: 7,
  },
});
