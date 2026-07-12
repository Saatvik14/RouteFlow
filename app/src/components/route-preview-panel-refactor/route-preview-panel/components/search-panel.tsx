import { useEffect, useState } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { useVoiceAddress } from '../../../../hooks/useVoiceAddress';

const isUkLocation = (item: any) => {
  const lat = Number(item?.latitude);
  const lon = Number(item?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
    if (lat >= 49.0 && lat <= 61.0 && lon >= -10.0 && lon <= 2.5) {
      return true;
    }
  }

  const address = (item?.address || item?.full_address || item?.fullAddress || '').toLowerCase();
  const title = (item?.title || '').toLowerCase();
  const country = (item?.country || '').toLowerCase();
  const countryCode = (item?.country_code || item?.countryCode || '').toLowerCase();

  return (
    address.includes('united kingdom') ||
    address.includes(', uk') ||
    address.includes(', gb') ||
    country.includes('united kingdom') ||
    country === 'uk' ||
    country === 'gb' ||
    countryCode === 'gb' ||
    countryCode === 'uk' ||
    title.includes('united kingdom')
  );
};

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
  pendingManifestStops?: any[];
  onConfirmManifestStops?: (stops: any[]) => Promise<void>;
  onCancelManifestStops?: () => void;
};

type Props = RoutePreviewPanelProps & SearchPanelExtraProps;

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
  isActive,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  isActive?: boolean;
}) {
  return (
    <Pressable
      style={[
        localStyles.actionCard,
        isActive && { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          localStyles.actionIconBox,
          isActive && { backgroundColor: '#FEE2E2' },
        ]}
      >
        <Text style={[localStyles.actionIcon, isActive && { color: '#EF4444' }]}>
          {icon}
        </Text>
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
  pendingManifestStops,
  onConfirmManifestStops,
  onCancelManifestStops,
  subscriptionType,
  errorMessage,
}: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { isListening, transcript, error, startListening, stopListening } = useVoiceAddress();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewStops, setReviewStops] = useState<any[]>([]);
  const [ukErrorVisible, setUkErrorVisible] = useState(false);

  useEffect(() => {
    if (pendingManifestStops && pendingManifestStops.length > 0) {
      setReviewStops(pendingManifestStops);
    } else {
      setReviewStops([]);
    }
  }, [pendingManifestStops]);

  useEffect(() => {
    if (transcript) {
      onSearchTextChange(transcript);
    }
  }, [transcript, onSearchTextChange]);

  useEffect(() => {
    if (error) {
      setErrorMsg(error);
      const timer = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleVoicePress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const downloadSampleTemplate = async () => {
    const csvContent =
      'Address\n' +
      '"1600 Amphitheatre Pkwy, Mountain View, CA 94043"\n' +
      '"1 Infinite Loop, Cupertino, CA 95014"\n' +
      '"350 Fifth Ave, New York, NY 10118"';

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample-route-manifest.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      try {
        const fileUri = FileSystem.documentDirectory + 'sample-route-manifest.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Download Sample Route Manifest',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          alert(
            'Excel/CSV Template Columns:\n\n' +
              '1. Address\n\n' +
              'Please create a spreadsheet with only this single header column.'
          );
        }
      } catch (error) {
        console.error('Error sharing sample file:', error);
        alert('Failed to save and share the sample template file.');
      }
    }
  };

  const handleDeletePendingStop = (indexToDelete: number) => {
    setReviewStops((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleConfirmReview = async () => {
    const hasOutsideUk = reviewStops.some((item) => !isUkLocation(item));
    if (hasOutsideUk) {
      setUkErrorVisible(true);
      return;
    }

    if (onConfirmManifestStops) {
      await onConfirmManifestStops(reviewStops);
    }
  };

  const handleCancelReview = () => {
    if (onCancelManifestStops) {
      onCancelManifestStops();
    }
  };

  const closeMenuAndRun = (handler?: () => void) => {
    setMenuVisible(false);
    requestAnimationFrame(() => {
      handler?.();
    });
  };

  const hasSearch = searchText.trim().length >= 2;

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
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
              placeholder={
                isListening
                  ? 'Listening... Speak now'
                  : errorMsg
                  ? errorMsg
                  : 'Tap to add stops'
              }
              placeholderTextColor={
                isListening
                  ? '#DE3B3B'
                  : errorMsg
                  ? '#DC2626'
                  : '#7C8CA5'
              }
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

            {/* {isListening ? (
              <Pressable
                onPress={handleVoicePress}
                style={[
                  localStyles.smallIconButton,
                  { backgroundColor: '#FEE2E2' },
                ]}
              >
                <Text style={[localStyles.headerIcon, { color: '#EF4444' }]}>🎙</Text>
              </Pressable>
            ) : searchText ? (
              <Pressable
                onPress={() => onSearchTextChange('')}
                style={localStyles.smallIconButton}
              >
                <Text style={localStyles.clearText}>×</Text>
              </Pressable>
            ) : (
              <>
                {subscriptionType !== 'lite' && (
                  <Pressable
                    onPress={onScanAddress}
                    style={localStyles.smallIconButton}
                  >
                    <Text style={localStyles.headerIcon}>⌗</Text>
                  </Pressable>
                )}

                {subscriptionType !== 'lite' && (
                  <Pressable
                    onPress={handleVoicePress}
                    style={localStyles.smallIconButton}
                  >
                    <Text style={localStyles.headerIcon}>🎙</Text>
                  </Pressable>
                )}
              </>
            )} */}

            {/* <Pressable
              onPress={() => setMenuVisible(true)}
              style={localStyles.smallIconButton}
            >
              <Text style={localStyles.dots}>⋮</Text>
            </Pressable> */}
          </View>

          <Pressable onPress={onCloseSearch} style={localStyles.closeButton}>
            <Text style={localStyles.closeText}>×</Text>
          </Pressable>
        </View>

        {!hasSearch ? (
          <View style={localStyles.emptyWrapper}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={localStyles.emptyIconBox}>
                <Text style={localStyles.emptyIcon}>▢</Text>
              </View>

              <Text style={localStyles.emptyTitle}>No stops added yet</Text>
              <Text style={localStyles.emptySubtitle}>
                Add stops manually, scan an address label, use voice, or import a
                complete route manifest.{' '}
                <Text
                  style={{ color: '#286EF0', fontWeight: '600', textDecorationLine: 'underline' }}
                  onPress={downloadSampleTemplate}
                >
                  Download template
                </Text>
              </Text>

              {subscriptionType !== 'lite' && (
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
                    title={isListening ? 'Stop listening' : 'Voice address'}
                    subtitle={isListening ? 'Listening... Speak now' : 'Speak the delivery address'}
                    onPress={handleVoicePress}
                    isActive={isListening}
                  />
                  <ActionCard
                    icon="▤"
                    title="Bulk upload orders"
                    subtitle="Upload Excel sheet with multiple stops"
                    onPress={() => setBulkUploadVisible(true)}
                  />
                </View>
              )}
            </ScrollView>

            <View style={[
              subscriptionType === 'lite' ? localStyles.liteFooter : localStyles.footer,
              { paddingBottom: Math.max(insets.bottom, 16) }
            ]}>
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

              {subscriptionType !== 'lite' && (
                <MenuRow
                  icon="⌗"
                  title="Scan address"
                  subtitle="Scan one package or address label"
                  onPress={() => closeMenuAndRun(onScanAddress)}
                />
              )}

              {subscriptionType !== 'lite' && (
                <MenuRow
                  icon="🎙"
                  title={isListening ? 'Stop listening' : 'Add address by voice'}
                  subtitle={
                    isListening
                      ? 'Listening... Tap to stop'
                      : 'Speak and convert it into address suggestions'
                  }
                  onPress={() => closeMenuAndRun(handleVoicePress)}
                  destructive={isListening}
                />
              )}

              {subscriptionType !== 'lite' && (
                <MenuRow
                  icon="▣"
                  title="Bulk upload orders"
                  subtitle="Import stops using Excel or CSV spreadsheet"
                  onPress={() => closeMenuAndRun(() => setBulkUploadVisible(true))}
                />
              )}

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

        <Modal
          visible={bulkUploadVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBulkUploadVisible(false)}
        >
          <Pressable
            style={localStyles.backdrop}
            onPress={() => setBulkUploadVisible(false)}
          >
            <Pressable style={localStyles.bottomMenu} onPress={(e) => e.stopPropagation()}>
              <View style={localStyles.menuHandle} />
              
              <Text style={localStyles.modalTitle}>Bulk Upload Orders</Text>
              <Text style={localStyles.modalSubtitle}>
                Add multiple stops at once using an Excel or CSV file.
              </Text>

              <MenuRow
                icon="⬇"
                title="Download sample file"
                subtitle="Get the 1-column template (Address)"
                onPress={() => {
                  setBulkUploadVisible(false);
                  downloadSampleTemplate();
                }}
              />

              <MenuRow
                icon="▤"
                title="Upload Excel file"
                subtitle="Upload CSV or Excel with your stop list"
                onPress={() => {
                  setBulkUploadVisible(false);
                  if (onImportRouteManifest) {
                    onImportRouteManifest();
                  }
                }}
              />

              <Pressable
                style={[localStyles.secondaryButton, { marginTop: 16 }]}
                onPress={() => setBulkUploadVisible(false)}
              >
                <Text style={localStyles.secondaryButtonText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={reviewStops && reviewStops.length > 0}
          transparent
          animationType="slide"
          onRequestClose={handleCancelReview}
        >
          <View style={[localStyles.backdrop, { justifyContent: 'center' }]}>
            <View style={localStyles.reviewContainer}>
              <View style={localStyles.reviewHeader}>
                <View>
                  <Text style={localStyles.reviewTitle}>Review Imported Stops</Text>
                  <Text style={localStyles.reviewSubtitle}>
                    {reviewStops.length} address{reviewStops.length === 1 ? '' : 'es'} found in manifest
                  </Text>
                </View>
              </View>

              <ScrollView style={localStyles.reviewList} showsVerticalScrollIndicator={true}>
                {reviewStops.map((item, idx) => {
                  const isItemUk = isUkLocation(item);
                  return (
                    <View key={idx} style={[localStyles.reviewRow, !isItemUk && { borderColor: '#FECACA', borderWidth: 1, backgroundColor: '#FFF5F5' }]}>
                      <View style={localStyles.reviewRowContent}>
                        <Text style={localStyles.reviewRowTitle} numberOfLines={1}>
                          {item.title || `Stop ${idx + 1}`}
                        </Text>
                        <Text style={localStyles.reviewRowAddress} numberOfLines={2}>
                          {item.address}
                        </Text>
                        <View style={localStyles.reviewRowBadgeRow}>
                          {!isItemUk && (
                            <Text style={[localStyles.reviewRowBadge, { backgroundColor: '#FEE2E2', color: '#EF4444', fontWeight: 'bold' }]}>
                              ⚠️ Outside UK
                            </Text>
                          )}
                          {item.packages > 0 && (
                            <Text style={localStyles.reviewRowBadge}>
                              📦 {item.packages} pkg{item.packages === 1 ? '' : 's'}
                            </Text>
                          )}
                          {item.stop_type && (
                            <Text style={localStyles.reviewRowBadge}>
                              🏷️ {item.stop_type === 'delivery' ? 'Delivery' : 'Pickup'}
                            </Text>
                          )}
                          {item.notes ? (
                            <Text
                              style={[localStyles.reviewRowBadge, { backgroundColor: '#F1F5F9', color: '#475569' }]}
                              numberOfLines={1}
                            >
                              📝 {item.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                    <Pressable
                      style={localStyles.reviewDeleteButton}
                      onPress={() => handleDeletePendingStop(idx)}
                    >
                      <Text style={localStyles.reviewDeleteText}>×</Text>
                    </Pressable>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={localStyles.reviewFooter}>
                <Pressable style={localStyles.reviewCancelButton} onPress={handleCancelReview}>
                  <Text style={localStyles.reviewCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={localStyles.reviewConfirmButton} onPress={handleConfirmReview}>
                  <Text style={localStyles.reviewConfirmText}>Confirm ({reviewStops.length})</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={ukErrorVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUkErrorVisible(false)}
        >
          <View style={[localStyles.backdrop, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={localStyles.alertContainer}>
              <Text style={localStyles.alertTitle}>Invalid Locations Detected</Text>
              <Text style={localStyles.alertMessage}>
                Please give only locations that are from United Kingdom only.
              </Text>
              <Pressable
                style={localStyles.alertButton}
                onPress={() => setUkErrorVisible(false)}
              >
                <Text style={localStyles.alertButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
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
  liteFooter: {
    marginTop: 'auto',
    width: '100%',
  },
  footer: {
    width: '100%',
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
  reviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingBottom: 14,
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  reviewSubtitle: {
    fontSize: 13,
    color: '#7C8CA5',
    marginTop: 2,
  },
  reviewList: {
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    justifyContent: 'space-between',
  },
  reviewRowContent: {
    flex: 1,
    marginRight: 10,
  },
  reviewRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#172033',
  },
  reviewRowAddress: {
    fontSize: 12,
    color: '#7C8CA5',
    marginTop: 2,
  },
  reviewRowBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reviewRowBadge: {
    backgroundColor: '#EEF4FF',
    color: '#286EF0',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDeleteText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: -2,
  },
  reviewFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2F74F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE6F2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCancelText: {
    color: '#526174',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
    textAlign: 'center',
    marginTop: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#7C8CA5',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: '#2F74F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});