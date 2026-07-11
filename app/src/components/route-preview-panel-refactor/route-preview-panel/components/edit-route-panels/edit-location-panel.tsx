import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableRouteSheet } from './../draggable-route-sheet';
import {
  BaseEditProps,
  Card,
  COLORS,
  getAddress,
  Header,
  PlaceSuggestion,
  Row,
  SectionTitle,
  sharedStyles,
} from './edit-route-shared';

export function EditLocationPanel({
  isWide,
  target,
  currentLocation,
  routeName,
  searchText = '',
  suggestions = [],
  isSavingRouteEdit,
  onSearchTextChange,
  onCancelEditRoute,
  onSaveRouteLocation,
  onSaveStopAddress,
}: BaseEditProps & {
  target: 'start' | 'end' | 'stop';
  currentLocation?: any;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);

  const isStop = target === 'stop';
  const title = isStop
    ? 'Change stop address'
    : target === 'start'
      ? 'Edit start location'
      : 'Edit end location';

  const currentTitle = isStop
    ? 'Current stop address'
    : 'Current selected address';

  const handleSave = () => {
    if (!selected) return;

    if (isStop) {
      onSaveStopAddress?.(selected);
      return;
    }

    onSaveRouteLocation?.(target, selected);
  };

  return (
    <DraggableRouteSheet isWide={isWide} initialSnap="top">
      <View style={sharedStyles.panel}>
        <Header
          title={title}
          rightLabel="Save"
          onBack={onCancelEditRoute}
          onRightPress={handleSave}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 120, 150),
          }}
        >
          {routeName && !isStop ? (
            <Text style={styles.smallRouteName}>{routeName}</Text>
          ) : null}

          <SectionTitle>Search address</SectionTitle>

          <View style={styles.searchBox}>
            <TextInput
              value={searchText}
              onChangeText={onSearchTextChange}
              placeholder="Search address"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            <Feather name="search" size={23} color="#475569" />
          </View>

          <View
            style={[
              styles.currentAddressBox,
              isStop ? styles.stopAddressBox : null,
            ]}
          >
            <View
              style={[
                styles.currentAddressIcon,
                isStop ? styles.stopAddressIcon : null,
              ]}
            >
              <Feather
                name="map-pin"
                size={23}
                color={isStop ? '#F59E0B' : COLORS.primary}
              />
            </View>

            <View style={sharedStyles.rowTextWrap}>
              <Text
                style={[
                  styles.currentAddressTitle,
                  isStop ? styles.stopCurrentText : null,
                ]}
              >
                {currentTitle}
              </Text>

              <Text style={styles.currentAddressText}>
                {getAddress(currentLocation) || 'No address selected'}
              </Text>
            </View>
          </View>

          <SectionTitle>Suggestions</SectionTitle>

          <Card>
            {suggestions.length ? (
              suggestions.map((item, index) => {
                const active =
                  selected?.id === item.id &&
                  selected?.fullAddress === item.fullAddress;

                return (
                  <Pressable
                    key={String(item.id || item.fullAddress || index)}
                    style={[
                      styles.suggestionRow,
                      active ? styles.suggestionRowActive : null,
                    ]}
                    onPress={() => setSelected(item)}
                  >
                    <View style={sharedStyles.rowIcon}>
                      <Feather
                        name={isStop ? 'search' : 'map-pin'}
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={sharedStyles.rowTextWrap}>
                      <Text style={sharedStyles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      {item.subtitle ? (
                        <Text
                          style={sharedStyles.rowSubtitle}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>

                    <Feather
                      name={active ? 'check' : 'chevron-right'}
                      size={active ? 20 : 22}
                      color={active ? COLORS.primary : COLORS.muted}
                    />
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptySuggestionBox}>
                <Text style={styles.emptySuggestionText}>
                  Type at least 2 letters to search addresses.
                </Text>
              </View>
            )}
          </Card>

          <SectionTitle>Other options</SectionTitle>

          <Card>
            <Row
              icon={<Feather name="crosshair" size={20} color={COLORS.primary} />}
              title="Use current location"
              onPress={() => {}}
            />
            <Row
              icon={<Feather name="map" size={20} color={COLORS.primary} />}
              title="Choose on map"
              onPress={() => {}}
            />
          </Card>
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
            <Text style={sharedStyles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[
              sharedStyles.primaryButton,
              !selected || isSavingRouteEdit
                ? sharedStyles.disabledButton
                : null,
            ]}
            onPress={handleSave}
            disabled={!selected || isSavingRouteEdit}
          >
            <Text style={sharedStyles.primaryButtonText}>
              {isSavingRouteEdit
                ? 'Saving...'
                : isStop
                  ? 'Save address'
                  : 'Save location'}
            </Text>
          </Pressable>
        </View>
      </View>
    </DraggableRouteSheet>
  );
}

const styles = StyleSheet.create({
  smallRouteName: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 22,
    marginTop: 18,
  },
  searchBox: {
    marginHorizontal: 22,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.title,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 12,
  },
  currentAddressBox: {
    marginHorizontal: 22,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: COLORS.blueBackground,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  stopAddressBox: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  currentAddressIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopAddressIcon: {
    backgroundColor: '#FFEDD5',
  },
  currentAddressTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  stopCurrentText: {
    color: '#D97706',
  },
  currentAddressText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginTop: 4,
  },
  suggestionRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  suggestionRowActive: {
    backgroundColor: COLORS.blueBackground,
  },
  emptySuggestionBox: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptySuggestionText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
