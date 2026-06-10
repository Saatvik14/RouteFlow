import { useRouter } from "expo-router";
import { ReactNode, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
            <SettingRow title="Terms of use" onPress={() => {}} />
            <SettingRow title="Privacy policy" onPress={() => {}} />
            <SettingRow title="Version" value="Spoke-v3.65.1" />
            <SettingRow title="Logout" danger onPress={handleLogout} />
          </Section>
        </View>
      </ScrollView>
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
});
