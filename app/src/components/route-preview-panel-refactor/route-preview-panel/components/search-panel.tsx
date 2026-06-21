import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { styles } from '../styles';
import type { RoutePreviewPanelProps } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { QuickAction } from './shared';

export function SearchPanel({
  isWide,
  searchText,
  suggestions,
  onSearchTextChange,
  onCloseSearch,
  onSelectSuggestion,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  return (
    <DraggableRouteSheet isWide={isWide} mode="large" initialSnap="top">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <View style={styles.searchHeader}>
        <View style={[styles.searchInputBox, styles.searchFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholder="Type to add a stop"
            placeholderTextColor="#64748B"
            autoFocus
            style={[
              styles.searchInput,
              Platform.OS === 'web' &&
              ({
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
              } as any),
            ]}
          />

          {searchText ? (
            <Pressable onPress={() => onSearchTextChange('')}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.searchSideIcon}>⌗</Text>
              <Text style={styles.searchSideIcon}>🎙</Text>
            </>
          )}
        </View>

        <Pressable onPress={onCloseSearch} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      {searchText.trim().length < 2 ? (
        <>
          <View style={styles.emptySearchBody}>
            <Text style={styles.emptyIcon}>▢</Text>
            <Text style={styles.emptyText}>
              Add your first stops to start{'\n'}creating your route
            </Text>
          </View>

          <View style={styles.quickActions}>
            <QuickAction icon="▱" label="Map" />
            <QuickAction icon="⌗" label="Scan" />
            <QuickAction icon="🎙" label="Voice" />
          </View>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.searchSectionTitle}>Add a new stop</Text>

          {suggestions.map(item => (
            <Pressable
              key={item.id}
              style={styles.suggestionRow}
              onPress={() => onSelectSuggestion(item)}
            >
              <Text style={styles.suggestionIcon}>▣</Text>

              <View style={styles.suggestionTextBox}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}

          <Pressable style={styles.suggestionRow}>
            <Text style={styles.suggestionIcon}>▱</Text>
            <View style={styles.suggestionTextBox}>
              <Text style={styles.suggestionTitle}>Choose on map</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </ScrollView>
      )}
      </KeyboardAvoidingView>
    </DraggableRouteSheet>
  );
}
