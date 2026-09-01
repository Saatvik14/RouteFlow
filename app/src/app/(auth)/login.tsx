import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthButton,
  AuthField,
  AuthHeading,
  AuthMessage,
  AuthShell,
  AUTH_FONT,
  TextLink,
} from '../../components/auth/auth-ui';
import { OperationsColors as C } from '../../constants/theme';
import { authService, AuthMethod, setAuthSession } from '../../services/api';
import { useAuth } from '../_layout';

type AccountResolution = {
  authMethod: AuthMethod;
  role: string;
  roleLabel: string;
};

const roleIcon = (role: string): keyof typeof Feather.glyphMap => {
  if (role === 'BUSINESS_OWNER' || role === 'PLATFORM_ADMIN') return 'briefcase';
  if (role === 'FLEET_DRIVER') return 'truck';
  return 'navigation';
};

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [account, setAccount] = useState<AccountResolution | null>(null);
  const [showCredential, setShowCredential] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { login } = useAuth();
  const isWeb = Platform.OS === 'web';

  const findAccount = async () => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Enter your email address or phone number.');
      return;
    }

    setLoading(true);
    setError('');
    const response = await authService.identify(cleanIdentifier);
    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.error || 'We could not check this account. Please try again.');
      return;
    }

    setCredential('');
    setAccount(response.data);
  };

  const signIn = async () => {
    if (!account) return findAccount();
    if (!credential.trim()) {
      setError(account.authMethod === 'access_code'
        ? 'Enter the access code provided by your business.'
        : 'Enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    const response = await authService.login({
      identifier: identifier.trim(),
      ...(account.authMethod === 'access_code'
        ? { accessCode: credential.trim() }
        : { password: credential }),
    });

    if (!response.success || !response.data?.accessToken) {
      setLoading(false);
      setError(response.error || 'Sign in failed. Check your details and try again.');
      return;
    }

    await setAuthSession(response.data.accessToken, response.data.refreshToken);
    login();
    const respData = response.data as any;
    const rawRole = String(respData?.role || respData?.user?.role || '').toUpperCase();
    const isOwner = rawRole === 'BUSINESS_OWNER' || rawRole === 'PLATFORM_ADMIN';
    const isFleetDriver = rawRole === 'FLEET_DRIVER';
    if (returnTo) {
      router.replace(String(returnTo) as any);
    } else if (isOwner && Platform.OS === 'web') {
      router.replace('/dashboard' as any);
    } else if (isFleetDriver) {
      router.replace('/fleet-routes' as any);
    } else {
      router.replace('/');
    }
    setLoading(false);
  };

  const editIdentifier = () => {
    setAccount(null);
    setCredential('');
    setError('');
  };

  return (
    <AuthShell>
      <AuthHeading
        eyebrow={account ? 'Secure sign in · Step 2 of 2' : 'Secure sign in · Step 1 of 2'}
        title="Welcome back"
        subtitle={account
          ? account.authMethod === 'access_code'
            ? 'Use the private access code your business admin gave you.'
            : 'Your account uses a password to keep your workspace secure.'
          : 'Start with your email or phone. We’ll show the right sign-in method for your account.'}
      />

      {error ? <AuthMessage message={error} /> : null}

      {!account ? (
        <>
          <AuthField
            label="Email or phone number"
            icon="user"
            value={identifier}
            onChangeText={(value) => { setIdentifier(value); setError(''); }}
            placeholder="you@example.com or +91 98765 43210"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            editable={!loading}
            onSubmitEditing={findAccount}
          />
          <AuthButton label="Continue securely" loading={loading} onPress={findAccount} />
        </>
      ) : (
        <>
          <View style={styles.accountCard}>
            <View style={styles.roleIcon}>
              <Feather name={roleIcon(account.role)} size={19} color={C.primaryDark} />
            </View>
            <View style={styles.accountText}>
              <Text style={styles.roleLabel}>{account.roleLabel}</Text>
              <Text numberOfLines={1} style={styles.identifier}>{identifier.trim()}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Use another account" hitSlop={10} onPress={editIdentifier}>
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          </View>

          <AuthField
            label={account.authMethod === 'access_code' ? 'Business access code' : 'Password'}
            icon={account.authMethod === 'access_code' ? 'key' : 'lock'}
            value={credential}
            onChangeText={(value) => {
              setCredential(account.authMethod === 'access_code' ? value.toUpperCase() : value);
              setError('');
            }}
            placeholder={account.authMethod === 'access_code' ? 'RF-XXXX-XXXX' : 'Enter your password'}
            secureTextEntry={!showCredential}
            autoCapitalize={account.authMethod === 'access_code' ? 'characters' : 'none'}
            autoCorrect={false}
            autoComplete={account.authMethod === 'password' ? 'password' : 'off'}
            textContentType={account.authMethod === 'password' ? 'password' : 'none'}
            returnKeyType="done"
            autoFocus={true}
            editable={!loading}
            onSubmitEditing={signIn}
            hint={account.authMethod === 'access_code'
              ? 'Codes are created and reset by your business admin.'
              : undefined}
            trailing={(
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showCredential ? 'Hide credential' : 'Show credential'}
                hitSlop={10}
                onPress={() => setShowCredential((value) => !value)}
                style={styles.visibilityButton}
              >
                <Feather name={showCredential ? 'eye-off' : 'eye'} size={18} color={C.inkMuted} />
              </Pressable>
            )}
          />

          {account.authMethod === 'password' ? (
            <View style={styles.forgotRow}>
              <TextLink label="Forgot password?" onPress={() => router.push('/forgot-password')} />
            </View>
          ) : null}

          <AuthButton label="Sign in" icon="log-in" loading={loading} onPress={signIn} />
        </>
      )}

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>New to RouteFloww?</Text>
        <TextLink label="Create an account" onPress={() => router.push('/signup')} />
      </View>

      {isWeb ? <Text style={styles.securityNote}>Protected by encrypted credentials and rate-limited sign-in.</Text> : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  accountCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.primarySoft, borderWidth: 1, borderColor: '#C7DAF7', marginBottom: 20 },
  roleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  accountText: { flex: 1, minWidth: 0 },
  roleLabel: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '600' },
  identifier: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 12, marginTop: 3 },
  changeText: { color: C.primaryDark, fontFamily: AUTH_FONT, fontSize: 12, fontWeight: '600' },
  visibilityButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  forgotRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 18 },
  signupRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  signupText: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 13 },
  securityNote: { color: C.inkSubtle, fontFamily: AUTH_FONT, fontSize: 11, textAlign: 'center', marginTop: 18 },
});
