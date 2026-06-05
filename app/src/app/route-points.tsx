import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EndMode = 'round_trip' | 'other_address' | 'no_end';

const formatTime = () => {
  return new Date()
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
};

export default function RoutePointsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [startLocation, setStartLocation] = useState('Use current location');
  const [startTime] = useState(formatTime());

  const [endMode, setEndMode] = useState<EndMode>('round_trip');
  const [endAddress, setEndAddress] = useState('');
  const [showEndSheet, setShowEndSheet] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const routeName = useMemo(() => {
    if (typeof params.routeName === 'string' && params.routeName.trim()) {
      return params.routeName;
    }

    return 'My route';
  }, [params.routeName]);

  const endTitle = useMemo(() => {
    if (endMode === 'round_trip') return 'Round trip';
    if (endMode === 'no_end') return "Don’t use end location";
    return endAddress.trim() || 'End at other address';
  }, [endAddress, endMode]);

  const endSubtitle = useMemo(() => {
    if (endMode === 'round_trip') return 'Roundtrip from current location';
    if (endMode === 'no_end') return 'Not recommended for couriers';
    return endAddress.trim() ? 'Custom destination' : 'Enter any address';
  }, [endAddress, endMode]);

  
const handleDone = () => {
  router.push({
    pathname: '/route-preview',
    params: {
      routeName,
      startLocation,
      startTime,
      endMode,
      endAddress,
      saveAsDefault: String(saveAsDefault),
    },
  } as never);
};
  const handleSelectEndMode = (mode: EndMode) => {
    setEndMode(mode);

    if (mode !== 'other_address') {
      setEndAddress('');
    }

    setShowEndSheet(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: insets.top + 22,
             paddingBottom: 112 + insets.bottom,
            },
          ]}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <Text style={styles.title}>Route details</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start</Text>

            <InfoCard
              icon="⌖"
              iconColor="#2F76F6"
              title={startLocation}
              showClear={startLocation !== 'Use current location'}
              onClear={() => setStartLocation('Use current location')}
              onPress={() => setStartLocation('Use current location')}
            />

            <InfoCard
              icon="◷"
              iconColor="#2F76F6"
              title="Start right now"
              titleSuffix={startTime}
              showChevron
              onPress={() => {}}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End</Text>

            <InfoCard
              icon={endMode === 'round_trip' ? '↩' : endMode === 'no_end' ? '×' : '⌖'}
              iconColor={endMode === 'no_end' ? '#98A2B3' : '#2F76F6'}
              title={endTitle}
              subtitle={endSubtitle}
              showChevron
              onPress={() => setShowEndSheet(true)}
            />

            {endMode === 'other_address' ? (
              <TextInput
                style={styles.addressInput}
                placeholder="Enter end address"
                placeholderTextColor="#98A2B3"
                value={endAddress}
                onChangeText={setEndAddress}
              />
            ) : null}

            <InfoCard
              icon="◷"
              iconColor="#98A2B3"
              title="Set end time"
              disabled
              showChevron
              onPress={() => {}}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Break</Text>

            <InfoCard
              icon="☕"
              iconColor="#2F76F6"
              title="30 min break"
              subtitle="Between 8:00 am — 3:00 pm"
              showClear
              onClear={() => {}}
              onPress={() => {}}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}>
          <Pressable style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>

          <Pressable
            style={styles.defaultRow}
            onPress={() => setSaveAsDefault(prev => !prev)}>
            <View style={[styles.checkbox, saveAsDefault && styles.checkboxActive]}>
              {saveAsDefault ? <Text style={styles.checkText}>✓</Text> : null}
            </View>

            <Text style={styles.defaultText}>Save as default</Text>
          </Pressable>
        </View>

        <EndLocationSheet
          visible={showEndSheet}
          selectedMode={endMode}
          onClose={() => setShowEndSheet(false)}
          onSelect={handleSelectEndMode}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function InfoCard({
  icon,
  iconColor,
  title,
  titleSuffix,
  subtitle,
  showChevron,
  showClear,
  disabled,
  onPress,
  onClear,
}: {
  icon: string;
  iconColor: string;
  title: string;
  titleSuffix?: string;
  subtitle?: string;
  showChevron?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.infoCard, disabled && styles.disabledCard]}
      onPress={onPress}>
      <Text style={[styles.cardIcon, { color: iconColor }]}>{icon}</Text>

      <View style={styles.cardTextBox}>
        <View style={styles.cardTitleRow}>
          <Text
            numberOfLines={1}
            style={[styles.cardTitle, disabled && styles.disabledText]}>
            {title}
          </Text>

          {titleSuffix ? (
            <Text style={styles.titleSuffix}> {titleSuffix}</Text>
          ) : null}
        </View>

        {subtitle ? (
          <Text numberOfLines={1} style={styles.cardSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showClear ? (
        <Pressable
          hitSlop={12}
          style={styles.sideAction}
          onPress={event => {
            event.stopPropagation();
            onClear?.();
          }}>
          <Text style={styles.clearText}>×</Text>
        </Pressable>
      ) : null}

      {showChevron ? (
        <Text style={[styles.chevron, disabled && styles.disabledText]}>›</Text>
      ) : null}
    </Pressable>
  );
}

function EndLocationSheet({
  visible,
  selectedMode,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedMode: EndMode;
  onClose: () => void;
  onSelect: (mode: EndMode) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom + 24, 36),
            },
          ]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>End</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </Pressable>
          </View>

          <SheetOption
            icon="↩"
            title="Return to start"
            subtitle="Roundtrip (recommended)"
            selected={selectedMode === 'round_trip'}
            onPress={() => onSelect('round_trip')}
          />

          <SheetOption
            icon="⌖"
            title="End at other address"
            subtitle="Enter any address"
            selected={selectedMode === 'other_address'}
            onPress={() => onSelect('other_address')}
          />

          <SheetOption
            icon="×"
            title="Don’t use end location"
            subtitle="Not recommended for couriers"
            selected={selectedMode === 'no_end'}
            onPress={() => onSelect('no_end')}
          />
        </View>
      </View>
    </Modal>
  );
}

function SheetOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.sheetOption, selected && styles.selectedSheetOption]} onPress={onPress}>
      <Text style={styles.sheetOptionIcon}>{icon}</Text>

      <View style={styles.sheetOptionText}>
        <Text style={styles.sheetOptionTitle}>{title}</Text>
        <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text>
      </View>

      {selected ? <Text style={styles.selectedTick}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginBottom: 22,
  },

  closeText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    color: '#7B8798',
  },

  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 24,
    letterSpacing: -0.3,
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    color: '#526071',
    marginBottom: 10,
  },

  infoCard: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  disabledCard: {
    opacity: 0.72,
  },

  cardIcon: {
    width: 36,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '400',
  },

  cardTextBox: {
    flex: 1,
    minWidth: 0,
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardTitle: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#101828',
    letterSpacing: -0.1,
  },

  titleSuffix: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    color: '#98A2B3',
  },

  cardSubtitle: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    color: '#98A2B3',
  },

  disabledText: {
    color: '#98A2B3',
  },

  sideAction: {
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  clearText: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
    color: '#8A96A8',
  },

  chevron: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
    color: '#8A96A8',
    marginLeft: 6,
    marginTop: -1,
  },

  addressInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 5,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#101828',
    marginTop: -2,
    marginBottom: 10,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  doneButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  defaultRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: '#B8C2D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxActive: {
    backgroundColor: '#2F76F6',
    borderColor: '#2F76F6',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },

  defaultText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    color: '#98A2B3',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
  },

  sheetHeader: {
    height: 58,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#101828',
    letterSpacing: -0.2,
  },

  sheetDone: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#2F76F6',
  },

  sheetOption: {
    minHeight: 82,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedSheetOption: {
    backgroundColor: '#F6FAFF',
  },

  sheetOptionIcon: {
    width: 42,
    fontSize: 27,
    lineHeight: 32,
    color: '#526071',
  },

  sheetOptionText: {
    flex: 1,
  },

  sheetOptionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    color: '#101828',
    letterSpacing: -0.1,
  },

  sheetOptionSubtitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: '#98A2B3',
  },

  selectedTick: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2F76F6',
  },
});