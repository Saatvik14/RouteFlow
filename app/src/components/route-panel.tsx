import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function RoutePanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const isWebWide = width >= 768;
  const isSmallScreen = height < 760 || width < 390;

  const panelHeight = isWebWide
    ? Math.min(Math.max(height * 0.42, 330), 390)
    : isSmallScreen
      ? Math.min(Math.max(height * 0.48, 350), 390)
      : Math.min(Math.max(height * 0.44, 365), 410);

  return (
    <View
      style={[
        styles.panel,
        {
          height: panelHeight,
          paddingBottom: Math.max(insets.bottom + 18, 26),
        },
      ]}
    >
      <View style={styles.handle} />

      <View style={styles.content}>
        <Text style={styles.title}>My first route</Text>

        <View style={[styles.illustrationCircle, isWebWide && styles.illustrationCircleWeb]}>
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

        <Text style={styles.question}>
          Where do you start and end{'\n'}your route?
        </Text>

        <Text style={styles.description}>
          Set your start and end location before adding route stops.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          {
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        onPress={() => router.push('/setup-locations' as never)}
      >
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
    borderColor: '#E5EAF1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingTop: 10,
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 16,
  },

  handle: {
    width: 74,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    marginBottom: 14,
  },

  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },

  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 14,
  },

  illustrationCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#EEF5FF',
  },

  illustrationCircleWeb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },

  warehouse: {
    position: 'absolute',
    left: 22,
    bottom: 28,
    width: 66,
    height: 58,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },

  roof: {
    position: 'absolute',
    top: -13,
    left: -7,
    width: 82,
    height: 22,
    backgroundColor: '#64748B',
    transform: [{ skewX: '26deg' }],
  },

  door: {
    position: 'absolute',
    right: 10,
    bottom: 0,
    width: 32,
    height: 39,
    backgroundColor: '#E2E8F0',
    borderTopWidth: 4,
    borderTopColor: '#FFFFFF',
  },

  doorLine: {
    height: 3,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
    marginHorizontal: 5,
    borderRadius: 2,
  },

  truck: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 58,
    height: 38,
  },

  truckBox: {
    position: 'absolute',
    left: 0,
    bottom: 10,
    width: 35,
    height: 25,
    backgroundColor: '#93C5FD',
    borderRadius: 3,
  },

  truckCab: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    width: 28,
    height: 31,
    backgroundColor: '#BFDBFE',
    borderTopRightRadius: 8,
  },

  wheelOne: {
    position: 'absolute',
    left: 8,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1E293B',
  },

  wheelTwo: {
    position: 'absolute',
    right: 8,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1E293B',
  },

  question: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
  },

  button: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
});