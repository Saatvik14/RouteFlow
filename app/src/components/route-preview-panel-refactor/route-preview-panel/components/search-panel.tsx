import { useState } from 'react';
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

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';

type SearchPanelExtraProps = {
  isWide: boolean;
  onChooseOnMap?: () => void;
  onScanAddress?: () => void;
  onVoiceAddress?: () => void;
  onScanRouteManifest?: () => void;
  onImportRouteManifest?: () => void;
  onCopyStopsFromPastRoute?: () => void;
  onSkipOptimization?: () => void;
  onRemoveStops?: () => void;
};

type Props = RoutePreviewPanelProps & SearchPanelExtraProps;

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={localStyles.actionCard} onPress={onPress}>
      <View style={localStyles.actionIconBox}>
        <Text style={localStyles.actionIcon}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={localStyles.actionTitle}>{title}</Text>
        <Text style={localStyles.actionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={localStyles.menuRow} onPress={onPress}>
      <Text style={[localStyles.menuIcon, destructive && localStyles.dangerText]}>
        {icon}
      </Text>

      <View style={{ flex: 1 }}>
        <Text style={[localStyles.menuTitle, destructive && localStyles.dangerText]}>
          {title}
        </Text>
        {subtitle ? <Text style={localStyles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export function SearchPanel({
  isWide,
  searchText,
  suggestions,
  onSearchTextChange,
  onCloseSearch,
  onSelectSuggestion,
  onChooseOnMap,
  onScanAddress,
  onVoiceAddress,
  onScanRouteManifest,
  onImportRouteManifest,
  onCopyStopsFromPastRoute,
  onSkipOptimization,
  onRemoveStops,
}: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenuAndRun = (handler?: () => void) => {
    setMenuVisible(false);
    requestAnimationFrame(() => {
      handler?.();
    });
  };

  const hasSearch = searchText.trim().length >= 2;

  return (
    <DraggableRouteSheet isWide={isWide} mode="large" initialSnap="top">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={localStyles.header}>
          <View style={localStyles.searchBox}>
            <Text style={localStyles.searchIcon}>⌕</Text>

            <TextInput
              value={searchText}
              onChangeText={onSearchTextChange}
              placeholder="Tap to add stops"
              placeholderTextColor="#7C8CA5"
              autoFocus
              style={[
                localStyles.input,
                Platform.OS === 'web' &&
                  ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outlineColor: 'transparent',
                  } as any),
              ]}
            />

            {searchText ? (
              <Pressable
                onPress={() => onSearchTextChange('')}
                style={localStyles.smallIconButton}
              >
                <Text style={localStyles.clearText}>×</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={onScanAddress}
                  style={localStyles.smallIconButton}
                >
                  <Text style={localStyles.headerIcon}>⌗</Text>
                </Pressable>

                <Pressable
                  onPress={onVoiceAddress}
                  style={localStyles.smallIconButton}
                >
                  <Text style={localStyles.headerIcon}>🎙</Text>
                </Pressable>
              </>
            )}

            <Pressable
              onPress={() => setMenuVisible(true)}
              style={localStyles.smallIconButton}
            >
              <Text style={localStyles.dots}>⋮</Text>
            </Pressable>
          </View>

          <Pressable onPress={onCloseSearch} style={localStyles.closeButton}>
            <Text style={localStyles.closeText}>×</Text>
          </Pressable>
        </View>

        {!hasSearch ? (
          <View style={localStyles.emptyWrapper}>
            <View style={localStyles.emptyIconBox}>
              <Text style={localStyles.emptyIcon}>▢</Text>
            </View>

            <Text style={localStyles.emptyTitle}>No stops added yet</Text>
            <Text style={localStyles.emptySubtitle}>
              Add stops manually, scan an address label, use voice, or import a
              complete route manifest.
            </Text>

            <View style={localStyles.actionGrid}>
              <ActionCard
                icon="+"
                title="Add stop"
                subtitle="Search address manually"
                onPress={() => onSearchTextChange(' ')}
              />
              <ActionCard
                icon="⌗"
                title="Scan address"
                subtitle="Use camera on parcel label"
                onPress={onScanAddress}
              />
              <ActionCard
                icon="🎙"
                title="Voice address"
                subtitle="Speak the delivery address"
                onPress={onVoiceAddress}
              />
              <ActionCard
                icon="▤"
                title="Route manifest"
                subtitle="Scan or import many stops"
                onPress={() => setMenuVisible(true)}
              />
            </View>

            <Pressable
              style={localStyles.primaryButton}
              onPress={() => onSearchTextChange(' ')}
            >
              <Text style={localStyles.primaryButtonText}>+ Add stops</Text>
            </Pressable>

            <Pressable
              style={localStyles.secondaryButton}
              onPress={onCopyStopsFromPastRoute}
            >
              <Text style={localStyles.secondaryButtonText}>
                Copy stops from a past route
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.resultsContent}
          >
            <Text style={localStyles.sectionTitle}>Add a new stop</Text>

            {suggestions.map(item => (
              <Pressable
                key={item.id}
                style={localStyles.suggestionRow}
                onPress={() => onSelectSuggestion(item)}
              >
                <View style={localStyles.pinBox}>
                  <Text style={localStyles.pinIcon}>⌖</Text>
                </View>

                <View style={localStyles.suggestionTextBox}>
                  <Text style={localStyles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={localStyles.suggestionSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
              </Pressable>
            ))}

            <Pressable style={localStyles.suggestionRow} onPress={onChooseOnMap}>
              <View style={localStyles.pinBox}>
                <Text style={localStyles.pinIcon}>▱</Text>
              </View>

              <View style={localStyles.suggestionTextBox}>
                <Text style={localStyles.suggestionTitle}>Choose on map</Text>
                <Text style={localStyles.suggestionSubtitle}>
                  Drop a pin and use that location as a stop
                </Text>
              </View>

              <Text style={localStyles.rowArrow}>›</Text>
            </Pressable>
          </ScrollView>
        )}

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={localStyles.backdrop}
            onPress={() => setMenuVisible(false)}
          >
            <Pressable style={localStyles.bottomMenu}>
              <View style={localStyles.menuHandle} />

              <MenuRow
                icon="⌗"
                title="Scan address"
                subtitle="Scan one package or address label"
                onPress={() => closeMenuAndRun(onScanAddress)}
              />

              <MenuRow
                icon="🎙"
                title="Add address by voice"
                subtitle="Speak and convert it into address suggestions"
                onPress={() => closeMenuAndRun(onVoiceAddress)}
              />

              <MenuRow
                icon="▤"
                title="Scan route manifest"
                subtitle="Scan a printed sheet with multiple stops"
                onPress={() => closeMenuAndRun(onScanRouteManifest)}
              />

              <MenuRow
                icon="▣"
                title="Import route manifest"
                subtitle="Upload CSV or Excel with many stops"
                onPress={() => closeMenuAndRun(onImportRouteManifest)}
              />

              <View style={localStyles.menuDivider} />

              <MenuRow
                icon="⇅"
                title="Copy stops from past route"
                onPress={() => closeMenuAndRun(onCopyStopsFromPastRoute)}
              />

              <MenuRow
                icon="↯"
                title="Skip optimization"
                onPress={() => closeMenuAndRun(onSkipOptimization)}
              />

              <MenuRow
                icon="⌫"
                title="Remove stops"
                destructive
                onPress={() => closeMenuAndRun(onRemoveStops)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </DraggableRouteSheet>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE6F2',
    backgroundColor: '#F8FAFD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    color: '#718096',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#172033',
    fontSize: 15,
    paddingVertical: 10,
  },
  smallIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 15,
    color: '#6B7890',
  },
  dots: {
    fontSize: 22,
    color: '#6B7890',
    marginTop: -2,
  },
  clearText: {
    fontSize: 22,
    color: '#6B7890',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF3FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#526174',
  },
  emptyWrapper: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 42,
  },
  emptyIconBox: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F1F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 28,
    color: '#9AABC2',
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#172033',
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: '#7C8CA5',
    marginTop: 6,
    marginBottom: 22,
    paddingHorizontal: 18,
  },
  actionGrid: {
    gap: 10,
  },
  actionCard: {
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
    color: '#286EF0',
    fontWeight: '600',
  },
  actionTitle: {
    fontSize: 15,
    color: '#172033',
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#7C8CA5',
    marginTop: 2,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2F74F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE6F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#286EF0',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#7C8CA5',
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  suggestionRow: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  },
  pinBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#F2F6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinIcon: {
    fontSize: 18,
    color: '#56657A',
  },
  suggestionTextBox: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#172033',
  },
  suggestionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7C8CA5',
    marginTop: 2,
  },
  rowArrow: {
    fontSize: 24,
    color: '#A0AEC0',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomMenu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D2DAE7',
    marginBottom: 12,
  },
  menuRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIcon: {
    width: 28,
    textAlign: 'center',
    fontSize: 21,
    color: '#4F5F78',
  },
  menuTitle: {
    fontSize: 16,
    color: '#172033',
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#7C8CA5',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 8,
  },
  dangerText: {
    color: '#D14343',
  },
});