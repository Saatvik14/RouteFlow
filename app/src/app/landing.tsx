import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { IMAGES } from '../constants/theme';
import { LEGAL_URLS } from '../constants/legal';
import { openExternalUrl } from '../hooks/open-external-url';

export default function MainLandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const isMedium = width >= 640;

  // Clean URL if accessed directly via /landing on web
  useEffect(() => {
    if (Platform.OS === 'web' && pathname === '/landing') {
      router.replace('/');
    }
  }, [pathname, router]);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do Independent Drivers use RouteFloww?',
      a: 'Independent drivers download our Android mobile app from Google Play. You can scan package labels with your camera, add stops by voice, optimize multi-stop routes with AI, and get turn-by-turn GPS navigation—helping you finish your deliveries up to 30% faster.',
    },
    {
      q: 'How do Fleet Drivers sign in without passwords?',
      a: 'Fleet drivers do not need complicated passwords. Your company Business Admin generates a private, secure access code (e.g. RF-XXXX-XXXX) from the dispatch portal. Simply enter this code into the RouteFloww mobile app to instantly load your assigned daily route.',
    },
    {
      q: 'Can Business Admins manage and dispatch to multiple drivers at once?',
      a: 'Yes! Business Admins have full access to our web-based Dispatcher Dashboard. You can upload large CSV delivery manifests, auto-split routes across your fleet, track driver locations live with 5-second polling, and review electronic proof of delivery in real time.',
    },
    {
      q: 'What platforms are supported?',
      a: 'Business Admins access the full Dispatcher Dashboard, Team Management, and Reports directly on modern desktop web browsers. Drivers operate on our dedicated Android mobile app available on Google Play.',
    },
    {
      q: 'How does real-time synchronization work between dispatchers and drivers?',
      a: 'RouteFloww features built-in 5-second background auto-polling. When a dispatcher adds, cancels, or re-orders stops from their desk, the driver’s phone updates within seconds—and completed deliveries with photo proof show up immediately on the dispatch board.',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerInner}>
          <Pressable style={styles.logoRow} onPress={() => router.push('/')}>
            <Image source={IMAGES.LOGO} style={styles.logoImage} />
            <Text style={styles.logoText}>
              Route<Text style={{ color: '#2563EB' }}>Floww</Text>
            </Text>
          </Pressable>

          <View style={styles.headerRight}>
            <Pressable
              style={styles.signupBtn}
              onPress={() => router.push('/dispatch')}
            >
              <Text style={styles.signupBtnText}>Explore Business Admin</Text>
              <Feather name="arrow-right" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Hero Header */}
        <View style={styles.heroHeader}>
          <View style={styles.heroBadge}>
            <Feather name="zap" size={13} color="#2563EB" />
            <Text style={styles.heroBadgeText}>SMART LAST-MILE LOGISTICS</Text>
          </View>

          <Text style={styles.mainTitle}>
            Last mile delivery tools — for Independent Drivers, Fleet Drivers, and Business Admins.
          </Text>

          <Text style={styles.mainSubtitle}>
            Specialized route optimization, fleet dispatching, and delivery tools tailored to your exact workflow. Click Explore on any role to see full details.
          </Text>
        </View>

        {/* 3 Solution Cards Grid */}
        <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
          {/* Card 1: Independent Driver */}
          <View style={[styles.optionCard, styles.optionCardBlue]}>
            {/* Card Header with Icon, Tag & Title */}
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderTop}>
                <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="navigation" size={20} color="#2563EB" />
                </View>
                <View style={[styles.roleTagPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.roleTagText, { color: '#2563EB' }]}>SOLO & GIG COURIERS</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Independent Driver</Text>
              <Text style={styles.cardTagline}>
                Scan manifests, optimize up to 500 stops with AI, and finish deliveries up to 30% faster.
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.cardButtonRow}>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => router.push('/driver-showcase?type=independent')}
              >
                <Text style={styles.primaryActionBtnText}>Explore</Text>
                <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </Pressable>
              <Pressable
                style={styles.playStoreBtn}
                onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
              >
                <Feather name="play" size={12} color="#15803D" style={{ marginRight: 5 }} />
                <Text style={styles.playStoreBtnText}>Google Play</Text>
              </Pressable>
            </View>

            {/* Core Capabilities Checklist */}
            <View style={styles.capabilitiesList}>
              <Text style={styles.capabilitiesHeading}>WHAT WE OFFER YOU</Text>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#2563EB" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>AI Camera Scanner</Text> — Manifests & package labels
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#2563EB" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Voice Stop Input</Text> — Hands-free speech to text
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#2563EB" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>500-Stop AI Routing</Text> — Time windows & priorities
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#2563EB" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Turn-by-Turn GPS</Text> — Navigation & mileage tax logs
                </Text>
              </View>
            </View>

            {/* Mock Visual Graphic */}
            <View style={styles.mockGraphicContainer}>
              <View style={styles.driverMockApp}>
                <View style={styles.mockMapPinHeader}>
                  <Text style={styles.mockTime}>12:41 PM</Text>
                  <View style={styles.mockPill}>
                    <Feather name="navigation" size={10} color="#2563EB" />
                    <Text style={styles.mockPillText}>Next: Stop 43 (2.1 mi)</Text>
                  </View>
                </View>
                <View style={styles.mockRouteBox}>
                  <View style={styles.mockStopBadge}><Text style={styles.mockStopText}>50 ↑</Text></View>
                  <View style={[styles.mockStopBadge, { backgroundColor: '#2563EB' }]}><Text style={[styles.mockStopText, { color: '#FFF' }]}>43</Text></View>
                  <View style={styles.mockStopBadge}><Text style={styles.mockStopText}>51</Text></View>
                  <View style={styles.mockStopBadge}><Text style={styles.mockStopText}>52</Text></View>
                </View>
              </View>
            </View>
          </View>

          {/* Card 2: Fleet Driver */}
          <View style={[styles.optionCard, styles.optionCardGreen]}>
            {/* Card Header with Icon, Tag & Title */}
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderTop}>
                <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Feather name="truck" size={20} color="#16A34A" />
                </View>
                <View style={[styles.roleTagPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={[styles.roleTagText, { color: '#16A34A' }]}>COMPANY FLEET DRIVERS</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Fleet Driver</Text>
              <Text style={styles.cardTagline}>
                Sign in with access codes, receive assigned routes, and sync live with your dispatchers.
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.cardButtonRow}>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => router.push('/driver-showcase?type=fleet')}
              >
                <Text style={styles.primaryActionBtnText}>Explore</Text>
                <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </Pressable>
              <Pressable
                style={styles.playStoreBtn}
                onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
              >
                <Feather name="play" size={12} color="#15803D" style={{ marginRight: 5 }} />
                <Text style={styles.playStoreBtnText}>Google Play</Text>
              </Pressable>
            </View>

            {/* Core Capabilities Checklist */}
            <View style={styles.capabilitiesList}>
              <Text style={[styles.capabilitiesHeading, { color: '#15803D' }]}>WHAT WE OFFER YOU</Text>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#16A34A" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Access Code Sign-In</Text> — Instant login via RF-XXXX code
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#16A34A" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>5s Real-Time Sync</Text> — Live route updates from office
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#16A34A" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Proof of Delivery (POD)</Text> — Signatures & photo proof
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#16A34A" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>One-Tap Stop Statuses</Text> — Fast Delivered / Failed reports
                </Text>
              </View>
            </View>

            {/* Mock Visual Graphic */}
            <View style={styles.mockGraphicContainer}>
              <View style={styles.fleetMockApp}>
                <View style={styles.fleetMockHeader}>
                  <Text style={styles.fleetMockTitle}>Assigned Route #108</Text>
                  <Text style={styles.fleetMockSub}>Access Code: RF-2026-FLT</Text>
                </View>
                <View style={styles.fleetMockItem}>
                  <Feather name="check-circle" size={15} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fleetItemTitle}>Stop 1: 45 Park Road</Text>
                    <Text style={styles.fleetItemSub}>Delivered · Proof uploaded</Text>
                  </View>
                </View>
                <View style={styles.fleetMockItem}>
                  <Feather name="clock" size={15} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fleetItemTitle}>Stop 2: 12 High Street</Text>
                    <Text style={styles.fleetItemSub}>Next delivery · ETA 10:15 AM</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Card 3: Business Admin */}
          <View style={[styles.optionCard, styles.optionCardAmber]}>
            {/* Card Header with Icon, Tag & Title */}
            <View style={styles.cardHeaderBox}>
              <View style={styles.cardHeaderTop}>
                <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="briefcase" size={20} color="#D97706" />
                </View>
                <View style={[styles.roleTagPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Text style={[styles.roleTagText, { color: '#D97706' }]}>MANAGERS & DISPATCHERS</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Business Admin</Text>
              <Text style={styles.cardTagline}>
                Desktop dispatch center to auto-split routes, track drivers live, and manage your fleet.
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.cardButtonRow}>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => router.push('/dispatch')}
              >
                <Text style={styles.primaryActionBtnText}>Explore</Text>
                <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </Pressable>
              <Pressable
                style={styles.outlineActionBtn}
                onPress={() => router.push('/login')}
              >
                <Feather name="log-in" size={13} color="#0F172A" style={{ marginRight: 5 }} />
                <Text style={styles.outlineActionBtnText}>Sign In</Text>
              </Pressable>
            </View>

            {/* Core Capabilities Checklist */}
            <View style={styles.capabilitiesList}>
              <Text style={[styles.capabilitiesHeading, { color: '#B45309' }]}>WHAT WE OFFER YOU</Text>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#D97706" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Desktop Dispatch Board</Text> — Live map & fleet progress
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#D97706" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Auto-Split CSV Routes</Text> — Multi-vehicle route dispatch
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#D97706" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>5s Live Driver Tracking</Text> — Real-time GPS & live ETAs
                </Text>
              </View>
              <View style={styles.capabilityRow}>
                <Feather name="check" size={15} color="#D97706" style={styles.checkIcon} />
                <Text style={styles.capabilityText}>
                  <Text style={styles.capBold}>Team Management</Text> — Driver access codes & reports
                </Text>
              </View>
            </View>

            {/* Mock Visual Graphic */}
            <View style={styles.mockGraphicContainer}>
              <View style={styles.dispatchMockApp}>
                <View style={styles.dispatchHeader}>
                  <Text style={styles.dispatchTitle}>Dispatch Board</Text>
                  <Text style={styles.dispatchBadge}>Live Syncing (5s)</Text>
                </View>
                <View style={styles.dispatchRow}>
                  <View style={styles.avatarMini}><Text style={styles.avatarMiniText}>AD</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dispatchDriverName}>Arturo D. (Driver)</Text>
                    <Text style={styles.dispatchStats}>33/42 stops finished</Text>
                  </View>
                  <View style={styles.progressPill}><Text style={styles.progressText}>78%</Text></View>
                </View>
                <View style={styles.dispatchRow}>
                  <View style={[styles.avatarMini, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.avatarMiniText, { color: '#16A34A' }]}>EH</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dispatchDriverName}>Esther H. (Driver)</Text>
                    <Text style={styles.dispatchStats}>30/30 stops finished</Text>
                  </View>
                  <View style={[styles.progressPill, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.progressText, { color: '#15803D' }]}>100%</Text></View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 1: Metrics & Impact Bar */}
        <View style={styles.metricsContainer}>
          <View style={[styles.metricsGrid, isMedium && styles.metricsGridMedium]}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>40%</Text>
              <Text style={styles.metricLabel}>Fuel & Time Saved</Text>
              <Text style={styles.metricDesc}>AI route re-sequencing avoids heavy traffic and backtracking</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>5s</Text>
              <Text style={styles.metricLabel}>Real-Time Live Sync</Text>
              <Text style={styles.metricDesc}>Automatic background polling keeps dispatchers and drivers in sync</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>500+</Text>
              <Text style={styles.metricLabel}>Stops per Route</Text>
              <Text style={styles.metricDesc}>Optimized seamlessly with package priorities and time windows</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>99.4%</Text>
              <Text style={styles.metricLabel}>On-Time Deliveries</Text>
              <Text style={styles.metricDesc}>Accurate dynamic ETAs and turn-by-turn in-app guidance</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: How It Works */}
        <View style={styles.sectionShell}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Feather name="layers" size={13} color="#2563EB" />
              <Text style={styles.sectionBadgeText}>SIMPLE WORKFLOW</Text>
            </View>
            <Text style={styles.sectionTitle}>How RouteFloww Powers Your Last Mile</Text>
            <Text style={styles.sectionSubtitle}>
              From stop input to final proof of delivery, our platform automates every step of your dispatch operation.
            </Text>
          </View>

          <View style={[styles.stepsGrid, isWide && styles.stepsGridWide]}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>01</Text>
              </View>
              <View style={[styles.stepIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="upload-cloud" size={24} color="#2563EB" />
              </View>
              <Text style={styles.stepTitle}>Import & Scan Stops</Text>
              <Text style={styles.stepDesc}>
                Snap photos of package labels using the camera scanner, speak addresses aloud, or upload spreadsheet manifests (CSV/Excel) in one click.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>02</Text>
              </View>
              <View style={[styles.stepIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="cpu" size={24} color="#16A34A" />
              </View>
              <Text style={styles.stepTitle}>AI Route Optimization</Text>
              <Text style={styles.stepDesc}>
                Our routing engine computes the fastest driving paths, accounting for departure times, delivery time windows, stop priorities, and vehicle capacities.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>03</Text>
              </View>
              <View style={[styles.stepIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="check-circle" size={24} color="#D97706" />
              </View>
              <Text style={styles.stepTitle}>Dispatch & Deliver</Text>
              <Text style={styles.stepDesc}>
                Dispatchers track progress live on desktop while drivers navigate turn-by-turn on mobile, collecting electronic signatures and photo proof of delivery.
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: Deep Feature Matrix by Role */}
        <View style={styles.roleMatrixSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Feather name="check-square" size={13} color="#2563EB" />
              <Text style={styles.sectionBadgeText}>ROLE CAPABILITIES</Text>
            </View>
            <Text style={styles.sectionTitle}>Engineered for Every Team Member</Text>
            <Text style={styles.sectionSubtitle}>
              Whether driving solo, running with a company fleet, or managing a courier enterprise, RouteFloww delivers purpose-built tools.
            </Text>
          </View>

          <View style={[styles.matrixGrid, isWide && styles.matrixGridWide]}>
            {/* Column 1: Independent Driver */}
            <View style={styles.matrixCard}>
              <View style={styles.matrixHeader}>
                <View style={[styles.matrixIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="user" size={20} color="#2563EB" />
                </View>
                <Text style={styles.matrixRoleTitle}>Independent Driver</Text>
                <Text style={styles.matrixRoleBadge}>Android Mobile App</Text>
              </View>
              <View style={styles.matrixList}>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>AI Camera Package & Manifest Scanner</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Voice address input for hands-free stops</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Multi-stop route optimization (up to 500 stops)</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Integrated in-app turn-by-turn navigation</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Route history & tax mileage export logs</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Pressable
                  style={[styles.matrixCtaBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => router.push('/driver-showcase?type=independent')}
                >
                  <Text style={styles.matrixCtaText}>Explore Independent Driver</Text>
                  <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </Pressable>
                <Pressable
                  style={[styles.matrixCtaBtn, { backgroundColor: '#16A34A' }]}
                  onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                >
                  <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.matrixCtaText}>Get on Google Play</Text>
                </Pressable>
              </View>
            </View>

            {/* Column 2: Fleet Driver */}
            <View style={styles.matrixCard}>
              <View style={styles.matrixHeader}>
                <View style={[styles.matrixIconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <Feather name="truck" size={20} color="#16A34A" />
                </View>
                <Text style={styles.matrixRoleTitle}>Fleet Driver</Text>
                <Text style={[styles.matrixRoleBadge, { backgroundColor: '#DCFCE7', color: '#15803D' }]}>Android Mobile App</Text>
              </View>
              <View style={styles.matrixList}>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Instant Business Access Code sign-in (`RF-XXXX`)</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Assigned route execution from your company</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>5-second real-time dispatcher sync</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Digital Proof of Delivery (photos & signatures)</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>One-tap status updates (Delivered / Failed)</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Pressable
                  style={[styles.matrixCtaBtn, { backgroundColor: '#16A34A' }]}
                  onPress={() => router.push('/driver-showcase?type=fleet')}
                >
                  <Text style={styles.matrixCtaText}>Explore Fleet Driver</Text>
                  <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </Pressable>
                <Pressable
                  style={[styles.matrixCtaBtn, { backgroundColor: '#15803D' }]}
                  onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
                >
                  <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.matrixCtaText}>Get on Google Play</Text>
                </Pressable>
              </View>
            </View>

            {/* Column 3: Business Admin */}
            <View style={[styles.matrixCard, styles.matrixCardFeatured]}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>DESKTOP WEB CONTROL</Text>
              </View>
              <View style={styles.matrixHeader}>
                <View style={[styles.matrixIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="briefcase" size={20} color="#D97706" />
                </View>
                <Text style={styles.matrixRoleTitle}>Business Admin</Text>
                <Text style={[styles.matrixRoleBadge, { backgroundColor: '#DBEAFE', color: '#1D4ED8' }]}>Web Platform</Text>
              </View>
              <View style={styles.matrixList}>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Live Dispatcher Dashboard with interactive map</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Driver management, invitations & access codes</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Automated multi-vehicle route assignment</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>5-second live driver tracking & ETA monitoring</Text>
                </View>
                <View style={styles.matrixItem}>
                  <Feather name="check" size={16} color="#16A34A" />
                  <Text style={styles.matrixItemText}>Proof of delivery verification & billing reports</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Pressable
                  style={[styles.matrixCtaBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => router.push('/dispatch')}
                >
                  <Text style={styles.matrixCtaText}>Explore Business Admin</Text>
                  <Feather name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 4: Platform Highlights (6 Features) */}
        <View style={styles.sectionShell}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Feather name="shield" size={13} color="#2563EB" />
              <Text style={styles.sectionBadgeText}>POWERFUL CAPABILITIES</Text>
            </View>
            <Text style={styles.sectionTitle}>Everything You Need for Effortless Deliveries</Text>
            <Text style={styles.sectionSubtitle}>
              Built with cutting-edge technology to give courier companies, dispatchers, and drivers a competitive edge.
            </Text>
          </View>

          <View style={[styles.featuresGrid, isWide && styles.featuresGridWide]}>
            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="camera" size={22} color="#2563EB" />
              </View>
              <Text style={styles.featureTitle}>AI Optical Manifest Scanner</Text>
              <Text style={styles.featureDesc}>
                Turn paper bills of lading, shipping labels, and typed manifests into organized route stops within seconds using your smartphone camera.
              </Text>
            </View>

            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="refresh-cw" size={22} color="#16A34A" />
              </View>
              <Text style={styles.featureTitle}>5-Second Bi-Directional Sync</Text>
              <Text style={styles.featureDesc}>
                Add urgent customer deliveries, change stop sequences, or reassign routes on desktop—changes reflect immediately on the driver's phone.
              </Text>
            </View>

            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="file-text" size={22} color="#D97706" />
              </View>
              <Text style={styles.featureTitle}>Electronic Proof of Delivery</Text>
              <Text style={styles.featureDesc}>
                Capture recipient signatures, photo proofs of parcel drop-offs, and custom driver notes stored securely with GPS geotags and timestamps.
              </Text>
            </View>

            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="users" size={22} color="#9333EA" />
              </View>
              <Text style={styles.featureTitle}>Driver & Team Management</Text>
              <Text style={styles.featureDesc}>
                Invite drivers to your company fleet, set vehicle types, generate temporary or permanent access codes, and monitor driver activity.
              </Text>
            </View>

            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="map" size={22} color="#DC2626" />
              </View>
              <Text style={styles.featureTitle}>Interactive In-App Navigation</Text>
              <Text style={styles.featureDesc}>
                Never miss a turn with road-aware path overlays, live traffic rerouting, hands-free voice directions, and one-tap external map launch.
              </Text>
            </View>

            <View style={styles.featureBox}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Feather name="bar-chart-2" size={22} color="#0284C7" />
              </View>
              <Text style={styles.featureTitle}>Analytics & Exportable Reports</Text>
              <Text style={styles.featureDesc}>
                Track company fleet KPIs including on-time delivery rates, average duration per stop, total mileage driven, and export detailed CSV reports.
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 5: Customer Testimonials */}
        <View style={styles.testimonialsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Feather name="star" size={13} color="#2563EB" />
              <Text style={styles.sectionBadgeText}>CUSTOMER SUCCESS</Text>
            </View>
            <Text style={styles.sectionTitle}>Trusted by Courier Companies & Drivers</Text>
            <Text style={styles.sectionSubtitle}>
              Hear how delivery professionals are cutting drive times and scaling operations with RouteFloww.
            </Text>
          </View>

          <View style={[styles.testimonialsGrid, isWide && styles.testimonialsGridWide]}>
            <View style={styles.testimonialCard}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Feather key={s} name="star" size={16} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.quoteText}>
                "RouteFloww cut our morning dispatch routine from 2 hours to just 10 minutes. Our 14 drivers love the access code login and finish an hour earlier every single day."
              </Text>
              <View style={styles.authorRow}>
                <View style={[styles.authorAvatar, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={styles.authorAvatarText}>MK</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>Marcus Klein</Text>
                  <Text style={styles.authorRole}>Operations Director, Metro Express Couriers</Text>
                </View>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Feather key={s} name="star" size={16} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.quoteText}>
                "The camera label scanner is a lifesaver. I scan 80 parcels every morning in my van, hit optimize, and RouteFloww builds the most efficient sequence. Fuel savings are huge."
              </Text>
              <View style={styles.authorRow}>
                <View style={[styles.authorAvatar, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.authorAvatarText, { color: '#16A34A' }]}>SR</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>Samantha Reed</Text>
                  <Text style={styles.authorRole}>Independent Courier Contractor</Text>
                </View>
              </View>
            </View>

            <View style={styles.testimonialCard}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Feather key={s} name="star" size={16} color="#F59E0B" />
                ))}
              </View>
              <Text style={styles.quoteText}>
                "Live driver tracking and photo proof of delivery eliminated 90% of our customer 'where is my package' calls. The web dashboard gives our office full control."
              </Text>
              <View style={styles.authorRow}>
                <View style={[styles.authorAvatar, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.authorAvatarText, { color: '#D97706' }]}>DV</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>David Vance</Text>
                  <Text style={styles.authorRole}>Fleet Manager, Apex Logistics</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 6: Frequently Asked Questions */}
        <View style={styles.sectionShell}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Feather name="help-circle" size={13} color="#2563EB" />
              <Text style={styles.sectionBadgeText}>COMMON QUESTIONS</Text>
            </View>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <Text style={styles.sectionSubtitle}>
              Have questions about RouteFloww? Here are answers to our most common inquiries.
            </Text>
          </View>

          <View style={styles.faqList}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Pressable
                  key={idx}
                  style={[styles.faqItem, isOpen && styles.faqItemOpen]}
                  onPress={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Feather
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#64748B"
                    />
                  </View>
                  {isOpen ? (
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SECTION 7: Final Dual CTA */}
        <View style={styles.dualCtaContainer}>
          <View style={[styles.dualCtaGrid, isWide && styles.dualCtaGridWide]}>
            {/* Left Box: Business Admin */}
            <View style={styles.ctaCardAdmin}>
              <View style={styles.ctaBadgeWrap}>
                <Feather name="briefcase" size={14} color="#2563EB" />
                <Text style={styles.ctaBadgeText}>FOR BUSINESSES & COURIERS</Text>
              </View>
              <Text style={styles.ctaCardTitle}>Ready to modernize your fleet dispatch?</Text>
              <Text style={styles.ctaCardDesc}>
                Access the web Dispatcher Dashboard, organize multi-driver routes, and manage your entire team seamlessly from your desktop.
              </Text>
              <Pressable
                style={styles.ctaAdminBtn}
                onPress={() => router.push('/dispatch')}
              >
                <Text style={styles.ctaAdminBtnText}>Explore Business Admin Portal</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </Pressable>
              <Text style={styles.ctaCardHint}>Free 7-day trial · No credit card required</Text>
            </View>

            {/* Right Box: Drivers */}
            <View style={styles.ctaCardDriver}>
              <View style={[styles.ctaBadgeWrap, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Feather name="smartphone" size={14} color="#16A34A" />
                <Text style={[styles.ctaBadgeText, { color: '#16A34A' }]}>FOR DELIVERY DRIVERS</Text>
              </View>
              <Text style={styles.ctaCardTitle}>Download RouteFloww on Google Play</Text>
              <Text style={styles.ctaCardDesc}>
                Scan manifests, sequence delivery stops, navigate with live GPS, and finish your daily shift faster than ever before.
              </Text>
              <Pressable
                style={styles.ctaDriverBtn}
                onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
              >
                <Feather name="download" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.ctaDriverBtnText}>Get Android App on Play Store</Text>
              </Pressable>
              <Text style={styles.ctaCardHint}>Free download for Android devices</Text>
            </View>
          </View>
        </View>

        {/* SECTION 8: Rich Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerInner, isWide && styles.footerInnerWide]}>
            <View style={styles.footerBrandCol}>
              <View style={styles.logoRow}>
                <Image source={IMAGES.LOGO} style={styles.logoImage} />
                <Text style={styles.logoText}>
                  Route<Text style={{ color: '#2563EB' }}>Floww</Text>
                </Text>
              </View>
              <Text style={styles.footerTagline}>
                Smart last-mile logistics and route optimization tools for modern couriers, delivery drivers, and fleet dispatchers.
              </Text>
              <Pressable
                style={styles.footerPlayBadge}
                onPress={() => openExternalUrl(LEGAL_URLS.PLAY_STORE_APP)}
              >
                <Feather name="play" size={14} color="#FFFFFF" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.playBadgeSmall}>GET IT ON</Text>
                  <Text style={styles.playBadgeLarge}>Google Play</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.footerLinksGrid}>
              <View style={styles.footerCol}>
                <Text style={styles.footerColHeader}>SOLUTIONS</Text>
                <Pressable onPress={() => router.push('/dispatch')}>
                  <Text style={styles.footerLink}>Business Admin</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/driver-showcase?type=independent')}>
                  <Text style={styles.footerLink}>Independent Driver</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/driver-showcase?type=fleet')}>
                  <Text style={styles.footerLink}>Fleet Driver App</Text>
                </Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColHeader}>PORTALS</Text>
                <Pressable onPress={() => router.push('/dispatch')}>
                  <Text style={styles.footerLink}>Dispatcher Dashboard</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Business Admin Login</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/signup', params: { role: 'BUSINESS_OWNER' } })}>
                  <Text style={styles.footerLink}>Business Sign Up</Text>
                </Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColHeader}>LEGAL & POLICIES</Text>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)}>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.ACCOUNT_DELETION)}>
                  <Text style={styles.footerLink}>Delete Account</Text>
                </Pressable>
                <Pressable onPress={() => openExternalUrl(LEGAL_URLS.PRIVACY_POLICY)}>
                  <Text style={styles.footerLink}>Terms of Service</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerBottomText}>
              © {new Date().getFullYear()} RouteFloww Logistics. All rights reserved. Driver accounts require Android mobile app. Business Admin features supported on desktop web.
            </Text>
          </View>
        </View>
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
    maxWidth: 1280,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signupBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 0,
  },
  heroHeader: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  mainSubtitle: {
    fontSize: 17,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 720,
  },
  cardGrid: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 24,
    marginBottom: 56,
  },
  cardGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  optionCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  optionCardBlue: {
    borderColor: '#DBEAFE',
  },
  optionCardGreen: {
    borderColor: '#DCFCE7',
  },
  optionCardAmber: {
    borderColor: '#FEF3C7',
  },
  cardHeaderBox: {
    minHeight: 124,
    marginBottom: 16,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTagPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardTagline: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
    minHeight: 40,
  },
  cardButtonRow: {
    flexDirection: 'row',
    gap: 10,
    height: 42,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flex: 1.2,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playStoreBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playStoreBtnText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  outlineActionBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineActionBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  capabilitiesList: {
    minHeight: 180,
    gap: 8,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  capabilitiesHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 34,
  },
  checkIcon: {
    marginTop: 2,
  },
  capabilityText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  capBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  mockGraphicContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    height: 180,
    justifyContent: 'center',
  },
  driverMockApp: {
    gap: 12,
  },
  mockMapPinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  mockPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  mockRouteBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  mockStopBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  mockStopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  fleetMockApp: {
    gap: 10,
  },
  fleetMockHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  fleetMockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  fleetMockSub: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  fleetMockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  fleetItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  fleetItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  dispatchMockApp: {
    gap: 10,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  dispatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dispatchBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dispatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  dispatchDriverName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dispatchStats: {
    fontSize: 11,
    color: '#64748B',
  },
  progressPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  // METRICS BAR STYLES
  metricsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginBottom: 50,
  },
  metricsGrid: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    gap: 28,
  },
  metricsGridMedium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    minWidth: 220,
    alignItems: 'center',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: -1,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },

  // GENERIC SECTION STYLES
  sectionShell: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 40,
    maxWidth: 800,
    alignSelf: 'center',
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },

  // HOW IT WORKS STEPS
  stepsGrid: {
    gap: 24,
  },
  stepsGridWide: {
    flexDirection: 'row',
  },
  stepCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  stepNumberBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  stepDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // ROLE MATRIX
  roleMatrixSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  matrixGrid: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  matrixGridWide: {
    flexDirection: 'row',
  },
  matrixCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    justifyContent: 'space-between',
  },
  matrixCardFeatured: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 2,
    position: 'relative',
  },
  featuredBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matrixHeader: {
    marginBottom: 20,
  },
  matrixIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  matrixRoleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  matrixRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matrixList: {
    gap: 12,
    marginBottom: 28,
  },
  matrixItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  matrixItemText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontWeight: '500',
  },
  matrixCtaBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // 6 FEATURES GRID
  featuresGrid: {
    gap: 24,
  },
  featuresGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    flex: 1,
    minWidth: 320,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  featureIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // TESTIMONIALS
  testimonialsSection: {
    backgroundColor: '#0F172A',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  testimonialsGrid: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  testimonialsGridWide: {
    flexDirection: 'row',
  },
  testimonialCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 28,
    justifyContent: 'space-between',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 15,
    color: '#F1F5F9',
    lineHeight: 24,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorRole: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // FAQ LIST
  faqList: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  faqItemOpen: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  faqAnswer: {
    marginTop: 14,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // DUAL CTA SECTION
  dualCtaContainer: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  dualCtaGrid: {
    gap: 24,
  },
  dualCtaGridWide: {
    flexDirection: 'row',
  },
  ctaCardAdmin: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 36,
    justifyContent: 'space-between',
  },
  ctaCardDriver: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 36,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  ctaBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  ctaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  ctaCardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  ctaCardDesc: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaAdminBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaAdminBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaDriverBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaDriverBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaCardHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // RICH FOOTER
  footer: {
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 64,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  footerInner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    gap: 48,
  },
  footerInnerWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerBrandCol: {
    maxWidth: 360,
  },
  footerTagline: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 20,
  },
  footerPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  playBadgeSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  playBadgeLarge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
  },
  footerCol: {
    minWidth: 140,
    gap: 12,
  },
  footerColHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerBottom: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    marginTop: 48,
    paddingTop: 24,
  },
  footerBottomText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
