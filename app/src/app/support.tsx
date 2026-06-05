import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Settings</Text>
        <Text style={styles.cardSubtitle}>
          Manage profile, notifications, route preferences and app settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 18,
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3EAF4',
  },

  backText: {
    fontSize: 34,
    lineHeight: 36,
    color: '#111827',
    marginTop: -3,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },

  spacer: {
    width: 42,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3EAF4',
    padding: 18,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
});