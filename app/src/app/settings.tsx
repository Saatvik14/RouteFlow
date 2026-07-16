import { useRouter } from "expo-router";
import { ReactNode, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { openExternalUrl } from "./../hooks/open-external-url";
import { LEGAL_URLS } from "../constants/legal";



type SettingRowProps = {
  title: string;
  value?: string;
  description?: string;
  danger?: boolean;
  onPress?: () => void;
  rightElement?: ReactNode;
};

type SectionProps = {
  title?: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  title,
  value,
  description,
  danger,
  onPress,
  rightElement,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
      </View>

      {rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleLogout = () => {
    // Add your logout logic here, then navigate to login screen if required.
    // Example: router.replace('/login' as never);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.iconPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerRightSpace} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 18) + 22 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          <Section title="Route Preferences">
            <SettingRow
              title="Navigation app"
              value="RouteFlow Navigation"
              onPress={() => {}}
            />

            <SettingRow
              title="Stop side"
              value="Any side of vehicle"
              onPress={() => {}}
            />

            <SettingRow
              title="Average time at stop"
              value="1 min"
              onPress={() => {}}
            />

            <SettingRow title="Vehicle type" value="Car" onPress={() => {}} />

            <SettingRow
              title="Avoid tolls"
              description="Save costs by avoiding toll roads"
              rightElement={
                <Switch
                  value={avoidTolls}
                  onValueChange={setAvoidTolls}
                  trackColor={{ false: "#D1D5DB", true: "#9CC3FF" }}
                  thumbColor={avoidTolls ? "#2F74ED" : "#F3F4F6"}
                />
              }
            />

            <SettingRow
              title="Stop ID"
              value="Modern and By route order"
              onPress={() => {}}
            />
          </Section>

          <Section title="General Preferences">
            <SettingRow title="Theme" value="Light" onPress={() => {}} />
          </Section>

          <Section title="Subscription">
            <SettingRow title="Compare plans" onPress={() => {}} />
          </Section>

          <Section>
            <SettingRow title="Licenses" onPress={() => {}} />
            <SettingRow
              title="Terms of Service"
              onPress={() => setShowTermsModal(true)}
            />
            <SettingRow
              title="Privacy policy"
              onPress={() => void openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)}
            />
            <SettingRow title="Version" value="Spoke-v3.65.1" />
            <SettingRow title="Logout" danger onPress={handleLogout} />
          </Section>
        </View>
      </ScrollView>

      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.documentModalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Terms of Service</Text>
              <Pressable
                onPress={() => setShowTermsModal(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close Terms of Service"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.documentScroll}
              contentContainerStyle={styles.documentScrollContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.documentBodyTitle}>
                RouteFloww Terms of Service
              </Text>
              <Text style={styles.documentLastUpdated}>
                Last Updated: July 2026
              </Text>

              <Text style={styles.documentSectionTitle}>Overview</Text>
              <Text style={styles.documentParagraph}>
                These Terms govern worldwide use of RouteFloww. By creating an
                account or using the app, users agree to these Terms. The app is
                jointly owned by Vaibhav Garg and Uttam Chand Rawat and is
                governed by the laws of India.
              </Text>

              <Text style={styles.documentSectionTitle}>Eligibility</Text>
              <Text style={styles.documentParagraph}>
                Users must be at least 18 years old or use the Service with
                legally required parental or guardian consent.
              </Text>

              <Text style={styles.documentSectionTitle}>Accounts</Text>
              <Text style={styles.documentParagraph}>
                Users register using email OTP and provide name, email, phone
                number and password. Users are responsible for maintaining
                account security.
              </Text>

              <Text style={styles.documentSectionTitle}>Services</Text>
              <Text style={styles.documentParagraph}>
                Route creation, stop management, navigation, saved routes, route
                history and future related services.
              </Text>

              <Text style={styles.documentSectionTitle}>Subscriptions</Text>
              <Text style={styles.documentParagraph}>
                Lite and Standard plans are available with a 7-day free trial.
                Charges renew unless cancelled according to the store policies.
              </Text>

              <Text style={styles.documentSectionTitle}>Refunds</Text>
              <Text style={styles.documentParagraph}>
                Refund requests are reviewed individually. Approved refunds may
                be reduced by non-recoverable taxes or platform fees.
              </Text>

              <Text style={styles.documentSectionTitle}>User Content</Text>
              <Text style={styles.documentParagraph}>
                Users retain ownership of route information they create while
                granting RouteFloww a limited licence to host, process and
                display that content for providing the Service.
              </Text>

              <Text style={styles.documentSectionTitle}>
                Prohibited Conduct
              </Text>
              <Text style={styles.documentParagraph}>
                No reverse engineering, scraping, bots, abuse, malware, illegal
                use or infringement of intellectual property.
              </Text>

              <Text style={styles.documentSectionTitle}>
                Navigation Disclaimer
              </Text>
              <Text style={styles.documentParagraph}>
                Navigation is provided for convenience only. Users remain
                responsible for obeying traffic laws and exercising independent
                judgment.
              </Text>

              <Text style={styles.documentSectionTitle}>Liability</Text>
              <Text style={styles.documentParagraph}>
                The Service is provided as is. Liability is limited to the
                maximum extent permitted by applicable law.
              </Text>

              <Text style={styles.documentSectionTitle}>Disputes</Text>
              <Text style={styles.documentParagraph}>
                Governed by Indian law. Arbitration seat: Muzaffarnagar, Uttar
                Pradesh, India.
              </Text>
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.modalButtonPressed,
              ]}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },

  iconPressed: {
    backgroundColor: "#F1F5F9",
  },

  backIcon: {
    fontSize: 40,
    lineHeight: 40,
    color: "#7B8798",
    marginTop: -3,
  },

  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },

  headerRightSpace: {
    width: 32,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 18,
  },

  contentWrap: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  section: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#2F74ED",
    marginBottom: 18,
  },

  sectionBody: {
    gap: 2,
  },

  row: {
    minHeight: 82,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },

  rowPressed: {
    backgroundColor: Platform.select({ web: "#F8FAFC", default: "#F1F5F9" }),
  },

  rowTextWrap: {
    flex: 1,
    paddingRight: 14,
  },

  rowTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "500",
    color: "#111827",
  },

  rowValue: {
    marginTop: 2,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "400",
    color: "#526078",
  },

  rowDescription: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "400",
    color: "#526078",
  },

  rightElement: {
    minWidth: 56,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  dangerText: {
    color: "#E45454",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 24, 48, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  documentModalContainer: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "80%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  modalHeaderTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#0F172A",
  },

  modalCloseText: {
    padding: 4,
    fontSize: 18,
    color: "#64748B",
  },

  documentScroll: {
    flex: 1,
    marginBottom: 16,
  },

  documentScrollContent: {
    paddingBottom: 8,
  },

  documentBodyTitle: {
    marginBottom: 4,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: "#1E293B",
  },

  documentLastUpdated: {
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  documentSectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  documentParagraph: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    color: "#334155",
  },

  modalButton: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  modalButtonPressed: {
    opacity: 0.75,
  },

  modalButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#475569",
  },
});