import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { Feather } from '@expo/vector-icons';

type StopLike = {
  id?: string | number;
  title?: string;
  name?: string;
  address?: string;
  priority?: number | null;
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
  onCancelRoute?: () => void;
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

function joinUniqueAddressParts(parts: Array<string | undefined>) {
  const seen = new Set<string>();

  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

function getStopText(stop: StopLike) {
  const rawAddress =
    stop.full_address ||
    stop.fullAddress ||
    stop.address ||
    stop.location?.full_address ||
    stop.location?.fullAddress ||
    stop.location?.address;

  const parsed = splitAddress(rawAddress);

  const title =
    stop.title ||
    stop.name ||
    stop.location?.title ||
    stop.location?.name ||
    parsed?.title ||
    'Stop location';

  const builtFullAddress = joinUniqueAddressParts([
    rawAddress,
    stop.description,
    stop.subtitle,
    stop.street || stop.location?.street,
    stop.city || stop.location?.city,
    stop.postcode || stop.postalCode || stop.location?.postcode || stop.location?.postalCode,
  ]);

  const subtitle =
    builtFullAddress && builtFullAddress.toLowerCase() !== title.toLowerCase()
      ? builtFullAddress
      : parsed?.subtitle || 'Address details not available';

  return { title, subtitle };
}

function HeaderSearchBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  return (
    <View style={localStyles.searchHeaderRow}>
      <Pressable style={localStyles.searchBox} onPress={onOpenSearch}>
        <Text style={localStyles.searchIcon}>⌕</Text>

        <Text style={localStyles.searchPlaceholder} numberOfLines={1}>
          Tap to add more stops
        </Text>
        {/* 
        <Text style={localStyles.searchActionIcon}>⌗</Text>
        <Text style={localStyles.searchActionIcon}>♬</Text> */}
      </Pressable>

      {/* <Pressable style={localStyles.moreButton} hitSlop={10}>
        <Text style={localStyles.moreIcon}>⋮</Text>
      </Pressable> */}
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

        <Text style={localStyles.setupSubtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      </View>

      <View style={localStyles.setupIconBox}>
        <Text style={localStyles.setupIcon}>{icon}</Text>
      </View>
    </View>
  );
}

function BreakToggleRow() {
  const [breakEnabled, setBreakEnabled] = useState(false);

  return (
    <View style={localStyles.breakRow}>
      <View style={localStyles.timelineCol}>
        <View style={localStyles.timelineDot} />
      </View>

      <View style={localStyles.breakTextBox}>
        <Text style={localStyles.setupTitle}>Add break</Text>
        <Text style={localStyles.setupSubtitle}>
          {breakEnabled ? 'Break will be added during route planning' : 'Turn on to plan a break'}
        </Text>
      </View>

      <Switch
        value={breakEnabled}
        onValueChange={setBreakEnabled}
        trackColor={{ false: '#D9E1EC', true: '#BFD5FF' }}
        thumbColor={breakEnabled ? '#2876F8' : '#FFFFFF'}
        ios_backgroundColor="#D9E1EC"
        style={localStyles.breakSwitch}
      />
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
          {stop.priority ? ` ★ P${stop.priority}` : ''}
        </Text>

        <Text style={localStyles.stopSubtitle}>{stopText.subtitle}</Text>
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
  onCancelRoute,
  onSelectStop,
  onOpenStopDetails,
  onStopPress,
  onSaveStopPriority,
}: RouteSetupPanelProps) {
  const insets = useSafeAreaInsets();
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);

  const stopLabel = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;

  const startText = getLocationText(start, 'Start from current location', 'Use GPS position when optimizing');

  const endText = getLocationText(end, 'Round trip', 'Return to start location');

  const handleStopPress = onSelectStop || onOpenStopDetails || onStopPress;

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="middle" collapsedHeight={88}>
      <View style={[localStyles.panel, isWide && localStyles.panelWeb]}>
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
          contentContainerStyle={{ paddingBottom: 20 }}
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

            <BreakToggleRow />

            <Pressable
              style={({ pressed }) => [
                localStyles.breakRow,
                pressed && { backgroundColor: '#F8FAFC' }
              ]}
              onPress={() => setIsPriorityModalOpen(true)}
            >
              <View style={localStyles.timelineCol}>
                <View style={localStyles.timelineDot} />
              </View>

              <View style={localStyles.breakTextBox}>
                <Text style={localStyles.setupTitle}>Set priority</Text>
                <Text style={localStyles.setupSubtitle}>
                  {stops && stops.some((s: any) => s.priority)
                    ? `${stops.filter((s: any) => s.priority).length} stops prioritized`
                    : 'Set custom priorities for stops'}
                </Text>
              </View>

              <View style={localStyles.setupIconBox}>
                <Feather name="star" size={18} color="#2E76F6" />
              </View>
            </Pressable>
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
          <Pressable
            style={({ pressed }) => [
              localStyles.cancelRouteButton,
              pressed && localStyles.cancelRouteButtonPressed,
            ]}
            onPress={onCancelRoute}
          >
            <Feather name="trash-2" size={22} color="#FF3B3B" />

            <Text style={localStyles.cancelRouteText}>Cancel route</Text>
          </Pressable>
          <Pressable style={localStyles.optimizeButton} onPress={onOptimizeRoute}>
            <Text style={localStyles.optimizeIcon}>↻</Text>
            <Text style={localStyles.optimizeText}>Optimize route</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isPriorityModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPriorityModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.42)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setIsPriorityModalOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom + 20, 30),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
                Set stops priority
              </Text>
              <Pressable onPress={() => setIsPriorityModalOpen(false)} style={{ padding: 4 }}>
                <Feather name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              Prioritized stops are kept at their set positions and are skipped during route optimization.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(stops ?? []).map((stop: any, index: number) => {
                const maxPriority = (stops ?? []).length;
                const stopText = getStopText(stop);
                return (
                  <View
                    key={stop.id ?? `${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
                        {stopText.title || `Stop ${index + 1}`}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }} numberOfLines={1}>
                        {stopText.subtitle || 'No address'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 4 }}>
                      <Pressable
                        onPress={() => {
                          const currentPriority = stop.priority;
                          if (currentPriority === null || currentPriority === undefined) {
                            // Already Auto
                          } else if (currentPriority === 1) {
                            onSaveStopPriority?.(stop.id, null);
                          } else {
                            onSaveStopPriority?.(stop.id, currentPriority - 1);
                          }
                        }}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>−</Text>
                      </Pressable>

                      <Text style={{ fontSize: 13, fontWeight: '600', color: stop.priority ? '#2E76F6' : '#64748B', minWidth: 40, textAlign: 'center' }}>
                        {stop.priority ? `P${stop.priority}` : 'Auto'}
                      </Text>

                      <Pressable
                        onPress={() => {
                          const currentPriority = stop.priority;
                          if (currentPriority === null || currentPriority === undefined) {
                            onSaveStopPriority?.(stop.id, 1);
                          } else if (currentPriority < maxPriority) {
                            onSaveStopPriority?.(stop.id, currentPriority + 1);
                          }
                        }}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setIsPriorityModalOpen(false)}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: '#2E76F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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

  searchHeaderRow: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
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
    fontSize: 15,
    fontWeight: '500',
  },
  searchActionIcon: {
    fontSize: 18,
    color: '#8AA0BE',
    marginLeft: 10,
    fontWeight: '500',
  },
  moreButton: {
    width: 28,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIcon: {
    color: '#7F95B3',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '500',
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
    fontWeight: '500',
  },
  whiteBlock: {
    backgroundColor: '#FFFFFF',
  },

  setupRow: {
    minHeight: 72,
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
    fontSize: 13,
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
    height: 30,
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
    fontWeight: '600',
  },

  breakRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 18,
  },
  breakTextBox: {
    flex: 1,
    paddingVertical: 10,
  },
  breakSwitch: {
    marginLeft: 12,
  },

  stopRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 14,
    paddingBottom: 14,
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
    marginTop: 3,
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
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  footerWeb: {
    maxWidth: 470,
    alignSelf: 'center',
  },
  cancelButton: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0B8B8',
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cancelButtonPressed: {
    backgroundColor: '#FFEDED',
  },
  cancelText: {
    color: '#C24141',
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  optimizeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  cancelRouteButton: {
    height: 54,
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFB8B8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,

    shadowColor: '#FF3B3B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  cancelRouteButtonPressed: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF8F8F',
  },

  cancelRouteText: {
    color: '#FF3B3B',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});