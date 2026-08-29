import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMAGES } from '../constants/theme';
import { LEGAL_URLS } from '../constants/legal';
import { openExternalUrl } from '../hooks/open-external-url';

export default function DriverShowcaseScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ type?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 840;
  const isMedium = width >= 600;

  const [activeTab, setActiveTab] = useState<'independent' | 'fleet'>(
    searchParams.type === 'fleet' ? 'fleet' : 'independent'
  );

  // Sync tab if search param changes
  useEffect(() => {
    if (searchParams.type === 'fleet') {
      setActiveTab('fleet');
    } else if (searchParams.type === 'independent') {
      setActiveTab('independent');
    }
  }, [searchParams.type]);

  const handleTabChange = (tab: 'independent' | 'fleet') => {
    setActiveTab(tab);
    router.replace({
      pathname: '/driver-showcase',
      params: { type: tab },
    });
  };

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerInner}>
          <Pressable style={styles.logoRow} onPress={() => router.push('/')}>
            <Image source={IMAGES.LOGO} style={styles.logoImage} />
            <Text style={styles.logoText}>
              Route<Text style={{ color: '#2563EB' }}>Floww</Text>
            </Text>
          </Pressable>

          <View style={styles.headerNav}>
            <Pressable style={styles.navLink} onPress={() => router.push('/')}>
              <Text style={styles.navLinkText}>Home</Text>
            </Pressable>
            <Pressable style={styles.navLink} onPress={() => router.push('/dispatch')}>
              <Text style={styles.navLinkText}>Business Admin</Text>
            </Pressable>

            <Pressable
              style={[styles.signupBtn, { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
            >
              <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.signupBtnText}>Install App</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.eyebrowBadge}>
            <Feather name="navigation" size={14} color="#2563EB" />
            <Text style={styles.eyebrowText}>DRIVER PLATFORM & TOOLS</Text>
          </View>

          <Text style={styles.heroTitle}>
            {activeTab === 'independent'
              ? 'Independent Driver Platform & Route Optimization'
              : 'Fleet Driver Mobile Workspace & Dispatch Sync'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {activeTab === 'independent'
              ? 'Explore everything RouteFloww offers solo couriers and gig delivery drivers: AI camera manifest scanning, voice input, 500-stop route optimization, and GPS navigation.'
              : 'Explore everything RouteFloww offers company drivers: instant access code sign-in, 5-second live dispatcher sync, and digital photo/signature proof of delivery.'}
          </Text>

          {/* Role Switcher Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tabButton, activeTab === 'independent' && styles.tabButtonActive]}
              onPress={() => handleTabChange('independent')}
            >
              <Feather name="user" size={18} color={activeTab === 'independent' ? '#2563EB' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'independent' && styles.tabTextActive]}>
                Independent Driver
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === 'fleet' && styles.tabButtonActive]}
              onPress={() => handleTabChange('fleet')}
            >
              <Feather name="truck" size={18} color={activeTab === 'fleet' ? '#16A34A' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'fleet' && [styles.tabTextActive, { color: '#16A34A' }]]}>
                Fleet Driver
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Content 1: Independent Driver */}
        {activeTab === 'independent' ? (
          <View style={styles.contentSection}>
            {/* SECTION 1: WHAT IS AN INDEPENDENT DRIVER */}
            <View style={styles.roleIntroCard}>
              <View style={styles.roleIntroHeader}>
                <View style={[styles.iconCircleBig, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="user" size={26} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleIntroBadge}>ROLE EXPLANATION</Text>
                  <Text style={styles.roleIntroTitle}>What is an Independent Driver?</Text>
                </View>
              </View>

              <Text style={styles.roleIntroParagraph}>
                An <Text style={styles.boldText}>Independent Driver</Text> is a self-employed delivery courier, contractor, or solo logistics driver who manages and executes their own delivery routes daily without a central company dispatcher.
              </Text>

              <Text style={styles.roleIntroParagraph}>
                Whether you drive for <Text style={styles.boldText}>Amazon Flex, DoorDash, UberEats, FedEx Ground contractors, local parcel courier services</Text>, or your own private delivery clients, your daily earnings depend on how fast and efficiently you can complete stops while saving fuel.
              </Text>

              <View style={styles.statHighlightsRow}>
                <View style={styles.statHighlightBox}>
                  <Text style={styles.statHighlightNum}>40%</Text>
                  <Text style={styles.statHighlightLabel}>Fuel & Time Saved</Text>
                </View>
                <View style={styles.statHighlightBox}>
                  <Text style={styles.statHighlightNum}>500+</Text>
                  <Text style={styles.statHighlightLabel}>Stops Supported</Text>
                </View>
                <View style={styles.statHighlightBox}>
                  <Text style={styles.statHighlightNum}>90 sec</Text>
                  <Text style={styles.statHighlightLabel}>Manifest Scanner</Text>
                </View>
                <View style={styles.statHighlightBox}>
                  <Text style={styles.statHighlightNum}>100%</Text>
                  <Text style={styles.statHighlightLabel}>Tax Compliant Logs</Text>
                </View>
              </View>
            </View>

            {/* SECTION 2: WHAT WE OFFER INDEPENDENT DRIVERS (DEEP DIVE) */}
            <View style={styles.sectionTitleBlock}>
              <View style={styles.eyebrowBadge}>
                <Feather name="zap" size={13} color="#2563EB" />
                <Text style={styles.eyebrowText}>CORE OFFERINGS</Text>
              </View>
              <Text style={styles.detailSectionTitle}>What RouteFloww Offers Independent Drivers</Text>
              <Text style={styles.detailSectionSubtitle}>
                Everything you need to plan, sequence, navigate, and finish your routes hours earlier every single day.
              </Text>
            </View>

            <View style={[styles.deepFeaturesGrid, isWide && styles.deepFeaturesGridWide]}>
              {/* Feature 1 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="camera" size={24} color="#2563EB" />
                </View>
                <Text style={styles.deepFeatureTitle}>AI Camera Manifest & Label Scanner</Text>
                <Text style={styles.deepFeatureDesc}>
                  Stop manually typing 60+ addresses into navigation apps one by one. Point your smartphone camera at package shipping labels, printed waybills, or paper manifests. RouteFloww’s optical AI reads street names, unit numbers, and postal codes instantly and adds them straight to your route.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={styles.featurePill}><Text style={styles.featurePillText}>OCR Text Extraction</Text></View>
                  <View style={styles.featurePill}><Text style={styles.featurePillText}>Paper Sheet Scanner</Text></View>
                </View>
              </View>

              {/* Feature 2 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Feather name="mic" size={24} color="#16A34A" />
                </View>
                <Text style={styles.deepFeatureTitle}>Hands-Free Voice Stop Input</Text>
                <Text style={styles.deepFeatureDesc}>
                  Driving in your van or car and need to add an urgent customer delivery? Just tap the microphone and speak: “Add delivery to 452 Elm Street, Apartment 3B”. RouteFloww’s voice AI converts speech to geocoded map coordinates and slots it into your sequence without taking your hands off the wheel.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={[styles.featurePill, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.featurePillText, { color: '#16A34A' }]}>Voice Geocoding</Text></View>
                  <View style={[styles.featurePill, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.featurePillText, { color: '#16A34A' }]}>Safe Driving</Text></View>
                </View>
              </View>

              {/* Feature 3 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="cpu" size={24} color="#D97706" />
                </View>
                <Text style={styles.deepFeatureTitle}>Smart Multi-Stop AI Route Optimization</Text>
                <Text style={styles.deepFeatureDesc}>
                  Upload or scan up to 500 stops in a single delivery run. RouteFloww’s pathing engine computes the shortest, fastest route factoring in departure times, delivery time windows (e.g. deliver before 1:00 PM), package priorities, and road traffic patterns to eliminate costly backtracking.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={[styles.featurePill, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.featurePillText, { color: '#D97706' }]}>Up to 500 Stops</Text></View>
                  <View style={[styles.featurePill, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.featurePillText, { color: '#D97706' }]}>Time Window Alerts</Text></View>
                </View>
              </View>

              {/* Feature 4 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Feather name="navigation-2" size={24} color="#9333EA" />
                </View>
                <Text style={styles.deepFeatureTitle}>Turn-by-Turn GPS Road Navigation</Text>
                <Text style={styles.deepFeatureDesc}>
                  Drive with clarity using integrated high-contrast road directions with live traffic rerouting, lane guidance, and upcoming turn previews. Prefer your favorite external GPS? Launch directly into Google Maps or Waze with a single tap and destination pre-loaded.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={[styles.featurePill, { backgroundColor: '#F3E8FF' }]}><Text style={[styles.featurePillText, { color: '#9333EA' }]}>Google Maps Launch</Text></View>
                  <View style={[styles.featurePill, { backgroundColor: '#F3E8FF' }]}><Text style={[styles.featurePillText, { color: '#9333EA' }]}>Waze 1-Tap Sync</Text></View>
                </View>
              </View>

              {/* Feature 5 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="file-text" size={24} color="#0284C7" />
                </View>
                <Text style={styles.deepFeatureTitle}>Automatic Mileage Logs & Tax Reports</Text>
                <Text style={styles.deepFeatureDesc}>
                  Every mile you drive is automatically recorded with GPS timestamps, route durations, and completed stop counts. Export verified CSV/PDF logs to claim standard mileage tax write-offs ($0.67/mile) or invoice your private delivery clients with 100% accuracy.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={[styles.featurePill, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.featurePillText, { color: '#0284C7' }]}>IRS Tax Ready</Text></View>
                  <View style={[styles.featurePill, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.featurePillText, { color: '#0284C7' }]}>CSV/PDF Export</Text></View>
                </View>
              </View>

              {/* Feature 6 */}
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="check-circle" size={24} color="#DC2626" />
                </View>
                <Text style={styles.deepFeatureTitle}>One-Swipe Stop Completion & Notes</Text>
                <Text style={styles.deepFeatureDesc}>
                  Mark packages delivered with a single quick swipe. Store gate codes, building access numbers, customer phone numbers, and special drop-off instructions right on each stop card so you never get stuck at a security gate again.
                </Text>
                <View style={styles.featurePillRow}>
                  <View style={[styles.featurePill, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.featurePillText, { color: '#DC2626' }]}>Gate Codes Saved</Text></View>
                  <View style={[styles.featurePill, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.featurePillText, { color: '#DC2626' }]}>One-Swipe Finish</Text></View>
                </View>
              </View>
            </View>

            {/* SECTION 3: STEP-BY-STEP DAILY WORKFLOW */}
            <View style={styles.workflowSection}>
              <Text style={styles.workflowMainTitle}>A Day in the Life with RouteFloww</Text>
              <Text style={styles.workflowMainSubtitle}>How independent delivery drivers complete their routes 2 hours early every morning</Text>

              <View style={[styles.workflowStepsRow, isWide && styles.workflowStepsRowWide]}>
                <View style={styles.workflowStepItem}>
                  <View style={styles.workflowStepBadge}><Text style={styles.workflowStepBadgeText}>1</Text></View>
                  <Text style={styles.workflowStepHeading}>Scan Stops</Text>
                  <Text style={styles.workflowStepBody}>
                    Snap photos of your shipping labels or speak addresses into the app at your vehicle.
                  </Text>
                </View>

                <View style={styles.workflowStepItem}>
                  <View style={[styles.workflowStepBadge, { backgroundColor: '#16A34A' }]}><Text style={styles.workflowStepBadgeText}>2</Text></View>
                  <Text style={styles.workflowStepHeading}>Optimize Route</Text>
                  <Text style={styles.workflowStepBody}>
                    Tap Optimize. RouteFloww AI computes the fastest order in 3 seconds.
                  </Text>
                </View>

                <View style={styles.workflowStepItem}>
                  <View style={[styles.workflowStepBadge, { backgroundColor: '#D97706' }]}><Text style={styles.workflowStepBadgeText}>3</Text></View>
                  <Text style={styles.workflowStepHeading}>Drive & Deliver</Text>
                  <Text style={styles.workflowStepBody}>
                    Follow voice turn-by-turn GPS, swipe to complete deliveries, and avoid heavy traffic.
                  </Text>
                </View>

                <View style={styles.workflowStepItem}>
                  <View style={[styles.workflowStepBadge, { backgroundColor: '#9333EA' }]}><Text style={styles.workflowStepBadgeText}>4</Text></View>
                  <Text style={styles.workflowStepHeading}>Finish & Log</Text>
                  <Text style={styles.workflowStepBody}>
                    Head home early! Your mileage and fuel tax log is automatically archived.
                  </Text>
                </View>
              </View>
            </View>

            {/* SECTION 4: FREQUENTLY ASKED QUESTIONS */}
            <View style={styles.faqSection}>
              <Text style={styles.faqSectionTitle}>Frequently Asked Questions (Independent Drivers)</Text>

              <View style={styles.faqList}>
                <Pressable
                  style={[styles.faqCard, openFaq === 0 && styles.faqCardOpen]}
                  onPress={() => setOpenFaq(openFaq === 0 ? null : 0)}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>Can I use Google Maps or Waze with RouteFloww?</Text>
                    <Feather name={openFaq === 0 ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                  </View>
                  {openFaq === 0 ? (
                    <Text style={styles.faqAnswer}>
                      Yes! RouteFloww has built-in turn-by-turn navigation, but also includes a 1-tap launcher for Google Maps or Waze. Each stop’s destination is passed directly to your preferred navigation app automatically.
                    </Text>
                  ) : null}
                </Pressable>

                <Pressable
                  style={[styles.faqCard, openFaq === 1 && styles.faqCardOpen]}
                  onPress={() => setOpenFaq(openFaq === 1 ? null : 1)}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>How does the Camera Manifest Scanner work?</Text>
                    <Feather name={openFaq === 1 ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                  </View>
                  {openFaq === 1 ? (
                    <Text style={styles.faqAnswer}>
                      You simply point your Android phone camera at shipping labels, delivery slips, or paper spreadsheets. The optical character recognition extracts street numbers, addresses, and postal codes automatically in seconds.
                    </Text>
                  ) : null}
                </Pressable>

                <Pressable
                  style={[styles.faqCard, openFaq === 2 && styles.faqCardOpen]}
                  onPress={() => setOpenFaq(openFaq === 2 ? null : 2)}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>Does the app work if I lose cellular signal?</Text>
                    <Feather name={openFaq === 2 ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                  </View>
                  {openFaq === 2 ? (
                    <Text style={styles.faqAnswer}>
                      Yes! Once your route is optimized, your stops, turn directions, and delivery details are stored in your device’s local memory so you can continue delivering even in basements or rural dead zones.
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* SECTION 5: GOOGLE PLAY CTA BOX */}
            <View style={styles.ctaBox}>
              <View style={styles.ctaBadge}>
                <Feather name="smartphone" size={14} color="#16A34A" />
                <Text style={styles.ctaBadgeText}>ANDROID MOBILE APP</Text>
              </View>
              <Text style={styles.ctaTitle}>Ready to start finishing your routes 2 hours early?</Text>
              <Text style={styles.ctaSubtitle}>
                Download the RouteFloww driver mobile app on Google Play. Scan your first manifest, optimize your route, and experience stress-free deliveries today.
              </Text>
              <View style={styles.ctaBtnRow}>
                <Pressable
                  style={[styles.primaryCta, { backgroundColor: '#16A34A' }]}
                  onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                >
                  <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryCtaText}>Download on Google Play</Text>
                </Pressable>
              </View>
              <Text style={styles.ctaFootnote}>Free download for Android devices · No credit card required</Text>
            </View>
          </View>
        ) : (
          /* Tab Content 2: Fleet Driver */
          <View style={styles.contentSection}>
            {/* SECTION 1: WHAT IS A FLEET DRIVER */}
            <View style={[styles.roleIntroCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
              <View style={styles.roleIntroHeader}>
                <View style={[styles.iconCircleBig, { backgroundColor: '#DCFCE7' }]}>
                  <Feather name="truck" size={26} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleIntroBadge, { color: '#16A34A' }]}>ROLE EXPLANATION</Text>
                  <Text style={styles.roleIntroTitle}>What is a Fleet Driver?</Text>
                </View>
              </View>

              <Text style={styles.roleIntroParagraph}>
                A <Text style={styles.boldText}>Fleet Driver</Text> is a company delivery driver employed by a courier firm, logistics business, medical pharmacy, or local retailer whose daily delivery manifests are planned and assigned by a central office dispatcher.
              </Text>

              <Text style={styles.roleIntroParagraph}>
                You don’t need to spend time planning routes or worrying about fuel algorithms. Your business dispatcher optimizes the route on desktop and sends it straight to your phone. All you need is your company <Text style={styles.boldText}>Business Access Code</Text>.
              </Text>

              <View style={styles.statHighlightsRow}>
                <View style={[styles.statHighlightBox, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.statHighlightNum, { color: '#16A34A' }]}>5s</Text>
                  <Text style={styles.statHighlightLabel}>Real-Time Sync</Text>
                </View>
                <View style={[styles.statHighlightBox, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.statHighlightNum, { color: '#16A34A' }]}>0</Text>
                  <Text style={styles.statHighlightLabel}>Passwords Needed</Text>
                </View>
                <View style={[styles.statHighlightBox, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.statHighlightNum, { color: '#16A34A' }]}>1-Tap</Text>
                  <Text style={styles.statHighlightLabel}>Proof of Delivery</Text>
                </View>
                <View style={[styles.statHighlightBox, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.statHighlightNum, { color: '#16A34A' }]}>100%</Text>
                  <Text style={styles.statHighlightLabel}>Office Visibility</Text>
                </View>
              </View>
            </View>

            {/* SECTION 2: WHAT WE OFFER FLEET DRIVERS */}
            <View style={styles.sectionTitleBlock}>
              <View style={[styles.eyebrowBadge, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
                <Feather name="shield" size={13} color="#16A34A" />
                <Text style={[styles.eyebrowText, { color: '#16A34A' }]}>FLEET DRIVER TOOLS</Text>
              </View>
              <Text style={styles.detailSectionTitle}>What RouteFloww Offers Fleet Drivers</Text>
              <Text style={styles.detailSectionSubtitle}>
                A simple, distraction-free mobile experience built for company couriers on the road.
              </Text>
            </View>

            <View style={[styles.deepFeaturesGrid, isWide && styles.deepFeaturesGridWide]}>
              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="key" size={24} color="#2563EB" />
                </View>
                <Text style={styles.deepFeatureTitle}>Instant Business Access Code Sign-In</Text>
                <Text style={styles.deepFeatureDesc}>
                  No complicated emails or passwords to memorize. Your business dispatcher provides a secure 6-digit access code (e.g. RF-XXXX-XXXX). Enter the code once into the mobile app to immediately unlock your assigned daily route.
                </Text>
              </View>

              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Feather name="refresh-cw" size={24} color="#16A34A" />
                </View>
                <Text style={styles.deepFeatureTitle}>5-Second Real-Time Dispatcher Sync</Text>
                <Text style={styles.deepFeatureDesc}>
                  When your office dispatcher adds an urgent pickup, cancels an order, or updates customer notes, your phone screen refreshes automatically within 5 seconds without you needing to pull over and reload.
                </Text>
              </View>

              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="check-square" size={24} color="#D97706" />
                </View>
                <Text style={styles.deepFeatureTitle}>Digital Proof of Delivery (Photos & Signatures)</Text>
                <Text style={styles.deepFeatureDesc}>
                  Capture recipient signatures directly on your touchscreen or snap photo proof of delivered packages left at the doorstep. Every proof is automatically geotagged with GPS coordinates and timestamps.
                </Text>
              </View>

              <View style={styles.deepFeatureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="alert-triangle" size={24} color="#DC2626" />
                </View>
                <Text style={styles.deepFeatureTitle}>One-Tap Stop Status & Failed Reasons</Text>
                <Text style={styles.deepFeatureDesc}>
                  Mark stops as “Delivered” or report “Failed” attempts with preset business reasons (Customer Unavailable, Gate Locked, Incorrect Address) so your office dispatchers can resolve issues immediately.
                </Text>
              </View>
            </View>

            {/* CTA BOX */}
            <View style={styles.ctaBox}>
              <Text style={styles.ctaTitle}>Driving for a business or courier company?</Text>
              <Text style={styles.ctaSubtitle}>
                Download the RouteFloww mobile app on Google Play, enter your company access code, and start your shift with zero friction.
              </Text>
              <View style={styles.ctaBtnRow}>
                <Pressable
                  style={[styles.primaryCta, { backgroundColor: '#16A34A' }]}
                  onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                >
                  <Feather name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryCtaText}>Download Fleet App on Google Play</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 50,
  },
  headerInner: {
    maxWidth: 1200,
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
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerNav: {
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
  signupBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
    maxWidth: 900,
    alignSelf: 'center',
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 18,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 32,
    maxWidth: 760,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  contentSection: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  // ROLE INTRO CARD
  roleIntroCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 32,
    marginBottom: 48,
  },
  roleIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  iconCircleBig: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIntroBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  roleIntroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  roleIntroParagraph: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '600',
    color: '#0F172A',
  },
  statHighlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 18,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.15)',
  },
  statHighlightBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statHighlightNum: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 2,
  },
  statHighlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  // SECTION HEADINGS
  sectionTitleBlock: {
    alignItems: 'center',
    marginBottom: 36,
    maxWidth: 760,
    alignSelf: 'center',
  },
  detailSectionTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  detailSectionSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 23,
  },

  // DEEP FEATURES GRID
  deepFeaturesGrid: {
    gap: 24,
    marginBottom: 56,
  },
  deepFeaturesGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deepFeatureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    flex: 1,
    minWidth: 320,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  deepFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 10,
  },
  deepFeatureDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  featurePillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featurePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },

  // WORKFLOW SECTION
  workflowSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 36,
    marginBottom: 56,
  },
  workflowMainTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  workflowMainSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  workflowStepsRow: {
    gap: 20,
  },
  workflowStepsRowWide: {
    flexDirection: 'row',
  },
  workflowStepItem: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  workflowStepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  workflowStepBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  workflowStepHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  workflowStepBody: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  // FAQ SECTION
  faqSection: {
    marginBottom: 56,
  },
  faqSectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 24,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  faqCardOpen: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // CTA BOX
  ctaBox: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  ctaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 640,
  },
  ctaSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 600,
  },
  ctaBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryCta: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  ctaFootnote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
