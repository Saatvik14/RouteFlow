import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEGAL_URLS } from '../constants/legal';
import { IMAGES, OperationsColors } from '../constants/theme';
import { openExternalUrl } from '../hooks/open-external-url';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

const roles: {
  key: string;
  icon: FeatherIconName;
  label: string;
  title: string;
  description: string;
  detail: string;
  features: string[];
  accent: string;
  tint: string;
  border: string;
  action: string;
  route: string;
}[] = [
  {
    key: 'independent',
    icon: 'navigation',
    label: 'Solo & gig couriers',
    title: 'Independent driver',
    description: 'Turn a full day of stops into one clear, optimized route.',
    detail: 'Built for drivers who plan, navigate, and complete every delivery themselves.',
    features: ['Camera and voice stop entry', 'AI optimization for up to 500 stops', 'Turn-by-turn navigation and mileage logs'],
    accent: '#2F76F6',
    tint: '#EDF4FF',
    border: '#CFE0FF',
    action: 'Explore driver tools',
    route: '/driver-showcase?type=independent',
  },
  {
    key: 'fleet',
    icon: 'truck',
    label: 'Company drivers',
    title: 'Fleet driver',
    description: 'Start assigned routes quickly and stay in sync with dispatch.',
    detail: 'A focused mobile experience that keeps drivers moving without dashboard clutter.',
    features: ['Secure access-code sign in', 'Live route and stop updates', 'Photo and signature proof of delivery'],
    accent: '#16845B',
    tint: '#ECF8F2',
    border: '#C7EBDD',
    action: 'Explore fleet app',
    route: '/driver-showcase?type=fleet',
  },
  {
    key: 'admin',
    icon: 'briefcase',
    label: 'Managers & dispatchers',
    title: 'Business admin',
    description: 'Plan routes, assign drivers, and monitor delivery progress live.',
    detail: 'One web workspace for dispatch, driver coordination, reporting, and proof of delivery.',
    features: ['CSV manifest upload and route splitting', 'Live driver locations and ETAs', 'Team access, reports, and delivery evidence'],
    accent: '#B66A16',
    tint: '#FFF6E8',
    border: '#F2D7AD',
    action: 'Explore dispatch',
    route: '/dispatch',
  },
];

const workflow: { icon: FeatherIconName; step: string; title: string; description: string }[] = [
  {
    icon: 'upload-cloud',
    step: '01',
    title: 'Bring in your stops',
    description: 'Upload a manifest, scan package labels, speak an address, or add stops manually.',
  },
  {
    icon: 'cpu',
    step: '02',
    title: 'Build the best route',
    description: 'RouteFloww organizes stops around time windows, priorities, and available drivers.',
  },
  {
    icon: 'radio',
    step: '03',
    title: 'Deliver in sync',
    description: 'Drivers navigate and report progress while dispatch sees updates and delivery proof.',
  },
];

const capabilities: { icon: FeatherIconName; title: string; description: string }[] = [
  {
    icon: 'camera',
    title: 'Faster route setup',
    description: 'Camera, voice, CSV, and manual entry reduce repetitive typing before the day begins.',
  },
  {
    icon: 'map',
    title: 'Practical route intelligence',
    description: 'Optimize large multi-stop routes while keeping priorities and delivery constraints visible.',
  },
  {
    icon: 'refresh-cw',
    title: 'Dispatcher-to-driver sync',
    description: 'Route changes and stop progress move between the web portal and driver app within seconds.',
  },
  {
    icon: 'shield',
    title: 'Accountable delivery',
    description: 'Capture status, photos, signatures, mileage, and route history in one consistent workflow.',
  },
];

const faqs = [
  {
    question: 'Who is RouteFloww designed for?',
    answer:
      'RouteFloww supports independent delivery drivers, company fleet drivers, and the business admins who plan and monitor their work. Each role gets a focused experience instead of a one-size-fits-all dashboard.',
  },
  {
    question: 'How do drivers add or receive stops?',
    answer:
      'Independent drivers can scan labels, use voice input, import a manifest, or enter addresses manually. Fleet drivers receive routes assigned by their business admin and can see updates from dispatch as they work.',
  },
  {
    question: 'What can business admins manage?',
    answer:
      'The web dispatch workspace supports manifest uploads, multi-driver route planning, assignments, live progress, driver access, route reports, and electronic proof of delivery.',
  },
  {
    question: 'Which platforms are supported?',
    answer:
      'Business admins use RouteFloww in a modern desktop web browser. Independent and fleet drivers use the dedicated Android app available through Google Play.',
  },
  {
    question: 'How does live synchronization work?',
    answer:
      'RouteFloww regularly checks for updates so new assignments, reordered stops, delivery statuses, and proof-of-delivery records stay aligned between dispatchers and drivers.',
  },
];

export default function MainLandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isWide = width >= 980;
  const isMedium = width >= 680;
  const pagePadding = isMedium ? 32 : 20;

  useEffect(() => {
    if (Platform.OS === 'web' && pathname === '/landing') {
      router.replace('/');
    }
  }, [pathname, router]);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={[styles.headerInner, { paddingHorizontal: pagePadding }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to RouteFloww home"
            onPress={() => router.push('/')}
            style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
          >
            <Image source={IMAGES.LOGO} style={styles.brandLogo} />
            <Text style={styles.brandName}>
              Route<Text style={styles.brandAccent}>Floww</Text>
            </Text>
          </Pressable>

          <View style={styles.headerActions}>
            {isMedium && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/login')}
                style={({ pressed }) => [styles.headerTextButton, pressed && styles.pressed]}
              >
                <Text style={styles.headerTextButtonLabel}>Sign in</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/dispatch')}
              style={({ pressed }) => [styles.headerPrimaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.headerPrimaryButtonLabel}>{isMedium ? 'For business' : 'Business'}</Text>
              <Feather name="arrow-up-right" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        <LinearGradient
          colors={['#F5F8FF', '#FFFFFF', '#F2FBF7']}
          locations={[0, 0.55, 1]}
          style={styles.heroBackground}
        >
          <View
            style={[
              styles.contentShell,
              styles.hero,
              isWide && styles.heroWide,
              { paddingHorizontal: pagePadding },
            ]}
          >
            <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>LAST-MILE OPERATIONS, CONNECTED</Text>
              </View>

              <Text style={[styles.heroTitle, !isMedium && styles.heroTitleMobile]}>
                Every stop, driver, and delivery — moving in one flow.
              </Text>
              <Text style={[styles.heroDescription, !isMedium && styles.heroDescriptionMobile]}>
                RouteFloww turns complex delivery work into a clear route from first upload to final proof.
                Plan on the web, drive on Android, and keep the whole operation aligned.
              </Text>

              <View style={styles.heroActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/dispatch')}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonLabel}>Explore business tools</Text>
                  <Feather name="arrow-right" size={17} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Feather name="download" size={16} color={OperationsColors.ink} />
                  <Text style={styles.secondaryButtonLabel}>Get the driver app</Text>
                </Pressable>
              </View>

              <View style={styles.heroProofRow}>
                <View style={styles.proofItem}>
                  <Feather name="check-circle" size={15} color={OperationsColors.success} />
                  <Text style={styles.proofText}>Up to 500 stops</Text>
                </View>
                <View style={styles.proofItem}>
                  <Feather name="check-circle" size={15} color={OperationsColors.success} />
                  <Text style={styles.proofText}>Web + Android</Text>
                </View>
                <View style={styles.proofItem}>
                  <Feather name="check-circle" size={15} color={OperationsColors.success} />
                  <Text style={styles.proofText}>Live delivery updates</Text>
                </View>
              </View>
            </View>

            <View style={[styles.heroVisualWrap, isWide && styles.heroVisualWrapWide]}>
              <LinearGradient colors={['#132744', '#071425']} style={styles.operationsCard}>
                <View style={styles.operationsTopRow}>
                  <View>
                    <Text style={styles.operationsEyebrow}>TODAY&apos;S OPERATION</Text>
                    <Text style={styles.operationsTitle}>North London · Route 108</Text>
                  </View>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.livePillText}>Live</Text>
                  </View>
                </View>

                <View style={styles.routeCanvas}>
                  <View style={[styles.mapRoad, styles.mapRoadOne]} />
                  <View style={[styles.mapRoad, styles.mapRoadTwo]} />
                  <View style={[styles.mapRoad, styles.mapRoadThree]} />
                  <View style={[styles.routeLine, styles.routeLineOne]} />
                  <View style={[styles.routeLine, styles.routeLineTwo]} />
                  <View style={[styles.routeLine, styles.routeLineThree]} />

                  <View style={[styles.stopMarker, styles.stopOne]}>
                    <Text style={styles.stopMarkerText}>1</Text>
                  </View>
                  <View style={[styles.stopMarker, styles.stopTwo]}>
                    <Text style={styles.stopMarkerText}>2</Text>
                  </View>
                  <View style={[styles.stopMarker, styles.stopThree]}>
                    <Text style={styles.stopMarkerText}>3</Text>
                  </View>
                  <View style={[styles.driverMarker, styles.driverPosition]}>
                    <Feather name="navigation" size={14} color="#FFFFFF" />
                  </View>

                  <View style={styles.nextStopCard}>
                    <View style={styles.nextStopIcon}>
                      <Feather name="map-pin" size={15} color="#2F76F6" />
                    </View>
                    <View style={styles.nextStopCopy}>
                      <Text style={styles.nextStopLabel}>NEXT STOP · 8 MIN</Text>
                      <Text style={styles.nextStopAddress}>45 Park Road</Text>
                    </View>
                    <Feather name="arrow-right" size={16} color="#708198" />
                  </View>
                </View>

                <View style={styles.operationStats}>
                  <View style={styles.operationStat}>
                    <Text style={styles.operationStatValue}>32</Text>
                    <Text style={styles.operationStatLabel}>Delivered</Text>
                  </View>
                  <View style={styles.operationStatDivider} />
                  <View style={styles.operationStat}>
                    <Text style={styles.operationStatValue}>18</Text>
                    <Text style={styles.operationStatLabel}>Remaining</Text>
                  </View>
                  <View style={styles.operationStatDivider} />
                  <View style={styles.operationStat}>
                    <Text style={styles.operationStatValue}>64%</Text>
                    <Text style={styles.operationStatLabel}>Complete</Text>
                  </View>
                </View>
              </LinearGradient>
              <View style={styles.syncCallout}>
                <View style={styles.syncIcon}>
                  <Feather name="refresh-cw" size={16} color={OperationsColors.success} />
                </View>
                <View>
                  <Text style={styles.syncTitle}>Dispatch is in sync</Text>
                  <Text style={styles.syncDescription}>Driver update received just now</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.contentShell, styles.roleSection, { paddingHorizontal: pagePadding }]}>
          <View style={[styles.sectionHeader, isWide && styles.sectionHeaderWide]}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionKicker}>ONE PLATFORM, THREE FOCUSED EXPERIENCES</Text>
              <Text style={[styles.sectionTitle, !isMedium && styles.sectionTitleMobile]}>
                Start with the tools built for your role.
              </Text>
            </View>
            <Text style={[styles.sectionDescription, isWide && styles.sectionDescriptionWide]}>
              RouteFloww gives each person the information they need while every update stays connected behind the scenes.
            </Text>
          </View>

          <View style={[styles.roleGrid, isWide && styles.roleGridWide]}>
            {roles.map((role) => (
              <View key={role.key} style={[styles.roleCard, isWide && styles.roleCardWide]}>
                <View style={styles.roleCardTop}>
                  <View style={[styles.roleIcon, { backgroundColor: role.tint, borderColor: role.border }]}>
                    <Feather name={role.icon} size={21} color={role.accent} />
                  </View>
                  <Text style={[styles.roleLabel, { color: role.accent }]}>{role.label.toUpperCase()}</Text>
                </View>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
                <Text style={styles.roleDetail}>{role.detail}</Text>

                <View style={styles.roleFeatureList}>
                  {role.features.map((feature) => (
                    <View key={feature} style={styles.roleFeatureRow}>
                      <View style={[styles.smallCheck, { backgroundColor: role.tint }]}>
                        <Feather name="check" size={12} color={role.accent} />
                      </View>
                      <Text style={styles.roleFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(role.route as never)}
                  style={({ pressed }) => [
                    styles.roleAction,
                    { backgroundColor: role.tint, borderColor: role.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.roleActionLabel, { color: role.accent }]}>{role.action}</Text>
                  <Feather name="arrow-right" size={16} color={role.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.workflowBand}>
          <View style={[styles.contentShell, styles.workflowSection, { paddingHorizontal: pagePadding }]}>
            <View style={styles.centeredSectionHeader}>
              <Text style={styles.sectionKicker}>FROM PLAN TO PROOF</Text>
              <Text style={[styles.sectionTitle, styles.centeredTitle, !isMedium && styles.sectionTitleMobile]}>
                A delivery day that feels easier to run.
              </Text>
              <Text style={styles.centeredDescription}>
                RouteFloww connects route creation, navigation, live progress, and delivery records in one simple flow.
              </Text>
            </View>

            <View style={[styles.workflowGrid, isWide && styles.workflowGridWide]}>
              {workflow.map((item, index) => (
                <View key={item.step} style={[styles.workflowItem, isWide && styles.workflowItemWide]}>
                  <View style={styles.workflowTopRow}>
                    <View style={styles.workflowIcon}>
                      <Feather name={item.icon} size={21} color={OperationsColors.primary} />
                    </View>
                    <Text style={styles.workflowStep}>{item.step}</Text>
                  </View>
                  <Text style={styles.workflowTitle}>{item.title}</Text>
                  <Text style={styles.workflowDescription}>{item.description}</Text>
                  {isWide && index < workflow.length - 1 && (
                    <View style={styles.workflowConnector}>
                      <Feather name="chevron-right" size={16} color="#A9B7C8" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.contentShell, styles.capabilitySection, { paddingHorizontal: pagePadding }]}>
          <View style={[styles.capabilityIntro, isWide && styles.capabilityIntroWide]}>
            <View style={styles.capabilityIntroCopy}>
              <Text style={styles.sectionKicker}>BUILT FOR THE REAL LAST MILE</Text>
              <Text style={[styles.sectionTitle, !isMedium && styles.sectionTitleMobile]}>
                Less coordination overhead. More delivery clarity.
              </Text>
              <Text style={styles.capabilityIntroDescription}>
                Every capability is designed around the practical details that slow teams down: messy stop data, last-minute changes, driver handoffs, and missing delivery evidence.
              </Text>
            </View>
            <View style={styles.capabilityQuote}>
              <Feather name="activity" size={19} color={OperationsColors.primary} />
              <Text style={styles.capabilityQuoteText}>
                One route record follows the work from planning through completion.
              </Text>
            </View>
          </View>

          <View style={[styles.capabilityGrid, isMedium && styles.capabilityGridMedium]}>
            {capabilities.map((item) => (
              <View key={item.title} style={[styles.capabilityCard, isMedium && styles.capabilityCardMedium]}>
                <View style={styles.capabilityIcon}>
                  <Feather name={item.icon} size={20} color={OperationsColors.primary} />
                </View>
                <View style={styles.capabilityCardCopy}>
                  <Text style={styles.capabilityTitle}>{item.title}</Text>
                  <Text style={styles.capabilityDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.faqBand}>
          <View
            style={[
              styles.contentShell,
              styles.faqSection,
              isWide && styles.faqSectionWide,
              { paddingHorizontal: pagePadding },
            ]}
          >
            <View style={[styles.faqIntro, isWide && styles.faqIntroWide]}>
              <Text style={styles.sectionKicker}>QUESTIONS, ANSWERED</Text>
              <Text style={[styles.sectionTitle, !isMedium && styles.sectionTitleMobile]}>
                What to know before you start.
              </Text>
              <Text style={styles.faqIntroDescription}>
                Explore the experience for your role, or use these quick answers to understand how the platform fits together.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/dispatch')}
                style={({ pressed }) => [styles.faqIntroAction, pressed && styles.pressed]}
              >
                <Text style={styles.faqIntroActionLabel}>See the business experience</Text>
                <Feather name="arrow-right" size={15} color={OperationsColors.primary} />
              </Pressable>
            </View>

            <View style={[styles.faqList, isWide && styles.faqListWide]}>
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <Pressable
                    key={faq.question}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => setOpenFaq(isOpen ? null : index)}
                    style={({ pressed }) => [styles.faqItem, pressed && styles.faqItemPressed]}
                  >
                    <View style={styles.faqQuestionRow}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <View style={[styles.faqToggle, isOpen && styles.faqToggleOpen]}>
                        <Feather
                          name={isOpen ? 'minus' : 'plus'}
                          size={16}
                          color={isOpen ? '#FFFFFF' : OperationsColors.primary}
                        />
                      </View>
                    </View>
                    {isOpen && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={[styles.contentShell, styles.ctaSection, { paddingHorizontal: pagePadding }]}>
          <LinearGradient colors={['#173B78', '#1F60C9', '#20805F']} style={styles.ctaCard}>
            <View style={[styles.ctaCopy, isWide && styles.ctaCopyWide]}>
              <Text style={styles.ctaKicker}>MOVE YOUR NEXT ROUTE FORWARD</Text>
              <Text style={[styles.ctaTitle, !isMedium && styles.ctaTitleMobile]}>
                Choose the RouteFloww experience that fits your day.
              </Text>
              <Text style={styles.ctaDescription}>
                Plan and dispatch from the web, or take optimized routes on the road with the Android driver app.
              </Text>
            </View>
            <View style={[styles.ctaActions, isWide && styles.ctaActionsWide]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/dispatch')}
                style={({ pressed }) => [styles.ctaPrimaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.ctaPrimaryButtonLabel}>Explore for business</Text>
                <Feather name="arrow-right" size={16} color="#173B78" />
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                style={({ pressed }) => [styles.ctaSecondaryButton, pressed && styles.pressed]}
              >
                <Feather name="smartphone" size={16} color="#FFFFFF" />
                <Text style={styles.ctaSecondaryButtonLabel}>Get Android app</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.contentShell,
              styles.footerInner,
              isWide && styles.footerInnerWide,
              { paddingHorizontal: pagePadding },
            ]}
          >
            <View style={styles.footerBrand}>
              <View style={styles.brand}>
                <Image source={IMAGES.LOGO} style={styles.footerLogo} />
                <Text style={styles.footerBrandName}>
                  Route<Text style={styles.brandAccent}>Floww</Text>
                </Text>
              </View>
              <Text style={styles.footerTagline}>
                Clearer routes, connected teams, and accountable deliveries from start to finish.
              </Text>
            </View>

            <View style={[styles.footerLinks, isMedium && styles.footerLinksMedium]}>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>PRODUCT</Text>
                <Pressable onPress={() => router.push('/dispatch')}>
                  <Text style={styles.footerLink}>Business admin</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/driver-showcase?type=independent')}>
                  <Text style={styles.footerLink}>Independent driver</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/driver-showcase?type=fleet')}>
                  <Text style={styles.footerLink}>Fleet driver</Text>
                </Pressable>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>ACCOUNT</Text>
                <Pressable onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/signup', params: { role: 'BUSINESS_OWNER' } })}>
                  <Text style={styles.footerLink}>Create business account</Text>
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}>
                  <Text style={styles.footerLink}>Google Play</Text>
                </Pressable>
              </View>
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>LEGAL</Text>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)}>
                  <Text style={styles.footerLink}>Privacy policy</Text>
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.ACCOUNT_DELETION)}>
                  <Text style={styles.footerLink}>Delete account</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={[styles.contentShell, styles.footerBottom, { paddingHorizontal: pagePadding }]}>
            <Text style={styles.footerBottomText}>© 2026 RouteFloww. Built for the last mile.</Text>
            <Text style={styles.footerBottomText}>Web dispatch · Android driver app</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.78,
  },
  header: {
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF4',
  },
  headerInner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    minHeight: 64,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  brandName: {
    color: OperationsColors.ink,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  brandAccent: {
    color: OperationsColors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTextButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextButtonLabel: {
    color: '#49576A',
    fontSize: 14,
    fontWeight: '500',
  },
  headerPrimaryButton: {
    minHeight: 42,
    borderRadius: 11,
    paddingHorizontal: 16,
    backgroundColor: OperationsColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  headerPrimaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentShell: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
  },
  heroBackground: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF4',
  },
  hero: {
    paddingTop: 72,
    paddingBottom: 76,
    gap: 46,
  },
  heroWide: {
    minHeight: 650,
    paddingTop: 88,
    paddingBottom: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCopy: {
    width: '100%',
    maxWidth: 660,
  },
  heroCopyWide: {
    flex: 1.05,
    paddingRight: 20,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#D4E3FF',
    marginBottom: 22,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: OperationsColors.success,
  },
  eyebrowText: {
    color: '#2D5FAD',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#102039',
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '600',
    letterSpacing: -1.7,
  },
  heroTitleMobile: {
    fontSize: 39,
    lineHeight: 47,
    letterSpacing: -1.1,
  },
  heroDescription: {
    maxWidth: 620,
    marginTop: 22,
    color: '#536174',
    fontSize: 18,
    lineHeight: 29,
    fontWeight: '400',
  },
  heroDescriptionMobile: {
    fontSize: 16,
    lineHeight: 25,
  },
  heroActions: {
    marginTop: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 21,
    borderRadius: 13,
    backgroundColor: OperationsColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#245DB8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 52,
    paddingHorizontal: 19,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondaryButtonLabel: {
    color: OperationsColors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  heroProofRow: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  proofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proofText: {
    color: '#667488',
    fontSize: 13,
    fontWeight: '400',
  },
  heroVisualWrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 24,
  },
  heroVisualWrapWide: {
    flex: 0.95,
  },
  operationsCard: {
    minHeight: 430,
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30425D',
    shadowColor: '#071425',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 8,
  },
  operationsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  operationsEyebrow: {
    color: '#91A3BC',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  operationsTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
    marginTop: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,139,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,168,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADEA8',
  },
  livePillText: {
    color: '#A4F2D2',
    fontSize: 11,
    fontWeight: '500',
  },
  routeCanvas: {
    position: 'relative',
    minHeight: 260,
    marginTop: 20,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#0B1A2D',
    borderWidth: 1,
    borderColor: '#243750',
  },
  mapRoad: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#26374E',
  },
  mapRoadOne: {
    width: '120%',
    top: 61,
    left: -28,
    transform: [{ rotate: '-10deg' }],
  },
  mapRoadTwo: {
    width: '110%',
    top: 154,
    left: -16,
    transform: [{ rotate: '14deg' }],
  },
  mapRoadThree: {
    width: 1,
    height: '130%',
    top: -38,
    left: '64%',
    transform: [{ rotate: '18deg' }],
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  routeLineOne: {
    width: '32%',
    top: 74,
    left: '16%',
    transform: [{ rotate: '15deg' }],
  },
  routeLineTwo: {
    width: '28%',
    top: 110,
    left: '43%',
    transform: [{ rotate: '34deg' }],
  },
  routeLineThree: {
    width: '24%',
    top: 154,
    left: '65%',
    transform: [{ rotate: '-28deg' }],
  },
  stopMarker: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#4B8DF8',
  },
  stopOne: {
    top: 57,
    left: '14%',
  },
  stopTwo: {
    top: 89,
    left: '45%',
  },
  stopThree: {
    top: 137,
    right: '8%',
  },
  stopMarkerText: {
    color: '#173B78',
    fontSize: 10,
    fontWeight: '600',
  },
  driverMarker: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: OperationsColors.success,
    borderWidth: 4,
    borderColor: '#B8F0DB',
  },
  driverPosition: {
    top: 102,
    left: '60%',
    transform: [{ rotate: '25deg' }],
  },
  nextStopCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 62,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextStopIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF4FF',
  },
  nextStopCopy: {
    flex: 1,
  },
  nextStopLabel: {
    color: '#748196',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.65,
  },
  nextStopAddress: {
    color: OperationsColors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
  },
  operationStats: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  operationStat: {
    flex: 1,
    alignItems: 'center',
  },
  operationStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
  },
  operationStatLabel: {
    color: '#8FA1B9',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  operationStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#31425A',
  },
  syncCallout: {
    position: 'absolute',
    right: -8,
    bottom: 0,
    minWidth: 250,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBE5EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F1F36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 4,
  },
  syncIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E9F8F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTitle: {
    color: OperationsColors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  syncDescription: {
    color: '#728095',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  roleSection: {
    paddingTop: 92,
    paddingBottom: 98,
  },
  sectionHeader: {
    gap: 18,
    marginBottom: 34,
  },
  sectionHeaderWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionHeaderCopy: {
    maxWidth: 650,
  },
  sectionKicker: {
    color: '#2D67BF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.05,
    marginBottom: 12,
  },
  sectionTitle: {
    color: OperationsColors.ink,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  sectionTitleMobile: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  sectionDescription: {
    maxWidth: 560,
    color: '#627084',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  sectionDescriptionWide: {
    maxWidth: 430,
    paddingBottom: 3,
  },
  roleGrid: {
    gap: 16,
  },
  roleGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  roleCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6EF',
    shadowColor: '#1B2A41',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 22,
    elevation: 2,
  },
  roleCardWide: {
    flex: 1,
    width: 'auto',
  },
  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleLabel: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.75,
  },
  roleTitle: {
    marginTop: 22,
    color: OperationsColors.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  roleDescription: {
    marginTop: 9,
    color: '#334256',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  roleDetail: {
    marginTop: 8,
    color: '#718095',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  roleFeatureList: {
    marginTop: 22,
    gap: 11,
    flex: 1,
  },
  roleFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  smallCheck: {
    width: 21,
    height: 21,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  roleFeatureText: {
    flex: 1,
    color: '#4C5A6D',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  roleAction: {
    minHeight: 47,
    marginTop: 24,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roleActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  workflowBand: {
    backgroundColor: '#F6F8FB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7ECF2',
  },
  workflowSection: {
    paddingTop: 92,
    paddingBottom: 96,
  },
  centeredSectionHeader: {
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center',
  },
  centeredTitle: {
    textAlign: 'center',
  },
  centeredDescription: {
    maxWidth: 640,
    marginTop: 14,
    color: '#627084',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  workflowGrid: {
    marginTop: 42,
    gap: 14,
  },
  workflowGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  workflowItem: {
    position: 'relative',
    padding: 23,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7EF',
  },
  workflowItemWide: {
    flex: 1,
  },
  workflowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workflowIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#EDF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowStep: {
    color: '#B1BDCA',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  workflowTitle: {
    marginTop: 19,
    color: OperationsColors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  workflowDescription: {
    marginTop: 8,
    color: '#69778B',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
  },
  workflowConnector: {
    position: 'absolute',
    zIndex: 3,
    width: 30,
    height: 30,
    right: -23,
    top: '50%',
    marginTop: -15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capabilitySection: {
    paddingTop: 96,
    paddingBottom: 98,
  },
  capabilityIntro: {
    gap: 24,
  },
  capabilityIntroWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  capabilityIntroCopy: {
    maxWidth: 720,
  },
  capabilityIntroDescription: {
    maxWidth: 680,
    marginTop: 14,
    color: '#627084',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  capabilityQuote: {
    maxWidth: 340,
    padding: 17,
    borderRadius: 15,
    backgroundColor: '#F3F7FD',
    borderWidth: 1,
    borderColor: '#DDE8F8',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  capabilityQuoteText: {
    flex: 1,
    color: '#40526A',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  capabilityGrid: {
    marginTop: 36,
    gap: 14,
  },
  capabilityGridMedium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  capabilityCard: {
    padding: 20,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7EF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  capabilityCardMedium: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  capabilityIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#EDF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capabilityCardCopy: {
    flex: 1,
  },
  capabilityTitle: {
    color: OperationsColors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  capabilityDescription: {
    marginTop: 6,
    color: '#6A788B',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
  },
  faqBand: {
    backgroundColor: '#F7F9FC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7ECF2',
  },
  faqSection: {
    paddingTop: 94,
    paddingBottom: 96,
    gap: 38,
  },
  faqSectionWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 70,
  },
  faqIntro: {
    maxWidth: 620,
  },
  faqIntroWide: {
    flex: 0.8,
    paddingTop: 8,
  },
  faqIntroDescription: {
    marginTop: 14,
    color: '#657388',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  faqIntroAction: {
    alignSelf: 'flex-start',
    marginTop: 22,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#AFC9EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  faqIntroActionLabel: {
    color: OperationsColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  faqList: {
    gap: 10,
  },
  faqListWide: {
    flex: 1.2,
  },
  faqItem: {
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE6EF',
  },
  faqItemPressed: {
    backgroundColor: '#FAFCFF',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  faqQuestion: {
    flex: 1,
    color: OperationsColors.ink,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  faqToggle: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: '#EDF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqToggleOpen: {
    backgroundColor: OperationsColors.primary,
  },
  faqAnswer: {
    marginTop: 12,
    paddingRight: 38,
    color: '#69778A',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
  },
  ctaSection: {
    paddingTop: 78,
    paddingBottom: 78,
  },
  ctaCard: {
    padding: 34,
    borderRadius: 25,
    overflow: 'hidden',
    gap: 26,
  },
  ctaCopy: {
    maxWidth: 720,
  },
  ctaCopyWide: {
    paddingRight: 20,
  },
  ctaKicker: {
    color: '#BED6FF',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  ctaTitle: {
    marginTop: 11,
    color: '#FFFFFF',
    fontSize: 35,
    lineHeight: 43,
    fontWeight: '600',
    letterSpacing: -0.7,
  },
  ctaTitleMobile: {
    fontSize: 29,
    lineHeight: 37,
  },
  ctaDescription: {
    maxWidth: 670,
    marginTop: 12,
    color: '#D7E5F8',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  ctaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ctaActionsWide: {
    alignSelf: 'flex-start',
  },
  ctaPrimaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  ctaPrimaryButtonLabel: {
    color: '#173B78',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaSecondaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  ctaSecondaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#0C1728',
  },
  footerInner: {
    paddingTop: 60,
    paddingBottom: 46,
    gap: 42,
  },
  footerInnerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerBrand: {
    maxWidth: 350,
  },
  footerLogo: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  footerBrandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  footerTagline: {
    marginTop: 16,
    color: '#98A8BD',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
  },
  footerLinks: {
    gap: 30,
  },
  footerLinksMedium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 58,
  },
  footerColumn: {
    minWidth: 138,
    gap: 12,
  },
  footerColumnTitle: {
    color: '#6F829B',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerLink: {
    color: '#C7D2E0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  footerBottom: {
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1D2B3D',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerBottomText: {
    color: '#6F829B',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
  },
});
