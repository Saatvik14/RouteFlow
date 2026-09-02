import { Feather } from '@expo/vector-icons';
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

const featureGroups: Array<{
  icon: IconName;
  title: string;
  description: string;
  points: string[];
  tone: 'blue' | 'green' | 'sand';
}> = [
  {
    icon: 'map-pin',
    title: 'Build routes your way',
    description: 'Bring delivery work into RouteFloww without rebuilding your process.',
    points: ['Camera, voice, manual, CSV and Excel entry', 'Time windows, priorities and route editing'],
    tone: 'blue',
  },
  {
    icon: 'zap',
    title: 'Plan a smarter day',
    description: 'Turn a long stop list into a clear route that respects real constraints.',
    points: ['AI optimization for up to 500 stops', 'Multi-route planning and assisted assignment'],
    tone: 'sand',
  },
  {
    icon: 'briefcase',
    title: 'Driver Marketplace',
    description: 'Share uncovered work with independent drivers while customer details stay private.',
    points: ['Budget, schedule and bid controls', 'Compare drivers, award work and track decisions'],
    tone: 'green',
  },
  {
    icon: 'radio',
    title: 'Keep delivery live',
    description: 'Give drivers the next action while dispatch sees the whole operation.',
    points: ['Live location, ETA and progress updates', 'Instant route and stop changes'],
    tone: 'blue',
  },
  {
    icon: 'users',
    title: 'Manage the team',
    description: 'Create the right access for admins, dispatchers and fleet drivers.',
    points: ['Invitations, permissions and access codes', 'Direct and reassigned driver work'],
    tone: 'green',
  },
  {
    icon: 'check-circle',
    title: 'Finish with proof',
    description: 'Keep a reliable record of what happened at every stop and route.',
    points: ['Photos, signatures, notes and outcomes', 'Mileage, performance and delivery reports'],
    tone: 'sand',
  },
];

const workflow: Array<{ icon: IconName; number: string; title: string; description: string }> = [
  { icon: 'upload-cloud', number: '01', title: 'Bring in the stops', description: 'Add a few addresses or upload a complete delivery manifest.' },
  { icon: 'shuffle', number: '02', title: 'Plan and cover', description: 'Optimize the route, assign a driver or list it on Driver Marketplace.' },
  { icon: 'navigation', number: '03', title: 'Deliver in sync', description: 'Drivers navigate while live progress and exceptions reach the team.' },
  { icon: 'file-text', number: '04', title: 'Review the day', description: 'See proof, mileage, outcomes and performance in one record.' },
];

const people: Array<{ icon: IconName; title: string; description: string }> = [
  { icon: 'navigation', title: 'Independent drivers', description: 'Create and optimize routes, find marketplace work, navigate, and log each delivery.' },
  { icon: 'truck', title: 'Fleet drivers', description: 'Receive company assignments, follow live updates, and capture proof without extra admin.' },
  { icon: 'briefcase', title: 'Delivery teams', description: 'Plan routes, assign or publish work, monitor the day, manage access, and report results.' },
];

export default function MainLandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const medium = width >= 700;
  const pagePadding = medium ? 32 : 18;

  useEffect(() => {
    if (Platform.OS === 'web' && pathname === '/landing') router.replace('/');
  }, [pathname, router]);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={[styles.headerInner, { paddingHorizontal: pagePadding }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="RouteFloww home" onPress={() => router.push('/')} style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
            <Image source={IMAGES.LOGO} style={styles.brandLogo} />
            <Text style={styles.brandName}>Route<Text style={styles.brandAccent}>Floww</Text></Text>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}>
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}>
              <Text style={styles.headerCtaText}>Get started</Text>
              <Feather name="arrow-right" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.sectionInner, styles.hero, !wide && styles.heroStack, { paddingHorizontal: pagePadding }]}>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrowPill}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>ONE DELIVERY PLATFORM</Text>
              </View>
              <Text style={[styles.heroTitle, !medium && styles.heroTitleMobile]}>Every delivery. One clear flow.</Text>
              <Text style={styles.heroDescription}>Plan routes, find or assign drivers, follow every delivery, and keep the proof—without switching between disconnected tools.</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryButtonText}>Start free</Text>
                  <Feather name="arrow-up-right" size={17} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Feather name="smartphone" size={17} color="#23405F" />
                  <Text style={styles.secondaryButtonText}>Get the driver app</Text>
                </Pressable>
              </View>
              <View style={styles.heroChecks}>
                {['Fast route setup', 'Live team visibility', 'Proof at every stop'].map((label) => (
                  <View key={label} style={styles.heroCheck}>
                    <Feather name="check" size={14} color="#187A5A" />
                    <Text style={styles.heroCheckText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.heroVisual, !wide && styles.heroVisualStack]}>
              <Image accessibilityLabel="Courier preparing deliveries beside a van" source={HERO_IMAGE} resizeMode="cover" style={styles.heroImage} />
              <View style={[styles.imageNote, !medium && styles.imageNoteMobile]}>
                <View style={styles.imageNoteIcon}><Feather name="activity" size={17} color="#2867C7" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.imageNoteLabel}>A calmer delivery day</Text>
                  <Text style={styles.imageNoteText}>Plan, dispatch and proof stay connected.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.flowBarSection}>
          <View style={[styles.sectionInner, styles.flowBar, { paddingHorizontal: pagePadding }]}>
            {['Plan', 'Assign', 'Deliver', 'Review'].map((label, index) => (
              <View key={label} style={styles.flowBarItem}>
                <View style={styles.flowBarNumber}><Text style={styles.flowBarNumberText}>{index + 1}</Text></View>
                <Text style={styles.flowBarText}>{label}</Text>
                {index < 3 ? <Feather name="chevron-right" size={17} color="#A7B3C2" /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.featuresSection}>
          <View style={[styles.sectionInner, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="THE COMPLETE WORKFLOW" title="Everything you need to run the day" description="RouteFloww keeps planning, people, live delivery and records together in one simple system." />
            <View style={styles.featureGrid}>
              {featureGroups.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </View>
          </View>
        </View>

        <View style={styles.marketplaceSection}>
          <View style={[styles.sectionInner, { paddingHorizontal: pagePadding }]}>
            <View style={[styles.marketplacePanel, !wide && styles.marketplacePanelStack]}>
              <View style={styles.marketplaceCopy}>
                <View style={styles.marketplaceIcon}><Feather name="briefcase" size={22} color="#176B51" /></View>
                <Text style={styles.marketplaceEyebrow}>DRIVER MARKETPLACE</Text>
                <Text style={styles.marketplaceTitle}>Cover open routes with confidence.</Text>
                <Text style={styles.marketplaceText}>Businesses publish the schedule, depot and budget. Independent drivers submit bids. Customer stops stay private until the route is awarded.</Text>
              </View>
              <View style={styles.marketplaceSteps}>
                {[
                  ['1', 'List the route', 'Set the work window, route summary and maximum driver cost.'],
                  ['2', 'Compare bids', 'Review price, vehicle details and delivery experience.'],
                  ['3', 'Choose a driver', 'Award the route and unlock the full delivery plan securely.'],
                ].map(([number, title, description]) => (
                  <View key={number} style={styles.marketplaceStep}>
                    <View style={styles.marketplaceStepNumber}><Text style={styles.marketplaceStepNumberText}>{number}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.marketplaceStepTitle}>{title}</Text><Text style={styles.marketplaceStepText}>{description}</Text></View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.peopleSection}>
          <View style={[styles.sectionInner, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="ONE SHARED VIEW" title="Everyone around the route stays in sync" description="Each person gets the tools they need, while the delivery record stays connected from planning to completion." />
            <View style={styles.peopleGrid}>
              {people.map((person) => (
                <View key={person.title} style={styles.personCard}>
                  <View style={styles.personIcon}><Feather name={person.icon} size={19} color="#2867C7" /></View>
                  <Text style={styles.personTitle}>{person.title}</Text>
                  <Text style={styles.personText}>{person.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.workflowSection}>
          <View style={[styles.sectionInner, { paddingHorizontal: pagePadding }]}>
            <SectionHeading eyebrow="HOW IT WORKS" title="From stop list to completed route" description="A simple four-step flow keeps the work visible and moving." />
            <View style={styles.workflowGrid}>
              {workflow.map((step) => (
                <View key={step.number} style={styles.workflowCard}>
                  <View style={styles.workflowTop}>
                    <View style={styles.workflowIcon}><Feather name={step.icon} size={19} color="#2867C7" /></View>
                    <Text style={styles.workflowNumber}>{step.number}</Text>
                  </View>
                  <Text style={styles.workflowTitle}>{step.title}</Text>
                  <Text style={styles.workflowText}>{step.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <View style={[styles.sectionInner, { paddingHorizontal: pagePadding }]}>
            <View style={[styles.ctaCard, !wide && styles.ctaCardStack]}>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaEyebrow}>READY FOR A CLEARER DELIVERY DAY?</Text>
                <Text style={styles.ctaTitle}>Put every route in one flow.</Text>
                <Text style={styles.ctaText}>Create your account and bring planning, drivers, live operations and proof together.</Text>
              </View>
              <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}>
                <Text style={styles.ctaButtonText}>Create an account</Text>
                <Feather name="arrow-right" size={17} color="#23405F" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.sectionInner, styles.footerInner, { paddingHorizontal: pagePadding }]}>
            <View style={styles.footerBrand}>
              <View style={styles.brand}><Image source={IMAGES.LOGO} style={styles.footerLogo} /><Text style={styles.footerName}>Route<Text style={styles.brandAccent}>Floww</Text></Text></View>
              <Text style={styles.footerTagline}>The connected way to plan, dispatch and complete delivery work.</Text>
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

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function FeatureCard({ icon, title, description, points, tone }: typeof featureGroups[number]) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, tone === 'green' && styles.featureIconGreen, tone === 'sand' && styles.featureIconSand]}>
        <Feather name={icon} size={20} color={tone === 'green' ? '#176B51' : tone === 'sand' ? '#93601F' : '#2867C7'} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
      <View style={styles.featurePoints}>
        {points.map((point) => <View key={point} style={styles.featurePoint}><Feather name="check" size={13} color="#187A5A" /><Text style={styles.featurePointText}>{point}</Text></View>)}
      </View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}><Text style={styles.footerLinkText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7F8F5' },
  header: { backgroundColor: 'rgba(255,255,255,0.98)', borderBottomWidth: 1, borderBottomColor: '#E8ECE8', zIndex: 10 },
  headerInner: { width: '100%', maxWidth: 1220, minHeight: 68, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLogo: { width: 30, height: 30, borderRadius: 8 },
  brandName: { color: '#1C3653', fontSize: 21, fontWeight: '600', letterSpacing: -0.5 },
  brandAccent: { color: '#2F76F6' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10 },
  signInText: { color: '#344E68', fontSize: 14, fontWeight: '500' },
  headerCta: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#2F76F6' },
  headerCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  sectionInner: { width: '100%', maxWidth: 1220, alignSelf: 'center' },
  heroSection: { backgroundColor: '#F7F8F5', borderBottomWidth: 1, borderBottomColor: '#E8ECE8' },
  hero: { minHeight: 650, flexDirection: 'row', alignItems: 'center', gap: 58, paddingVertical: 72 },
  heroStack: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 42, paddingVertical: 48 },
  heroCopy: { flex: 0.92, minWidth: 280 },
  eyebrowPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#D7E5FB' },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2F76F6' },
  eyebrowText: { color: '#275FAE', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  heroTitle: { color: '#18324D', fontSize: 58, lineHeight: 64, fontWeight: '500', letterSpacing: -2.3, marginTop: 24 },
  heroTitleMobile: { fontSize: 41, lineHeight: 47, letterSpacing: -1.35 },
  heroDescription: { color: '#536A80', fontSize: 18, lineHeight: 29, fontWeight: '400', maxWidth: 600, marginTop: 21 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 30 },
  primaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 21, borderRadius: 12, backgroundColor: '#2F76F6' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3E9' },
  secondaryButtonText: { color: '#23405F', fontSize: 14, fontWeight: '500' },
  heroChecks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  heroCheck: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroCheckText: { color: '#647789', fontSize: 12, fontWeight: '400' },
  heroVisual: { flex: 1.08, minWidth: 360, height: 500, borderRadius: 26, overflow: 'hidden', backgroundColor: '#E8ECE8', borderWidth: 1, borderColor: '#DCE3DE' },
  heroVisualStack: { width: '100%', minWidth: 0, maxWidth: 760, alignSelf: 'center', height: 430 },
  heroImage: { width: '100%', height: '100%' },
  imageNote: { position: 'absolute', left: 18, right: 18, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: 'rgba(219,227,232,0.94)' },
  imageNoteMobile: { left: 10, right: 10, bottom: 10 },
  imageNoteIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EAF2FF' },
  imageNoteLabel: { color: '#23405F', fontSize: 13, fontWeight: '600' },
  imageNoteText: { color: '#66798B', fontSize: 11, lineHeight: 16, marginTop: 2 },
  flowBarSection: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8ECE8' },
  flowBar: { minHeight: 84, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 18 },
  flowBarItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flowBarNumber: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#EEF3F7' },
  flowBarNumberText: { color: '#43617B', fontSize: 10, fontWeight: '600' },
  flowBarText: { color: '#3F5870', fontSize: 13, fontWeight: '500' },
  featuresSection: { backgroundColor: '#FFFFFF', paddingVertical: 90 },
  sectionHeading: { maxWidth: 690, marginBottom: 40 },
  sectionEyebrow: { color: '#2C69C4', fontSize: 10, fontWeight: '600', letterSpacing: 1.2 },
  sectionTitle: { color: '#1B3652', fontSize: 37, lineHeight: 44, fontWeight: '500', letterSpacing: -1.05, marginTop: 11 },
  sectionDescription: { color: '#647789', fontSize: 16, lineHeight: 26, marginTop: 12 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featureCard: { flexGrow: 1, flexBasis: 340, minWidth: 270, padding: 24, borderRadius: 18, backgroundColor: '#FBFCFD', borderWidth: 1, borderColor: '#E3E8EC' },
  featureIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#EAF2FF' },
  featureIconGreen: { backgroundColor: '#E8F5EF' },
  featureIconSand: { backgroundColor: '#F7F0E4' },
  featureTitle: { color: '#23405F', fontSize: 18, fontWeight: '600', marginTop: 18 },
  featureDescription: { color: '#66798B', fontSize: 13, lineHeight: 20, marginTop: 7 },
  featurePoints: { gap: 8, marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E8ECEF' },
  featurePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featurePointText: { flex: 1, color: '#4F6579', fontSize: 12, lineHeight: 18 },
  marketplaceSection: { backgroundColor: '#F7F8F5', paddingVertical: 88, borderTopWidth: 1, borderTopColor: '#E8ECE8', borderBottomWidth: 1, borderBottomColor: '#E8ECE8' },
  marketplacePanel: { flexDirection: 'row', gap: 56, padding: 46, borderRadius: 24, backgroundColor: '#EDF6F1', borderWidth: 1, borderColor: '#D7E8DF' },
  marketplacePanelStack: { flexDirection: 'column', gap: 34, padding: 26 },
  marketplaceCopy: { flex: 0.95, minWidth: 260 },
  marketplaceIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#DCEEE5' },
  marketplaceEyebrow: { color: '#176B51', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginTop: 20 },
  marketplaceTitle: { color: '#1E4639', fontSize: 34, lineHeight: 41, fontWeight: '500', letterSpacing: -0.8, marginTop: 10 },
  marketplaceText: { color: '#537064', fontSize: 15, lineHeight: 25, marginTop: 13 },
  marketplaceSteps: { flex: 1.05, minWidth: 280, gap: 11 },
  marketplaceStep: { flexDirection: 'row', gap: 14, padding: 17, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: '#DCE9E2' },
  marketplaceStepNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#DCEEE5' },
  marketplaceStepNumberText: { color: '#176B51', fontSize: 11, fontWeight: '600' },
  marketplaceStepTitle: { color: '#244B3E', fontSize: 14, fontWeight: '600' },
  marketplaceStepText: { color: '#617A70', fontSize: 12, lineHeight: 18, marginTop: 3 },
  peopleSection: { backgroundColor: '#FFFFFF', paddingVertical: 90 },
  peopleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  personCard: { flexGrow: 1, flexBasis: 300, minWidth: 250, padding: 23, borderRadius: 17, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E3E8EC' },
  personIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EAF2FF' },
  personTitle: { color: '#23405F', fontSize: 16, fontWeight: '600', marginTop: 16 },
  personText: { color: '#647789', fontSize: 13, lineHeight: 21, marginTop: 7 },
  workflowSection: { backgroundColor: '#F7F8F5', paddingVertical: 90, borderTopWidth: 1, borderTopColor: '#E8ECE8' },
  workflowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  workflowCard: { flexGrow: 1, flexBasis: 235, minWidth: 215, padding: 22, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E7E4' },
  workflowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workflowIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EAF2FF' },
  workflowNumber: { color: '#A4B0B9', fontSize: 12, fontWeight: '500' },
  workflowTitle: { color: '#23405F', fontSize: 16, fontWeight: '600', marginTop: 19 },
  workflowText: { color: '#647789', fontSize: 12, lineHeight: 19, marginTop: 7 },
  ctaSection: { backgroundColor: '#F7F8F5', paddingBottom: 90 },
  ctaCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 36, padding: 44, borderRadius: 23, backgroundColor: '#EAF2FF', borderWidth: 1, borderColor: '#D7E5FB' },
  ctaCardStack: { flexDirection: 'column', alignItems: 'flex-start', padding: 28 },
  ctaCopy: { flex: 1, maxWidth: 730 },
  ctaEyebrow: { color: '#2867C7', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  ctaTitle: { color: '#1C3D63', fontSize: 32, lineHeight: 39, fontWeight: '500', letterSpacing: -0.7, marginTop: 9 },
  ctaText: { color: '#5C7289', fontSize: 14, lineHeight: 22, marginTop: 8 },
  ctaButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8DAF5' },
  ctaButtonText: { color: '#23405F', fontSize: 14, fontWeight: '600' },
  footer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E6EAE7' },
  footerInner: { minHeight: 150, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 28, paddingVertical: 32 },
  footerBrand: { maxWidth: 420 },
  footerLogo: { width: 27, height: 27, borderRadius: 7 },
  footerName: { color: '#1C3653', fontSize: 19, fontWeight: '600', letterSpacing: -0.4 },
  footerTagline: { color: '#758595', fontSize: 12, lineHeight: 18, marginTop: 9 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  footerLink: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11 },
  footerLinkText: { color: '#536A80', fontSize: 12, fontWeight: '500' },
});
