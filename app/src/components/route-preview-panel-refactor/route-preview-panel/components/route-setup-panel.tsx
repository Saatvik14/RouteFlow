import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type StopLike = {
  id?: string | number;
  title?: string;
  name?: string;
  address?: string;
  full_address?: string;
  fullAddress?: string;
  description?: string;
  subtitle?: string;
  city?: string;
  street?: string;
  postcode?: string;
  postalCode?: string;
  location?: {
    name?: string;
    title?: string;
    address?: string;
    full_address?: string;
    fullAddress?: string;
    description?: string;
    city?: string;
    street?: string;
    postcode?: string;
    postalCode?: string;
  };
};

type RouteSetupPanelProps = RoutePreviewPanelProps & {
  isWide: boolean;

  /**
   * Pass any one of these from route-preview.
   * Example:
   * onSelectStop={(stop) => {
   *   setSelectedStop(stop);
   *   setActivePanel('stopDetails');
   * }}
   */
  onSelectStop?: (stop: StopLike, index: number) => void;
  onOpenStopDetails?: (stop: StopLike, index: number) => void;
  onStopPress?: (stop: StopLike, index: number) => void;
};

function getLocationText(location: any, fallbackTitle: string, fallbackSubtitle: string) {
  const title =
    location?.title ||
    location?.name ||
    location?.addressLine1 ||
    location?.location?.name ||
    location?.location?.title ||
    fallbackTitle;

  const subtitle =
    location?.description ||
    location?.subtitle ||
    location?.full_address ||
    location?.fullAddress ||
    location?.address ||
    location?.location?.description ||
    location?.location?.full_address ||
    location?.location?.fullAddress ||
    location?.location?.address ||
    fallbackSubtitle;

  return { title, subtitle };
}

function splitAddress(address?: string) {
  if (!address) return null;

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  return {
    title: parts[0],
    subtitle: parts.slice(1).join(', '),
  };
}

function getStopText(stop: StopLike) {
  const rawAddress =
    stop.address ||
    stop.full_address ||
    stop.fullAddress ||
    stop.location?.address ||
    stop.location?.full_address ||
    stop.location?.fullAddress;

  const parsed = splitAddress(rawAddress);

  const title =
    stop.title ||
    stop.name ||
    stop.location?.title ||
    stop.location?.name ||
    parsed?.title ||
    'Stop location';

  const subtitleParts = [
    stop.description,
    stop.subtitle,
    parsed?.subtitle,
    stop.street || stop.location?.street,
    stop.city || stop.location?.city,
    stop.postcode || stop.postalCode || stop.location?.postcode || stop.location?.postalCode,
  ]
    .filter(Boolean)
    .map(String);

  const subtitle = subtitleParts[0] || 'Address details not available';

  return { title, subtitle };
}

function HeaderSearchBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  return (
    <View style={localStyles.searchHeaderRow}>
      <Pressable style={localStyles.menuButton} hitSlop={10}>
        <Text style={localStyles.menuIcon}>☰</Text>
      </Pressable>

      <Pressable style={localStyles.searchBox} onPress={onOpenSearch}>
        <Text style={localStyles.searchIcon}>⌕</Text>

        <Text style={localStyles.searchPlaceholder} numberOfLines={1}>
          Tap to add more stops
        </Text>

        <Text style={localStyles.searchActionIcon}>⌗</Text>
        <Text style={localStyles.searchActionIcon}>♬</Text>
      </Pressable>

      <Pressable style={localStyles.moreButton} hitSlop={10}>
        <Text style={localStyles.moreIcon}>⋮</Text>
      </Pressable>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={localStyles.sectionLabelBox}>
      <Text style={localStyles.sectionLabel}>{title}</Text>
    </View>
  );
}

function RouteSetupRow({
  leftText,
  dotOnly,
  title,
  subtitle,
  icon,
  last,
}: {
  leftText?: string;
  dotOnly?: boolean;
  title: string;
  subtitle: string;
  icon: string;
  last?: boolean;
}) {
  return (
    <View style={localStyles.setupRow}>
      <View style={localStyles.timelineCol}>
        {leftText ? (
          <Text style={localStyles.timelineTime} numberOfLines={1}>
            {leftText}
          </Text>
        ) : (
          <View style={localStyles.timelineDot} />
        )}

        {!last && <View style={[localStyles.timelineLine, dotOnly && localStyles.timelineLineFromDot]} />}
      </View>

      <View style={localStyles.setupTextBox}>
        <Text style={localStyles.setupTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={localStyles.setupSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      <View style={localStyles.setupIconBox}>
        <Text style={localStyles.setupIcon}>{icon}</Text>
      </View>
    </View>
  );
}

function StopRow({
  stop,
  index,
  onPress,
}: {
  stop: StopLike;
  index: number;
  onPress?: (stop: StopLike, index: number) => void;
}) {
  const stopText = getStopText(stop);

  return (
    <Pressable
      style={({ pressed }) => [localStyles.stopRow, pressed && localStyles.stopRowPressed]}
      onPress={() => onPress?.(stop, index)}
    >
      <Text style={localStyles.stopIndex}>{String(index + 1).padStart(2, '0')}</Text>

      <View style={localStyles.stopTextBox}>
        <Text style={localStyles.stopTitle} numberOfLines={1}>
          {stopText.title}
        </Text>
        <Text style={localStyles.stopSubtitle} numberOfLines={2}>
          {stopText.subtitle}
        </Text>
      </View>

      <View style={localStyles.stopIconBox}>
        <View style={localStyles.stopBlueDot} />
      </View>
    </Pressable>
  );
}

export function RouteSetupPanel({
  isWide,
  routeName,
  start,
  end,
  stops,
  startTime,
  onOpenSearch,
  onOptimizeRoute,
  onSelectStop,
  onOpenStopDetails,
  onStopPress,
}: RouteSetupPanelProps) {
  const insets = useSafeAreaInsets();

  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

  const startText = getLocationText(
    start,
    'Start from current location',
    'Use GPS position when optimizing',
  );

  const endText = getLocationText(end, 'Round trip', 'Return to start location');

  const handleStopPress = onSelectStop || onOpenStopDetails || onStopPress;

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="middle">
      <View style={[localStyles.panel, isWide && localStyles.panelWeb]}>
        <View style={localStyles.dragHandle} />

        <HeaderSearchBar onOpenSearch={onOpenSearch} />

        <View style={localStyles.routeTitleBox}>
          <Text style={localStyles.stopCount}>{stopLabel}</Text>

          <Text style={localStyles.routeTitle} numberOfLines={1}>
            {routeName || 'Route preview'}
          </Text>
        </View>

        <ScrollView
          style={localStyles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 112, 132) }}
        >
          <SectionLabel title="Route setup" />

          <View style={localStyles.whiteBlock}>
            <RouteSetupRow
              leftText={startTime || 'Now'}
              title={startText.title || 'Start from current location'}
              subtitle={startText.subtitle || 'Use GPS position when optimizing'}
              icon="⌂"
            />

            <RouteSetupRow
              dotOnly
              title={endText.title || 'Round trip'}
              subtitle={endText.subtitle || 'Return to start location'}
              icon="⚑"
            />

            <RouteSetupRow dotOnly title="No break" subtitle="Tap to plan a break" icon="☕" last />
          </View>

          <SectionLabel title="Stops" />

          <View style={localStyles.whiteBlock}>
            {stops.length ? (
              stops.map((stop: StopLike, index: number) => (
                <StopRow
                  key={stop.id ?? `${index}`}
                  stop={stop}
                  index={index}
                  onPress={handleStopPress}
                />
              ))
            ) : (
              <Pressable style={localStyles.emptyStopBox} onPress={onOpenSearch}>
                <Text style={localStyles.emptyStopTitle}>No stops added yet</Text>
                <Text style={localStyles.emptyStopSubtitle}>Tap here to add your first stop</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            localStyles.footer,
            isWide && localStyles.footerWeb,
            { paddingBottom: Math.max(insets.bottom + 10, 16) },
          ]}
        >
          <Pressable style={localStyles.optimizeButton} onPress={onOptimizeRoute}>
            <Text style={localStyles.optimizeIcon}>↻</Text>
            <Text style={localStyles.optimizeText}>Optimize route</Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const localStyles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  panelWeb: {
    maxWidth: 470,
    alignSelf: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 58,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D6DEE9',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },

  searchHeaderRow: {
    minHeight: 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#7F95B3',
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '600',
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D7E0EC',
    backgroundColor: '#F7F9FD',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 21,
    color: '#8AA0BE',
    marginRight: 8,
    marginTop: -1,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#50627E',
    fontSize: 16,
    fontWeight: '500',
  },
  searchActionIcon: {
    fontSize: 19,
    color: '#8AA0BE',
    marginLeft: 10,
    fontWeight: '600',
  },
  moreButton: {
    width: 26,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#7F95B3',
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '600',
  },

  routeTitleBox: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  stopCount: {
    color: '#536682',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  routeTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '600',
    letterSpacing: -0.25,
  },

  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sectionLabelBox: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F3F6FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E7EDF5',
  },
  sectionLabel: {
    color: '#556783',
    fontSize: 15,
    fontWeight: '600',
  },
  whiteBlock: {
    backgroundColor: '#FFFFFF',
  },

  setupRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  timelineCol: {
    width: 76,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timelineTime: {
    color: '#536682',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 66,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#9CAFCB',
  },
  timelineLine: {
    position: 'absolute',
    top: 43,
    width: 2,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#D9E1EC',
  },
  timelineLineFromDot: {
    top: 40,
  },
  setupTextBox: {
    flex: 1,
    paddingVertical: 10,
  },
  setupTitle: {
    color: '#151B2A',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  setupSubtitle: {
    color: '#52637F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
  },
  setupIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  setupIcon: {
    color: '#2E76F6',
    fontSize: 18,
    fontWeight: '700',
  },

  stopRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingRight: 16,
  },
  stopRowPressed: {
    backgroundColor: '#F7FAFF',
  },
  stopIndex: {
    width: 76,
    textAlign: 'center',
    color: '#50627E',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  stopTextBox: {
    flex: 1,
    paddingRight: 10,
  },
  stopTitle: {
    color: '#151B2A',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  stopSubtitle: {
    color: '#52637F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: 2,
  },
  stopIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBlueDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2E76F6',
  },

  emptyStopBox: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CAD6E7',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFF',
  },
  emptyStopTitle: {
    color: '#151B2A',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyStopSubtitle: {
    color: '#65758E',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  footerWeb: {
    maxWidth: 470,
    alignSelf: 'center',
  },
  optimizeButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2876F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizeIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    marginRight: 10,
    fontWeight: '700',
  },
  optimizeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});