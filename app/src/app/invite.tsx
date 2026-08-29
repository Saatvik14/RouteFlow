import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActionButton, FormField, StatusBadge } from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { useAuth } from './_layout';
import { getAuthToken, setAuthToken } from '../services/api/client';
import { enterpriseService } from '../services/api/enterprise';
import { LEGAL_URLS } from '../constants/legal';
import { openExternalUrl } from '../hooks/open-external-url';

type ScreenState = 'loading' | 'ready' | 'invalid' | 'expired' | 'accepted' | 'inactive' | 'success';

export default function InvitationScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string }>();
  const token = String(rawToken || '');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isLoggedIn, login } = useAuth();
  const [state, setState] = useState<ScreenState>('loading');
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const preview = async () => {
      if (!token) { setState('invalid'); return; }
      const response = await enterpriseService.previewInvitation(token);
      if (!mounted) return;
      if (!response.success) {
        if (response.statusCode === 410 || /expired/i.test(response.error || '')) setState('expired');
        else if (/accepted/i.test(response.error || '')) setState('accepted');
        else if (response.statusCode === 409) setState('inactive');
        else setState('invalid');
        setError(response.error || 'This invitation could not be opened.');
        return;
      }
      setInvitation(response.data?.invitation || response.data);
      const status = response.data?.invitation?.status;
      setState(status === 'expired' ? 'expired' : status === 'accepted' ? 'accepted' : status === 'pending' ? 'ready' : 'inactive');
    };
    preview();
    return () => { mounted = false; };
  }, [token]);

  const acceptNew = async () => {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError('Use at least 8 characters with a letter and a number.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setSubmitting(true); setError('');
    const response = await enterpriseService.acceptInvitationNew(token, { password, phone: phone.trim() || undefined });
    setSubmitting(false);
    if (!response.success) {
      if (response.statusCode === 410) setState('expired');
      else setError(response.error || 'The invitation could not be accepted.');
      return;
    }
    if (response.data?.accessToken) {
      await setAuthToken(response.data.accessToken);
      login();
    }
    setState('success');
  };

  const acceptExisting = async () => {
    setSubmitting(true); setError('');
    const response = await enterpriseService.acceptInvitationExisting(token);
    setSubmitting(false);
    if (!response.success) {
      if (response.statusCode === 410) setState('expired');
      else setError(response.error || 'The invitation could not be accepted.');
      return;
    }
    if (response.data?.accessToken) {
      await setAuthToken(response.data.accessToken);
      login();
    }
    setState('success');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View pointerEvents="none" style={styles.background}><View style={styles.backgroundLine} /><View style={styles.backgroundDot} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={[styles.card, width < 520 && styles.cardMobile]}>
            <View style={styles.brand}><View style={styles.brandMark}><Feather name="navigation" size={19} color="#FFFFFF" /></View><Text style={styles.brandText}>Route<Text style={{ color: C.primary }}>Floww</Text></Text></View>

            {state === 'loading' ? <InvitationState icon="mail" title="Opening your invitation" message="We’re checking that this secure link is still active." loading /> : null}
            {state === 'invalid' ? <InvitationState icon="link-2" title="This link is invalid" message="The invitation link may be incomplete. Open the latest email from RouteFloww or ask the business to send a new invitation." actionLabel="Go to sign in" onAction={() => router.replace('/login')} /> : null}
            {state === 'expired' ? <InvitationState icon="clock" title="This invitation expired" message="For security, invitation links expire after a limited time. Ask the business dispatcher to resend your invitation." actionLabel="Go to sign in" onAction={() => router.replace('/login')} /> : null}
            {state === 'accepted' ? <InvitationState icon="check-circle" title="Invitation already accepted" message="This single-use link has already been used. Sign in to open your RouteFloww account." actionLabel="Sign in" onAction={() => router.replace('/login')} success /> : null}
            {state === 'inactive' ? <InvitationState icon="slash" title="Invitation no longer active" message="This invitation was revoked or replaced by a newer link. Ask the business to send a new invitation." actionLabel="Go to sign in" onAction={() => router.replace('/login')} /> : null}
            {state === 'success' ? (
              <InvitationState
                icon="user-check"
                title={`Welcome to ${invitation?.organizationName || 'the team'}`}
                message={invitation?.role === 'driver'
                  ? (Platform.OS === 'web'
                      ? 'Your driver account is active! Download the RouteFloww Android app on Google Play to log in and access your assigned routes.'
                      : 'Your membership is active. Assigned routes will now appear in your driver workspace.')
                  : 'Your membership is active. You can now open the business operations workspace.'}
                actionLabel={invitation?.role === 'driver'
                  ? (Platform.OS === 'web' ? 'Install App on Google Play' : 'Open my routes')
                  : 'Open dashboard'}
                onAction={() => {
                  if (invitation?.role === 'driver' && Platform.OS === 'web') {
                    openExternalUrl(LEGAL_URLS.PLAY_STORE_APP);
                  } else {
                    router.replace((invitation?.role === 'driver' ? '/fleet-routes' : '/driver-routes') as any);
                  }
                }}
                success
              />
            ) : null}

            {state === 'ready' && invitation ? (
              <View>
                <View style={styles.invitationIcon}><Feather name="users" size={23} color={C.primaryDark} /></View>
                <Text style={styles.eyebrow}>Team invitation</Text>
                <Text style={styles.title}>Join {invitation.organizationName}</Text>
                <Text style={styles.message}>Hi {invitation.inviteeName}. You’ve been invited as a {String(invitation.role).replace(/_/g, ' ')} using {invitation.maskedEmail}.</Text>
                <View style={styles.invitationMeta}><View><Text style={styles.metaLabel}>Business</Text><Text style={styles.metaValue}>{invitation.organizationName}</Text></View><View><Text style={styles.metaLabel}>Role</Text><StatusBadge compact status={invitation.role === 'driver' ? 'assigned' : 'active'} /></View><View><Text style={styles.metaLabel}>Link expires</Text><Text style={styles.metaValue}>{new Date(invitation.expiresAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View></View>

                {invitation.existingUser ? (
                  <View style={styles.existingBox}>
                    <View style={styles.existingIcon}><Feather name="shield" size={18} color={C.info} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.existingTitle}>You already have a RouteFloww account</Text><Text style={styles.existingText}>For your security, sign in with the email that received this invitation before joining.</Text></View>
                    {isLoggedIn && getAuthToken() ? <ActionButton label="Accept invitation" icon="check" loading={submitting} onPress={acceptExisting} /> : <ActionButton label="Sign in to accept" icon="log-in" onPress={() => router.push({ pathname: '/login', params: { returnTo: `/invite?token=${encodeURIComponent(token)}` } } as any)} />}
                  </View>
                ) : (
                  <View style={styles.form}>
                    <Text style={styles.formTitle}>Create your secure password</Text>
                    <Text style={styles.formHint}>Your password is never shared with the business that invited you.</Text>
                    <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Your mobile number" hint="Used for operational contact; you can add it later." />
                    <View style={{ position: 'relative' }}><FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="At least 8 characters" hint="Include at least one letter and one number." /><Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} style={styles.passwordToggle}><Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.inkMuted} /></Pressable></View>
                    <FormField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholder="Enter password again" error={confirmPassword.length > 0 && confirmPassword !== password ? 'Passwords do not match.' : undefined} />
                    {error ? <View accessibilityRole="alert" style={styles.errorBox}><Feather name="alert-circle" size={17} color={C.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
                    <ActionButton label="Create account and join" icon="user-check" loading={submitting} onPress={acceptNew} />
                  </View>
                )}
                {invitation.existingUser && error ? <View accessibilityRole="alert" style={styles.errorBox}><Feather name="alert-circle" size={17} color={C.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
                <Text style={styles.securityNote}><Feather name="lock" size={12} color={C.inkSubtle} /> This link is single-use. RouteFloww never emails passwords.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InvitationState({ icon, title, message, loading, actionLabel, onAction, success }: { icon: any; title: string; message: string; loading?: boolean; actionLabel?: string; onAction?: () => void; success?: boolean }) {
  return <View style={styles.state}><View style={[styles.stateIcon, success && { backgroundColor: C.successSoft }]}>{loading ? <ActivityIndicator color={C.primary} /> : <Feather name={icon} size={26} color={success ? C.success : C.primaryDark} />}</View><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateMessage}>{message}</Text>{actionLabel && onAction ? <ActionButton label={actionLabel} icon="arrow-right" onPress={onAction} /> : null}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  background: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backgroundLine: { position: 'absolute', left: -120, right: -120, top: '32%', height: 1, backgroundColor: '#D8E3F0', transform: [{ rotate: '-8deg' }] },
  backgroundDot: { position: 'absolute', width: 280, height: 280, borderRadius: 140, right: -100, top: -110, backgroundColor: C.primarySoft, opacity: 0.72 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: S.xl },
  card: { width: '100%', maxWidth: 610, padding: S.xxl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, shadowColor: '#43546E', shadowOpacity: 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 7 },
  cardMobile: { padding: S.xl },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xxl },
  brandMark: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, marginRight: 10 },
  brandText: { color: C.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  invitationIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, marginBottom: S.md },
  eyebrow: { color: C.primaryDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: C.ink, fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, marginTop: S.sm },
  message: { color: C.inkMuted, fontSize: 14, lineHeight: 22, marginTop: S.sm },
  invitationMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xl, paddingVertical: S.lg, marginVertical: S.xl, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  metaLabel: { color: C.inkSubtle, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  metaValue: { color: C.ink, fontSize: 12, fontWeight: '700' },
  existingBox: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.md, padding: S.lg, backgroundColor: C.infoSoft, borderRadius: R.lg, borderWidth: 1, borderColor: '#BCD2EE' },
  existingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  existingTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  existingText: { color: C.inkMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  form: { gap: S.lg },
  formTitle: { color: C.ink, fontSize: 16, fontWeight: '800' },
  formHint: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: -S.md },
  passwordToggle: { position: 'absolute', right: 2, top: 26, width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, backgroundColor: C.dangerSoft, borderRadius: R.md, padding: S.md, marginTop: S.md },
  errorText: { flex: 1, color: C.danger, fontSize: 12, lineHeight: 18 },
  securityNote: { color: C.inkSubtle, fontSize: 11, textAlign: 'center', marginTop: S.xl },
  state: { minHeight: 340, alignItems: 'center', justifyContent: 'center' },
  stateIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, marginBottom: S.lg },
  stateTitle: { color: C.ink, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  stateMessage: { maxWidth: 450, color: C.inkMuted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: S.sm, marginBottom: S.xl },
});
