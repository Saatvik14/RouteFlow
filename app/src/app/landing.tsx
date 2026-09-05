import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
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
import Svg, { Circle, Path } from 'react-native-svg';

import { LEGAL_URLS } from '../constants/legal';
import { IMAGES } from '../constants/theme';
import { openExternalUrl } from '../hooks/open-external-url';

type IconName = ComponentProps<typeof Feather>['name'];

const capabilityCards: Array<{
  icon: IconName;
  title: string;
  description: string;
  detail: string;
  tone: 'blue' | 'cyan' | 'green' | 'violet' | 'orange';
}> = [
  {
    icon: 'zap',
    title: 'Route intelligence',
    description: 'Build practical routes around the real delivery day.',
    detail: 'Add stops by camera, voice or manually, import CSV and Excel manifests, then optimize up to 500 stops with time windows and priorities.',
    tone: 'blue',
  },
  {
    icon: 'briefcase',
    title: 'Driver Marketplace',
    description: 'Find trusted coverage for routes your team cannot take.',
    detail: 'Publish schedule and budget details, receive driver bids and award work without exposing customer stops early.',
    tone: 'cyan',
  },
  {
    icon: 'radio',
    title: 'Live delivery control',
    description: 'See progress while there is still time to act.',
    detail: 'Follow driver location, ETAs, route progress and exceptions, with live stop changes reaching the driver.',
    tone: 'green',
  },
  {
    icon: 'users',
    title: 'Teams and assignments',
    description: 'Give every person the right workspace and access.',
    detail: 'Invite teammates, create fleet-driver access codes, set permissions and assign or reassign routes directly.',
    tone: 'violet',
  },
  {
    icon: 'file-text',
    title: 'Proof and reporting',
    description: 'Close each delivery with a reliable record.',
    detail: 'Require photo or OTP proof, capture notes and outcomes, then review mileage, performance and delivery reports.',
    tone: 'orange',
  },
];

const journey: Array<{ icon: IconName; number: string; title: string; text: string }> = [
  { icon: 'upload-cloud', number: '01', title: 'Import', text: 'Bring in stops one at a time or as a complete manifest.' },
  { icon: 'shuffle', number: '02', title: 'Plan', text: 'Optimize, split and assign work to the right driver.' },
  { icon: 'navigation', number: '03', title: 'Deliver', text: 'Navigate every stop with live progress shared automatically.' },
  { icon: 'shield', number: '04', title: 'Verify', text: 'Confirm completion with the proof policy your operation uses.' },
];

export default function LandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const tablet = width >= 720;
  const pagePadding = tablet ? 32 : 20;
  const scrollRef = useRef<ScrollView>(null);
  const [howItWorksY, setHowItWorksY] = useState(760);

  useEffect(() => {
    if (Platform.OS === 'web' && pathname === '/landing') router.replace('/');
  }, [pathname, router]);

  return (
    <View style={styles.page}>
      <Head>
        <title>RouteFloww | Multi-stop route planning and driver dispatch</title>
        <meta name="description" content="Create and optimise multi-stop delivery routes, assign them to drivers, and manage delivery progress from one organised workspace." />
        <link rel="canonical" href="https://routefloww.com/" />
        <meta property="og:title" content="RouteFloww | Plan smarter routes. Dispatch with confidence." />
        <meta property="og:description" content="Plan multi-stop routes, assign drivers and keep delivery work organised in one clear workspace." />
        <meta property="og:type" content="website" />
      </Head>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={[styles.headerInner, { paddingHorizontal: pagePadding }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="RouteFloww home" onPress={() => router.push('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
            <Image source={IMAGES.LOGO} style={styles.logo} />
            <Text style={styles.brandName}>Route<Text style={styles.brandAccent}>Floww</Text></Text>
          </Pressable>

          {desktop ? (
            <View style={styles.navLinks}>
              <Pressable accessibilityRole="link" onPress={() => scrollRef.current?.scrollTo({ y: howItWorksY, animated: true })} style={styles.navLink}><Text style={styles.navLinkText}>Product</Text></Pressable>
              <Pressable accessibilityRole="link" onPress={() => scrollRef.current?.scrollTo({ y: howItWorksY, animated: true })} style={styles.navLink}><Text style={styles.navLinkText}>How it works</Text></Pressable>
            </View>
          ) : null}

          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
              <Text style={styles.textButtonLabel}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <Text style={styles.headerButtonLabel}>Start free</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={styles.heroSection}>
          <View style={[styles.content, styles.hero, !desktop && styles.heroStack, { paddingHorizontal: pagePadding }]}>
            <View style={styles.heroCopy}>
              <View style={styles.productPill}>
                <View style={styles.productPillIcon}><Feather name="navigation" size={14} color="#2563EB" /></View>
                <Text style={styles.productPillText}>ROUTE PLANNING & DISPATCH</Text>
              </View>
              <Text style={[styles.heroTitle, !tablet && styles.heroTitleMobile]}>Plan smarter routes. Dispatch with confidence.</Text>
              <Text style={styles.heroText}>Create and optimise multi-stop routes, assign them to drivers, and keep every delivery organised from one clear workspace.</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonLabel}>Start planning routes</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={() => scrollRef.current?.scrollTo({ y: howItWorksY, animated: true })} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                  <Feather name="play-circle" size={18} color="#173B64" />
                  <Text style={styles.outlineButtonLabel}>See how it works</Text>
                </Pressable>
              </View>
              <View style={styles.heroAssurances}>
                {['Built for delivery teams', 'Clear driver hand-off', 'Routes and history in one place'].map((item) => (
                  <View key={item} style={styles.assurance}>
                    <Feather name="check" size={14} color="#168462" />
                    <Text style={styles.assuranceText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.heroMedia, !desktop && styles.heroMediaStack]}>
              <DispatchPreview compact={!tablet} />
            </View>
          </View>
        </View>

        <View style={styles.trustSection} onLayout={(event) => setHowItWorksY(event.nativeEvent.layout.y + 88)}>
          <View style={[styles.content, styles.trustRow, { paddingHorizontal: pagePadding }]}>
            <Text style={styles.trustLead}>One platform for the complete delivery lifecycle</Text>
            <View style={styles.trustItems}>
              {['PLAN', 'ASSIGN', 'TRACK', 'VERIFY', 'REPORT'].map((item, index) => (
                <View key={item} style={styles.trustItem}>
                  {index > 0 ? <View style={styles.trustDivider} /> : null}
                  <Text style={styles.trustItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.capabilitiesSection}>
          <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="THE PLATFORM" title="Less operational noise. More control." text="Everything your delivery day depends on stays visible, current and connected." />
            <View style={styles.capabilityGrid}>
              {capabilityCards.map((card, index) => (
                <View key={card.title} style={[styles.capabilityCard, index === 0 && styles.capabilityCardWide]}>
                  <View style={[styles.capabilityIcon, toneStyles[card.tone].background]}>
                    <Feather name={card.icon} size={22} color={toneStyles[card.tone].color} />
                  </View>
                  <Text style={styles.capabilityTitle}>{card.title}</Text>
                  <Text style={styles.capabilityLead}>{card.description}</Text>
                  <Text style={styles.capabilityDetail}>{card.detail}</Text>
                  {index === 0 ? (
                    <View style={styles.optimizerStrip}>
                      <View style={styles.optimizerPoint}><View style={[styles.optimizerDot, { backgroundColor: '#1D63ED' }]} /><Text style={styles.optimizerLabel}>Depot</Text></View>
                      <View style={styles.optimizerLine} />
                      <View style={styles.optimizerPoint}><View style={[styles.optimizerDot, { backgroundColor: '#16A3B6' }]} /><Text style={styles.optimizerLabel}>26 stops</Text></View>
                      <View style={styles.optimizerLine} />
                      <View style={styles.optimizerPoint}><View style={[styles.optimizerDot, { backgroundColor: '#1E9B69' }]} /><Text style={styles.optimizerLabel}>Complete</Text></View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.marketplaceSection}>
          <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
            <View style={[styles.marketplacePanel, !desktop && styles.marketplacePanelStack]}>
              <View style={styles.marketplaceCopy}>
                <View style={styles.sectionTag}><Feather name="briefcase" size={15} color="#075E8F" /><Text style={styles.marketplaceEyebrow}>DRIVER MARKETPLACE</Text></View>
                <Text style={styles.marketplaceTitle}>Open routes meet available drivers.</Text>
                <Text style={styles.marketplaceText}>Publish only the details drivers need to make a decision. Compare bids, choose the right driver and release the complete route securely after award.</Text>
                <View style={styles.marketplaceChecks}>
                  {['Customer stops stay private before award', 'Budget and bid deadlines stay clear', 'Driver history supports the decision'].map((item) => (
                    <View key={item} style={styles.marketplaceCheck}><Feather name="check-circle" size={17} color="#087B67" /><Text style={styles.marketplaceCheckText}>{item}</Text></View>
                  ))}
                </View>
              </View>
              <View style={styles.bidBoard}>
                <View style={styles.bidBoardHeader}><View><Text style={styles.bidBoardKicker}>ROUTE RF-2048</Text><Text style={styles.bidBoardTitle}>Manchester morning route</Text></View><View style={styles.openBadge}><Text style={styles.openBadgeText}>Open</Text></View></View>
                <View style={styles.bidFacts}>
                  <BidFact label="START" value="08:30" />
                  <BidFact label="STOPS" value="32" />
                  <BidFact label="MAX COST" value="£148" />
                </View>
                <View style={styles.bidList}>
                  <DriverBid initials="AM" name="Aisha M." detail="Van · 96 routes" value="£132" selected />
                  <DriverBid initials="JT" name="James T." detail="Car · 71 routes" value="£138" />
                  <DriverBid initials="SK" name="Sam K." detail="Van · 112 routes" value="£144" />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.proofSection}>
          <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="DELIVERY CONFIDENCE" title="Proof happens before ‘Delivered’." text="Choose one verification policy for your operation. The driver cannot complete the stop until the configured proof is accepted." />
            <View style={[styles.proofPanel, !desktop && styles.proofPanelStack]}>
              <View style={styles.proofVisual}>
                <View style={styles.proofVisualIcon}><Feather name="shield" size={28} color="#FFFFFF" /></View>
                <Text style={styles.proofVisualTitle}>A verified handoff, every time.</Text>
                <Text style={styles.proofVisualText}>The selected proof is stored with the stop outcome, server completion time and driver record.</Text>
                <View style={styles.verificationReceipt}>
                  <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Stop</Text><Text style={styles.receiptValue}>18 · Oakfield Road</Text></View>
                  <View style={styles.receiptLine} />
                  <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Status</Text><View style={styles.verifiedPill}><Feather name="check" size={12} color="#087B67" /><Text style={styles.verifiedText}>Verified</Text></View></View>
                  <View style={styles.receiptLine} />
                  <View style={styles.receiptRow}><Text style={styles.receiptLabel}>Completed</Text><Text style={styles.receiptValue}>09:42</Text></View>
                </View>
              </View>
              <View style={styles.proofModes}>
                <ProofMode icon="camera" title="Photo proof" label="CAPTURE MODE" text="The driver takes a delivery image inside the completion flow. The stop stays open until a valid photo is attached." />
                <ProofMode icon="key" title="Customer OTP" label="CODE MODE" text="The customer receives a one-time code for the delivery. The driver enters it and the server verifies it before completion." />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.journeySection}>
          <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="ONE SHARED FLOW" title="From manifest to verified delivery" text="Independent drivers, fleet drivers and delivery teams work in one connected sequence—not separate product experiences." />
            <View style={styles.journeyGrid}>
              {journey.map((step, index) => (
                <View key={step.number} style={styles.journeyItem}>
                  <View style={styles.journeyTop}>
                    <View style={styles.journeyIcon}><Feather name={step.icon} size={20} color="#1D63ED" /></View>
                    <Text style={styles.journeyNumber}>{step.number}</Text>
                  </View>
                  <Text style={styles.journeyTitle}>{step.title}</Text>
                  <Text style={styles.journeyText}>{step.text}</Text>
                  {index < journey.length - 1 ? <View style={styles.journeyConnector} /> : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
            <LinearGradient colors={['#0E4FBC', '#1D63ED', '#1684D8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ctaCard, !desktop && styles.ctaCardStack]}>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaEyebrow}>START WITH YOUR NEXT ROUTE</Text>
                <Text style={styles.ctaTitle}>A better delivery day starts with one clear flow.</Text>
                <Text style={styles.ctaText}>Create your account, add your stops and see how RouteFloww keeps the whole operation connected.</Text>
              </View>
              <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}>
                <Text style={styles.ctaButtonLabel}>Get started free</Text>
                <Feather name="arrow-right" size={18} color="#123A69" />
              </Pressable>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.content, styles.footerInner, { paddingHorizontal: pagePadding }]}>
            <View style={styles.footerBrand}>
              <View style={styles.brand}><Image source={IMAGES.LOGO} style={styles.footerLogo} /><Text style={styles.footerName}>Route<Text style={styles.brandAccent}>Floww</Text></Text></View>
              <Text style={styles.footerText}>Plan, assign, deliver and verify in one connected platform.</Text>
            </View>
            <View style={styles.footerLinks}>
              <FooterLink label="Sign in" onPress={() => router.push('/login')} />
              <FooterLink label="Create account" onPress={() => router.push('/signup')} />
              <FooterLink label="Privacy" onPress={() => openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)} />
              <FooterLink label="Delete account" onPress={() => openExternalUrl(LEGAL_URLS.ACCOUNT_DELETION)} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const toneStyles = {
  blue: { background: { backgroundColor: '#E9F1FF' }, color: '#1D63ED' },
  cyan: { background: { backgroundColor: '#E4F7FA' }, color: '#087C92' },
  green: { background: { backgroundColor: '#E6F7EF' }, color: '#087B67' },
  violet: { background: { backgroundColor: '#F0ECFF' }, color: '#6D4BD1' },
  orange: { background: { backgroundColor: '#FFF2E5' }, color: '#B56017' },
} as const;

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionText}>{text}</Text></View>;
}

function Signal({ icon, label, tone }: { icon: IconName; label: string; tone: 'blue' | 'violet' | 'green' }) {
  const color = tone === 'green' ? '#087B67' : tone === 'violet' ? '#6D4BD1' : '#1D63ED';
  const backgroundColor = tone === 'green' ? '#E6F7EF' : tone === 'violet' ? '#F0ECFF' : '#E9F1FF';
  return <View style={styles.signal}><View style={[styles.signalIcon, { backgroundColor }]}><Feather name={icon} size={15} color={color} /></View><Text style={styles.signalText}>{label}</Text></View>;
}

function BidFact({ label, value }: { label: string; value: string }) {
  return <View style={styles.bidFact}><Text style={styles.bidFactLabel}>{label}</Text><Text style={styles.bidFactValue}>{value}</Text></View>;
}

function DriverBid({ initials, name, detail, value, selected }: { initials: string; name: string; detail: string; value: string; selected?: boolean }) {
  return <View style={[styles.driverBid, selected && styles.driverBidSelected]}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.driverName}>{name}</Text><Text style={styles.driverDetail}>{detail}</Text></View><Text style={styles.driverValue}>{value}</Text>{selected ? <View style={styles.selectedCheck}><Feather name="check" size={12} color="#FFFFFF" /></View> : null}</View>;
}

function ProofMode({ icon, title, label, text }: { icon: IconName; title: string; label: string; text: string }) {
  return <View style={styles.proofMode}><View style={styles.proofModeIcon}><Feather name={icon} size={21} color="#1D63ED" /></View><View style={{ flex: 1 }}><Text style={styles.proofModeLabel}>{label}</Text><Text style={styles.proofModeTitle}>{title}</Text><Text style={styles.proofModeText}>{text}</Text></View></View>;
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}><Text style={styles.footerLinkText}>{label}</Text></Pressable>;
}

function DispatchPreview({ compact }: { compact: boolean }) {
  return (
    <View accessibilityLabel="RouteFloww dispatch workspace showing an assigned multi-stop route" style={styles.dispatchFrame}>
      <View style={styles.dispatchToolbar}>
        <View style={styles.dispatchToolbarBrand}><View style={styles.dispatchMark}><Feather name="navigation" size={12} color="#FFFFFF" /></View><Text style={styles.dispatchToolbarTitle}>Delivery operations</Text></View>
        <View style={styles.dispatchToolbarActions}><View style={styles.dispatchSearch}><Feather name="search" size={12} color="#718096" /><Text style={styles.dispatchSearchText}>Search routes</Text></View><View style={styles.dispatchAvatar}><Text style={styles.dispatchAvatarText}>AD</Text></View></View>
      </View>
      <View style={styles.dispatchBody}>
        {!compact ? (
          <View style={styles.dispatchRail}>
            <Text style={styles.dispatchRailLabel}>TODAY</Text>
            <View style={styles.metricCard}><Text style={styles.metricValue}>6</Text><Text style={styles.metricLabel}>Routes</Text></View>
            <View style={styles.metricCard}><Text style={[styles.metricValue, { color: '#168462' }]}>2</Text><Text style={styles.metricLabel}>In progress</Text></View>
            <Text style={styles.dispatchRailLabel}>ROUTES</Text>
            <View style={styles.routeMiniCardActive}><View style={styles.routeMiniTop}><View style={styles.routeMiniDot} /><Text style={styles.routeMiniStatus}>IN PROGRESS</Text></View><Text style={styles.routeMiniTitle}>North London AM</Text><Text style={styles.routeMiniMeta}>12 stops · Alex D.</Text></View>
            <View style={styles.routeMiniCard}><Text style={styles.routeMiniTitle}>Central deliveries</Text><Text style={styles.routeMiniMeta}>8 stops · Unassigned</Text></View>
          </View>
        ) : null}
        <View style={styles.dispatchMap}>
          <Svg width="100%" height="100%" viewBox="0 0 620 390" preserveAspectRatio="xMidYMid slice">
            <Path d="M-20 85 C120 40 185 145 320 92 S515 54 660 112" stroke="#DCE5ED" strokeWidth="18" fill="none" />
            <Path d="M48 355 C126 270 182 250 278 242 S458 258 670 196" stroke="#E4EAF0" strokeWidth="15" fill="none" />
            <Path d="M62 -20 C90 120 132 185 206 232 S304 334 336 430" stroke="#E7EDF2" strokeWidth="12" fill="none" />
            <Path d="M500 -25 C456 96 470 145 535 222 S585 326 560 420" stroke="#DFE7EE" strokeWidth="16" fill="none" />
            <Path d="M138 326 C182 280 226 260 270 242 C326 218 380 184 418 132 C447 94 489 87 538 116" stroke="#2563EB" strokeWidth="7" strokeLinecap="round" fill="none" />
            <Path d="M138 326 C182 280 226 260 270 242 C326 218 380 184 418 132 C447 94 489 87 538 116" stroke="#8BB6FF" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="3 12" />
            <Circle cx="138" cy="326" r="13" fill="#173B64" stroke="#FFFFFF" strokeWidth="5" />
            <Circle cx="270" cy="242" r="12" fill="#FFFFFF" stroke="#2563EB" strokeWidth="6" />
            <Circle cx="418" cy="132" r="12" fill="#FFFFFF" stroke="#2563EB" strokeWidth="6" />
            <Circle cx="538" cy="116" r="13" fill="#168462" stroke="#FFFFFF" strokeWidth="5" />
          </Svg>
          <View style={styles.mapZoom}><View style={styles.mapZoomButton}><Feather name="plus" size={14} color="#425466" /></View><View style={styles.mapZoomDivider} /><View style={styles.mapZoomButton}><Feather name="minus" size={14} color="#425466" /></View></View>
          <View style={styles.mapRouteCard}>
            <View style={styles.mapRouteHeader}><View><Text style={styles.mapRouteEyebrow}>ROUTE RF-1042</Text><Text style={styles.mapRouteTitle}>North London AM</Text></View><View style={styles.liveStatus}><View style={styles.liveStatusDot} /><Text style={styles.liveStatusText}>In progress</Text></View></View>
            <View style={styles.mapProgressTrack}><View style={styles.mapProgressFill} /></View>
            <View style={styles.mapRouteFooter}><Text style={styles.mapRouteMeta}>7 of 12 stops complete</Text><Text style={styles.mapRouteDriver}>Alex D.</Text></View>
          </View>
          <View style={styles.vehiclePin}><Feather name="truck" size={16} color="#FFFFFF" /></View>
        </View>
      </View>
      <View style={styles.dispatchFooter}><View style={styles.dispatchFooterItem}><View style={styles.footerStatusDot} /><Text style={styles.dispatchFooterText}>Driver route active</Text></View><View style={styles.dispatchFooterItem}><Feather name="clock" size={12} color="#718096" /><Text style={styles.dispatchFooterText}>Updated just now</Text></View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center' },
  header: { zIndex: 20, backgroundColor: 'rgba(255,255,255,0.98)', borderBottomWidth: 1, borderBottomColor: '#E5ECF5' },
  headerInner: { width: '100%', maxWidth: 1240, minHeight: 70, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 31, height: 31, borderRadius: 8 },
  brandName: { color: '#102B4E', fontSize: 21, fontWeight: '600', letterSpacing: -0.6 },
  brandAccent: { color: '#1D63ED' },
  navLinks: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 },
  navLink: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9 },
  navLinkText: { color: '#405873', fontSize: 14, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10 },
  textButtonLabel: { color: '#34506F', fontSize: 14, fontWeight: '500' },
  headerButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 17, borderRadius: 11, backgroundColor: '#1D63ED' },
  headerButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  heroSection: { borderBottomWidth: 1, borderBottomColor: '#DCE6F0', backgroundColor: '#F4F8FC' },
  hero: { minHeight: 664, flexDirection: 'row', alignItems: 'center', gap: 54, paddingVertical: 48 },
  heroStack: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 46, paddingVertical: 48 },
  heroCopy: { flex: 0.94, minWidth: 300 },
  productPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5E1EE' },
  productPillIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E9F1FF' },
  productPillText: { color: '#245A9E', fontSize: 11, fontWeight: '600', letterSpacing: 0.9 },
  heroTitle: { color: '#102A49', fontSize: 56, lineHeight: 62, fontWeight: '600', letterSpacing: -2.15, marginTop: 22 },
  heroTitleMobile: { fontSize: 40, lineHeight: 46, letterSpacing: -1.35 },
  heroText: { color: '#516B87', fontSize: 18, lineHeight: 29, maxWidth: 610, marginTop: 20 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 30 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 21, borderRadius: 12, backgroundColor: '#1D63ED' },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  outlineButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD9EA' },
  outlineButtonLabel: { color: '#143A69', fontSize: 15, fontWeight: '500' },
  heroAssurances: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  assuranceText: { color: '#5D728A', fontSize: 13, lineHeight: 18 },
  heroMedia: { flex: 1.06, minWidth: 390 },
  heroMediaStack: { width: '100%', minWidth: 0, maxWidth: 760, alignSelf: 'center' },
  dispatchFrame: { width: '100%', minHeight: 500, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C9D6E3', shadowColor: '#163C68', shadowOffset: { width: 0, height: 22 }, shadowOpacity: 0.16, shadowRadius: 36, elevation: 7 },
  dispatchToolbar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#E5EBF1', backgroundColor: '#FFFFFF' },
  dispatchToolbarBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dispatchMark: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' },
  dispatchToolbarTitle: { color: '#193653', fontSize: 12, fontWeight: '600' },
  dispatchToolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dispatchSearch: { minWidth: 118, height: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F4F7FA', borderWidth: 1, borderColor: '#E5EBF1' },
  dispatchSearchText: { color: '#8795A5', fontSize: 10 },
  dispatchAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1FF' },
  dispatchAvatarText: { color: '#2258B8', fontSize: 9, fontWeight: '700' },
  dispatchBody: { minHeight: 410, flexDirection: 'row' },
  dispatchRail: { width: 178, padding: 13, gap: 9, borderRightWidth: 1, borderRightColor: '#E5EBF1', backgroundColor: '#F9FBFD' },
  dispatchRailLabel: { color: '#8998A9', fontSize: 8, fontWeight: '700', letterSpacing: 0.9, marginTop: 2 },
  metricCard: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EBF1' },
  metricValue: { color: '#173B64', fontSize: 18, fontWeight: '700' },
  metricLabel: { color: '#708195', fontSize: 9, marginTop: 2 },
  routeMiniCardActive: { padding: 10, borderRadius: 10, backgroundColor: '#ECF3FF', borderWidth: 1, borderColor: '#BDD2F4' },
  routeMiniCard: { padding: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EBF1' },
  routeMiniTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  routeMiniDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#168462' },
  routeMiniStatus: { color: '#168462', fontSize: 7, fontWeight: '700', letterSpacing: 0.5 },
  routeMiniTitle: { color: '#223E59', fontSize: 10, fontWeight: '600' },
  routeMiniMeta: { color: '#7D8B9A', fontSize: 8, marginTop: 3 },
  dispatchMap: { flex: 1, minWidth: 0, minHeight: 410, overflow: 'hidden', backgroundColor: '#F5F7F8' },
  mapZoom: { position: 'absolute', top: 12, right: 12, width: 30, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE5EC' },
  mapZoomButton: { height: 27, alignItems: 'center', justifyContent: 'center' },
  mapZoomDivider: { height: 1, backgroundColor: '#E5EBF1' },
  mapRouteCard: { position: 'absolute', left: 14, right: 14, bottom: 14, padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: '#D6E0E9', shadowColor: '#18395D', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 3 },
  mapRouteHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  mapRouteEyebrow: { color: '#2563EB', fontSize: 8, fontWeight: '700', letterSpacing: 0.7 },
  mapRouteTitle: { color: '#173B64', fontSize: 13, fontWeight: '700', marginTop: 3 },
  liveStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999, backgroundColor: '#E8F6F1' },
  liveStatusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#168462' },
  liveStatusText: { color: '#147455', fontSize: 8, fontWeight: '700' },
  mapProgressTrack: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: '#E6ECF1', marginTop: 11 },
  mapProgressFill: { width: '58%', height: '100%', borderRadius: 3, backgroundColor: '#2563EB' },
  mapRouteFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 7 },
  mapRouteMeta: { color: '#708195', fontSize: 9 },
  mapRouteDriver: { color: '#42566B', fontSize: 9, fontWeight: '600' },
  vehiclePin: { position: 'absolute', left: '57%', top: '39%', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#173B64', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 4 },
  dispatchFooter: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#E5EBF1', backgroundColor: '#FFFFFF' },
  dispatchFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#168462' },
  dispatchFooterText: { color: '#718096', fontSize: 9 },
  imageFrame: { height: 500, borderRadius: 27, overflow: 'hidden', backgroundColor: '#D9E7F7', borderWidth: 1, borderColor: '#C9D9EB', shadowColor: '#194274', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.14, shadowRadius: 30, elevation: 5 },
  heroImage: { width: '100%', height: '100%' },
  imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,38,72,0.08)' },
  routeStatusCard: { position: 'absolute', left: 18, right: 18, bottom: 18, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(213,226,241,0.96)' },
  routeStatusTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E9B69' },
  routeStatusKicker: { color: '#3B668F', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  routeStatusTime: { marginLeft: 'auto', color: '#6B7F94', fontSize: 12 },
  routeStatusTitle: { color: '#163758', fontSize: 17, fontWeight: '600', marginTop: 8 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#E1E9F2', overflow: 'hidden', marginTop: 13 },
  progressFill: { width: '69%', height: '100%', borderRadius: 4, backgroundColor: '#1D63ED' },
  routeStatusMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  routeStatusMetaText: { color: '#60758B', fontSize: 12 },
  mediaSignals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 14 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DAE4EF' },
  signalIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  signalText: { color: '#425D79', fontSize: 12, fontWeight: '500' },
  trustSection: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EDF5' },
  trustRow: { minHeight: 96, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 22 },
  trustLead: { color: '#5B7188', fontSize: 14 },
  trustItems: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  trustDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#A9B8C8' },
  trustItemText: { color: '#294C73', fontSize: 12, fontWeight: '600', letterSpacing: 0.9 },
  capabilitiesSection: { paddingVertical: 96, backgroundColor: '#FFFFFF' },
  sectionHeading: { maxWidth: 720, marginBottom: 42 },
  sectionEyebrow: { color: '#1D63ED', fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },
  sectionTitle: { color: '#102B4E', fontSize: 39, lineHeight: 47, fontWeight: '500', letterSpacing: -1.2, marginTop: 10 },
  sectionText: { color: '#5B7188', fontSize: 17, lineHeight: 27, marginTop: 12 },
  capabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  capabilityCard: { flexGrow: 1, flexBasis: 340, minWidth: 280, padding: 25, borderRadius: 19, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E0E8F1' },
  capabilityCardWide: { flexBasis: 700, backgroundColor: '#F2F7FF', borderColor: '#D5E3F7' },
  capabilityIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  capabilityTitle: { color: '#183858', fontSize: 19, fontWeight: '600', marginTop: 18 },
  capabilityLead: { color: '#365574', fontSize: 16, lineHeight: 23, marginTop: 7 },
  capabilityDetail: { color: '#667C92', fontSize: 14, lineHeight: 22, marginTop: 9 },
  optimizerStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E5F4' },
  optimizerPoint: { alignItems: 'center', gap: 7 },
  optimizerDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: '#FFFFFF' },
  optimizerLine: { flex: 1, height: 2, backgroundColor: '#C8D9EE', marginHorizontal: 9 },
  optimizerLabel: { color: '#48647F', fontSize: 12, fontWeight: '500' },
  marketplaceSection: { paddingVertical: 96, backgroundColor: '#F2F7FF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#DDE8F6' },
  marketplacePanel: { flexDirection: 'row', alignItems: 'center', gap: 60 },
  marketplacePanelStack: { flexDirection: 'column', alignItems: 'stretch', gap: 42 },
  marketplaceCopy: { flex: 1, minWidth: 290 },
  sectionTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#E1F3FA', borderWidth: 1, borderColor: '#C8E7F2' },
  marketplaceEyebrow: { color: '#075E8F', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  marketplaceTitle: { color: '#102B4E', fontSize: 38, lineHeight: 46, fontWeight: '500', letterSpacing: -1, marginTop: 20 },
  marketplaceText: { color: '#587089', fontSize: 16, lineHeight: 26, marginTop: 13 },
  marketplaceChecks: { gap: 11, marginTop: 24 },
  marketplaceCheck: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  marketplaceCheckText: { flex: 1, color: '#42617D', fontSize: 14, lineHeight: 20 },
  bidBoard: { flex: 1, minWidth: 320, padding: 22, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5E2F1', shadowColor: '#1D4A7C', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3 },
  bidBoardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  bidBoardKicker: { color: '#1D63ED', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  bidBoardTitle: { color: '#173858', fontSize: 18, fontWeight: '600', marginTop: 5 },
  openBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E6F7EF' },
  openBadgeText: { color: '#087B67', fontSize: 11, fontWeight: '600' },
  bidFacts: { flexDirection: 'row', gap: 8, marginTop: 20 },
  bidFact: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F4F7FB' },
  bidFactLabel: { color: '#7A8DA1', fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  bidFactValue: { color: '#254765', fontSize: 16, fontWeight: '600', marginTop: 5 },
  bidList: { gap: 9, marginTop: 16 },
  driverBid: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: '#E1E8F0' },
  driverBidSelected: { backgroundColor: '#EEF5FF', borderColor: '#BBD2F5' },
  driverAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5EDF7' },
  driverAvatarText: { color: '#2D557B', fontSize: 12, fontWeight: '600' },
  driverName: { color: '#254765', fontSize: 14, fontWeight: '600' },
  driverDetail: { color: '#788B9F', fontSize: 12, marginTop: 3 },
  driverValue: { color: '#173858', fontSize: 15, fontWeight: '600' },
  selectedCheck: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D63ED' },
  proofSection: { paddingVertical: 96, backgroundColor: '#FFFFFF' },
  proofPanel: { flexDirection: 'row', alignItems: 'stretch', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#DCE5F0' },
  proofPanelStack: { flexDirection: 'column' },
  proofVisual: { flex: 0.85, minWidth: 300, padding: 34, backgroundColor: '#123A69' },
  proofVisualIcon: { width: 55, height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D63ED' },
  proofVisualTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 35, fontWeight: '500', letterSpacing: -0.5, marginTop: 24 },
  proofVisualText: { color: '#C8D7E8', fontSize: 15, lineHeight: 24, marginTop: 10 },
  verificationReceipt: { marginTop: 28, padding: 16, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  receiptRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  receiptLabel: { color: '#AFC4DC', fontSize: 12 },
  receiptValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '500', textAlign: 'right' },
  receiptLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#E6F7EF' },
  verifiedText: { color: '#087B67', fontSize: 11, fontWeight: '600' },
  proofModes: { flex: 1.15, minWidth: 320, justifyContent: 'center', gap: 14, padding: 28, backgroundColor: '#F7FAFE' },
  proofMode: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, padding: 19, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE7F0' },
  proofModeIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F1FF' },
  proofModeLabel: { color: '#1D63ED', fontSize: 10, fontWeight: '600', letterSpacing: 0.9 },
  proofModeTitle: { color: '#1A3B5B', fontSize: 17, fontWeight: '600', marginTop: 4 },
  proofModeText: { color: '#657B91', fontSize: 14, lineHeight: 21, marginTop: 6 },
  journeySection: { paddingVertical: 96, backgroundColor: '#F7F9FC', borderTopWidth: 1, borderTopColor: '#E5ECF4' },
  journeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  journeyItem: { flexGrow: 1, flexBasis: 245, minWidth: 220, position: 'relative', padding: 22, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E7EF' },
  journeyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journeyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F1FF' },
  journeyNumber: { color: '#98A9BA', fontSize: 12, fontWeight: '600' },
  journeyTitle: { color: '#1B3C5C', fontSize: 18, fontWeight: '600', marginTop: 18 },
  journeyText: { color: '#687E94', fontSize: 14, lineHeight: 21, marginTop: 7 },
  journeyConnector: { position: 'absolute', right: -15, top: 42, width: 15, height: 2, backgroundColor: '#C5D5E8', zIndex: 2 },
  ctaSection: { paddingVertical: 86, backgroundColor: '#FFFFFF' },
  ctaCard: { minHeight: 270, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 40, padding: 46, borderRadius: 25, overflow: 'hidden' },
  ctaCardStack: { flexDirection: 'column', alignItems: 'flex-start', padding: 30 },
  ctaCopy: { flex: 1, maxWidth: 760 },
  ctaEyebrow: { color: '#CFE2FF', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  ctaTitle: { color: '#FFFFFF', fontSize: 37, lineHeight: 45, fontWeight: '500', letterSpacing: -0.9, marginTop: 11 },
  ctaText: { color: '#D9E8FF', fontSize: 16, lineHeight: 25, marginTop: 10 },
  ctaButton: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 21, borderRadius: 13, backgroundColor: '#FFFFFF' },
  ctaButtonLabel: { color: '#123A69', fontSize: 15, fontWeight: '600' },
  footer: { backgroundColor: '#F7F9FC', borderTopWidth: 1, borderTopColor: '#E1E8F0' },
  footerInner: { minHeight: 165, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 28, paddingVertical: 34 },
  footerBrand: { maxWidth: 430 },
  footerLogo: { width: 28, height: 28, borderRadius: 7 },
  footerName: { color: '#102B4E', fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  footerText: { color: '#6B7F94', fontSize: 13, lineHeight: 20, marginTop: 10 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  footerLink: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 11 },
  footerLinkText: { color: '#536C84', fontSize: 13, fontWeight: '500' },
});
