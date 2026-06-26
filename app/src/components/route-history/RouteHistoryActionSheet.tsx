import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteHistoryRoute } from "../../types/route-history";

type ActionSheetProps = {
  visible: boolean;
  route: RouteHistoryRoute | null;
  onClose: () => void;
  onDuplicate: () => void;
  onDownloadReport: () => void;
  onShareSummary: () => void;
  onViewProof: () => void;
  onDelete: () => void;
};

type ActionRowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
};

function ActionRow({ icon, title, subtitle, danger, onPress }: ActionRowProps) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View
        style={[
          styles.actionIcon,
          danger ? styles.actionIconDanger : styles.actionIconBlue,
        ]}
      >
        <Feather name={icon} size={18} color={danger ? "#EF4444" : "#2563EB"} />
      </View>
      <View style={styles.actionTextBox}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>
          {title}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function RouteHistoryActionSheet({
  visible,
  route,
  onClose,
  onDuplicate,
  onDownloadReport,
  onShareSummary,
  onViewProof,
  onDelete,
}: ActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>More actions</Text>
              {route ? (
                <Text style={styles.sheetSubtitle}>{route.title}</Text>
              ) : null}
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.actionGroup}>
            <ActionRow
              icon="copy"
              title="Duplicate route"
              subtitle="Create a copy to plan a new run"
              onPress={onDuplicate}
            />
            <ActionRow
              icon="download"
              title="Download report"
              subtitle="Export route summary as PDF"
              onPress={onDownloadReport}
            />
            <ActionRow
              icon="share-2"
              title="Share summary"
              subtitle="Share route details with team"
              onPress={onShareSummary}
            />
            <ActionRow
              icon="image"
              title="View proof of delivery"
              subtitle="See photos and POD for each stop"
              onPress={onViewProof}
            />
          </View>

          <View style={styles.deleteGroup}>
            <ActionRow
              icon="trash-2"
              title="Delete route"
              subtitle="Permanently remove this route"
              danger
              onPress={onDelete}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
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
    borderColor: "#E2E8F0",
  },
  actionGroup: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EDF8",
    overflow: "hidden",
  },
  deleteGroup: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    overflow: "hidden",
  },
  actionRow: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionIconBlue: {
    backgroundColor: "#EFF6FF",
  },
  actionIconDanger: {
    backgroundColor: "#FEF2F2",
  },
  actionTextBox: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  actionTitleDanger: {
    color: "#EF4444",
  },
  actionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#64748B",
  },
});
