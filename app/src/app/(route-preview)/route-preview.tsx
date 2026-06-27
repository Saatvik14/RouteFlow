import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapScreen from '../../components/maps/RouteMap';
import { RoutePanel } from './../../components/route-panel';
import { RoutePreviewPanel } from './../../components/route-preview-panel-refactor/route-preview-panel';
import { TransitStopPanel } from './../../components/route-preview-panel-refactor/route-preview-panel/components/transit-stop-panel';
import { Sidebar } from './../../components/sidebar';
import { getParam, ROUTE_STATUS_IN_ARCHIVE } from './route-preview.helpers';
import { styles } from './route-preview.styles';
import { useRoutePreviewController } from './use-route-preview-controller';

export { ROUTE_STATUS_IN_ARCHIVE };

export default function RoutePreviewScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const routeId = useMemo(() => getParam(params.id, ''), [params.id]);

  const {
    route,
    mapRoute,
    routeTitle,
    previewStartTime,
    routeMeta,
    resolvedPanelMode,
    mapType,
    centerSignal,
    isInitialLoading,
    isOptimizing,
    isStartingRoute,
    isAddingStop,
    routeStatus,
    isSidebarOpen,
    errorMessage,
    searchText,
    suggestions,
    selectedSuggestion,
    stopDetails,
    isUpdatingStopStatus,
    isCancellingRoute,
    activeStopInfo,
    setSearchText,
    setIsSidebarOpen,
    recenterMap,
    handleToggleMapType,
    handleOpenSearch,
    handleCloseSearch,
    handleSelectSuggestion,
    handleOpenStopDetails,
    handleStopDetailsChange,
    handleConfirmStopDetails,
    handleOptimizeRoute,
    handleRefineRoute,
    handleConfirmRoute,
    handleStartRoute,
    handleNavigateActiveStop,
    handleMarkStopDelivered,
    handleMarkStopFailed,
    handleCancelRoute,
    handleCreateNewRoute,
    handleScanAddress,
    handleVoiceAddress,
    handleScanRouteManifest,
    handleImportRouteManifest,
    handleCopyStopsFromPastRoute,
    handleSkipOptimization,
    handleRemoveStops,
  } = useRoutePreviewController(routeId);

  return (
    <GestureHandlerRootView style={styles.root}>
      <MapScreen
        confirmedRoute={mapRoute}
        mapType={mapType}
        centerSignal={centerSignal}
      />

      <Pressable
        style={[
          styles.menuButton,
          {
            top: insets.top + 16,
          },
        ]}
        onPress={() => setIsSidebarOpen(true)}
      >
        <View style={styles.hamburger}>
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
          <View style={styles.hamburgerBar} />
        </View>
      </Pressable>

      <View
        style={[
          styles.mapControls,
          {
            top: insets.top + 16,
          },
        ]}
      >
        <Pressable style={styles.mapControlButton} onPress={handleToggleMapType}>
          <MaterialCommunityIcons
            name={mapType === 'standard' ? 'map' : 'satellite'}
            size={22}
            color="#2F76F6"
          />
        </Pressable>

        <Pressable style={styles.mapControlButton} onPress={recenterMap}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#2F76F6" />
        </Pressable>
      </View>

      {isInitialLoading ? (
        <View
          style={[
            styles.loadingCard,
            {
              bottom: Math.max(insets.bottom + 24, 34),
            },
          ]}
        >
          <ActivityIndicator color="#2F76F6" />
          <Text style={styles.loadingText}>Preparing route...</Text>
        </View>
      ) : null}

      {!isInitialLoading && errorMessage ? (
        <View
          style={[
            styles.errorCard,
            {
              bottom: Math.max(insets.bottom + 24, 34),
            },
          ]}
        >
          <Text style={styles.errorTitle}>Unable to load route</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!isInitialLoading && !route ? (
        <RoutePanel />
      ) : !isInitialLoading && route && resolvedPanelMode === 'transit' ? (
        <TransitStopPanel
          isWide={isWide}
          mode={resolvedPanelMode}
          routeName={routeTitle}
          startTime={previewStartTime}
          start={route.start}
          end={route.end}
          stops={route.stops}
          durationLabel={routeMeta.durationLabel}
          distanceLabel={routeMeta.distanceLabel}
          routeStatus={routeStatus}
          activeStop={activeStopInfo.stop}
          activeStopIndex={activeStopInfo.index}
          totalActiveStops={activeStopInfo.total}
          isUpdatingStopStatus={isUpdatingStopStatus}
          isCancellingRoute={isCancellingRoute}
          isCompletingRoute={false}
          searchText={searchText}
          suggestions={suggestions}
          selectedSuggestion={selectedSuggestion}
          stopDetails={stopDetails}
          isAddingStop={isAddingStop}
          isStartingRoute={isStartingRoute}
          onSearchTextChange={setSearchText}
          onOpenSearch={handleOpenSearch}
          onCloseSearch={handleCloseSearch}
          onSelectSuggestion={handleSelectSuggestion}
          onSelectStop={handleOpenStopDetails}
          onOpenStopDetails={handleOpenStopDetails}
          onStopPress={handleOpenStopDetails}
          onStopDetailsChange={handleStopDetailsChange}
          onConfirmStopDetails={handleConfirmStopDetails}
          onOptimizeRoute={handleOptimizeRoute}
          onRefine={handleRefineRoute}
          onConfirm={handleConfirmRoute}
          onStartRoute={handleStartRoute}
          onNavigateActiveStop={handleNavigateActiveStop}
          onMarkStopDelivered={handleMarkStopDelivered}
          onMarkStopFailed={handleMarkStopFailed}
          onMarkRouteCompleted={handleCreateNewRoute}
          onCancelRoute={handleCancelRoute}
          onCreateNewRoute={handleCreateNewRoute}
          onScanAddress={handleScanAddress}
          onVoiceAddress={handleVoiceAddress}
          onScanRouteManifest={handleScanRouteManifest}
          onImportRouteManifest={handleImportRouteManifest}
          onCopyStopsFromPastRoute={handleCopyStopsFromPastRoute}
          onSkipOptimization={handleSkipOptimization}
          onRemoveStops={handleRemoveStops}
        />
      ) : !isInitialLoading && route ? (
        <RoutePreviewPanel
          mode={resolvedPanelMode}
          routeName={routeTitle}
          startTime={previewStartTime}
          start={route.start}
          end={route.end}
          stops={route.stops}
          durationLabel={routeMeta.durationLabel}
          distanceLabel={routeMeta.distanceLabel}
          routeStatus={routeStatus}
          activeStop={activeStopInfo.stop}
          activeStopIndex={activeStopInfo.index}
          totalActiveStops={activeStopInfo.total}
          isUpdatingStopStatus={isUpdatingStopStatus}
          searchText={searchText}
          suggestions={suggestions}
          selectedSuggestion={selectedSuggestion}
          stopDetails={stopDetails}
          isAddingStop={isAddingStop}
          isStartingRoute={isStartingRoute}
          onSearchTextChange={setSearchText}
          onOpenSearch={handleOpenSearch}
          onCloseSearch={handleCloseSearch}
          onSelectSuggestion={handleSelectSuggestion}
          onSelectStop={handleOpenStopDetails}
          onOpenStopDetails={handleOpenStopDetails}
          onStopPress={handleOpenStopDetails}
          onStopDetailsChange={handleStopDetailsChange}
          onConfirmStopDetails={handleConfirmStopDetails}
          onOptimizeRoute={handleOptimizeRoute}
          onRefine={handleRefineRoute}
          onConfirm={handleConfirmRoute}
          onStartRoute={handleStartRoute}
          onNavigateActiveStop={handleNavigateActiveStop}
          onMarkStopDelivered={handleMarkStopDelivered}
          onMarkStopFailed={handleMarkStopFailed}
          onCreateNewRoute={handleCreateNewRoute}
          onScanAddress={handleScanAddress}
          onVoiceAddress={handleVoiceAddress}
          onScanRouteManifest={handleScanRouteManifest}
          onImportRouteManifest={handleImportRouteManifest}
          onCopyStopsFromPastRoute={handleCopyStopsFromPastRoute}
          onSkipOptimization={handleSkipOptimization}
          onRemoveStops={handleRemoveStops}
        />
      ) : null}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isOptimizing ? (
        <View style={styles.optimizingOverlay}>
          <View style={styles.optimizingCard}>
            <Text style={styles.optimizingTitle}>Optimizing route</Text>
            <Text style={styles.optimizingArt}>⌖</Text>
            <Text style={styles.optimizingText}>Analyzing your stops...</Text>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}
