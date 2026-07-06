import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  RouteHistoryRoute,
  RouteHistoryTone,
} from "./route-history";

type RouteHistoryCardProps = {
  route: RouteHistoryRoute;
  onPress: () => void;
  onMorePress: () => void;
};

const normalizeDistance = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const km = value > 10000 ? value / 1000 : value;
  return km >= 100 ? `${km.toFixed(1)} km` : `${km.toFixed(1)} km`;
};

const getToneStyles = (tone: RouteHistoryTone) => {
  switch (tone) {
    case "green":
      return { badge: styles.badgeGreen, text: styles.badgeTextGreen };
    case "amber":
      return { badge: styles.badgeAmber, text: styles.badgeTextAmber };
    case "red":
      return { badge: styles.badgeRed, text: styles.badgeTextRed };
    case "blue":
      return { badge: styles.badgeBlue, text: styles.badgeTextBlue };
    default:
      return { badge: styles.badgeSlate, text: styles.badgeTextSlate };
  }
};

function RouteMiniPreview({ pointsCount }: { pointsCount: number }) {
  const dots = Array.from({ length: Math.min(Math.max(pointsCount, 3), 6) });

  return (
    <View style={styles.mapPreview}>
      <View style={styles.roadOne} />
      <View style={styles.roadTwo} />
      <View style={styles.routeLineBase} />
      <View style={styles.routeLine} />
      <View style={styles.startPin} />
      {dots.map((_, index) => (
        <View
          key={index}
          style={[
            styles.routeDot,
            {
              left: 17 + index * 11,
              top: index % 2 === 0 ? 50 - index * 4 : 39 - index * 3,
            },
          ]}
        />
      ))}
      <View style={styles.endPin} />
    </View>
  );
}

function LocationRow({
  icon,
  color,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  text: string;
}) {
  return (
    <View style={styles.locationRow}>
      <Feather name={icon} size={12} color={color} />
      <Text numberOfLines={1} style={styles.locationText}>
        {text || "Not available"}
      </Text>
    </View>
  );
}

export function RouteHistoryCard({
  route,
  onPress,
  onMorePress,
}: RouteHistoryCardProps) {
  const tone = getToneStyles(route.statusTone);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <RouteMiniPreview
          pointsCount={route.mapPoints.length || route.stopsCount}
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>
              {route.title}
            </Text>
            <View style={[styles.badge, tone.badge]}>
              <Text style={[styles.badgeText, tone.text]}>
                {route.statusLabel}
              </Text>
            </View>
          </View>

          <Text numberOfLines={1} style={styles.dateText}>
            {route.fullDateLabel || route.dateLabel} · {route.startTime} - {route.endTime}
          </Text>

          <View style={styles.locationsBox}>
            <LocationRow
              icon="play-circle"
              color="#16A34A"
              text={route.startLocation}
            />
            <LocationRow
              icon="map-pin"
              color="#EF4444"
              text={route.endLocation}
            />
          </View>
        </View>

        <Pressable
          hitSlop={10}
          style={styles.moreButton}
          onPress={(event) => {
            event.stopPropagation();
            onMorePress();
          }}
        >
          <Feather name="more-vertical" size={18} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={13} color="#64748B" />
          <Text style={styles.metaText}>{route.stopsCount} stops</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Feather name="navigation" size={13} color="#64748B" />
          <Text style={styles.metaText}>{normalizeDistance(route.distanceKm)}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Feather name="clock" size={13} color="#64748B" />
          <Text numberOfLines={1} style={styles.metaText}>
            {route.durationText || "--"}
          </Text>
        </View>
        <Feather name="chevron-right" size={17} color="#CBD5E1" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2EAF3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: "#FAFCFF",
    transform: [{ scale: 0.997 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mapPreview: {
    width: 82,
    height: 86,
    borderRadius: 14,
    backgroundColor: "#F2F7F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginRight: 11,
  },
  roadOne: {
    position: "absolute",
    left: -10,
    right: -8,
    top: 18,
    height: 8,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "13deg" }],
  },
  roadTwo: {
    position: "absolute",
    left: -8,
    right: -8,
    bottom: 17,
    height: 7,
    backgroundColor: "#E4EADF",
    transform: [{ rotate: "-18deg" }],
  },
  routeLineBase: {
    position: "absolute",
    left: 12,
    right: 10,
    top: 42,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-28deg" }],
  },
  routeLine: {
    position: "absolute",
    left: 13,
    right: 11,
    top: 43.5,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2F6FED",
    transform: [{ rotate: "-28deg" }],
  },
  startPin: {
    position: "absolute",
    left: 9,
    bottom: 14,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  endPin: {
    position: "absolute",
    right: 8,
    top: 13,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  routeDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#2563EB",
    borderWidth: 1.4,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "600",
    color: "#0F172A",
  },
  dateText: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  locationsBox: {
    marginTop: 9,
    gap: 5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#475569",
  },
  moreButton: {
    width: 28,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginTop: -4,
  },
  footerRow: {
    minHeight: 38,
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#E2E8F0",
  },
  metaText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: "#475569",
  },
  badge: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  badgeGreen: { backgroundColor: "#ECFDF5", borderColor: "#BBF7D0" },
  badgeTextGreen: { color: "#15803D" },
  badgeAmber: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  badgeTextAmber: { color: "#B45309" },
  badgeRed: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  badgeTextRed: { color: "#DC2626" },
  badgeBlue: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  badgeTextBlue: { color: "#2563EB" },
  badgeSlate: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  badgeTextSlate: { color: "#64748B" },
});
