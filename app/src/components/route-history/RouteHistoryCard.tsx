import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  RouteHistoryRoute,
  RouteHistoryTone,
} from "../../types/route-history";

type RouteHistoryCardProps = {
  route: RouteHistoryRoute;
  onPress: () => void;
  onMorePress: () => void;
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
  const dots = Array.from({ length: Math.min(Math.max(pointsCount, 4), 8) });

  return (
    <View style={styles.mapPreview}>
      <View style={styles.routeLine} />
      <View style={styles.startPin} />
      {dots.map((_, index) => (
        <View
          key={index}
          style={[
            styles.routeDot,
            {
              left: 16 + index * 14,
              top: index % 2 === 0 ? 24 : 14,
            },
          ]}
        />
      ))}
      <View style={styles.endPin} />
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
    <Pressable style={styles.card} onPress={onPress}>
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

        <Text style={styles.timeText}>
          {route.startTime} - {route.endTime}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color="#64748B" />
            <Text style={styles.metaText}>{route.stopsCount} stops</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="navigation" size={12} color="#64748B" />
            <Text style={styles.metaText}>{route.distanceKm || "--"} km</Text>
          </View>
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
        <Feather name="more-vertical" size={18} color="#94A3B8" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EDF8",
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  mapPreview: {
    width: 106,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#F1F8EF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginRight: 11,
  },
  routeLine: {
    position: "absolute",
    left: 15,
    right: 14,
    top: 33,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#2F76F6",
    transform: [{ rotate: "-18deg" }],
  },
  startPin: {
    position: "absolute",
    left: 9,
    top: 41,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  endPin: {
    position: "absolute",
    right: 9,
    top: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
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
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "700",
    color: "#0F172A",
  },
  timeText: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
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
    fontWeight: "800",
  },
  badgeGreen: { backgroundColor: "#ECFDF5", borderColor: "#BBF7D0" },
  badgeTextGreen: { color: "#16A34A" },
  badgeAmber: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  badgeTextAmber: { color: "#D97706" },
  badgeRed: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  badgeTextRed: { color: "#DC2626" },
  badgeBlue: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  badgeTextBlue: { color: "#2563EB" },
  badgeSlate: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  badgeTextSlate: { color: "#64748B" },
  moreButton: {
    width: 30,
    height: 52,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 6,
  },
});
