import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Path,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type {
  RouteHistoryPoint,
  RouteHistoryRoute,
} from "./route-history";

type RouteHistoryMapProps = {
  route: RouteHistoryRoute;
  height?: number;
  compact?: boolean;
};

type Size = { width: number; height: number };

const isValidPoint = (point?: RouteHistoryPoint | null) =>
  Boolean(
    point &&
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.latitude) <= 90 &&
      Math.abs(point.longitude) <= 180,
  );

const samePoint = (a: RouteHistoryPoint, b: RouteHistoryPoint) =>
  Math.abs(a.latitude - b.latitude) < 0.000001 &&
  Math.abs(a.longitude - b.longitude) < 0.000001;

const dedupePoints = (points: RouteHistoryPoint[]) =>
  points.filter(
    (point, index) =>
      isValidPoint(point) && (index === 0 || !samePoint(point, points[index - 1])),
  );

const buildAnchorPoints = (route: RouteHistoryRoute) => {
  const storedAnchors = dedupePoints(route.mapPoints || []);
  if (storedAnchors.length >= 2) return storedAnchors;

  const stopPoints = route.stops
    .filter(
      (stop) =>
        Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude),
    )
    .map((stop) => ({
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      stopId: stop.id,
      sequence: stop.sequence,
    }));

  return dedupePoints([
    ...(isValidPoint(route.startPoint) ? [route.startPoint!] : []),
    ...stopPoints,
    ...(isValidPoint(route.endPoint) ? [route.endPoint!] : []),
  ]);
};

const fetchOsrmGeometry = async (
  points: RouteHistoryPoint[],
  signal: AbortSignal,
): Promise<RouteHistoryPoint[]> => {
  if (points.length < 2 || points.length > 25) return points;

  const coordinates = points
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
    { signal },
  );

  if (!response.ok) return points;

  const body = await response.json();
  const geometry = body?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(geometry) || geometry.length < 2) return points;

  return geometry.map(([longitude, latitude]: [number, number]) => ({
    latitude,
    longitude,
  }));
};

const createFallbackPoints = (count: number): RouteHistoryPoint[] => {
  const total = Math.min(Math.max(count + 2, 4), 10);
  return Array.from({ length: total }, (_, index) => ({
    latitude: 51.48 + Math.sin(index * 0.9) * 0.11 + index * 0.025,
    longitude: -0.32 + index * 0.14 + Math.cos(index * 0.7) * 0.04,
  }));
};

const projectPoints = (
  points: RouteHistoryPoint[],
  size: Size,
  padding: number,
) => {
  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const lonSpan = Math.max(maxLon - minLon, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const usableWidth = Math.max(size.width - padding * 2, 1);
  const usableHeight = Math.max(size.height - padding * 2, 1);

  return points.map((point) => ({
    x: padding + ((point.longitude - minLon) / lonSpan) * usableWidth,
    y: padding + ((maxLat - point.latitude) / latSpan) * usableHeight,
  }));
};

export function RouteHistoryMap({
  route,
  height = 300,
  compact = false,
}: RouteHistoryMapProps) {
  const [size, setSize] = useState<Size>({ width: 0, height });
  const [geometry, setGeometry] = useState<RouteHistoryPoint[]>([]);
  const [isRouting, setIsRouting] = useState(false);

  const anchors = useMemo(() => buildAnchorPoints(route), [route]);
  const storedGeometry = useMemo(
    () => dedupePoints(route.optimizedPath || []),
    [route.optimizedPath],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (storedGeometry.length >= 2) {
      setIsRouting(false);
      setGeometry(storedGeometry);
      return () => controller.abort();
    }

    if (anchors.length < 2) {
      setIsRouting(false);
      setGeometry(createFallbackPoints(route.stopsCount));
      return () => controller.abort();
    }

    setGeometry(anchors);
    setIsRouting(true);

    fetchOsrmGeometry(anchors, controller.signal)
      .then((points) => {
        if (!controller.signal.aborted) setGeometry(points);
      })
      .catch(() => {
        if (!controller.signal.aborted) setGeometry(anchors);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRouting(false);
      });

    return () => controller.abort();
  }, [anchors, route.stopsCount, storedGeometry]);

  const displayGeometry =
    geometry.length >= 2 ? geometry : createFallbackPoints(route.stopsCount);
  const padding = compact ? 14 : 30;
  const routePixels = projectPoints(displayGeometry, size, padding);
  const routePolyline = routePixels.map((point) => `${point.x},${point.y}`).join(" ");

  const markerPixels = useMemo(() => {
    const count = Math.max(route.stops.length, route.stopsCount);
    if (count <= 0 || routePixels.length < 2) return [];

    return Array.from({ length: count }, (_, index) => {
      const ratio = (index + 1) / (count + 1);
      const pointIndex = Math.min(
        routePixels.length - 2,
        Math.max(1, Math.round(ratio * (routePixels.length - 1))),
      );
      return routePixels[pointIndex];
    });
  }, [route.stops.length, route.stopsCount, routePixels]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const start = routePixels[0];
  const end = routePixels[routePixels.length - 1];

  return (
    <View style={[styles.card, { height }]} onLayout={onLayout}>
      {size.width > 0 ? (
        <Svg width={size.width} height={height}>
          <Rect width="100%" height="100%" fill="#F3F7F2" />

          <Path
            d={`M 0 ${height * 0.22} C ${size.width * 0.28} ${height * 0.08}, ${size.width * 0.44} ${height * 0.38}, ${size.width} ${height * 0.18}`}
            stroke="#DCE8D8"
            strokeWidth={compact ? 6 : 10}
            fill="none"
          />
          <Path
            d={`M ${size.width * 0.12} ${height} C ${size.width * 0.32} ${height * 0.62}, ${size.width * 0.68} ${height * 0.92}, ${size.width * 0.9} 0`}
            stroke="#E4EADF"
            strokeWidth={compact ? 5 : 8}
            fill="none"
          />
          <Path
            d={`M 0 ${height * 0.72} C ${size.width * 0.24} ${height * 0.52}, ${size.width * 0.56} ${height * 0.82}, ${size.width} ${height * 0.55}`}
            stroke="#FFFFFF"
            strokeWidth={compact ? 8 : 13}
            fill="none"
          />

          <Polyline
            points={routePolyline}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={compact ? 6 : 9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={routePolyline}
            fill="none"
            stroke="#2F6FED"
            strokeWidth={compact ? 3 : 5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {!compact &&
            markerPixels.map((point, index) => (
              <G key={`stop-${index}`}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={12}
                  fill="#2F6FED"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
                <SvgText
                  x={point.x}
                  y={point.y + 3.5}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#FFFFFF"
                >
                  {index + 1}
                </SvgText>
              </G>
            ))}

          {start ? (
            <>
              <Circle
                cx={start.x}
                cy={start.y}
                r={compact ? 7 : 11}
                fill="#16A34A"
                stroke="#FFFFFF"
                strokeWidth={3}
              />
              {!compact ? (
                <Path
                  d={`M ${start.x - 3} ${start.y - 4} L ${start.x + 4} ${start.y} L ${start.x - 3} ${start.y + 4} Z`}
                  fill="#FFFFFF"
                />
              ) : null}
            </>
          ) : null}

          {end ? (
            <>
              <Circle
                cx={end.x}
                cy={end.y}
                r={compact ? 7 : 11}
                fill="#EF4444"
                stroke="#FFFFFF"
                strokeWidth={3}
              />
              {!compact ? (
                <Circle cx={end.x} cy={end.y} r={3} fill="#FFFFFF" />
              ) : null}
            </>
          ) : null}
        </Svg>
      ) : null}

      {!compact ? (
        <View style={styles.mapHeader}>
          <View style={styles.optimizedChip}>
            <Feather name="navigation" size={13} color="#2563EB" />
            <Text style={styles.optimizedText}>Optimized route</Text>
          </View>
          {isRouting ? (
            <View style={styles.routingChip}>
              <ActivityIndicator size="small" color="#64748B" />
              <Text style={styles.routingText}>Loading roads</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.startDot]} />
            <Text style={styles.legendText}>Start</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.stopDot]} />
            <Text style={styles.legendText}>Stops</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.endDot]} />
            <Text style={styles.legendText}>End</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE6F0",
    backgroundColor: "#F3F7F2",
  },
  mapHeader: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optimizedChip: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  optimizedText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  routingChip: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routingText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  legend: {
    position: "absolute",
    left: 12,
    bottom: 12,
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  startDot: { backgroundColor: "#16A34A" },
  stopDot: { backgroundColor: "#2563EB" },
  endDot: { backgroundColor: "#EF4444" },
  legendText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#475569",
  },
});
