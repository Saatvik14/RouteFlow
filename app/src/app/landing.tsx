import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { type ComponentProps, useEffect } from 'react';
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
import { IMAGES } from '../constants/theme';
import { openExternalUrl } from '../hooks/open-external-url';

type IconName = ComponentProps<typeof Feather>['name'];

const HERO_IMAGE = require('../../assets/images/landing-delivery-hero.png');

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

  useEffect(() => {
    if (Platform.OS === 'web' && pathname === '/landing') router.replace('/');
  }, [pathname, router]);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={[styles.headerInner, { paddingHorizontal: pagePadding }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="RouteFloww home" onPress={() => router.push('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
            <Image source={IMAGES.LOGO} style={styles.logo} />
            <Text style={styles.brandName}>Route<Text style={styles.brandAccent}>Floww</Text></Text>
          </Pressable>

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <LinearGradient colors={['#F4F8FF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.heroSection}>
          <View style={[styles.content, styles.hero, !desktop && styles.heroStack, { paddingHorizontal: pagePadding }]}>
            <View style={styles.heroCopy}>
              <View style={styles.productPill}>
                <View style={styles.productPillIcon}><Feather name="activity" size={14} color="#1D63ED" /></View>
                <Text style={styles.productPillText}>DELIVERY OPERATIONS, CONNECTED</Text>
              </View>
              <Text style={[styles.heroTitle, !tablet && styles.heroTitleMobile]}>Run every route from one clear workspace.</Text>
              <Text style={styles.heroText}>Plan smarter routes, coordinate drivers, verify deliveries and understand performance—without stitching together separate tools.</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonLabel}>Create your account</Text>
                  <Feather name="arrow-up-right" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                  <Feather name="smartphone" size={18} color="#143A69" />
                  <Text style={styles.outlineButtonLabel}>Get the driver app</Text>
                </Pressable>
              </View>
              <View style={styles.heroAssurances}>
                {['No card to start', 'Built for drivers and teams', 'Proof-ready delivery records'].map((item) => (
                  <View key={item} style={styles.assurance}>
                    <View style={styles.assuranceCheck}><Feather name="check" size={11} color="#FFFFFF" /></View>
                    <Text style={styles.assuranceText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.heroMedia, !desktop && styles.heroMediaStack]}>
              <View style={styles.imageFrame}>
                <Image source={HERO_IMAGE} resizeMode="cover" accessibilityLabel="Courier checking a delivery route beside a loaded van" style={styles.heroImage} />
                <View style={styles.imageShade} />
                <View style={styles.routeStatusCard}>
                  <View style={styles.routeStatusTop}>
                    <View style={styles.liveDot} />
                    <Text style={styles.routeStatusKicker}>LIVE ROUTE</Text>
                    <Text style={styles.routeStatusTime}>09:42</Text>
                  </View>
                  <Text style={styles.routeStatusTitle}>Delivery day in motion</Text>
                  <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
                  <View style={styles.routeStatusMeta}>
                    <Text style={styles.routeStatusMetaText}>18 of 26 stops</Text>
                    <Text style={styles.routeStatusMetaText}>Next ETA 12 min</Text>
                  </View>
                </View>
              </View>
              <View style={styles.mediaSignals}>
                <Signal icon="map-pin" label="Route optimized" tone="blue" />
                <Signal icon="briefcase" label="Driver covered" tone="violet" />
                <Signal icon="shield" label="Proof verified" tone="green" />
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.trustSection}>
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center' },
  header: { zIndex: 20, backgroundColor: 'rgba(255,255,255,0.98)', borderBottomWidth: 1, borderBottomColor: '#E5ECF5' },
  headerInner: { width: '100%', maxWidth: 1240, minHeight: 70, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 31, height: 31, borderRadius: 8 },
  brandName: { color: '#102B4E', fontSize: 21, fontWeight: '600', letterSpacing: -0.6 },
  brandAccent: { color: '#1D63ED' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10 },
  textButtonLabel: { color: '#34506F', fontSize: 14, fontWeight: '500' },
  headerButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 17, borderRadius: 11, backgroundColor: '#1D63ED' },
  headerButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  heroSection: { borderBottomWidth: 1, borderBottomColor: '#DDE8F6' },
  hero: { minHeight: 690, flexDirection: 'row', alignItems: 'center', gap: 58, paddingVertical: 68 },
  heroStack: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 46, paddingVertical: 48 },
  heroCopy: { flex: 0.94, minWidth: 300 },
  productPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D6E3F5' },
  productPillIcon: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E9F1FF' },
  productPillText: { color: '#245A9E', fontSize: 11, fontWeight: '600', letterSpacing: 0.9 },
  heroTitle: { color: '#102B4E', fontSize: 61, lineHeight: 67, fontWeight: '500', letterSpacing: -2.4, marginTop: 24 },
  heroTitleMobile: { fontSize: 42, lineHeight: 48, letterSpacing: -1.45 },
  heroText: { color: '#516B87', fontSize: 18, lineHeight: 29, maxWidth: 610, marginTop: 20 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 30 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 21, borderRadius: 12, backgroundColor: '#1D63ED' },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  outlineButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD9EA' },
  outlineButtonLabel: { color: '#143A69', fontSize: 15, fontWeight: '500' },
  heroAssurances: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  assuranceCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E9B69' },
  assuranceText: { color: '#5D728A', fontSize: 13, lineHeight: 18 },
  heroMedia: { flex: 1.06, minWidth: 390 },
  heroMediaStack: { width: '100%', minWidth: 0, maxWidth: 760, alignSelf: 'center' },
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
