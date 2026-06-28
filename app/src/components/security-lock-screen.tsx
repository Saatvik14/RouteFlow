import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SecurityLockScreenProps = {
  onUnlocked: () => void;
};

export function SecurityLockScreen({ onUnlocked }: SecurityLockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<string>('device lock');

  useEffect(() => {
    detectAuthMethod();
    authenticate();
  }, []);

  const detectAuthMethod = async () => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setAuthMethod(Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setAuthMethod(Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
      } else {
        setAuthMethod('Passcode');
      }
    } catch {
      setAuthMethod('Passcode');
    }
  };

  const authenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      // Check if any authentication is enrolled (biometric or device passcode)
      const level = await LocalAuthentication.getEnrolledLevelAsync();

      if (level === LocalAuthentication.SecurityLevel.NONE) {
        // No lock screen set up on the device — let the user through
        onUnlocked();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock RouteFlow',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        onUnlocked();
      } else {
        const errorCode = result.error;
        if (errorCode === 'user_cancel' || errorCode === 'system_cancel') {
          setErrorMessage('Authentication cancelled. Tap below to try again.');
        } else if (errorCode === 'lockout') {
          setErrorMessage('Too many attempts. Please wait and try again.');
        } else {
          setErrorMessage('Authentication failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('LocalAuthentication error:', err);
      setErrorMessage('Unable to authenticate. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, onUnlocked]);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      <View style={styles.content}>
        {/* Lock icon */}
        <View style={styles.lockIconContainer}>
          <View style={styles.lockIconOuter}>
            <View style={styles.lockShackle} />
            <View style={styles.lockBody}>
              <View style={styles.lockKeyhole} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>RouteFlow is Locked</Text>
        <Text style={styles.subtitle}>
          Authenticate using {authMethod} to continue
        </Text>

        {/* Status area */}
        {isAuthenticating ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#2F76F6" />
            <Text style={styles.statusText}>Waiting for authentication...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Unlock button */}
        {!isAuthenticating && (
          <Pressable
            style={({ pressed }) => [
              styles.unlockButton,
              pressed && styles.unlockButtonPressed,
            ]}
            onPress={authenticate}
          >
            <Text style={styles.unlockButtonText}>Unlock App</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(47, 118, 246, 0.06)',
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(47, 118, 246, 0.03)',
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 400,
  },
  lockIconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  lockIconOuter: {
    alignItems: 'center',
  },
  lockShackle: {
    width: 36,
    height: 24,
    borderWidth: 4,
    borderColor: '#2F76F6',
    borderBottomWidth: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginBottom: -2,
  },
  lockBody: {
    width: 56,
    height: 40,
    backgroundColor: '#2F76F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockKeyhole: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A0A0F',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 24,
    width: '100%',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  unlockButton: {
    backgroundColor: '#2F76F6',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2F76F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  unlockButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
