import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../constants/theme';
import { LEGAL_URLS } from '../constants/legal';
import { openExternalUrl } from '../hooks/open-external-url';

export default function DispatchLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleGetStarted = () => {
    const cleanEmail = email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }

    router.push({
      pathname: '/signup',
      params: {
        role: 'BUSINESS_OWNER',
        ...(cleanEmail ? { email: cleanEmail } : {}),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header Navbar matching Screenshot 2 */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerInner}>
          <Pressable style={styles.logoRow} onPress={() => router.push('/')}>
            <Image source={IMAGES.LOGO} style={styles.logoImage} />
            <Text style={styles.logoText}>
              Dispatch <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '600' }}>by RouteFloww</Text>
            </Text>
          </Pressable>

          <View style={styles.headerLinks}>
            <Pressable style={styles.navLink} onPress={() => router.push('/')}>
              <Text style={styles.navLinkText}>All Products</Text>
            </Pressable>
            <Pressable
              style={[styles.navLink, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}
              onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
            >
              <Feather name="download" size={13} color="#16A34A" />
              <Text style={[styles.navLinkText, { color: '#16A34A', fontWeight: '700' }]}>Get Driver App</Text>
            </Pressable>

            <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>Log in</Text>
            </Pressable>

            <Pressable style={styles.startTrialBtn} onPress={handleGetStarted}>
              <Text style={styles.startTrialBtnText}>Start free trial</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Hero Section matching Screenshot 2 */}
        <View style={[styles.heroContainer, isWide && styles.heroContainerWide]}>
          {/* Left Column: Headline & Email CTA */}
          <View style={[styles.heroLeft, isWide && { flex: 1 }]}>
            <Text style={styles.heroTitle}>
              Last mile management for modern couriers
            </Text>

            <Text style={styles.heroSubtitle}>
              Meet your new <Text style={styles.highlightText}>dispatcher dashboard</Text>, <Text style={styles.highlightText}>driver app</Text>, <Text style={styles.highlightText}>client portal</Text> and <Text style={styles.highlightText}>delivery tracker</Text>. All in one.
            </Text>

            {/* Work Email CTA Form */}
            <View style={styles.ctaForm}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Your work email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable style={styles.getStartedBtn} onPress={handleGetStarted}>
                <Text style={styles.getStartedBtnText}>Get started</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.subHintText}>Free 7-day trial · Onboard in 5 minutes · No credit card required</Text>
          </View>

          {/* Right Column: Dispatcher Dashboard Mockup Graphic matching Screenshot 2 */}
          <View style={[styles.heroRight, isWide && { flex: 1.2 }]}>
            <View style={styles.dashboardMockCard}>
              <View style={styles.mockHeader}>
                <View style={styles.mockHeaderTabRow}>
                  <Text style={styles.mockBreadcrumb}>Map view › Today Sep 20 Routes</Text>
                </View>
                <Text style={styles.mockRouteTitle}>Thursday deliveries</Text>
                <View style={styles.mockTabRow}>
                  <View style={styles.activeTabItem}>
                    <Text style={styles.activeTabItemText}>Routes (4)</Text>
                  </View>
                  <Text style={styles.inactiveTabItemText}>Settings</Text>
                </View>
              </View>

              <View style={styles.driverCardItem}>
                <View style={styles.driverAvatarCircle}>
                  <Text style={styles.avatarText}>AD</Text>
                </View>
                <View style={styles.driverInfoText}>
                  <Text style={styles.driverName}>Arturo D. <Text style={styles.statusBadge}>In Transit</Text></Text>
                  <Text style={styles.driverMeta}>Finishing 10:28 AM · 33/42 stops · 32 mi</Text>
                </View>
              </View>

              <View style={styles.stopDetailCard}>
                <View style={styles.stopHeaderRow}>
                  <Text style={styles.stopNum}>34</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopAddress}>992 Trinity Ave</Text>
                    <Text style={styles.stopSub}>Queens, NY</Text>
                  </View>
                  <Text style={styles.timeLabel}>9:41 AM</Text>
                </View>
                <View style={styles.chipRow}>
                  <Text style={styles.chip}>2 packages</Text>
                  <Text style={styles.chip}>Fragile contents</Text>
                </View>
              </View>

              <View style={styles.driverCardItem}>
                <View style={[styles.driverAvatarCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.avatarText, { color: '#16A34A' }]}>EH</Text>
                </View>
                <View style={styles.driverInfoText}>
                  <Text style={styles.driverName}>Esther H. <Text style={[styles.statusBadge, { backgroundColor: '#DCFCE7', color: '#15803D' }]}>Completed</Text></Text>
                  <Text style={styles.driverMeta}>7:30 AM - 9:11 PM · 30/30 stops · 26 mi</Text>
                </View>
              </View>

              <View style={styles.driverCardItem}>
                <View style={[styles.driverAvatarCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.avatarText, { color: '#16A34A' }]}>RE</Text>
                </View>
                <View style={styles.driverInfoText}>
                  <Text style={styles.driverName}>Ralph Edwards <Text style={[styles.statusBadge, { backgroundColor: '#DCFCE7', color: '#15803D' }]}>Completed</Text></Text>
                  <Text style={styles.driverMeta}>8:00 AM - 9:06 PM · 28/28 stops · 26 mi</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Feature Grid Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionHeading}>Built for Courier Business Admins & Dispatchers</Text>
          <View style={[styles.featureGrid, isWide && styles.featureGridWide]}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="users" size={22} color="#2563EB" />
              </View>
              <Text style={styles.featureTitle}>Multi-Driver Fleet Dispatch</Text>
              <Text style={styles.featureDesc}>Add drivers to your team, generate private access codes, and automatically split large orders into multi-vehicle optimized routes.</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="activity" size={22} color="#16A34A" />
              </View>
              <Text style={styles.featureTitle}>5-Second Real-Time Live Sync</Text>
              <Text style={styles.featureDesc}>Automatic background polling keeps driver progress, ETAs, and completed stops synced instantly between the road and your desk.</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="file-text" size={22} color="#D97706" />
              </View>
              <Text style={styles.featureTitle}>CSV / Manifest Import</Text>
              <Text style={styles.featureDesc}>Import hundreds of customer delivery addresses directly from Excel or CSV spreadsheets into optimized routes in seconds.</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="check-circle" size={22} color="#9333EA" />
              </View>
              <Text style={styles.featureTitle}>Proof of Delivery Reports</Text>
              <Text style={styles.featureDesc}>Collect recipient signatures, photo proof, delivery timestamps, and export complete performance reports for billing.</Text>
            </View>
          </View>
        </View>

        {/* Direct Action Login Bar */}
        <View style={styles.actionBanner}>
          <Text style={styles.actionBannerTitle}>Already a Business Admin?</Text>
          <Text style={styles.actionBannerSub}>Sign in directly to access your Dispatcher Dashboard, driver tracking, and team settings.</Text>
          <View style={styles.actionBannerButtons}>
            <Pressable style={styles.bannerLoginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.bannerLoginBtnText}>Sign In as Business Admin</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 50,
  },
  headerInner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  loginBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  startTrialBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  startTrialBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroContainer: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 40,
  },
  heroContainerWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLeft: {
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 56,
    letterSpacing: -1.2,
    marginBottom: 24,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#475569',
    lineHeight: 28,
    marginBottom: 32,
  },
  highlightText: {
    color: '#0F172A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  ctaForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  emailInput: {
    fontSize: 15,
    color: '#0F172A',
  },
  getStartedBtn: {
    height: 52,
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
  },
  subHintText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  heroRight: {
    alignItems: 'center',
  },
  dashboardMockCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  mockHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  mockHeaderTabRow: {
    marginBottom: 4,
  },
  mockBreadcrumb: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  mockRouteTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  mockTabRow: {
    flexDirection: 'row',
    gap: 16,
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 4,
  },
  activeTabItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  inactiveTabItemText: {
    fontSize: 13,
    color: '#64748B',
  },
  driverCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  driverAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  driverInfoText: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  driverMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stopDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    marginLeft: 16,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stopNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stopAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopSub: {
    fontSize: 12,
    color: '#64748B',
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    fontSize: 11,
    backgroundColor: '#F1F5F9',
    color: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuresSection: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  sectionHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 40,
  },
  featureGrid: {
    gap: 24,
  },
  featureGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    minWidth: 260,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  actionBanner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 44,
    marginTop: 60,
    alignItems: 'center',
  },
  actionBannerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  actionBannerSub: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 640,
    marginBottom: 28,
  },
  actionBannerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bannerLoginBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
