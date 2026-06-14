import { authService, setAuthToken } from './../../services/api';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../_layout';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 820;

function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <View style={[styles.googleArc, styles.googleBlue]} />
      <View style={[styles.googleArc, styles.googleRed]} />
      <View style={[styles.googleArc, styles.googleYellow]} />
      <View style={[styles.googleArc, styles.googleGreen]} />
      <View style={styles.googleHole} />
      <View style={styles.googleCut} />
      <View style={styles.googleBar} />
    </View>
  );
}

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { height, width } = useWindowDimensions();
  const { login } = useAuth();
  const router = useRouter();

  const isWeb = Platform.OS === 'web';

  const scale = Math.min(
    1,
    (width - (isWeb ? 32 : 0)) / DESIGN_WIDTH,
    (height - (isWeb ? 32 : 0)) / DESIGN_HEIGHT,
  );

  const screenScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        identifier: phone.trim(),
        password,
      });

      if (response.success && response.data?.accessToken) {
        await setAuthToken(response.data.accessToken);
        login();
        router.replace('/');
      } else {
        setError(response.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bgTop} />
      <View style={styles.bgLeft} />
      <View style={styles.bgRight} />

      <View
        style={[
          styles.screen,
          {
            transform: [{ scale: screenScale }],
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoArrow}>↗</Text>
          </View>

          <Text style={styles.brandText}>
            Route<Text style={styles.brandBlue}>Flow</Text>
          </Text>
        </View>

        <Text style={styles.title}>Smart Route Navigation</Text>

        <Text style={styles.subtitle}>
          Manage deliveries, track routes and finish faster.
        </Text>

        <View style={styles.hero}>
          <View style={styles.mapLayer} />

          <View style={[styles.mapRoad, styles.mapRoadOne]} />
          <View style={[styles.mapRoad, styles.mapRoadTwo]} />
          <View style={[styles.mapRoad, styles.mapRoadThree]} />
          <View style={[styles.mapRoad, styles.mapRoadFour]} />
          <View style={[styles.mapRoadVertical, styles.mapRoadVerticalOne]} />
          <View style={[styles.mapRoadVertical, styles.mapRoadVerticalTwo]} />

          <View style={[styles.mapPatch, styles.mapPatchOne]} />
          <View style={[styles.mapPatch, styles.mapPatchTwo]} />

          <View style={[styles.routeLine, styles.routeLineOne]} />
          <View style={[styles.routeLine, styles.routeLineTwo]} />
          <View style={[styles.routeLine, styles.routeLineThree]} />

          <View style={[styles.pinShadow, styles.pinShadowBlue]} />
          <View style={[styles.pinShadow, styles.pinShadowGreen]} />

          <View style={[styles.pin, styles.pinBlue]}>
            <View style={styles.pinHole} />
          </View>

          <View style={[styles.pin, styles.pinGreen]}>
            <View style={styles.pinHole} />
          </View>

          <View style={styles.packageCard}>
            <View style={styles.boxTop} />
            <View style={styles.boxBody}>
              <View style={styles.boxTape} />
            </View>

            <View style={styles.truck}>
              <View style={styles.truckBody} />
              <View style={styles.truckCab} />
              <View style={styles.truckWheel} />
              <View style={styles.truckWheel} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>

          <Text style={styles.cardSubtitle}>
            Login to continue your route.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Phone Number</Text>

          <View style={styles.inputBox}>
            <View style={styles.inputIconBox}>
              <Text style={styles.inputIcon}>☎</Text>
            </View>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#A9B5C9"
              keyboardType="phone-pad"
              returnKeyType="next"
              style={[styles.input, isWeb && styles.webInput]}
            />
          </View>

          <Text style={styles.label}>Password</Text>

          <View style={styles.inputBox}>
            <View style={styles.inputIconBox}>
              <Text style={styles.lockIcon}>▣</Text>
            </View>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#A9B5C9"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={[styles.input, isWeb && styles.webInput]}
            />

            <Pressable
              hitSlop={12}
              onPress={() => setShowPassword(prev => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>{showPassword ? '◉' : '◌'}</Text>
            </Pressable>
          </View>

          <Link href="/forgot-password" asChild>
            <Pressable style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </Link>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Please wait...' : 'Continue'}
            </Text>

            {!loading ? <Text style={styles.primaryArrow}>→</Text> : null}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Pressable style={styles.googleButton}>
            <GoogleMark />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don’t have an account?</Text>

            <Link href="/signup" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.signupLink}> Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  bgTop: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    top: -250,
    backgroundColor: '#FFFFFF',
  },

  bgLeft: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -150,
    top: 70,
    backgroundColor: '#D9ECFF',
  },

  bgRight: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    right: -170,
    top: 230,
    backgroundColor: '#DFF1FF',
  },

  screen: {
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 18,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#246BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    shadowColor: '#246BFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },

  logoArrow: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '700',
  },

  brandText: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: '#071733',
    letterSpacing: -0.5,
  },

  brandBlue: {
    color: '#246BFF',
  },

  title: {
    marginTop: 32,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: '#071733',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 19,
    color: '#5F6D86',
    textAlign: 'center',
    fontWeight: '400',
  },

  hero: {
    height: 205,
    marginTop: 18,
    marginHorizontal: -28,
    position: 'relative',
    overflow: 'visible',
  },

  mapLayer: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: 0,
    height: 175,
    backgroundColor: 'rgba(231,242,255,0.92)',
    transform: [{ skewY: '-6deg' }],
  },

  mapRoad: {
    position: 'absolute',
    height: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },

  mapRoadOne: {
    left: -30,
    right: 115,
    top: 80,
    transform: [{ rotate: '15deg' }],
  },

  mapRoadTwo: {
    left: 100,
    right: -25,
    top: 76,
    transform: [{ rotate: '-17deg' }],
  },

  mapRoadThree: {
    left: -24,
    right: 85,
    top: 135,
    transform: [{ rotate: '-20deg' }],
  },

  mapRoadFour: {
    left: 70,
    right: -28,
    top: 153,
    transform: [{ rotate: '18deg' }],
  },

  mapRoadVertical: {
    position: 'absolute',
    width: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },

  mapRoadVerticalOne: {
    height: 170,
    left: 142,
    top: 50,
    transform: [{ rotate: '25deg' }],
  },

  mapRoadVerticalTwo: {
    height: 160,
    right: 116,
    top: 52,
    transform: [{ rotate: '25deg' }],
  },

  mapPatch: {
    position: 'absolute',
    width: 70,
    height: 42,
    borderRadius: 18,
    opacity: 0.55,
  },

  mapPatchOne: {
    left: 34,
    bottom: 46,
    backgroundColor: '#D8F6EF',
    transform: [{ rotate: '-16deg' }],
  },

  mapPatchTwo: {
    right: 34,
    top: 76,
    backgroundColor: '#E5EEF9',
    transform: [{ rotate: '18deg' }],
  },

  routeLine: {
    position: 'absolute',
    height: 7,
    borderRadius: 999,
    backgroundColor: '#216BFF',
    shadowColor: '#216BFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },

  routeLineOne: {
    width: 120,
    left: 98,
    top: 128,
    transform: [{ rotate: '29deg' }],
  },

  routeLineTwo: {
    width: 105,
    left: 146,
    top: 162,
    transform: [{ rotate: '-8deg' }],
  },

  routeLineThree: {
    width: 118,
    right: 76,
    top: 137,
    transform: [{ rotate: '-27deg' }],
  },

  pinShadow: {
    position: 'absolute',
    width: 52,
    height: 17,
    borderRadius: 999,
    opacity: 0.22,
  },

  pinShadowBlue: {
    left: 82,
    top: 125,
    backgroundColor: '#216BFF',
  },

  pinShadowGreen: {
    right: 75,
    top: 128,
    backgroundColor: '#2DBE68',
  },

  pin: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  pinBlue: {
    left: 79,
    top: 67,
    backgroundColor: '#216BFF',
    shadowColor: '#216BFF',
  },

  pinGreen: {
    right: 73,
    top: 70,
    backgroundColor: '#32BF67',
    shadowColor: '#32BF67',
  },

  pinHole: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  packageCard: {
    position: 'absolute',
    top: 86,
    alignSelf: 'center',
    width: 82,
    height: 82,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EEF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8EA5C8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 10,
  },

  boxTop: {
    width: 38,
    height: 17,
    borderRadius: 3,
    backgroundColor: '#E8B06B',
    transform: [{ rotate: '-28deg' }],
  },

  boxBody: {
    width: 42,
    height: 31,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: '#C98B4D',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 7,
  },

  boxTape: {
    width: 9,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#F3D0A1',
  },

  truck: {
    marginTop: 5,
    height: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  truckBody: {
    width: 18,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#216BFF',
  },

  truckCab: {
    width: 12,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#216BFF',
    marginLeft: 2,
  },

  truckWheel: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0D3FA8',
    marginLeft: 3,
  },

  card: {
    marginTop: -30,
    backgroundColor: '#FFFFFF',
    borderRadius: 27,
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F0FB',
    shadowColor: '#8EAAD1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
  },

  cardTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: '#071733',
    letterSpacing: -0.4,
  },

  cardSubtitle: {
    marginTop: 5,
    marginBottom: 15,
    fontSize: 13,
    lineHeight: 18,
    color: '#60708B',
    fontWeight: '400',
  },

  errorText: {
    marginTop: -5,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    color: '#EF4444',
    fontWeight: '500',
  },

  label: {
    marginBottom: 7,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: '#071733',
  },

  inputBox: {
    height: 48,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: '#DCE6F2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 15,
  },

  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  inputIcon: {
    fontSize: 17,
    lineHeight: 20,
    color: '#216BFF',
    fontWeight: '700',
  },

  lockIcon: {
    fontSize: 17,
    lineHeight: 20,
    color: '#216BFF',
    fontWeight: '700',
  },

  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: 13,
    color: '#071733',
    fontWeight: '400',
  },

  webInput: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,

  eyeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },

  eyeText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#7B879A',
    fontWeight: '500',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -7,
    marginBottom: 15,
    paddingVertical: 3,
  },

  forgotText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#1069FF',
    fontWeight: '600',
  },

  primaryButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: '#126BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#126BFF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    fontSize: 14,
    lineHeight: 19,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  primaryArrow: {
    marginLeft: 13,
    fontSize: 22,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '400',
  },

  dividerRow: {
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#DFE8F4',
  },

  orText: {
    marginHorizontal: 15,
    fontSize: 11,
    lineHeight: 15,
    color: '#8490A3',
    fontWeight: '600',
  },

  googleButton: {
    height: 49,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: '#DCE6F2',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleText: {
    marginLeft: 13,
    fontSize: 14,
    lineHeight: 19,
    color: '#071733',
    fontWeight: '500',
  },

  signupRow: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signupText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5D6A82',
    fontWeight: '400',
  },

  signupLink: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1069FF',
    fontWeight: '700',
  },

  googleMark: {
    width: 21,
    height: 21,
    position: 'relative',
  },

  googleArc: {
    position: 'absolute',
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: 'transparent',
  },

  googleBlue: {
    borderTopColor: '#4285F4',
    borderRightColor: '#4285F4',
    transform: [{ rotate: '8deg' }],
  },

  googleRed: {
    borderTopColor: '#EA4335',
    borderLeftColor: '#EA4335',
    transform: [{ rotate: '-18deg' }],
  },

  googleYellow: {
    borderLeftColor: '#FBBC05',
    borderBottomColor: '#FBBC05',
    transform: [{ rotate: '-8deg' }],
  },

  googleGreen: {
    borderBottomColor: '#34A853',
    borderRightColor: '#34A853',
    transform: [{ rotate: '-8deg' }],
  },

  googleHole: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    left: 5,
    top: 5,
  },

  googleCut: {
    position: 'absolute',
    width: 9,
    height: 9,
    backgroundColor: '#FFFFFF',
    right: -1,
    top: 6,
  },

  googleBar: {
    position: 'absolute',
    width: 10,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#4285F4',
    right: 0,
    top: 9,
  },
});