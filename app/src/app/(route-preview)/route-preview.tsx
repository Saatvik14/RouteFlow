import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, useWindowDimensions, View, Platform, FlatList, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapScreen from '../../components/maps/RouteMap';
import { CameraScanner } from '../../components/camera-scanner';
import { RoutePanel } from './../../components/route-panel';
import { RoutePreviewPanel } from './../../components/route-preview-panel-refactor/route-preview-panel';
import { TransitStopPanel } from './../../components/route-preview-panel-refactor/route-preview-panel/components/transit-stop-panel';
import { ReorderStopsPanel } from './../../components/route-preview-panel-refactor/route-preview-panel/components/reorder-stops-panel';
import {
  RouteCompletedPanel,
  RouteCompletionPromptPanel,
} from './../../components/route-preview-panel-refactor/route-preview-panel/components/completion-panels';
import { Sidebar } from './../../components/sidebar';
import {
  getParam,
  isFinishedStopStatus,
  isStatus,
  ROUTE_STATUS_COMPLETED,
} from './route-preview.helpers';
import { styles } from './route-preview.styles';
import { useRoutePreviewController } from './use-route-preview-controller';
import InAppNavigationOverlay from '../../components/maps/InAppNavigationOverlay';



export default function RoutePreviewScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const routeId = useMemo(() => getParam(params.id, ''), [params.id]);
  const shouldCarryPastStops = useMemo(
    () => getParam(params.carryPastStops as string | string[] | undefined, 'false') === 'true',
    [params.carryPastStops]
  );
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const hasAutoOpenedCopyStops = useRef(false);

  const {
    route,
    mapRoute,
    routeTitle,
    previewStartTime,
    routeMeta,
    panelMode,
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
    subscriptionType,
    searchText,
    suggestions,
    selectedSuggestion,
    stopDetails,
    isUpdatingStopStatus,
    isCancellingRoute,
    isCompletingRoute,
    isRetryingFailedStops,
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
    handleMarkRouteCompleted,
    handleRetryFailedStops,
    handleCancelRoute,
    handleCreateNewRoute,
    handleScanAddress: controllerHandleScanAddress,
    handleVoiceAddress,
    handleScanRouteManifest,
    handleImportRouteManifest,
    handleCopyStopsFromPastRoute,
    handleSkipOptimization,
    handleRemoveStops,
    editingStop,
    isSavingRouteEdit,
    isSavingStopOrder,
    handleOpenReorderStops,
    handleCancelReorderStops,
    handleSaveStopOrder,
    handleOpenEditRoute,
    handleCancelEditRoute,
    handleBackFromEditStop,
    handleOpenEditStartLocation,
    handleOpenEditEndLocation,
    handleOpenEditStartTime,
    handleSaveRouteLocation,
    handleSaveRouteTime,
    handleOpenEditStop,
    handleSaveEditedStop,
    handleOpenEditStopAddress,
    handleSaveStopAddress,
    handleRemoveEditedStop,
    handleReOptimizeEditedRoute,
    pendingManifestStops,
    handleConfirmManifestStops,
    handleCancelManifestStops,
    isNavigating,
    navigationTargetStop,
    handleExitNavigation,
    userLocation,
    setUserLocation,
    isCopyStopsModalOpen,
    setIsCopyStopsModalOpen,
    allPastRoutes,
    pastRouteStops,
    pastRouteTitle,
    selectedPastRouteId,
    selectedPastStopKeys,
    isLoadingPastRoutes,
    isLoadingStops,
    togglePastStopSelection,
    togglePastStopsBatch,
    handleSwitchPastRoute,
    handleConfirmCopyStops,
    handleToggleMockingLocation,
    handleSaveStopPriority,
  } = useRoutePreviewController(routeId);

  const handleScanAddress = () => {
    setIsScannerVisible(true);
  };

  // Auto-open copy stops modal when navigated with carryPastStops=true
  useEffect(() => {
    if (shouldCarryPastStops && route && !hasAutoOpenedCopyStops.current) {
      hasAutoOpenedCopyStops.current = true;
      handleCopyStopsFromPastRoute();
    }
  }, [shouldCarryPastStops, route, handleCopyStopsFromPastRoute]);

  const failedStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status === 'failed');
  }, [pastRouteStops]);

  const doneStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status === 'delivered' || item.status === 'completed');
  }, [pastRouteStops]);

  const skippedStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status !== 'failed' && item.status !== 'delivered' && item.status !== 'completed');
  }, [pastRouteStops]);

  const allStopsResolved = useMemo(() => {
    if (!route?.stops?.length) return false;

    return route.stops.every((stop: any) =>
      isFinishedStopStatus(stop?.status || stop?.orderStatus || stop?.order_status),
    );
  }, [route?.stops]);

  const isCompletedRoute = useMemo(
    () => isStatus(routeStatus, ROUTE_STATUS_COMPLETED),
    [routeStatus],
  );

  const explicitPanelModes = [
  'reorder_stops',
  'search',
  'details',
  'setup',
  'edit_route',
  'edit_start_location',
  'edit_end_location',
  'edit_start_time',
  'edit_stop',
  'edit_stop_address',
];

const activePanelMode = explicitPanelModes.includes(panelMode)
  ? panelMode
  : resolvedPanelMode;

  const handleToggleCategory = (categoryStops: any[]) => {
    const allSelected = categoryStops.length > 0 && categoryStops.every(s => !!selectedPastStopKeys[s.id]);
    const stopIds = categoryStops.map(s => s.id);
    togglePastStopsBatch(stopIds, !allSelected);
  };

  const renderCategorySection = (
    title: string,
    stops: any[],
    iconComponent: React.ReactNode,
    emptyText: string
  ) => {
    const isChecked = stops.length > 0 && stops.every(stop => !!selectedPastStopKeys[stop.id]);
    
    return (
      <View style={{ marginBottom: 20 }}>
        {/* Category Header */}
        <Pressable
          onPress={() => handleToggleCategory(stops)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons
              name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
              size={22}
              color={isChecked ? "#2F76F6" : "#CBD5E1"}
            />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#475569', marginLeft: 12 }}>
              {title}
            </Text>
          </View>
          {iconComponent}
        </Pressable>

        {/* Category Stops List */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          {stops.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#94A3B8' }}>{emptyText}</Text>
            </View>
          ) : (
            stops.map((stop, index) => {
              const isStopChecked = !!selectedPastStopKeys[stop.id];
              return (
                <Pressable
                  key={stop.id}
                  onPress={() => togglePastStopSelection(stop.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isStopChecked ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isStopChecked ? '#BFDBFE' : '#E2E8F0',
                    padding: 16,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    <MaterialCommunityIcons
                      name={isStopChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={22}
                      color={isStopChecked ? "#2F76F6" : "#CBD5E1"}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                      {stop.title || 'Untitled Stop'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={2}>
                      {stop.address || stop.description || 'No address'}
                    </Text>
                  </View>

                  <View style={{
                    backgroundColor: '#DBEAFE',
                    borderRadius: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginLeft: 8,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                      A{stop.sequence || index + 1}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    );
  };

 
  return (
    <GestureHandlerRootView style={styles.root}>
      <MapScreen
        confirmedRoute={mapRoute}
        mapType={mapType}
        centerSignal={centerSignal}
        isNavigating={isNavigating}
        userLocation={userLocation}
      />

      {isNavigating ? (
        <InAppNavigationOverlay
          targetStop={navigationTargetStop}
          userLocation={userLocation}
          onExit={handleExitNavigation}
          onSimulateLocationUpdate={setUserLocation}
          onToggleSimulationMode={handleToggleMockingLocation}
        />
      ) : (
        <>
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
      ) : !isInitialLoading &&
        route &&
        activePanelMode === 'reorder_stops' ? (
        <ReorderStopsPanel
          isWide={isWide}
          start={route.start}
          end={route.end}
          stops={route.stops}
          isSaving={isSavingStopOrder}
          errorMessage={errorMessage}
          onCancel={handleCancelReorderStops}
          onSave={handleSaveStopOrder}
        />
      ) : !isInitialLoading && route && isCompletedRoute ? (
        <RouteCompletedPanel
          isWide={isWide}
          routeName={routeTitle}
          stops={route.stops}
          durationLabel={routeMeta.durationLabel}
          distanceLabel={routeMeta.distanceLabel}
          isRetryingFailedStops={isRetryingFailedStops}
          onRetryFailedStops={handleRetryFailedStops}
          onCreateNewRoute={handleCreateNewRoute}
        />
      ) : !isInitialLoading &&
        route &&
        activePanelMode === 'transit' &&
        allStopsResolved ? (
        <RouteCompletionPromptPanel
          isWide={isWide}
          routeName={routeTitle}
          startTime={previewStartTime}
          start={route.start}
          end={route.end}
          stops={route.stops}
          durationLabel={routeMeta.durationLabel}
          distanceLabel={routeMeta.distanceLabel}
          isCompletingRoute={isCompletingRoute}
          onMarkRouteCompleted={handleMarkRouteCompleted}
        />
      ) : !isInitialLoading && route && activePanelMode === 'transit' ? (
        <TransitStopPanel
          isWide={isWide}
          mode={activePanelMode}
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
          isCompletingRoute={isCompletingRoute}
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
          onOpenStopDetails={handleOpenStopDetails}
          onStopDetailsChange={handleStopDetailsChange}
          onConfirmStopDetails={handleConfirmStopDetails}
          onOptimizeRoute={handleOptimizeRoute}
          onRefine={handleRefineRoute}
          onConfirm={handleConfirmRoute}
          onStartRoute={handleStartRoute}
          onNavigateActiveStop={handleNavigateActiveStop}
          onMarkStopDelivered={handleMarkStopDelivered}
          onMarkStopFailed={handleMarkStopFailed}
          onMarkRouteCompleted={handleMarkRouteCompleted}
          onCancelRoute={handleCancelRoute}
          onCreateNewRoute={handleCreateNewRoute}
          onScanAddress={handleScanAddress}
          onVoiceAddress={handleVoiceAddress}
          onScanRouteManifest={handleScanRouteManifest}
          onImportRouteManifest={handleImportRouteManifest}
          onCopyStopsFromPastRoute={handleCopyStopsFromPastRoute}
          onSkipOptimization={handleSkipOptimization}
          onRemoveStops={handleRemoveStops}
          editingStop={editingStop as any}
          isSavingRouteEdit={isSavingRouteEdit}
          isOptimizing={isOptimizing}
          onOpenEditRoute={handleOpenEditRoute}
          onCancelEditRoute={handleCancelEditRoute}
          onBackFromEditStop={handleBackFromEditStop}
          onOpenEditStartLocation={handleOpenEditStartLocation}
          onOpenEditEndLocation={handleOpenEditEndLocation}
          onOpenEditStartTime={handleOpenEditStartTime}
          onSaveRouteLocation={handleSaveRouteLocation}
          onSaveRouteTime={handleSaveRouteTime}
          onOpenEditStop={handleOpenEditStop}
          onSaveEditedStop={handleSaveEditedStop}
          onOpenEditStopAddress={handleOpenEditStopAddress}
          onSaveStopAddress={handleSaveStopAddress}
          onRemoveEditedStop={handleRemoveEditedStop}
          onReOptimizeEditedRoute={handleReOptimizeEditedRoute}
          onAddAnotherStop={handleOpenSearch}
          onOpenReorderStops={handleOpenReorderStops}

        />
      ) : !isInitialLoading && route ? (
        <RoutePreviewPanel
          mode={activePanelMode}
          subscriptionType={subscriptionType}
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
          onCancelRoute={handleCancelRoute}
          editingStop={editingStop as any}
          isSavingRouteEdit={isSavingRouteEdit}
          isSavingStopOrder={isSavingStopOrder}
          onOpenReorderStops={handleOpenReorderStops}
          onCancelReorderStops={handleCancelReorderStops}
          onSaveStopOrder={handleSaveStopOrder}
          isOptimizing={isOptimizing}
          onOpenEditRoute={handleOpenEditRoute}
          onCancelEditRoute={handleCancelEditRoute}
          onBackFromEditStop={handleBackFromEditStop}
          onOpenEditStartLocation={handleOpenEditStartLocation}
          onOpenEditEndLocation={handleOpenEditEndLocation}
          onOpenEditStartTime={handleOpenEditStartTime}
          onSaveRouteLocation={handleSaveRouteLocation}
          onSaveRouteTime={handleSaveRouteTime}
          onOpenEditStop={handleOpenEditStop}
          onSaveEditedStop={handleSaveEditedStop}
          onOpenEditStopAddress={handleOpenEditStopAddress}
          onSaveStopAddress={handleSaveStopAddress}
          onRemoveEditedStop={handleRemoveEditedStop}
          onReOptimizeEditedRoute={handleReOptimizeEditedRoute}
          onAddAnotherStop={handleOpenSearch}
          pendingManifestStops={pendingManifestStops}
          onConfirmManifestStops={handleConfirmManifestStops}
          onCancelManifestStops={handleCancelManifestStops}
          onSaveStopPriority={handleSaveStopPriority}
          errorMessage={errorMessage}
        />
      ) : null}
        </>
      )}

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

      <Modal
        animationType="slide"
        transparent={false}
        visible={isScannerVisible}
        onRequestClose={() => setIsScannerVisible(false)}>
        <CameraScanner
          onClose={() => setIsScannerVisible(false)}
          onTextRecognized={(text) => setSearchText(text)}
        />
      </Modal>

      {/* Past Routes Picker Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isCopyStopsModalOpen}
        onRequestClose={() => {
          setIsCopyStopsModalOpen(false);
          setIsRouteDropdownOpen(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
          {/* Header Bar */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 16,
          }}>
            <Pressable
              onPress={() => {
                setIsCopyStopsModalOpen(false);
                setIsRouteDropdownOpen(false);
              }}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#64748B" />
            </Pressable>
            
            <Pressable style={{ padding: 8, marginRight: -8 }}>
              <MaterialCommunityIcons name="magnify" size={24} color="#64748B" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
              Carry over stops
            </Text>

            {/* Dropdown Input Selector */}
            <Pressable
              onPress={() => setIsRouteDropdownOpen(!isRouteDropdownOpen)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 15, color: '#64748B' }}>
                From: <Text style={{ color: '#0F172A', fontWeight: '500' }}>{pastRouteTitle || 'Select past route...'}</Text>
              </Text>
              <MaterialCommunityIcons 
                name="chevron-down" 
                size={20} 
                color="#64748B" 
              />
            </Pressable>
          </View>

          {/* Collapsible Dropdown Options Menu */}
          {isRouteDropdownOpen && (
            <View style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 190 : 170,
              left: 20,
              right: 20,
              maxHeight: 200,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 4,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
              zIndex: 9999,
            }}>
              <ScrollView nestedScrollEnabled={true}>
                {allPastRoutes.length === 0 ? (
                  <Text style={{ padding: 12, fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                    No other routes available
                  </Text>
                ) : (
                  allPastRoutes.map((item) => {
                    const itemRouteId = String(item.route_id || item.id || item.routeId);
                    const isSelected = itemRouteId === selectedPastRouteId;
                    return (
                      <Pressable
                        key={itemRouteId}
                        onPress={() => {
                          handleSwitchPastRoute(itemRouteId, item.name || item.routeName || item.title || 'Untitled Route');
                          setIsRouteDropdownOpen(false);
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: isSelected ? '600' : '400',
                          color: isSelected ? '#1D4ED8' : '#334155',
                        }}>
                          {item.name || item.routeName || item.title || 'Untitled Route'}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {isLoadingPastRoutes || isLoadingStops ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2F76F6" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 15 }}>
                {isLoadingPastRoutes ? 'Loading past routes...' : 'Loading route stops...'}
              </Text>
            </View>
          ) : pastRouteStops.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <MaterialCommunityIcons name="map-marker-off" size={60} color="#94A3B8" />
              <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#475569' }}>No stops found</Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: '#94A3B8', textAlign: 'center' }}>
                The selected route does not have any stops to copy.
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 100 }}
              >
                {/* 1. Failed Stops Section */}
                {renderCategorySection(
                  "Failed stops",
                  failedStops,
                  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />
                    <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="close-circle" size={10} color="#EF4444" />
                    </View>
                  </View>,
                  "No failed stops on this route"
                )}

                {/* 2. Skipped Stops Section */}
                {renderCategorySection(
                  "Skipped stops",
                  skippedStops,
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />,
                  "No skipped stops on this route"
                )}

                {/* 3. Done Stops Section */}
                {renderCategorySection(
                  "Done stops",
                  doneStops,
                  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />
                    <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="check-circle" size={10} color="#22C55E" />
                    </View>
                  </View>,
                  "No done stops on this route"
                )}
              </ScrollView>

              {/* Action Button at bottom */}
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}>
                {errorMessage ? (
                  <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
                    {errorMessage}
                  </Text>
                ) : null}
                
                <Pressable
                  onPress={handleConfirmCopyStops}
                  style={({ pressed }) => ({
                    backgroundColor: Object.values(selectedPastStopKeys).filter(Boolean).length === 0 ? '#93C5FD' : '#2F76F6',
                    borderRadius: 12,
                    height: 52,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                    Copy {Object.values(selectedPastStopKeys).filter(Boolean).length} {Object.values(selectedPastStopKeys).filter(Boolean).length === 1 ? 'stop' : 'stops'} to {routeTitle ? routeTitle.replace(/\s*[Rr]oute\s*/, '') : 'Monday'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}
