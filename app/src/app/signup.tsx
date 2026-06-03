import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authService, setAuthToken } from '@/services/api';
import { useAuth } from './_layout';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !email || !phone || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Call signup API
      const response = await authService.signup({
        name,
        email,
        phone_no: phone,
        password,
        role: 'DRIVER', // Default role
      });

      setLoading(false);
      console.log('Signup response:', response);

      if (response.success && response.data?.accessToken) {
        // Save token for future requests
        await setAuthToken(response.data.accessToken);
        login();
        // Route to Home screen
        router.replace('/(tabs)/explore');
      } else {
        // Show error message from API
        setError(response.error || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.screenCard}>
          <View style={styles.heroSection}>
            <View style={styles.logoTruckWrap}>
              <Text style={styles.logoTruck}>🚚</Text>
            </View>

            <View style={styles.logoRow}>
              <Text style={styles.logoDark}>Route</Text>
              <Text style={styles.logoBlue}>Flow</Text>
            </View>

            <Text style={styles.heading}>
              Create Your{'\n'}Account
            </Text>

            <Text style={styles.subtitle}>
              Start managing deliveries, routes and{'\n'}orders faster.
            </Text>

            <View style={styles.illustration}>
              <View style={[styles.cloud, styles.cloudLeft]} />
              <View style={[styles.cloudSmall, styles.cloudLeftSmall]} />
              <View style={[styles.cloud, styles.cloudRight]} />
              <View style={[styles.cloudSmall, styles.cloudRightSmall]} />

              <View style={styles.cityLayer}>
                <View style={[styles.building, styles.buildingOne]}>
                  <View style={styles.window} />
                  <View style={styles.window} />
                </View>

                <View style={[styles.building, styles.buildingTwo]}>
                  <View style={styles.window} />
                  <View style={styles.window} />
                  <View style={styles.window} />
                </View>

                <View style={[styles.building, styles.buildingThree]}>
                  <View style={styles.window} />
                  <View style={styles.window} />
                </View>

                <View style={[styles.building, styles.buildingFour]}>
                  <View style={styles.window} />
                  <View style={styles.window} />
                  <View style={styles.window} />
                </View>
              </View>

              <View style={styles.ground} />

              <View style={styles.routePathOne} />
              <View style={styles.routePathTwo} />
              <View style={styles.routePathThree} />

              <View style={[styles.pin, styles.pinBlue]}>
                <View style={styles.pinInner} />
              </View>

              <View style={[styles.pin, styles.pinGreen]}>
                <View style={styles.pinInner} />
              </View>

              <View style={styles.packageBox}>
                <Text style={styles.packageIcon}>📦</Text>
              </View>

              <View style={styles.truckOnRoute}>
                <Text style={styles.truckIcon}>🚚</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureCard}>
                <View style={[styles.featureIconCircle, styles.blueCircle]}>
                  <Text style={styles.featureIcon}>📍</Text>
                </View>
                <Text style={styles.featureTitle}>Live Routes</Text>
                <Text style={styles.featureDesc}>
                  Real-time route{'\n'}updates
                </Text>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.featureIconCircle, styles.greenCircle]}>
                  <Text style={styles.featureIcon}>🛰️</Text>
                </View>
                <Text style={styles.featureTitle}>GPS Tracking</Text>
                <Text style={styles.featureDesc}>
                  Track every{'\n'}delivery live
                </Text>
              </View>

              <View style={styles.featureCard}>
                <View style={[styles.featureIconCircle, styles.purpleCircle]}>
                  <Text style={styles.featureIcon}>📦</Text>
                </View>
                <Text style={styles.featureTitle}>Deliveries</Text>
                <Text style={styles.featureDesc}>
                  Manage orders{'\n'}efficiently
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.signupCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.labelRow}>
              <Text style={styles.labelIcon}>👤</Text>
              <Text style={styles.label}>Full Name</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9AA8BD"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <View style={styles.labelRow}>
              <Text style={styles.labelIcon}>📧</Text>
              <Text style={styles.label}>Email Address</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9AA8BD"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.labelRow}>
              <Text style={styles.labelIcon}>📱</Text>
              <Text style={styles.label}>Phone Number</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor="#9AA8BD"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />

            <View style={styles.labelRow}>
              <Text style={styles.labelIcon}>🔒</Text>
              <Text style={styles.label}>Password</Text>
            </View>

            <View style={styles.passwordInputWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor="#9AA8BD"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                hitSlop={10}
                style={styles.eyeButton}
                onPress={() => setShowPassword(prev => !prev)}
                disabled={loading}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>

            <Pressable 
              style={[styles.signupButton, loading && styles.signupButtonDisabled]} 
              onPress={handleSignup}
              disabled={loading}>
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 10 }} />
                  <Text style={styles.signupButtonText}>Creating Account...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signupButtonText}>Create Account</Text>
                  <Text style={styles.arrowText}>→</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Pressable style={styles.googleButton}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Sign up with Google</Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text style={styles.loginLink}> Login</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF5FF',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  screenCard: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAF1FF',
    shadowColor: '#8BADEB',
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 8,
  },

  heroSection: {
    paddingTop: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  logoTruckWrap: {
    width: 72,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  logoTruck: {
    fontSize: 42,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  logoDark: {
    fontSize: 33,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#1F2A44',
  },

  logoBlue: {
    fontSize: 33,
    lineHeight: 39,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#2F76F6',
  },

  heading: {
    fontSize: 39,
    lineHeight: 47,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.8,
    color: '#1B2440',
  },

  subtitle: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    textAlign: 'center',
    color: '#66728A',
  },

  illustration: {
    width: '100%',
    height: 215,
    marginTop: 18,
    position: 'relative',
  },

  cloud: {
    position: 'absolute',
    width: 84,
    height: 38,
    borderRadius: 28,
    backgroundColor: '#EDF5FF',
  },

  cloudSmall: {
    position: 'absolute',
    width: 54,
    height: 28,
    borderRadius: 22,
    backgroundColor: '#EDF5FF',
  },

  cloudLeft: {
    left: -30,
    top: 22,
  },

  cloudLeftSmall: {
    left: 36,
    top: 42,
  },

  cloudRight: {
    right: -10,
    top: 44,
  },

  cloudRightSmall: {
    right: 64,
    top: 64,
  },

  cityLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    height: 92,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    opacity: 0.65,
  },

  building: {
    width: 34,
    borderRadius: 8,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    paddingTop: 10,
  },

  buildingOne: {
    height: 54,
    marginLeft: 18,
  },

  buildingTwo: {
    height: 84,
  },

  buildingThree: {
    height: 66,
  },

  buildingFour: {
    height: 92,
    marginRight: 18,
  },

  window: {
    width: 8,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },

  ground: {
    position: 'absolute',
    left: -45,
    right: -45,
    bottom: 0,
    height: 112,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: '#EAF4FF',
  },

  routePathOne: {
    position: 'absolute',
    left: 66,
    top: 100,
    width: 165,
    height: 68,
    borderLeftWidth: 7,
    borderBottomWidth: 7,
    borderColor: '#7BAEFF',
    borderBottomLeftRadius: 90,
    opacity: 0.95,
    transform: [{ rotate: '-8deg' }],
  },

  routePathTwo: {
    position: 'absolute',
    right: 62,
    top: 104,
    width: 175,
    height: 70,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderColor: '#2F76F6',
    borderBottomRightRadius: 90,
    opacity: 0.95,
    transform: [{ rotate: '7deg' }],
  },

  routePathThree: {
    position: 'absolute',
    left: 150,
    right: 138,
    bottom: 38,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#2F76F6',
    opacity: 0.9,
  },

  pin: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F76F6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },

  pinBlue: {
    left: 52,
    top: 78,
    backgroundColor: '#2F76F6',
  },

  pinGreen: {
    right: 52,
    top: 90,
    backgroundColor: '#45C978',
  },

  pinInner: {
    width: 13,
    height: 13,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  packageBox: {
    position: 'absolute',
    top: 98,
    alignSelf: 'center',
  },

  packageIcon: {
    fontSize: 34,
  },

  truckOnRoute: {
    position: 'absolute',
    left: '42%',
    bottom: 24,
  },

  truckIcon: {
    fontSize: 46,
  },

  featureRow: {
    width: '100%',
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  featureCard: {
    flex: 1,
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEF3FB',
    shadowColor: '#7E9BCB',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },

  featureIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  blueCircle: {
    backgroundColor: '#EAF2FF',
  },

  greenCircle: {
    backgroundColor: '#E9F9EF',
  },

  purpleCircle: {
    backgroundColor: '#F2EAFF',
  },

  featureIcon: {
    fontSize: 24,
  },

  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1B2440',
  },

  featureDesc: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'center',
    color: '#717D96',
  },

  signupCard: {
    marginTop: 22,
    marginHorizontal: 18,
    marginBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF3FB',
    shadowColor: '#7E9BCB',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  labelIcon: {
    width: 26,
    fontSize: 19,
    color: '#2F76F6',
    marginRight: 8,
  },

  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#1B2440',
  },

  input: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: '#DDE5F0',
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: '400',
    color: '#1B2440',
    backgroundColor: '#FFFFFF',
    marginBottom: 21,
  },

  passwordInputWrap: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: '#DDE5F0',
    paddingLeft: 18,
    paddingRight: 54,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    justifyContent: 'center',
    position: 'relative',
  },

  passwordInput: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1B2440',
    paddingVertical: 0,
  },

  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  eyeIcon: {
    fontSize: 22,
    color: '#7C879A',
  },

  signupButton: {
    height: 62,
    borderRadius: 18,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#2F76F6',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 5,
  },

  signupButtonDisabled: {
    backgroundColor: '#B0C4E1',
    shadowOpacity: 0,
    elevation: 0,
  },

  signupButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  arrowText: {
    marginLeft: 14,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '400',
    color: '#FFFFFF',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 26,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E8F2',
  },

  orText: {
    marginHorizontal: 18,
    fontSize: 14,
    fontWeight: '600',
    color: '#7A8496',
  },

  googleButton: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: '#DDE5F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  googleG: {
    fontSize: 25,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 18,
  },

  googleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1B2440',
  },

  loginRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#717D96',
  },

  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D6DF2',
  },

  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
});