import { authService, setAuthToken } from './../../services/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../_layout';

const APP_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { height, width } = useWindowDimensions();
  const { login } = useAuth();
  const router = useRouter();

  const isWeb = Platform.OS === 'web';
  const isWide = width >= 768;
  const isMobile = width < 480;

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.login({
        identifier: trimmedIdentifier,
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.backgroundLayer} pointerEvents="none">
          <View style={styles.bgGlowTop} />
          <View style={styles.bgGlowBottom} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height },
            isWide && styles.scrollContentWide,
          ]}
        >
          <View style={[styles.container, isWide && styles.containerWide]}>
            <View style={[styles.card, isMobile && styles.cardMobile]}>
              <View style={styles.brandRow}>
                <View style={[styles.logoBox, isMobile && styles.logoBoxMobile]}>
                  <Text style={styles.logoArrow}>↗</Text>
                </View>

                <Text style={[styles.brandText, isMobile && styles.brandTextMobile]}>
                  Route<Text style={styles.brandBlue}>Flow</Text>
                </Text>
              </View>

              <View style={[styles.routeIntroBlock, isMobile && styles.routeIntroBlockMobile]}>
                <Text style={[styles.routeIntroTitle, isMobile && styles.routeIntroTitleMobile]}>
                  Smart Route Navigation
                </Text>
                <Text style={[styles.routeIntroSubtitle, isMobile && styles.routeIntroSubtitleMobile]}>
                  Plan routes, track deliveries and finish faster.
                </Text>
              </View>

              <View style={[styles.headerBlock, isMobile && styles.headerBlockMobile]}>
                <Text style={[styles.title, isMobile && styles.titleMobile]}>Welcome back</Text>
                <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
                  Sign in to manage routes and deliveries.
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={[styles.label, isMobile && styles.labelMobile]}>
                Email or Phone Number
              </Text>
              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Enter email or phone number"
                  placeholderTextColor="#98A6BA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  textContentType="username"
                  editable={!loading}
                  style={[styles.input, isMobile && styles.inputMobile, isWeb && styles.webInput]}
                />
              </View>

              <View style={styles.labelRow}>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>Password</Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => router.push('/forgot-password')}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </View>

              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#98A6BA"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  textContentType="password"
                  autoCapitalize="none"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  style={[styles.input, isMobile && styles.inputMobile, isWeb && styles.webInput]}
                />

                <Pressable
                  hitSlop={12}
                  onPress={() => setShowPassword(prev => !prev)}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.showButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.showButtonText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isMobile && styles.primaryButtonMobile,
                  loading && styles.buttonDisabled,
                  pressed && !loading && styles.primaryButtonPressed,
                ]}
              >
                <Text style={[styles.primaryButtonText, isMobile && styles.primaryButtonTextMobile]}>
                  {loading ? 'Please wait...' : 'Continue'}
                </Text>
              </Pressable>

              {/* <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  isMobile && styles.googleButtonMobile,
                  pressed && styles.googleButtonPressed,
                ]}
              >
                <GoogleMark />
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable> */}

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don’t have an account?</Text>

                <Pressable
                  hitSlop={18}
                  onPress={() => router.push('/signup')}
                  style={({ pressed }) => [
                    styles.signupPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.signupLink}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardMobile: {
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 26,
    borderRadius: 28,
  },

  logoBoxMobile: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginRight: 11,
  },

  brandTextMobile: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.45,
  },

  routeIntroBlockMobile: {
    marginTop: 32,
    marginBottom: 34,
  },

  routeIntroTitleMobile: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.45,
  },

  routeIntroSubtitleMobile: {
    marginTop: 9,
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 24,
  },

  headerBlockMobile: {
    marginBottom: 26,
  },

  titleMobile: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.55,
  },

  subtitleMobile: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 24,
  },

  labelMobile: {
    marginBottom: 9,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },

  inputBoxMobile: {
    height: 58,
    borderRadius: 17,
    marginBottom: 20,
  },

  inputMobile: {
    fontSize: 16,
    lineHeight: 22,
  },

  primaryButtonMobile: {
    height: 58,
    borderRadius: 17,
  },

  primaryButtonTextMobile: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  },

  googleButtonMobile: {
    height: 56,
    borderRadius: 17,
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8FC',
  },

  keyboardRoot: {
    flex: 1,
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  bgGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -150,
    right: -110,
    backgroundColor: '#DDEEFF',
  },

  bgGlowBottom: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    left: -150,
    bottom: -150,
    backgroundColor: '#E9F4FF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    justifyContent: 'center',
  },

  scrollContentWide: {
    paddingVertical: 40,
  },

  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  containerWide: {
    maxWidth: 430,
  },

  card: {
    width: '100%',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4ECF5',
    shadowColor: '#6B8EB8',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#176BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#176BFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },

  logoArrow: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },

  brandText: {
    color: '#0B1830',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '600',
    letterSpacing: -0.35,
    fontFamily: APP_FONT,
  },

  brandBlue: {
    color: '#176BFF',
  },

  routeIntroBlock: {
    marginTop: 28,
    marginBottom: 32,
    alignItems: 'center',
  },

  routeIntroTitle: {
    color: '#0B1830',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.35,
    fontFamily: APP_FONT,
  },

  routeIntroSubtitle: {
    marginTop: 8,
    color: '#66758C',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: APP_FONT,
  },

  headerBlock: {
    marginTop: 0,
    marginBottom: 24,
  },

  title: {
    color: '#0B1830',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.45,
    fontFamily: APP_FONT,
  },

  subtitle: {
    marginTop: 8,
    color: '#66758C',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  errorText: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  labelRow: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    marginBottom: 8,
    color: '#17243B',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  inputBox: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#D9E3EF',
    backgroundColor: '#FBFDFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: '#0B1830',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  webInput: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,

  forgotText: {
    color: '#176BFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  showButton: {
    minWidth: 48,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  showButtonText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#176BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#176BFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },

  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },

  dividerRow: {
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1EAF3',
  },

  orText: {
    marginHorizontal: 14,
    color: '#8B98AA',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  googleMarkText: {
    color: '#4285F4',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },


  signupRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signupText: {
    color: '#66758C',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  signupPressable: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 3,
    borderRadius: 10,
  },

  signupLink: {
    color: '#176BFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },

  pressed: {
    opacity: 0.72,
  },
    googleButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#D8E4F1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleButtonPressed: {
    backgroundColor: '#F8FAFC',
  },

  googleText: {
    marginLeft: 12,
    color: '#14213D',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  loginRow: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  loginLinkButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 2,
    borderRadius: 10,
  },

  loginLink: {
    color: '#176BFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: APP_FONT,
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
