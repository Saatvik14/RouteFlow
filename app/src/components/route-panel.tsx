import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function RoutePanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { height, width } = useWindowDimensions();

  const isDark = colorScheme === 'dark';
  const isSmallScreen = height < 760 || width < 390;

  const colors = useMemo(
    () => ({
      panel: isDark ? '#151A21' : '#FFFFFF',
      border: isDark ? '#28303B' : '#E3EAF4',
      handle: isDark ? '#3A4453' : '#D5DEE9',
      title: isDark ? '#F8FAFC' : '#101828',
      text: isDark ? '#F8FAFC' : '#101828',
      circle: isDark ? '#EAF2FB' : '#EEF5FF',
      button: '#4285F4',
      shadow: isDark ? '#000000' : '#8BADEB',
    }),
    [isDark]
  );

  const panelHeight = isSmallScreen
    ? Math.min(Math.max(height * 0.49, 365), 390)
    : Math.min(Math.max(height * 0.46, 380), 420);

  return (
    <View
      style={[
        styles.panel,
        {
          height: panelHeight,
          paddingBottom: Math.max(insets.bottom + 16, 24),
          backgroundColor: colors.panel,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}>
      <View style={[styles.handle, { backgroundColor: colors.handle }]} />

      <Text style={[styles.title, { color: colors.title }]}>
        My first route
      </Text>

      <View style={[styles.illustrationCircle, { backgroundColor: colors.circle }]}>
        <View style={styles.warehouse}>
          <View style={styles.roof} />

          <View style={styles.door}>
            <View style={styles.doorLine} />
            <View style={styles.doorLine} />
            <View style={styles.doorLine} />
          </View>
        </View>

        <View style={styles.truck}>
          <View style={styles.truckBox} />
          <View style={styles.truckCab} />
          <View style={styles.wheelOne} />
          <View style={styles.wheelTwo} />
        </View>
      </View>

      <Text style={[styles.question, { color: colors.text }]}>
        Where do you start and end{'\n'}your route?
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.button,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.push('/setup-locations')}>
        <Text style={styles.buttonText}>Set up locations</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingTop: 14,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },

  handle: {
    width: 74,
    height: 5,
    borderRadius: 999,
    marginBottom: 18,
  },

  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },

  illustrationCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 22,
  },

  warehouse: {
    position: 'absolute',
    left: 24,
    bottom: 31,
    width: 72,
    height: 66,
    backgroundColor: '#F4F7FA',
  },

  roof: {
    position: 'absolute',
    top: -15,
    left: -8,
    width: 90,
    height: 24,
    backgroundColor: '#5D6A73',
    transform: [{ skewX: '26deg' }],
  },

  door: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    width: 36,
    height: 44,
    backgroundColor: '#D8E2EA',
    borderTopWidth: 5,
    borderTopColor: '#FFFFFF',
  },

  doorLine: {
    height: 4,
    backgroundColor: '#B8C5CF',
    marginTop: 6,
    marginHorizontal: 5,
    borderRadius: 2,
  },

  truck: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 62,
    height: 42,
  },

  truckBox: {
    position: 'absolute',
    left: 0,
    bottom: 11,
    width: 38,
    height: 28,
    backgroundColor: '#A9D8F7',
  },

  truckCab: {
    position: 'absolute',
    right: 0,
    bottom: 11,
    width: 30,
    height: 34,
    backgroundColor: '#B8E1FF',
    borderTopRightRadius: 8,
  },

  wheelOne: {
    position: 'absolute',
    left: 8,
    bottom: 3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#1D2935',
  },

  wheelTwo: {
    position: 'absolute',
    right: 8,
    bottom: 3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#1D2935',
  },

  question: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 22,
  },

  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
});