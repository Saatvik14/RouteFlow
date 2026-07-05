import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteHistoryRoute } from "./route-history";

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
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.actionIcon,
          danger ? styles.actionIconDanger : styles.actionIconBlue,
        ]}
      >
        <Feather name={icon} size={17} color={danger ? "#DC2626" : "#2563EB"} />
      </View>
      <View style={styles.actionTextBox}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>
          {title}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={17} color="#CBD5E1" />
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerTextBox}>
              <Text style={styles.sheetTitle}>Route actions</Text>
              {route ? (
                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  {route.title}
                </Text>
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
              subtitle="Create a reusable copy of this route"
              onPress={onDuplicate}
            />
            <ActionRow
              icon="download"
              title="Download report"
              subtitle="Export the complete route summary"
              onPress={onDownloadReport}
            />
            <ActionRow
              icon="share-2"
              title="Share summary"
              subtitle="Share route information with the team"
              onPress={onShareSummary}
            />
            <ActionRow
              icon="image"
              title="View delivery records"
              subtitle="Review stop status and proof of delivery"
              onPress={onViewProof}
            />
          </View>

          <View style={styles.deleteGroup}>
            <ActionRow
              icon="trash-2"
              title="Delete route"
              subtitle="Permanently remove this route from history"
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
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 28,
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTextBox: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: "#0F172A",
  },
  sheetSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
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
  actionGroup: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EDF8",
    overflow: "hidden",
  },
  deleteGroup: {
    marginTop: 12,
    borderRadius: 17,
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
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
    paddingRight: 8,
  },
  actionTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  actionTitleDanger: {
    color: "#DC2626",
  },
  actionSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "400",
    color: "#64748B",
  },
});
