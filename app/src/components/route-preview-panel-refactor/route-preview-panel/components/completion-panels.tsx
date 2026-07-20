import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RoutePreviewPanelProps } from "../types";
import {
  countStopsByStatus,
  getStopSubtitle,
  getStopTitle,
  isDeliveredStop,
  isFailedStop,
} from "../utils";
import { DraggableRouteSheet } from "./draggable-route-sheet";

type CompletionStatus = "delivered" | "failed" | "start" | "end" | "pending";

function formatTimelineTime(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) return fallback;

  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (trimmed.includes("T") && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return trimmed;
}

function getDeliveredArrivalTime(stop: any) {
  return (
    stop.arrivedAt ||
    stop.arrived_at ||
    stop.actualArrivalTime ||
    stop.actual_arrival_time ||
    stop.actualArrivalAt ||
    stop.actual_arrival_at ||
    stop.deliveredAt ||
    stop.delivered_at ||
    stop.completedAt ||
    stop.completed_at ||
    null
  );
}

function getFailedAttemptTime(stop: any) {
  return (
    stop.failedAt ||
    stop.failed_at ||
    stop.attemptedAt ||
    stop.attempted_at ||
    stop.completedAt ||
    stop.completed_at ||
    null
  );
}

function StatusBadge({ status }: { status: CompletionStatus }) {
  if (status === "start" || status === "end") return null;

  const delivered = status === "delivered";
  const failed = status === "failed";

  return (
    <View
      style={[
        promptStyles.statusBadge,
        delivered && promptStyles.statusBadgeDelivered,
        failed && promptStyles.statusBadgeFailed,
        status === "pending" && promptStyles.statusBadgePending,
      ]}
    >
      <Text
        style={[
          promptStyles.statusBadgeText,
          delivered && promptStyles.statusBadgeTextDelivered,
          failed && promptStyles.statusBadgeTextFailed,
          status === "pending" && promptStyles.statusBadgeTextPending,
        ]}
      >
        {delivered ? "Delivered" : failed ? "Failed" : "Pending"}
      </Text>
    </View>
  );
}

function CompletionTimelineItem({
  time,
  title,
  subtitle,
  marker,
  isLast,
  status,
  timeLabel,
}: {
  time: string;
  title: string;
  subtitle: string;
  marker: string;
  isLast?: boolean;
  status: CompletionStatus;
  timeLabel?: string;
}) {
  const delivered = status === "delivered";
  const failed = status === "failed";
  const start = status === "start";
  const end = status === "end";

  return (
    <View style={promptStyles.timelineItem}>
      <View style={promptStyles.timelineRail}>
        <View
          style={[
            promptStyles.marker,
            delivered && promptStyles.markerDelivered,
            failed && promptStyles.markerFailed,
            start && promptStyles.markerStart,
            end && promptStyles.markerEnd,
          ]}
        >
          {delivered ? (
            <Feather name="check" size={12} color="#FFFFFF" />
          ) : failed ? (
            <Feather name="x" size={12} color="#FFFFFF" />
          ) : start ? (
            <Feather name="play" size={11} color="#2563EB" />
          ) : end ? (
            <MaterialCommunityIcons name="flag" size={13} color="#FFFFFF" />
          ) : (
            <Text style={promptStyles.markerText}>{marker}</Text>
          )}
        </View>
        {!isLast ? <View style={promptStyles.markerLine} /> : null}
      </View>

      <View style={promptStyles.timelineContent}>
        <View style={promptStyles.timelineTopRow}>
          <View style={promptStyles.timelineTimeBox}>
            {timeLabel ? (
              <Text style={promptStyles.timelineTimeLabel}>{timeLabel}</Text>
            ) : null}
            <Text
              style={[
                promptStyles.timelineTime,
                timeLabel && promptStyles.timelineTimeWithLabel,
              ]}
              numberOfLines={1}
            >
              {time}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>

        <Text style={promptStyles.timelineTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={promptStyles.timelineSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function SummaryMetric({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: ComponentProps<typeof Feather>["name"];
  value: string | number;
  label: string;
  tone?: "default" | "success" | "danger";
}) {
  const success = tone === "success";
  const danger = tone === "danger";

  return (
    <View style={promptStyles.metricItem}>
      <View
        style={[
          promptStyles.metricIcon,
          success && promptStyles.metricIconSuccess,
          danger && promptStyles.metricIconDanger,
        ]}
      >
        <Feather
          name={icon}
          size={15}
          color={success ? "#15803D" : danger ? "#DC2626" : "#2563EB"}
        />
      </View>
      <View style={promptStyles.metricTextBox}>
        <Text style={promptStyles.metricValue}>{value}</Text>
        <Text style={promptStyles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CompleteRouteConfirmation({
  visible,
  deliveredCount,
  failedCount,
  isCompleting,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  deliveredCount: number;
  failedCount: number;
  isCompleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={promptStyles.modalOverlay} onPress={onCancel}>
        <Pressable
          style={promptStyles.modalCard}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={promptStyles.modalIconBox}>
            <Feather name="check-circle" size={25} color="#2563EB" />
          </View>

          <Text style={promptStyles.modalTitle}>Complete this route?</Text>
          <Text style={promptStyles.modalDescription}>
            {failedCount > 0
              ? `${deliveredCount} stops were delivered and ${failedCount} failed. Failed stops will remain available in route history.`
              : `All ${deliveredCount} stops were delivered successfully. This route will be moved to route history.`}
          </Text>

          <View style={promptStyles.modalSummaryRow}>
            <View style={promptStyles.modalSummaryItem}>
              <Text style={promptStyles.modalSummaryValue}>
                {deliveredCount}
              </Text>
              <Text style={promptStyles.modalSummaryLabel}>Delivered</Text>
            </View>
            <View style={promptStyles.modalDivider} />
            <View style={promptStyles.modalSummaryItem}>
              <Text style={promptStyles.modalSummaryValue}>{failedCount}</Text>
              <Text style={promptStyles.modalSummaryLabel}>Failed</Text>
            </View>
          </View>

          <View style={promptStyles.modalActions}>
            <Pressable
              style={promptStyles.modalCancelButton}
              onPress={onCancel}
              disabled={isCompleting}
            >
              <Text style={promptStyles.modalCancelText}>Keep open</Text>
            </Pressable>

            <Pressable
              style={promptStyles.modalConfirmButton}
              onPress={onConfirm}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check" size={18} color="#FFFFFF" />
              )}
              <Text style={promptStyles.modalConfirmText}>
                {isCompleting ? "Completing..." : "Complete route"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function RouteCompletionPromptPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  durationLabel,
  distanceLabel,
  isCompletingRoute,
  onMarkRouteCompleted,
  onOpenSearch,
}: Pick<
  RoutePreviewPanelProps,
  | "routeName"
  | "start"
  | "end"
  | "stops"
  | "startTime"
  | "durationLabel"
  | "distanceLabel"
  | "isCompletingRoute"
  | "onMarkRouteCompleted"
  | "onOpenSearch"
> & { isWide: boolean }) {
  const insets = useSafeAreaInsets();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const routeStops = Array.isArray(stops) ? stops : [];
  const stats = countStopsByStatus(routeStops);
  const deliveredCount = stats.delivered || 0;
  const failedCount = stats.failed || 0;
  const pendingCount = stats.pending || 0;
  const allStopsResolved = routeStops.length === 0 || pendingCount === 0;
  const buttonDisabled = Boolean(
    isCompletingRoute || !onMarkRouteCompleted || !allStopsResolved,
  );

  const handleConfirmCompletion = () => {
    if (buttonDisabled) return;
    setShowConfirmation(false);
    onMarkRouteCompleted?.();
  };

  return (
    <>
      <DraggableRouteSheet isWide={isWide} initialSnap="top">
        <View style={promptStyles.header}>
          <View style={promptStyles.headerTextBox}>
            <View style={promptStyles.readyRow}>
              <View style={promptStyles.readyDot} />
              <Text style={promptStyles.readyText}>
                {allStopsResolved
                  ? "Ready to finish"
                  : `${pendingCount} stops pending`}
              </Text>
            </View>
            <Text style={promptStyles.headerTitle} numberOfLines={1}>
              {routeName || "Route summary"}
            </Text>
            <Text style={promptStyles.headerSubtitle}>
              Review the stop results before closing this route.
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            promptStyles.content,
            isWide && promptStyles.contentWide,
            { paddingBottom: Math.max(insets.bottom + 108, 126) },
          ]}
        >
          <View style={promptStyles.summaryCard}>
            <View style={promptStyles.summaryHeaderRow}>
              <View>
                <Text style={promptStyles.summaryEyebrow}>Stop results</Text>
                <Text style={promptStyles.summaryTitle}>
                  {routeStops.length} stop{routeStops.length === 1 ? "" : "s"}{" "}
                  processed
                </Text>
              </View>

              <View
                style={[
                  promptStyles.summaryStatePill,
                  failedCount > 0 && promptStyles.summaryStatePillWarning,
                ]}
              >
                <Feather
                  name={failedCount > 0 ? "alert-circle" : "check-circle"}
                  size={14}
                  color={failedCount > 0 ? "#B45309" : "#15803D"}
                />
                <Text
                  style={[
                    promptStyles.summaryStateText,
                    failedCount > 0 && promptStyles.summaryStateTextWarning,
                  ]}
                >
                  {failedCount > 0 ? "Needs review" : "All successful"}
                </Text>
              </View>
            </View>

            <View style={promptStyles.metricsRow}>
              <SummaryMetric
                icon="check-circle"
                value={deliveredCount}
                label="Delivered"
                tone="success"
              />
              <View style={promptStyles.metricDivider} />
              <SummaryMetric
                icon="x-circle"
                value={failedCount}
                label="Failed"
                tone="danger"
              />
              <View style={promptStyles.metricDivider} />
              <SummaryMetric
                icon="clock"
                value={durationLabel || "—"}
                label="Duration"
              />
            </View>

            {distanceLabel ? (
              <View style={promptStyles.distanceRow}>
                <Feather name="navigation" size={15} color="#64748B" />
                <Text style={promptStyles.distanceText}>
                  {distanceLabel} travelled
                </Text>
              </View>
            ) : null}
          </View>

          {failedCount > 0 ? (
            <View style={promptStyles.warningCard}>
              <View style={promptStyles.warningIconBox}>
                <Feather name="alert-triangle" size={18} color="#B45309" />
              </View>
              <View style={promptStyles.warningTextBox}>
                <Text style={promptStyles.warningTitle}>
                  {failedCount} failed stop{failedCount === 1 ? "" : "s"}
                </Text>
                <Text style={promptStyles.warningDescription}>
                  Failed stops will stay visible in route history and can be
                  copied into a new route.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={promptStyles.sectionHeader}>
            <Text style={promptStyles.sectionTitle}>Route result</Text>
            <Text style={promptStyles.sectionMeta}>
              {routeStops.length + 2} locations
            </Text>
          </View>

          <View style={promptStyles.timelineCard}>
            <CompletionTimelineItem
              time={formatTimelineTime(startTime, "Start")}
              title="Start location"
              subtitle={
                start.description ||
                start.title ||
                "GPS position used when the route started"
              }
              marker="S"
              status="start"
            />

            {routeStops.map((stop: any, index: number) => {
              const delivered = isDeliveredStop(stop);
              const failed = isFailedStop(stop);
              const status: CompletionStatus = delivered
                ? "delivered"
                : failed
                  ? "failed"
                  : "pending";
              const marker = String(stop.sequence || index + 1).padStart(
                2,
                "0",
              );
              const rawTime = delivered
                ? getDeliveredArrivalTime(stop)
                : failed
                  ? getFailedAttemptTime(stop)
                  : stop.eta || stop.time;
              const fallbackTime = delivered
                ? "Arrival not recorded"
                : failed
                  ? "Attempt time not recorded"
                  : marker;

              return (
                <CompletionTimelineItem
                  key={stop.id || stop.backendOrderId || `${index}`}
                  time={formatTimelineTime(rawTime, fallbackTime)}
                  timeLabel={
                    delivered ? "Arrived" : failed ? "Attempted" : undefined
                  }
                  title={getStopTitle(stop, `Stop ${index + 1}`)}
                  subtitle={getStopSubtitle(stop)}
                  marker={marker}
                  status={status}
                />
              );
            })}

            <CompletionTimelineItem
              time={durationLabel || "End"}
              title={end.title || "End location"}
              subtitle={end.description || "Final destination for this route"}
              marker="E"
              status="end"
              isLast
            />
          </View>
        </ScrollView>

        <View
          style={[
            promptStyles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom + 12, 18) },
          ]}
        >
          <Pressable
            style={[
              promptStyles.completeButton,
              buttonDisabled && promptStyles.disabledButton,
            ]}
            onPress={() => setShowConfirmation(true)}
            disabled={buttonDisabled}
          >
            {isCompletingRoute ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="check" size={20} color="#FFFFFF" />
            )}
            <Text style={promptStyles.completeButtonText}>
              {isCompletingRoute
                ? "Completing route..."
                : allStopsResolved
                  ? "Complete route"
                  : `${pendingCount} stops still pending`}
            </Text>
          </Pressable>
        </View>
      </DraggableRouteSheet>

      <CompleteRouteConfirmation
        visible={showConfirmation}
        deliveredCount={deliveredCount}
        failedCount={failedCount}
        isCompleting={Boolean(isCompletingRoute)}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmCompletion}
      />
    </>
  );
}

function CompletedMetric({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: ComponentProps<typeof Feather>["name"];
  value: string | number;
  label: string;
  tone?: "default" | "success" | "danger";
}) {
  const success = tone === "success";
  const danger = tone === "danger";

  return (
    <View style={completedStyles.metricCard}>
      <View
        style={[
          completedStyles.metricIconBox,
          success && completedStyles.metricIconBoxSuccess,
          danger && completedStyles.metricIconBoxDanger,
        ]}
      >
        <Feather
          name={icon}
          size={17}
          color={success ? "#15803D" : danger ? "#DC2626" : "#2563EB"}
        />
      </View>
      <Text style={completedStyles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={completedStyles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type RouteCompletedPanelProps = RoutePreviewPanelProps & {
  isWide: boolean;
  onCreateNewRoute?: () => void;
  onRetryFailedStops?: (failedStops: any[]) => void;
};

export function RouteCompletedPanel({
  isWide,
  routeName,
  stops,
  distanceLabel,
  durationLabel,
  onCreateNewRoute,
  onRetryFailedStops,
}: RouteCompletedPanelProps) {
  const insets = useSafeAreaInsets();
  const routeStops = Array.isArray(stops) ? stops : [];
  const stats = countStopsByStatus(routeStops);
  const failedCount = stats.failed || 0;
  const deliveredCount = stats.delivered || 0;
  const hasFailures = failedCount > 0;
  const failedStops = routeStops.filter((stop: any) => isFailedStop(stop));
  const retryDisabled = !onRetryFailedStops || failedStops.length === 0;
  const createRouteDisabled = !onCreateNewRoute;

  const handleRetryFailedStops = () => {
    if (retryDisabled) return;
    onRetryFailedStops?.(failedStops);
  };

  return (
    <DraggableRouteSheet
      isWide={isWide}
      initialSnap="top"
      collapsedHeight={isWide ? 420 : 88}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          completedStyles.content,
          isWide && completedStyles.contentWide,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
      >
        <View style={completedStyles.heroCard}>
          <View style={completedStyles.successIconOuter}>
            <View style={completedStyles.successIconInner}>
              <Feather name="check" size={25} color="#FFFFFF" />
            </View>
          </View>

          <Text style={completedStyles.kicker}>ROUTE CLOSED</Text>
          <Text style={completedStyles.title}>Route completed</Text>
          <Text style={completedStyles.subtitle} numberOfLines={2}>
            {routeName || "The route has been saved to route history."}
          </Text>

          <View
            style={[
              completedStyles.statusPill,
              hasFailures && completedStyles.statusPillWarning,
            ]}
          >
            <Feather
              name={hasFailures ? "alert-circle" : "check-circle"}
              size={15}
              color={hasFailures ? "#B45309" : "#15803D"}
            />
            <Text
              style={[
                completedStyles.statusPillText,
                hasFailures && completedStyles.statusPillTextWarning,
              ]}
            >
              {hasFailures
                ? `${failedCount} stop${failedCount === 1 ? "" : "s"} need follow-up`
                : "All stops delivered successfully"}
            </Text>
          </View>
        </View>

        <View>
          <Text style={completedStyles.sectionLabel}>Delivery summary</Text>
          <View style={completedStyles.metricsRow}>
            <CompletedMetric
              icon="map-pin"
              value={routeStops.length}
              label="Stops"
            />
            <CompletedMetric
              icon="check-circle"
              value={deliveredCount}
              label="Delivered"
              tone="success"
            />
            <CompletedMetric
              icon="x-circle"
              value={failedCount}
              label="Failed"
              tone="danger"
            />
          </View>
        </View>

        {distanceLabel || durationLabel ? (
          <View style={completedStyles.summaryCard}>
            <Text style={completedStyles.sectionLabel}>Route details</Text>

            <View style={completedStyles.summaryGrid}>
              {distanceLabel ? (
                <View style={completedStyles.summaryItem}>
                  <View style={completedStyles.summaryIconBox}>
                    <Feather name="navigation" size={17} color="#2563EB" />
                  </View>
                  <View style={completedStyles.summaryTextBox}>
                    <Text style={completedStyles.summaryLabel}>Distance</Text>
                    <Text style={completedStyles.summaryValue}>
                      {distanceLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              {durationLabel ? (
                <View style={completedStyles.summaryItem}>
                  <View style={completedStyles.summaryIconBox}>
                    <Feather name="clock" size={17} color="#2563EB" />
                  </View>
                  <View style={completedStyles.summaryTextBox}>
                    <Text style={completedStyles.summaryLabel}>Duration</Text>
                    <Text style={completedStyles.summaryValue}>
                      {durationLabel}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {hasFailures ? (
          <View style={completedStyles.followUpCard}>
            <View style={completedStyles.followUpIconBox}>
              <MaterialCommunityIcons
                name="map-marker-alert-outline"
                size={22}
                color="#B45309"
              />
            </View>
            <View style={completedStyles.followUpTextBox}>
              <Text style={completedStyles.followUpTitle}>
                Follow up failed stops
              </Text>
              <Text style={completedStyles.followUpDescription}>
                Start a new route containing only the failed stops. The
                completed route will remain unchanged in route history.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={completedStyles.actionBlock}>
          {hasFailures ? (
            <Pressable
              style={[
                completedStyles.primaryButton,
                retryDisabled && completedStyles.disabledButton,
              ]}
              onPress={handleRetryFailedStops}
              disabled={retryDisabled}
            >
              <MaterialCommunityIcons
                name="restart"
                size={21}
                color="#FFFFFF"
              />
              <Text style={completedStyles.primaryButtonText}>
                Retry {failedCount} failed stop{failedCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              hasFailures
                ? completedStyles.secondaryButton
                : completedStyles.primaryButton,
              createRouteDisabled && completedStyles.disabledButton,
            ]}
            onPress={onCreateNewRoute}
            disabled={createRouteDisabled}
          >
            {hasFailures ? (
              <>
                <View style={completedStyles.secondaryIconBox}>
                  <Feather name="plus" size={19} color="#2563EB" />
                </View>
                <View style={completedStyles.secondaryTextBox}>
                  <Text style={completedStyles.secondaryButtonText}>
                    Create new route
                  </Text>
                  <Text style={completedStyles.secondaryButtonSubtext}>
                    Set up another route from the beginning
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" />
              </>
            ) : (
              <>
                <Feather name="plus" size={20} color="#FFFFFF" />
                <Text style={completedStyles.primaryButtonText}>
                  Create new route
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </DraggableRouteSheet>
  );
}

const promptStyles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E9EEF5",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 14,
  },
  headerTextBox: {
    gap: 4,
  },
  readyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  readyDot: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  readyText: {
    color: "#15803D",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.35,
    lineHeight: 27,
  },
  headerSubtitle: {
    color: "#7C8A9F",
    fontSize: 13.5,
    lineHeight: 19,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentWide: {
    paddingHorizontal: 24,
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E4EAF2",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  summaryHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  summaryEyebrow: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  summaryTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
    marginTop: 2,
  },
  summaryStatePill: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  summaryStatePillWarning: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  summaryStateText: {
    color: "#15803D",
    fontSize: 11.5,
    fontWeight: "600",
  },
  summaryStateTextWarning: {
    color: "#B45309",
  },
  metricsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    marginTop: 16,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
    gap: 5,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 11,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  metricIconSuccess: {
    backgroundColor: "#EAF8EE",
  },
  metricIconDanger: {
    backgroundColor: "#FEF0F0",
  },
  metricTextBox: {
    alignItems: "center",
  },
  metricValue: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  metricLabel: {
    color: "#8A97AA",
    fontSize: 11.5,
    lineHeight: 15,
  },
  metricDivider: {
    backgroundColor: "#E1E7EF",
    marginVertical: 6,
    width: 1,
  },
  distanceRow: {
    alignItems: "center",
    borderTopColor: "#E4EAF2",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 14,
    paddingTop: 12,
  },
  distanceText: {
    color: "#64748B",
    fontSize: 12.5,
  },
  warningCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFF9F0",
    borderColor: "#FDE2B7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  warningIconBox: {
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    borderRadius: 11,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  warningTextBox: {
    flex: 1,
  },
  warningTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  warningDescription: {
    color: "#A16207",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionMeta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4EAF2",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 86,
  },
  timelineRail: {
    alignItems: "center",
    width: 34,
  },
  marker: {
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderColor: "#C8DAF7",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    marginTop: 17,
    width: 24,
  },
  markerDelivered: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  markerFailed: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  markerStart: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  markerEnd: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  markerText: {
    color: "#2563EB",
    fontSize: 9.5,
    fontWeight: "600",
  },
  markerLine: {
    backgroundColor: "#D9E6F8",
    flex: 1,
    width: 2,
  },
  timelineContent: {
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
    flex: 1,
    paddingBottom: 14,
    paddingLeft: 8,
    paddingTop: 14,
  },
  timelineTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  timelineTimeBox: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 5,
  },
  timelineTimeLabel: {
    color: "#94A3B8",
    fontSize: 10.5,
    lineHeight: 15,
  },
  timelineTime: {
    color: "#64748B",
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  timelineTimeWithLabel: {
    color: "#334155",
    fontWeight: "600",
  },
  timelineTitle: {
    color: "#1E293B",
    fontSize: 15.5,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 5,
  },
  timelineSubtitle: {
    color: "#66758A",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    paddingRight: 4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeDelivered: {
    backgroundColor: "#ECFDF3",
  },
  statusBadgeFailed: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgePending: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  statusBadgeTextDelivered: {
    color: "#15803D",
  },
  statusBadgeTextFailed: {
    color: "#DC2626",
  },
  statusBadgeTextPending: {
    color: "#64748B",
  },
  stickyFooter: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5EAF1",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: "absolute",
    right: 0,
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 17,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.45,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    maxWidth: 420,
    padding: 20,
    width: "100%",
  },
  modalIconBox: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    marginTop: 16,
  },
  modalDescription: {
    color: "#64748B",
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 6,
  },
  modalSummaryRow: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E7ECF3",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 16,
    paddingVertical: 12,
  },
  modalSummaryItem: {
    alignItems: "center",
    flex: 1,
  },
  modalSummaryValue: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "600",
  },
  modalSummaryLabel: {
    color: "#8492A6",
    fontSize: 11.5,
    marginTop: 1,
  },
  modalDivider: {
    backgroundColor: "#E1E7EF",
    height: 34,
    width: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCancelButton: {
    alignItems: "center",
    borderColor: "#DCE4EE",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  modalCancelText: {
    color: "#475569",
    fontSize: 14.5,
    fontWeight: "600",
  },
  modalConfirmButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 15,
    flex: 1.35,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 50,
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "600",
  },
});

const completedStyles = StyleSheet.create({
  content: {
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5EAF1",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  successIconOuter: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  successIconInner: {
    alignItems: "center",
    backgroundColor: "#22C55E",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  kicker: {
    color: "#16A34A",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.9,
    marginTop: 14,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.4,
    lineHeight: 31,
    marginTop: 3,
    textAlign: "center",
  },
  subtitle: {
    color: "#7B899D",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    maxWidth: "92%",
    textAlign: "center",
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusPillWarning: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  statusPillText: {
    color: "#15803D",
    fontSize: 12.5,
    fontWeight: "600",
  },
  statusPillTextWarning: {
    color: "#B45309",
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 9,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 9,
  },
  metricCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E6EBF2",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    paddingHorizontal: 7,
    paddingVertical: 13,
  },
  metricIconBox: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    marginBottom: 7,
    width: 32,
  },
  metricIconBoxSuccess: {
    backgroundColor: "#ECFDF3",
  },
  metricIconBoxDanger: {
    backgroundColor: "#FEF2F2",
  },
  metricValue: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "600",
    lineHeight: 24,
  },
  metricLabel: {
    color: "#8A97AA",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6EBF2",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  summaryIconBox: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  summaryTextBox: {
    flex: 1,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    lineHeight: 16,
  },
  summaryValue: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 1,
  },
  followUpCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFF9F0",
    borderColor: "#FDE2B7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  followUpIconBox: {
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  followUpTextBox: {
    flex: 1,
  },
  followUpTitle: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  followUpDescription: {
    color: "#A16207",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  actionBlock: {
    gap: 11,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE4EE",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 62,
    paddingHorizontal: 14,
  },
  secondaryIconBox: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  secondaryTextBox: {
    flex: 1,
  },
  secondaryButtonText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  secondaryButtonSubtext: {
    color: "#8A97AA",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 17,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.45,
  },
});
