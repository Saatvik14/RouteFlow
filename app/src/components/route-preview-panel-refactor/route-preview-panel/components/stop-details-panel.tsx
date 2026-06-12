import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { styles } from '../styles';
import type { RoutePreviewPanelProps, StopDetails } from '../types';
import { DraggableRouteSheet } from './draggable-route-sheet';
import { OptionSegment, Tag } from './shared';

export function StopDetailsPanel({
  isWide,
  selectedSuggestion,
  stopDetails,
  isAddingStop,
  onStopDetailsChange,
  onOpenSearch,
  onCloseSearch,
  onConfirmStopDetails,
}: RoutePreviewPanelProps & { isWide: boolean }) {
  const updateDetails = (patch: Partial<StopDetails>) => {
    onStopDetailsChange({
      ...stopDetails,
      ...patch,
    });
  };

  return (
    <DraggableRouteSheet isWide={isWide} mode="large">
      <View style={styles.searchHeader}>
        <Pressable style={styles.searchInputBox} onPress={onOpenSearch}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>Type to add more stops</Text>
          <Text style={styles.searchSideIcon}>⌗</Text>
          <Text style={styles.searchSideIcon}>🎙</Text>
        </Pressable>

        <Pressable onPress={onCloseSearch} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>
        <View style={styles.stopCard}>
          <View style={styles.tagsRow}>
            <Tag label="Blue" dot />
            <Tag label="ID Pending" />
            <View style={styles.addedTag}>
              <Text style={styles.addedTagText}>✓ Added</Text>
            </View>
          </View>

          <Text style={styles.detailsTitle}>{selectedSuggestion?.title || 'Selected stop'}</Text>
          <Text style={styles.detailsSubtitle}>{selectedSuggestion?.subtitle}</Text>

          <Pressable style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>＋ Access instructions</Text>
          </Pressable>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsRowIcon}>▣</Text>
          <TextInput
            value={stopDetails.notes}
            onChangeText={value => updateDetails({ notes: value })}
            placeholder="Add notes"
            placeholderTextColor="#94A3B8"
            style={styles.notesInput}
          />
          <Text style={styles.detailsRowIcon}>📷</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>▧</Text>
          <Text style={styles.optionLabel}>Package finder</Text>
          <Text style={styles.optionValue}>Not set</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>▱</Text>
          <Text style={styles.optionLabel}>Packages</Text>

          <View style={styles.counter}>
            <Pressable
              style={styles.counterButton}
              onPress={() => updateDetails({ packages: Math.max(1, stopDetails.packages - 1) })}
            >
              <Text style={styles.counterText}>−</Text>
            </Pressable>

            <Text style={styles.counterNumber}>{stopDetails.packages}</Text>

            <Pressable
              style={styles.counterButton}
              onPress={() => updateDetails({ packages: stopDetails.packages + 1 })}
            >
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
        </View>

        <OptionSegment
          icon="≡"
          label="Order"
          value={stopDetails.order}
          options={[
            { label: 'First', value: 'first' },
            { label: 'Auto', value: 'auto' },
            { label: 'Last', value: 'last' },
          ]}
          onChange={value => updateDetails({ order: value as StopDetails['order'] })}
        />

        <OptionSegment
          icon="⌄"
          label="Type"
          value={stopDetails.stopType}
          options={[
            { label: 'Delivery', value: 'delivery' },
            { label: 'Pickup', value: 'pickup' },
          ]}
          onChange={value => updateDetails({ stopType: value as StopDetails['stopType'] })}
        />

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>◷</Text>
          <Text style={styles.optionLabel}>Arrival time</Text>
          <Text style={styles.optionValue}>Anytime</Text>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionIcon}>⏱</Text>
          <Text style={styles.optionLabel}>Estimated time at stop</Text>
          <Text style={styles.optionValue}>Default</Text>
        </View>

        <Pressable style={styles.actionRow} onPress={onOpenSearch}>
          <Text style={styles.optionIcon}>⌕</Text>
          <Text style={styles.optionLabel}>Change address</Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.actionRow}>
          <Text style={styles.optionIcon}>▣</Text>
          <Text style={styles.optionLabel}>Duplicate stop</Text>
          <Text style={styles.rowArrow}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.addStopConfirmButton, isAddingStop && styles.buttonDisabled]}
          onPress={onConfirmStopDetails}
          disabled={isAddingStop}
        >
          <Text style={styles.addStopConfirmText}>
            {isAddingStop ? 'Adding stop...' : 'Add stop'}
          </Text>
        </Pressable>
      </ScrollView>
    </DraggableRouteSheet>
  );
}
