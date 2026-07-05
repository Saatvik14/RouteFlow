import { Feather } from "@expo/vector-icons";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { RouteHistoryStop } from "./route-history";

type RouteStopDetailsSheetProps = {
  visible: boolean;
  stop: RouteHistoryStop | null;
  onClose: () => void;
};

const getStatusStyle = (status?: RouteHistoryStop["status"]) => {
  if (status === "failed") {
    return {
      background: "#FEF2F2",
      border: "#FECACA",
      text: "#DC2626",
      icon: "x-circle" as const,
    };
  }
  if (status === "pending") {
    return {
      background: "#F8FAFC",
      border: "#E2E8F0",
      text: "#64748B",
      icon: "clock" as const,
    };
  }
  if (status === "delayed") {
    return {
      background: "#FFFBEB",
      border: "#FDE68A",
      text: "#B45309",
      icon: "alert-circle" as const,
    };
  }
  return {
    background: "#ECFDF5",
    border: "#BBF7D0",
    text: "#15803D",
    icon: "check-circle" as const,
  };
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={15} color="#64748B" />
      </View>
      <View style={styles.detailTextBox}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text selectable style={styles.detailValue}>
          {String(value)}
        </Text>
      </View>
    </View>
  );
}

export function RouteStopDetailsSheet({
  visible,
  stop,
  onClose,
}: RouteStopDetailsSheetProps) {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 700;
  const status = getStatusStyle(stop?.status);

  const openAddress = async () => {
    if (!stop) return;
    const destination =
      Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)
        ? `${stop.latitude},${stop.longitude}`
        : stop.address;
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
    );
  };

  const callContact = async () => {
    if (!stop?.phone) return;
    await Linking.openURL(`tel:${stop.phone}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isWide && styles.overlayWide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            isWide && styles.sheetWide,
            { maxHeight: Math.min(height * 0.88, 760) },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextBox}>
              <Text style={styles.eyebrow}>STOP {stop?.sequence || ""}</Text>
              <Text numberOfLines={2} style={styles.title}>
                {stop?.title || "Order details"}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          {stop ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: status.background,
                    borderColor: status.border,
                  },
                ]}
              >
                <Feather name={status.icon} size={17} color={status.text} />
                <View style={styles.statusTextBox}>
                  <Text style={[styles.statusTitle, { color: status.text }]}> 
                    {stop.statusLabel}
                  </Text>
                  <Text style={styles.statusTime}>
                    {stop.actualTime
                      ? `Completed at ${stop.actualTime}`
                      : `Expected ${stop.eta || "--"}`}
                  </Text>
                </View>
                {stop.delayMinutes ? (
                  <Text style={[styles.delayText, { color: status.text }]}> 
                    +{stop.delayMinutes} min
                  </Text>
                ) : null}
              </View>

              <View style={styles.addressCard}>
                <View style={styles.addressIcon}>
                  <Feather name="map-pin" size={18} color="#2563EB" />
                </View>
                <View style={styles.addressTextBox}>
                  <Text style={styles.addressLabel}>Delivery address</Text>
                  <Text selectable style={styles.addressText}>
                    {stop.address}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Order details</Text>
                <DetailRow
                  icon="package"
                  label="Order"
                  value={stop.orderNumber || stop.orderId || stop.id}
                />
                <DetailRow
                  icon="user"
                  label="Customer"
                  value={stop.customerName || stop.contactName}
                />
                <DetailRow icon="phone" label="Phone" value={stop.phone} />
                <DetailRow icon="mail" label="Email" value={stop.email} />
                <DetailRow
                  icon="clock"
                  label="Time window"
                  value={stop.timeWindow}
                />
                <DetailRow
                  icon="box"
                  label="Items"
                  value={stop.itemsCount}
                />
                <DetailRow
                  icon="activity"
                  label="Service time"
                  value={
                    stop.serviceDurationMinutes
                      ? `${stop.serviceDurationMinutes} min`
                      : undefined
                  }
                />
                <DetailRow
                  icon="flag"
                  label="Priority"
                  value={stop.priority}
                />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Delivery record</Text>
                <DetailRow icon="clock" label="ETA" value={stop.eta || "--"} />
                <DetailRow
                  icon="check"
                  label="Actual arrival"
                  value={stop.actualTime}
                />
                <DetailRow
                  icon="image"
                  label="Proof of delivery"
                  value={`${stop.proofCount || 0} file${stop.proofCount === 1 ? "" : "s"}`}
                />
              </View>

              {stop.notes ? (
                <View style={styles.notesCard}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text selectable style={styles.notesText}>
                    {stop.notes}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable style={styles.secondaryButton} onPress={openAddress}>
                  <Feather name="navigation" size={16} color="#2563EB" />
                  <Text style={styles.secondaryButtonText}>Open map</Text>
                </Pressable>
                {stop.phone ? (
                  <Pressable style={styles.primaryButton} onPress={callContact}>
                    <Feather name="phone" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Call</Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  overlayWide: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingTop: 9,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  sheetWide: {
    width: 440,
    height: "100%",
    maxHeight: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 24,
    paddingTop: 12,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    paddingBottom: 14,
  },
  headerTextBox: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#2563EB",
  },
  title: {
    marginTop: 3,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#0F172A",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 12,
  },
  statusCard: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  statusTextBox: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  statusTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
  },
  statusTime: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "400",
    color: "#64748B",
  },
  delayText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
  },
  addressCard: {
    marginTop: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
    padding: 13,
    flexDirection: "row",
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addressTextBox: {
    flex: 1,
    minWidth: 0,
  },
  addressLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  addressText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#0F172A",
  },
  sectionCard: {
    marginTop: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EDF8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingTop: 13,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  detailRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailIcon: {
    width: 28,
    alignItems: "flex-start",
  },
  detailTextBox: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "400",
    color: "#64748B",
  },
  detailValue: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#0F172A",
  },
  notesCard: {
    marginTop: 12,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    padding: 13,
  },
  notesText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "400",
    color: "#475569",
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#2563EB",
  },
  primaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
