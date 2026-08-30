import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { authService } from '../../services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Step 1: Send OTP to email
  const handleSendCode = async () => {
    const cleanIdentifier = identifier.trim().toLowerCase();
    if (!cleanIdentifier) {
      setError('Please enter your email address.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanIdentifier)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.sendOtp({ email: cleanIdentifier });
      if (!response.success && response.error) {
        setError(response.error);
        return;
      }
      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code in Step 2
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const cleanIdentifier = identifier.trim().toLowerCase();
    if (!cleanIdentifier) return;

    setLoading(true);
    setError('');

    try {
      const response = await authService.sendOtp({ email: cleanIdentifier });
      if (!response.success && response.error) {
        setError(response.error);
        return;
      }
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async () => {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanOtp.length !== 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must be at least 8 characters and include both a letter and a number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.resetPassword({
        email: cleanIdentifier,
        otp: cleanOtp,
        newPassword,
      });

      if (!response.success && response.error) {
        setError(response.error);
        return;
      }

      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please verify your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {step === 'request' ? (
        <>
          <AuthHeading
            eyebrow="Account recovery · Step 1 of 2"
            title="Reset your password"
            subtitle="Enter the email address associated with your account, and we'll send you a 6-digit verification code."
          />

          {error ? <AuthMessage message={error} /> : null}

          <AuthField
            label="Email address"
            icon="mail"
            value={identifier}
            onChangeText={(val) => {
              setIdentifier(val);
              setError('');
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            editable={!loading}
            onSubmitEditing={handleSendCode}
          />

          <View style={styles.tipBox}>
            <View style={styles.tipIcon}>
              <Feather name="info" size={16} color={C.primary} />
            </View>
            <Text style={styles.tipText}>
              Fleet drivers: If you sign in using a business access code, your business admin can regenerate your code directly from their dashboard.
            </Text>
          </View>

          <AuthButton
            label="Send verification code"
            icon="arrow-right"
            loading={loading}
            onPress={handleSendCode}
          />

          <Pressable
            style={styles.alreadyHaveCodeBtn}
            onPress={() => {
              setError('');
              setStep('verify');
            }}
          >
            <Text style={styles.alreadyHaveCodeText}>Already have a verification code? Enter it here</Text>
          </Pressable>
        </>
      ) : step === 'verify' ? (
        <>
          <AuthHeading
            eyebrow="Account recovery · Step 2 of 2"
            title="Enter code & new password"
            subtitle={
              identifier.trim()
                ? `Enter the 6-digit code sent to ${identifier.trim()} and choose a new password.`
                : "Enter your email, the 6-digit verification code, and your new password."
            }
          />

          {error ? <AuthMessage message={error} /> : null}

          {!identifier.trim() ? (
            <AuthField
              label="Email address"
              icon="mail"
              value={identifier}
              onChangeText={(val) => {
                setIdentifier(val);
                setError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          ) : null}

          <View style={styles.otpFieldWrap}>
            <Text style={styles.otpLabel}>Verification code</Text>
            <TextInput
              style={[styles.otpInput, isWeb && styles.webOtpInput]}
              value={otp}
              onChangeText={(val) => {
                setOtp(val.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="••••••"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
            />
          </View>

          <AuthField
            label="New password"
            icon="lock"
            value={newPassword}
            onChangeText={(val) => {
              setNewPassword(val);
              setError('');
            }}
            placeholder="At least 8 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            trailing={
              <Pressable
                hitSlop={10}
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.inkMuted} />
              </Pressable>
            }
          />

          <AuthField
            label="Confirm new password"
            icon="lock"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              setError('');
            }}
            placeholder="Re-enter your new password"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleResetPassword}
            trailing={
              <Pressable
                hitSlop={10}
                onPress={() => setShowConfirmPassword((v) => !v)}
                style={styles.eyeButton}
              >
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={C.inkMuted} />
              </Pressable>
            }
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <TextLink
              label={resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              onPress={resendCooldown > 0 ? () => {} : handleResend}
            />
          </View>

          <AuthButton
            label="Reset password"
            icon="check"
            loading={loading}
            onPress={handleResetPassword}
          />

          <Pressable
            style={styles.backStepBtn}
            onPress={() => {
              setError('');
              setStep('request');
            }}
          >
            <Feather name="arrow-left" size={14} color={C.primaryDark} />
            <Text style={styles.backStepText}>Change email address</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Feather name="check-circle" size={42} color="#16A34A" />
          </View>

          <Text style={styles.successTitle}>Password Reset Successful!</Text>
          <Text style={styles.successSubtext}>
            Your password has been updated securely. You can now sign in to RouteFloww with your new password.
          </Text>

          <AuthButton
            label="Sign in now"
            icon="log-in"
            onPress={() => router.replace('/login')}
          />
        </View>
      )}

      {step !== 'success' ? (
        <View style={styles.linksContainer}>
          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>Remember your password?</Text>
            <TextLink label="Back to sign in" onPress={() => router.push('/login')} />
          </View>

          <View style={styles.linkRow}>
            <Text style={styles.linkPrompt}>New to RouteFloww?</Text>
            <TextLink label="Create an account" onPress={() => router.push('/signup')} />
          </View>
        </View>
      ) : null}

      {isWeb ? (
        <Text style={styles.securityNote}>
          Protected by encrypted credentials and rate-limited recovery.
        </Text>
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: '#C7DAF7',
    marginBottom: 20,
    marginTop: 2,
  },
  tipIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    color: C.inkMuted,
    fontFamily: AUTH_FONT,
    fontSize: 12,
    lineHeight: 18,
  },
  alreadyHaveCodeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  alreadyHaveCodeText: {
    color: C.primaryDark,
    fontFamily: AUTH_FONT,
    fontSize: 13,
    fontWeight: '600',
  },
  otpFieldWrap: {
    marginBottom: 16,
  },
  otpLabel: {
    color: C.ink,
    fontFamily: AUTH_FONT,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  otpInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#C8D6E6',
    backgroundColor: '#FBFDFF',
    color: C.ink,
    textAlign: 'center',
    fontFamily: AUTH_FONT,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 10,
  },
  webOtpInput: {
    outlineStyle: 'none' as any,
  },
  eyeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 14,
    flexWrap: 'wrap',
  },
  resendLabel: {
    color: C.inkMuted,
    fontFamily: AUTH_FONT,
    fontSize: 13,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
  },
  backStepText: {
    color: C.primaryDark,
    fontFamily: AUTH_FONT,
    fontSize: 13,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  successIconBox: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: C.ink,
    fontFamily: AUTH_FONT,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    color: C.inkMuted,
    fontFamily: AUTH_FONT,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  linksContainer: {
    marginTop: 22,
    gap: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  linkPrompt: {
    color: C.inkMuted,
    fontFamily: AUTH_FONT,
    fontSize: 13,
  },
  securityNote: {
    color: C.inkSubtle,
    fontFamily: AUTH_FONT,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
  },
});