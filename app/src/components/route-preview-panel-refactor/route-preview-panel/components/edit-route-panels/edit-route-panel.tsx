import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableRouteSheet } from './../draggable-route-sheet';
import {
  BaseEditProps,
  Card,
  COLORS,
  formatTime,
  getAddress,
  getStatusLabel,
  getStopSubtitle,
  getTitle,
  Header,
  Row,
  SectionTitle,
  sharedStyles,
} from './edit-route-shared';

export function EditRoutePanel({
  isWide,
  routeName,
  start,
  end,
  stops = [],
  startTime,
  routeStatus,
  isOptimizing,
  onCancelEditRoute,
  onOpenEditStartLocation,
  onOpenEditEndLocation,
  onOpenEditStartTime,
  onOpenEditStop,
  onAddAnotherStop,
  onReOptimizeEditedRoute,
}: BaseEditProps) {
  const insets = useSafeAreaInsets();

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={sharedStyles.panel}>
        <Header title="Edit route" onBack={onCancelEditRoute} rightLabel="⋮" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 120, 150),
          }}
        >
          <Text style={sharedStyles.routeTitle}>{routeName || 'Route'}</Text>

          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {getStatusLabel(routeStatus)}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Any change will require re-optimization before starting the route.
            </Text>
          </View>

          <SectionTitle>Route setup</SectionTitle>

          <Card>
            <Row
              icon={<Feather name="navigation" size={20} color={COLORS.primary} />}
              title="Start location"
              subtitle={getAddress(start)}
              value={formatTime(startTime)}
              onPress={onOpenEditStartLocation}
            />

            <Row
              icon={
                <MaterialCommunityIcons
                  name="flag"
                  size={21}
                  color={COLORS.primary}
                />
              }
              title="End location"
              subtitle={getAddress(end)}
              onPress={onOpenEditEndLocation}
            />

            <Row
              icon={<Feather name="clock" size={20} color={COLORS.primary} />}
              title="Start time"
              value={formatTime(startTime) || 'Set time'}
              onPress={onOpenEditStartTime}
            />
          </Card>

          <SectionTitle>Stops</SectionTitle>

          <Card>
            {stops.map((stop, index) => (
              <Pressable
                key={String(
                  stop?.id || stop?.orderId || stop?.order_id || index,
                )}
                style={({ pressed }) => [
                  styles.stopRow,
                  pressed ? sharedStyles.rowPressed : null,
                ]}
                onPress={() => onOpenEditStop?.(stop)}
              >
                <View style={styles.stopNumberPill}>
                  <Text style={styles.stopNumberText}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>

                <View style={sharedStyles.rowTextWrap}>
                  <Text style={sharedStyles.rowTitle} numberOfLines={1}>
                    {getTitle(stop, `Stop ${index + 1}`)}
                    {stop.priority ? ` ★ P${stop.priority}` : ''}
                  </Text>

                  <Text style={sharedStyles.rowSubtitle}>
                    {getStopSubtitle(stop)}
                  </Text>
                </View>

                <Text style={sharedStyles.rowValue}>
                  {formatTime(
                    stop?.arrival_time ||
                      stop?.eta ||
                      stop?.estimatedArrivalTime,
                  )}
                </Text>

                <Feather name="more-vertical" size={21} color={COLORS.muted} />
              </Pressable>
            ))}
          </Card>

          <Pressable style={styles.addStopButton} onPress={onAddAnotherStop}>
            <Feather name="plus" size={22} color={COLORS.primary} />
            <Text style={styles.addStopText}>Add another stop</Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            sharedStyles.footer,
            { paddingBottom: Math.max(insets.bottom + 10, 16) },
          ]}
        >
          <Pressable
            style={sharedStyles.secondaryButton}
            onPress={onCancelEditRoute}
          >
            <Text style={sharedStyles.secondaryButtonText}>Cancel edit</Text>
          </Pressable>

          <Pressable
            style={[
              sharedStyles.primaryButton,
              isOptimizing ? sharedStyles.disabledButton : null,
            ]}
            onPress={onReOptimizeEditedRoute}
            disabled={isOptimizing}
          >
            <Feather name="refresh-cw" size={19} color={COLORS.white} />
            <Text style={sharedStyles.primaryButtonText}>
              {isOptimizing ? 'Optimizing...' : 'Re-optimize'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  statusChip: {
    marginLeft: 22,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusChipText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    marginHorizontal: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: COLORS.blueBackground,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  stopRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  stopNumberPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.blueBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  addStopButton: {
    marginHorizontal: 22,
    marginTop: 16,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  addStopText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
