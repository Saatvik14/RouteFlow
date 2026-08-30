import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AuthButton,
  AuthField,
  AuthHeading,
  AuthMessage,
  AuthShell,
  AUTH_FONT,
  StepProgress,
  TextLink,
} from '../../components/auth/auth-ui';
import { LEGAL_URLS } from '../../constants/legal';
import { OperationsColors as C } from '../../constants/theme';
import { openExternalUrl } from '../../hooks/open-external-url';
import { authService, setAuthSession } from '../../services/api';
import { useAuth } from '../_layout';

type SignupRole = 'INDEPENDENT_DRIVER' | 'BUSINESS_OWNER' | 'FLEET_DRIVER';
type VehicleType = 'car' | 'van' | 'truck' | 'motorbike';

const roleOptions: Array<{
  value: SignupRole;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: string;
}> = [
  {
    value: 'INDEPENDENT_DRIVER',
    title: 'Independent driver',
    description: 'Plan and drive your own routes',
    icon: 'navigation',
  },
  {
    value: 'BUSINESS_OWNER',
    title: 'Business admin',
    description: 'Manage drivers and dispatch work',
    icon: 'briefcase',
  },
  {
    value: 'FLEET_DRIVER',
    title: 'Fleet driver',
    description: 'Drive routes assigned by a business',
    icon: 'truck',
    badge: 'Business setup',
  },
];

const vehicles: Array<{ value: VehicleType; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { value: 'car', label: 'Car', icon: 'navigation' },
  { value: 'van', label: 'Van', icon: 'box' },
  { value: 'truck', label: 'Truck', icon: 'truck' },
  { value: 'motorbike', label: 'Motorbike', icon: 'zap' },
];

export default function SignupScreen() {
  const searchParams = useLocalSearchParams<{ role?: string; email?: string }>();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<SignupRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const { width } = useWindowDimensions();
  const router = useRouter();
  const { login } = useAuth();
  const narrow = width < 620;

  useEffect(() => {
    if (searchParams.email) {
      setEmail(String(searchParams.email));
    }
    if (searchParams.role) {
      const paramRole = String(searchParams.role).toUpperCase();
      if (paramRole === 'BUSINESS_OWNER' || paramRole === 'FLEET_DRIVER' || paramRole === 'INDEPENDENT_DRIVER') {
        setRole(paramRole as SignupRole);
      }
    }
  }, [searchParams.email, searchParams.role]);

  const validateAccount = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !phone.trim() || !password) {
      setError('Complete your name, email, phone number and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with a letter and a number.');
      return;
    }
    if (!agreeToTerms) {
      setError('Agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setEmail(cleanEmail);
    setError('');
    setStep(2);
  };

  const continueRole = () => {
    if (!role) {
      setError('Choose the option that best describes you.');
      return;
    }
    if (Platform.OS === 'web' && (role === 'INDEPENDENT_DRIVER' || role === 'FLEET_DRIVER')) {
      setError('Driver accounts are registered and operated exclusively via our Android mobile app. Please download RouteFloww on Google Play.');
      openExternalUrl(LEGAL_URLS.PLAY_STORE_APP);
      return;
    }
    setError('');
    setStep(3);
  };

  const validateProfile = () => {
    if (role === 'BUSINESS_OWNER' && !companyName.trim()) {
      setError('Enter your business name.');
      return false;
    }
    if (role === 'INDEPENDENT_DRIVER' && !vehicleType) {
      setError('Choose the vehicle you use most often.');
      return false;
    }
    return true;
  };

  const sendVerificationCode = async (resend = false) => {
    if (!role || role === 'FLEET_DRIVER' || !validateProfile()) return;
    setLoading(true);
    setError('');
    setOtpError('');
    setOtp('');
    const response = await authService.sendOtp({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (!response.success) {
      const message = response.error || 'We could not send the verification code.';
      if (resend) setOtpError(message);
      else setError(message);
      return;
    }
    setShowOtp(true);
    if (resend) setOtpError('A fresh code was sent.');
  };

  const createAccount = async (verificationToken: string) => {
    if (!role || role === 'FLEET_DRIVER') return false;
    const response = await authService.signup({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone_no: phone.trim(),
      password,
      role,
      company_name: role === 'BUSINESS_OWNER' ? companyName.trim() : undefined,
      address: role === 'BUSINESS_OWNER' ? companyAddress.trim() || undefined : undefined,
      vehicle_type: role === 'INDEPENDENT_DRIVER' ? vehicleType || undefined : undefined,
      email_verification_token: verificationToken,
    });

    if (!response.success || !response.data?.accessToken) {
      setOtpError(response.error || 'Your account could not be created. Please try again.');
      return false;
    }

    await setAuthSession(response.data.accessToken, response.data.refreshToken);
    login();
    setShowOtp(false);
    router.replace('/');
    return true;
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    const response = await authService.verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() });
    if (!response.success || !response.data?.verificationToken) {
      setOtpLoading(false);
      setOtpError(response.error || 'That code is invalid or has expired.');
      return;
    }
    await createAccount(response.data.verificationToken);
    setOtpLoading(false);
  };

  const back = () => {
    setError('');
    setStep((current) => Math.max(1, current - 1));
  };

  return (
    <>
      <AuthShell wide={step >= 2}>
        <StepProgress current={step} total={3} />

        {step === 1 ? (
          <>
            <AuthHeading
              eyebrow="Create account · Step 1"
              title="Start with the essentials"
              subtitle="One secure account for your routes. We’ll tailor the workspace after this step."
            />
            {error ? <AuthMessage message={error} /> : null}
            <View style={[styles.twoColumns, narrow && styles.oneColumn]}>
              <View style={styles.column}>
                <AuthField label="Full name" icon="user" value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="Your full name" autoCapitalize="words" textContentType="name" />
                <AuthField label="Email address" icon="mail" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
              </View>
              <View style={styles.column}>
                <AuthField label="Phone number" icon="phone" value={phone} onChangeText={(value) => { setPhone(value); setError(''); }} placeholder="Your mobile number" keyboardType="phone-pad" textContentType="telephoneNumber" />
                <AuthField
                  label="Create password"
                  icon="lock"
                  value={password}
                  onChangeText={(value) => { setPassword(value); setError(''); }}
                  placeholder="At least 8 characters"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  hint="Use at least one letter and one number."
                  trailing={<Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}><Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.inkMuted} /></Pressable>}
                />
              </View>
            </View>

            <View style={styles.termsRow}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreeToTerms }} onPress={() => { setAgreeToTerms((value) => !value); setError(''); }} style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
              </Pressable>
              <View style={styles.termsCopy}>
                <Text style={styles.termsText}>I agree to the </Text>
                <TextLink label="Terms of Service" onPress={() => setShowTerms(true)} />
                <Text style={styles.termsText}> and </Text>
                <TextLink label="Privacy Policy" onPress={() => void openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)} />
              </View>
            </View>
            <AuthButton label="Choose how you’ll use RouteFloww" onPress={validateAccount} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AuthHeading
              eyebrow="Choose your workspace · Step 2"
              title="What are you looking for?"
              subtitle="Choose one role. This controls the tools and sign-in experience you’ll see."
            />
            {error ? <AuthMessage message={error} /> : null}
            <ScrollView horizontal={narrow} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleGrid}>
              {roleOptions.map((option) => {
                const selected = role === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => { setRole(option.value); setError(''); }}
                    style={({ pressed, focused }: any) => [styles.roleCard, selected && styles.roleCardSelected, focused && styles.roleCardFocused, pressed && styles.cardPressed]}
                  >
                    {option.badge ? <Text style={styles.roleBadge}>{option.badge}</Text> : null}
                    {selected ? <View style={styles.selectedMark}><Feather name="check" size={13} color="#FFFFFF" /></View> : null}
                    <View style={[styles.roleIcon, selected && styles.roleIconSelected]}><Feather name={option.icon} size={28} color={selected ? '#FFFFFF' : C.primaryDark} /></View>
                    <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{option.title}</Text>
                    <Text style={styles.roleDescription}>{option.description}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.roleNote}><Feather name="shield" size={17} color={C.info} /><Text style={styles.roleNoteText}>Fleet driver accounts are created by a business admin—drivers never need to register themselves.</Text></View>
            <View style={styles.actions}>
              <AuthButton label="Back" icon="arrow-left" variant="secondary" onPress={back} style={styles.actionButton} />
              <AuthButton label="Continue" onPress={continueRole} style={styles.actionButton} />
            </View>
          </>
        ) : null}

        {step === 3 && role === 'INDEPENDENT_DRIVER' ? (
          <>
            <AuthHeading eyebrow="Driver setup · Step 3" title="One last detail" subtitle="Your primary vehicle helps RouteFloww prepare the right starting workspace." />
            {error ? <AuthMessage message={error} /> : null}
            <Text style={styles.sectionLabel}>Primary vehicle</Text>
            <View style={styles.vehicleGrid}>
              {vehicles.map((vehicle) => {
                const selected = vehicleType === vehicle.value;
                return <Pressable key={vehicle.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setVehicleType(vehicle.value); setError(''); }} style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}><Feather name={vehicle.icon} size={22} color={selected ? C.primaryDark : C.inkMuted} /><Text style={[styles.vehicleText, selected && styles.vehicleTextSelected]}>{vehicle.label}</Text>{selected ? <Feather name="check-circle" size={17} color={C.primary} /> : null}</Pressable>;
              })}
            </View>
            <AuthMessage tone="info" message="That’s all we need. Route addresses and delivery details are added only when you create a route." />
            <View style={styles.actions}><AuthButton label="Back" icon="arrow-left" variant="secondary" onPress={back} style={styles.actionButton} /><AuthButton label="Create driver account" icon="check" loading={loading} onPress={() => void sendVerificationCode()} style={styles.actionButton} /></View>
          </>
        ) : null}

        {step === 3 && role === 'BUSINESS_OWNER' ? (
          <>
            <AuthHeading eyebrow="Business setup · Step 3" title="Name your workspace" subtitle="We only need the business name. An operating address is optional." />
            {error ? <AuthMessage message={error} /> : null}
            <View style={[styles.twoColumns, narrow && styles.oneColumn]}>
              <View style={styles.column}><AuthField label="Business name" icon="briefcase" value={companyName} onChangeText={(value) => { setCompanyName(value); setError(''); }} placeholder="e.g. Acme Express Logistics" autoCapitalize="words" /></View>
              <View style={styles.column}><AuthField label="Operating address (optional)" icon="map-pin" value={companyAddress} onChangeText={setCompanyAddress} placeholder="City, depot or main office" autoCapitalize="words" hint="Useful as a reference only; it does not limit your routes." /></View>
            </View>
            <View style={styles.summaryCard}><View style={styles.summaryIcon}><Feather name="users" size={21} color={C.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.summaryTitle}>Your admin workspace includes</Text><Text style={styles.summaryText}>Driver accounts, access codes, route assignment and live delivery oversight.</Text></View></View>
            <View style={styles.actions}><AuthButton label="Back" icon="arrow-left" variant="secondary" onPress={back} style={styles.actionButton} /><AuthButton label="Create business account" icon="check" loading={loading} onPress={() => void sendVerificationCode()} style={styles.actionButton} /></View>
          </>
        ) : null}

        {step === 3 && role === 'FLEET_DRIVER' ? (
          <View style={styles.fleetPanel}>
            <View style={styles.fleetIcon}><Feather name="key" size={30} color={C.primaryDark} /></View>
            <Text style={styles.fleetTitle}>Your business creates this account</Text>
            <Text style={styles.fleetText}>Ask your business admin to add you in RouteFloww. They’ll give you a private access code to use with your email or phone number.</Text>
            <View style={styles.fleetSteps}><View style={styles.fleetStep}><Text style={styles.fleetStepNumber}>1</Text><Text style={styles.fleetStepText}>Business creates your driver profile</Text></View><View style={styles.fleetStep}><Text style={styles.fleetStepNumber}>2</Text><Text style={styles.fleetStepText}>They share your private code securely</Text></View><View style={styles.fleetStep}><Text style={styles.fleetStepNumber}>3</Text><Text style={styles.fleetStepText}>Sign in and see assigned routes</Text></View></View>
            <View style={styles.actions}><AuthButton label="Choose another role" icon="arrow-left" variant="secondary" onPress={back} style={styles.actionButton} /><AuthButton label="I have an access code" icon="log-in" onPress={() => router.replace('/login')} style={styles.actionButton} /></View>
          </View>
        ) : null}

        <View style={styles.signinRow}><Text style={styles.signinText}>Already have an account?</Text><TextLink label="Sign in" onPress={() => router.replace('/login')} /></View>
      </AuthShell>

      <OtpModal visible={showOtp} email={email} otp={otp} setOtp={setOtp} error={otpError} loading={otpLoading} onClose={() => !otpLoading && setShowOtp(false)} onVerify={verifyCode} onResend={() => void sendVerificationCode(true)} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}

function OtpModal({ visible, email, otp, setOtp, error, loading, onClose, onVerify, onResend }: { visible: boolean; email: string; otp: string; setOtp: (value: string) => void; error: string; loading: boolean; onClose: () => void; onVerify: () => void; onResend: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View accessibilityViewIsModal style={styles.otpCard}><Pressable accessibilityLabel="Close verification" onPress={onClose} style={styles.modalClose}><Feather name="x" size={20} color={C.inkMuted} /></Pressable><View style={styles.otpIcon}><Feather name="mail" size={24} color={C.primaryDark} /></View><Text style={styles.otpTitle}>Check your email</Text><Text style={styles.otpText}>Enter the 6-digit code sent to <Text style={styles.otpEmail}>{email}</Text>.</Text>{error ? <AuthMessage tone={/fresh code/i.test(error) ? 'success' : 'error'} message={error} /> : null}<TextInput accessibilityLabel="Six digit verification code" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} placeholder="000000" placeholderTextColor={C.inkSubtle} style={styles.otpInput} onSubmitEditing={onVerify} /><AuthButton label="Verify and create account" icon="check-circle" loading={loading} onPress={onVerify} /><Pressable disabled={loading} onPress={onResend} style={styles.resend}><Text style={styles.resendText}>Send a new code</Text></Pressable></View></View></Modal>;
}

function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View accessibilityViewIsModal style={styles.termsModal}>
          <View style={styles.termsHeader}>
            <Text style={styles.termsTitle}>Terms of Service</Text>
            <Pressable accessibilityLabel="Close terms" onPress={onClose}><Feather name="x" size={21} color={C.inkMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.termsDocument}>
            <Text style={styles.documentDate}>Last updated: July 2026</Text>
            <Term title="Overview">These Terms govern worldwide use of RouteFloww. By creating an account or using the app, you agree to these Terms. The app is jointly owned by Vaibhav Garg and Uttam Chand Rawat and governed by the laws of India.</Term>
            <Term title="Eligibility">You must be at least 18 years old or use the service with any legally required parent or guardian consent.</Term>
            <Term title="Accounts">Keep your sign-in credentials private and provide accurate account information. Business admins are responsible for sharing fleet-driver access codes securely.</Term>
            <Term title="Services">RouteFloww provides route creation, stop management, navigation, saved routes, route history and related delivery tools.</Term>
            <Term title="Subscriptions and refunds">Paid plans may renew unless cancelled according to the applicable app-store policy. Refund requests are reviewed individually and may exclude non-recoverable taxes or platform fees.</Term>
            <Term title="User content">You retain ownership of route information you create and grant RouteFloww a limited licence to process it only to provide the service.</Term>
            <Term title="Navigation disclaimer">Navigation is provided for convenience. Drivers remain responsible for traffic laws, road conditions and independent judgment.</Term>
            <Term title="Acceptable use">Do not reverse engineer, scrape, abuse, introduce malware, use the service illegally or infringe intellectual property.</Term>
            <Term title="Liability and disputes">The service is provided “as is” to the extent permitted by law. Indian law applies; the arbitration seat is Muzaffarnagar, Uttar Pradesh, India.</Term>
          </ScrollView>
          <AuthButton label="Close" icon="check" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Term({ title, children }: { title: string; children: string }) {
  return <View><Text style={styles.documentTitle}>{title}</Text><Text style={styles.documentText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: 'row', gap: 18 },
  oneColumn: { flexDirection: 'column', gap: 0 },
  column: { flex: 1, minWidth: 0 },
  eyeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.4, borderColor: '#BAC8D9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  termsCopy: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3 },
  termsText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13, lineHeight: 20 },
  roleGrid: { flexGrow: 1, justifyContent: 'center', gap: 12, paddingVertical: 4, paddingHorizontal: 2 },
  roleCard: { width: 190, height: 190, borderRadius: 20, padding: 16, backgroundColor: '#FBFDFF', borderWidth: 1.2, borderColor: '#D8E3EF', justifyContent: 'flex-end', position: 'relative' },
  roleCardSelected: { borderColor: C.primary, backgroundColor: '#F3F7FF', shadowColor: C.primary, shadowOpacity: 0.13, shadowRadius: 14, elevation: 3 },
  roleCardFocused: { borderWidth: 2 },
  cardPressed: { transform: [{ scale: 0.985 }] },
  roleBadge: { position: 'absolute', top: 13, left: 13, color: C.info, fontFamily: AUTH_FONT, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.45 },
  selectedMark: { position: 'absolute', right: 12, top: 12, width: 23, height: 23, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  roleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, marginBottom: 14 },
  roleIconSelected: { backgroundColor: C.primary },
  roleTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  roleTitleSelected: { color: C.primaryDark },
  roleDescription: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 12, lineHeight: 17, marginTop: 5 },
  roleNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 13, backgroundColor: C.infoSoft, marginTop: 16, marginBottom: 20 },
  roleNoteText: { flex: 1, color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  actionButton: { flex: 1, minWidth: 190 },
  sectionLabel: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  vehicleCard: { flex: 1, minWidth: 135, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 15, borderWidth: 1.2, borderColor: '#D8E3EF', backgroundColor: '#FBFDFF' },
  vehicleCardSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  vehicleText: { flex: 1, color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '500' },
  vehicleTextSelected: { color: C.primaryDark },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#C9DBF5', backgroundColor: C.primarySoft, marginBottom: 20 },
  summaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '600' },
  summaryText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 12, lineHeight: 18, marginTop: 3 },
  fleetPanel: { alignItems: 'center', paddingVertical: 8 },
  fleetIcon: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, marginBottom: 18 },
  fleetTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 23, lineHeight: 30, fontWeight: '600', textAlign: 'center' },
  fleetText: { maxWidth: 540, color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  fleetSteps: { width: '100%', maxWidth: 560, gap: 9, marginVertical: 22 },
  fleetStep: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 14, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E2E9F2' },
  fleetStepNumber: { width: 26, height: 26, borderRadius: 13, color: C.primaryDark, backgroundColor: C.primarySoft, textAlign: 'center', lineHeight: 26, fontFamily: AUTH_FONT, fontSize: 12, fontWeight: '600' },
  fleetStepText: { flex: 1, color: C.ink, fontFamily: AUTH_FONT, fontSize: 12, fontWeight: '500' },
  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 },
  signinText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 24, 44, 0.58)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  otpCard: { width: '100%', maxWidth: 430, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 26, position: 'relative' },
  modalClose: { position: 'absolute', right: 14, top: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  otpIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, marginBottom: 15 },
  otpTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 21, fontWeight: '600' },
  otpText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 18 },
  otpEmail: { color: C.ink, fontFamily: AUTH_FONT, fontWeight: '600' },
  otpInput: { height: 58, borderRadius: 15, borderWidth: 1.2, borderColor: '#C8D6E6', backgroundColor: '#FBFDFF', color: C.ink, textAlign: 'center', fontFamily: AUTH_FONT, fontSize: 22, fontWeight: '600', letterSpacing: 8, marginBottom: 16 },
  resend: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  resendText: { color: C.primaryDark, fontFamily: AUTH_FONT, fontSize: 12, fontWeight: '600' },
  termsModal: { width: '100%', maxWidth: 650, maxHeight: '88%', borderRadius: 24, backgroundColor: '#FFFFFF', padding: 24 },
  termsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: C.line },
  termsTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 19, fontWeight: '600' },
  termsDocument: { gap: 17, paddingVertical: 20 },
  documentDate: { color: C.inkSubtle, fontFamily: AUTH_FONT, fontSize: 11 },
  documentTitle: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 14, fontWeight: '600', marginBottom: 5 },
  documentText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13, lineHeight: 20 },
});
