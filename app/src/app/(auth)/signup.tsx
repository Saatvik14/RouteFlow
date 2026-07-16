import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';

import { authService, setAuthToken } from './../../services/api';
import { useAuth } from './../_layout';
import { IMAGES } from '@/src/constants/theme';
import { openExternalUrl } from './../../hooks/open-external-url';
import { LEGAL_URLS } from '@/src/constants/legal';


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

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(''); // New state for OTP modal errors

  // Terms and agreement state
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { height, width } = useWindowDimensions();
  const router = useRouter();
  const { login } = useAuth();

  const isWeb = Platform.OS === 'web';
  const isWide = width >= 768;
  const isMobile = width < 480;

  const handleSignup = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setError('');

    // Require OTP verification tied to the exact email address
    if (!(otpVerified && verifiedEmail === trimmedEmail)) {
      await handleSendOtp(trimmedEmail);
      return;
    }

    await executeSignup();
  };

  const handleSendOtp = async (targetEmail: string, isResend = false) => {
    // Clear previous errors and OTP input before attempting to send OTP
    setError(''); // Clear main form error
    setOtpError(''); // Clear OTP modal error
    setOtp(''); // Clear OTP input field

    setLoading(true);
    try {
      const response = await authService.sendOtp({ email: targetEmail });

      if (response.success) {
        setShowOtpModal(true);
        if (isResend) {
          setOtpError('New OTP sent to your email.'); // Success message for resend
        }
      } else {
        const errorMessage = response.error || response.message || 'Failed to send verification code.';
        if (isResend) {
          setOtpError(errorMessage); // Show error in modal for resend
        } else {
          setError(errorMessage); // Show error on main form for initial send
        }
      }
    } catch (err) {
      const networkErrorMessage = 'Network error. Please try again.';
      if (isResend) {
        setOtpError(networkErrorMessage);
      } else {
        setError(networkErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter a 6-digit OTP.'); // Set OTP specific error
      return;
    }
    setOtpLoading(true);
    setOtpError(''); // Clear previous OTP errors
    try {
      const response = await authService.verifyOtp({ email: email.trim(), otp });

      if (response.success) {
        setOtpVerified(true);
        setVerifiedEmail(email.trim());
        setShowOtpModal(false);
        setOtpError(''); // Clear OTP error on success
        // Proceed to final signup now that it's verified
        await executeSignup();
      } else {
        const errorMessage = response.error || response.message || 'Invalid OTP code.';
        setOtpError(errorMessage); // Set OTP specific error
      }
    } catch (err) {
      setOtpError('Verification failed. Please try again.'); // Set OTP specific error
    } finally {
      setOtpLoading(false);
    }
  };

  const executeSignup = async () => {
    setLoading(true);
    try {
      const response = await authService.signup({
        name: name.trim(),
        email: email.trim(),
        phone_no: phone.trim(),
        password,
        role: 'DRIVER',
      });

      if (response.success && response.data?.accessToken) {
        await setAuthToken(response.data.accessToken);
        login();
        router.replace('/');
      } else {
        setError(response.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
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
                <Image
                  source={IMAGES.LOGO}
                  style={[styles.logoImage, isMobile && styles.logoImageMobile]}
                />

                <Text style={[styles.brandText, isMobile && styles.brandTextMobile]}>
                  Route<Text style={styles.brandBlue}>Floww</Text>
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
                <Text style={[styles.title, isMobile && styles.titleMobile]}>Create account</Text>
                <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
                  Start managing routes and deliveries in minutes.
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={[styles.label, isMobile && styles.labelMobile]}>Full Name</Text>
              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#98A6BA"
                  returnKeyType="next"
                  textContentType="name"
                  autoCapitalize="words"
                  editable={!loading}
                  style={[styles.input, isMobile && styles.inputMobile, isWeb && styles.webInput]}
                />
              </View>

              <Text style={[styles.label, isMobile && styles.labelMobile]}>Email Address</Text>
              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    // If the user changes the email, clear OTP verification for safety
                    if (val.trim() !== verifiedEmail) {
                      setOtpVerified(false);
                      setOtpError('');
                    }
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#98A6BA"
                  keyboardType="email-address"
                  returnKeyType="next"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={[styles.input, isMobile && styles.inputMobile, isWeb && styles.webInput]}
                />
              </View>

              <Text style={[styles.label, isMobile && styles.labelMobile]}>Phone Number</Text>
              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#98A6BA"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  textContentType="telephoneNumber"
                  editable={!loading}
                  style={[styles.input, isMobile && styles.inputMobile, isWeb && styles.webInput]}
                />
              </View>

              <Text style={[styles.label, isMobile && styles.labelMobile]}>Password</Text>
              <View style={[styles.inputBox, isMobile && styles.inputBoxMobile]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create password"
                  placeholderTextColor="#98A6BA"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  textContentType="newPassword"
                  autoCapitalize="none"
                  editable={!loading}
                  onSubmitEditing={handleSignup}
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

              <View style={styles.agreeRow}>
                <Pressable
                  onPress={() => setAgreeToTerms(prev => !prev)}
                  disabled={loading}
                  style={styles.checkboxTouch}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && <Text style={styles.checkboxCheckmark}>✓</Text>}
                  </View>
                </Pressable>
                <View style={styles.agreeTextContainer}>
                  <Text style={styles.agreeNormalText}>I agree to the </Text>
                  <Pressable onPress={() => setShowTermsModal(true)} hitSlop={12}>
                    <Text style={styles.agreeLinkText}>Terms of Service</Text>
                  </Pressable>
                  <Text style={styles.agreeNormalText}> and </Text>
                  <Pressable
                    onPress={() => void openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)}
                    hitSlop={12}
                    accessibilityRole="link"
                    accessibilityLabel="Open RouteFloww Privacy Policy"
                  >
                    <Text style={styles.agreeLinkText}>Privacy Policy</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleSignup}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isMobile && styles.primaryButtonMobile,
                  loading && styles.buttonDisabled,
                  pressed && !loading && styles.primaryButtonPressed,
                ]}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.primaryButtonText, isMobile && styles.primaryButtonTextMobile, styles.loadingText]}>
                      Creating...
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.primaryButtonText, isMobile && styles.primaryButtonTextMobile]}>Create Account</Text>
                )}
              </Pressable>

              {/* <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.divider} />
              </View> */}

              {/* <Pressable
                disabled={loading}
                style={({ pressed }) => [
                  styles.googleButton,
                  isMobile && styles.googleButtonMobile,
                  pressed && !loading && styles.googleButtonPressed,
                ]}
              >
                <GoogleMark />
                <Text style={[styles.googleText, isMobile && styles.googleTextMobile]}>Sign up with Google</Text>
              </Pressable> */}

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account?</Text>

                <Pressable
                  hitSlop={18}
                  onPress={() => router.push('/login')}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.loginPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.loginLink}>Login</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowOtpModal(false);
          setOtpError(''); // Clear OTP error when modal is closed
          setOtp(''); // Clear OTP input when modal is closed
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              onPress={() => {
                setShowOtpModal(false);
                setOtpError(''); // Clear any OTP errors
                setOtp(''); // Clear OTP input
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Verify Email</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ fontWeight: '600', color: '#17243B' }}>{email.trim()}</Text>
            </Text>

            <Text style={styles.modalHelper}>
              Please check your Spam or Junk folder if you don't see the email.
            </Text>

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            <View style={styles.otpInputBox}>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                placeholderTextColor="#98A6BA"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
                autoFocus
              />
            </View>

            <Pressable
              onPress={handleVerifyOtp}
              disabled={otpLoading || otp.length < 6}
              style={[styles.primaryButton, (otpLoading || otp.length < 6) && styles.buttonDisabled, { width: '100%' }]}
            >
              {otpLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleSendOtp(email.trim(), true)} // Pass true for isResend
              style={styles.resendButton}
            >
              <Text style={styles.resendText}>Resend Code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.documentModalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Terms of Service</Text>
              <Pressable onPress={() => setShowTermsModal(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.documentScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.documentBodyTitle}>RouteFloww Terms of Service</Text>
              <Text style={styles.documentLastUpdated}>Last Updated: July 2026</Text>

              <Text style={styles.documentSectionTitle}>Overview</Text>
              <Text style={styles.documentParagraph}>
                These Terms govern worldwide use of RouteFloww. By creating an account or using the app, users agree to these Terms. The app is jointly owned by Vaibhav Garg and Uttam Chand Rawat and is governed by the laws of India.
              </Text>

              <Text style={styles.documentSectionTitle}>Eligibility</Text>
              <Text style={styles.documentParagraph}>
                Users must be at least 18 years old or use the Service with legally required parental/guardian consent.
              </Text>

              <Text style={styles.documentSectionTitle}>Accounts</Text>
              <Text style={styles.documentParagraph}>
                Users register using email OTP and provide name, email, phone number and password. Users are responsible for maintaining account security.
              </Text>

              <Text style={styles.documentSectionTitle}>Services</Text>
              <Text style={styles.documentParagraph}>
                Route creation, stop management, navigation, saved routes, route history and future related services.
              </Text>

              <Text style={styles.documentSectionTitle}>Subscriptions</Text>
              <Text style={styles.documentParagraph}>
                Lite and Standard plans are available with a 7-day free trial. Charges renew unless cancelled according to the store policies.
              </Text>

              <Text style={styles.documentSectionTitle}>Refunds</Text>
              <Text style={styles.documentParagraph}>
                Refund requests are reviewed individually. Approved refunds may be reduced by non-recoverable taxes or platform fees.
              </Text>

              <Text style={styles.documentSectionTitle}>User Content</Text>
              <Text style={styles.documentParagraph}>
                Users retain ownership of route information they create while granting RouteFloww a limited licence to host, process and display that content for providing the Service.
              </Text>

              <Text style={styles.documentSectionTitle}>Prohibited Conduct</Text>
              <Text style={styles.documentParagraph}>
                No reverse engineering, scraping, bots, abuse, malware, illegal use or infringement of intellectual property.
              </Text>

              <Text style={styles.documentSectionTitle}>Navigation Disclaimer</Text>
              <Text style={styles.documentParagraph}>
                Navigation is provided for convenience only. Users remain responsible for obeying traffic laws and exercising independent judgment.
              </Text>

              <Text style={styles.documentSectionTitle}>Liability</Text>
              <Text style={styles.documentParagraph}>
                Service is provided 'as is'. Liability is limited to the maximum extent permitted by applicable law.
              </Text>

              <Text style={styles.documentSectionTitle}>Disputes</Text>
              <Text style={styles.documentParagraph}>
                Governed by Indian law. Arbitration seat: Muzaffarnagar, Uttar Pradesh, India.
              </Text>
            </ScrollView>
            <Pressable style={styles.modalButton} onPress={() => setShowTermsModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
    marginBottom: 30,
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
    marginBottom: 25,
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
    marginBottom: 19,
  },

  inputMobile: {
    fontSize: 16,
    lineHeight: 22,
  },

  primaryButtonMobile: {
    height: 58,
    borderRadius: 17,
    marginTop: 2,
  },

  primaryButtonTextMobile: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  },

  googleButtonMobile: {
    height: 54,
    borderRadius: 17,
  },

  googleTextMobile: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
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

  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
  },

  logoImageMobile: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 8,
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
    marginBottom: 28,
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
    marginBottom: 22,
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
    flexDirection: 'row',
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

  loadingText: {
    marginLeft: 10,
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

  googleButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#D9E3EF',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleButtonPressed: {
    backgroundColor: '#F8FAFC',
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

  googleText: {
    marginLeft: 12,
    color: '#17243B',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: APP_FONT,
  },

  loginRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {
    color: '#66758C',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: APP_FONT,
  },

  loginPressable: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 3,
    borderRadius: 10,
  },

  loginLink: {
    color: '#176BFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },

  pressed: {
    opacity: 0.72,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 24, 48, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1830',
    marginBottom: 8,
    fontFamily: APP_FONT,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#66758C',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: APP_FONT,
  },
  modalHelper: {
    fontSize: 13,
    color: '#66758C',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: APP_FONT,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },
  otpInputBox: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#D9E3EF',
    backgroundColor: '#FBFDFF',
    marginBottom: 20,
    justifyContent: 'center',
  },
  otpInput: {
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#176BFF',
    fontWeight: '700',
    fontFamily: APP_FONT,
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
  },
  resendText: {
    color: '#176BFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: APP_FONT,
  },
  otpErrorText: {
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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
  },
  checkboxTouch: {
    padding: 6,
    marginLeft: -6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#98A6BA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  agreeTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: 1,
    marginLeft: 4,
  },
  agreeNormalText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: APP_FONT,
    lineHeight: 20,
  },
  agreeLinkText: {
    fontSize: 13,
    color: '#2563EB',
    fontFamily: APP_FONT,
    fontWeight: '600',
    textDecorationLine: 'underline',
    lineHeight: 20,
  },
  documentModalContainer: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: APP_FONT,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    padding: 4,
  },
  documentScroll: {
    flex: 1,
    marginBottom: 16,
  },
  documentBodyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: APP_FONT,
  },
  documentLastUpdated: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    fontFamily: APP_FONT,
  },
  documentSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
    fontFamily: APP_FONT,
  },
  documentParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontFamily: APP_FONT,
  },
  modalButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    fontFamily: APP_FONT,
  },
});
