import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ordersService } from './../../services/api/orders';
import { routesService } from './../../services/api/routes';
import {
  addManifestStopsToBackend,
  buildManifestOrderPayloads,
  importRouteManifestFromFile,
  listenForVoiceAddress,
  resolveAddressText,
  scanAddressFromCamera,
  scanRouteManifestFromCamera,
} from './route-preview-input.service';
import type { RouteMapType } from '../../components/maps/RouteMap';
import type {
  AppRoute,
  PanelMode,
  PlaceSuggestion,
  RouteMeta,
  RouteStatus,
  RouteStop,
  StopDetails,
} from './route-preview.types';
import {
  buildMapDisplayRoute,
  buildOrderPayload,
  buildRouteFromBackendResponse,
  buildStopDetailsFromStop,
  buildStopFromSavedOrder,
  buildSuggestionFromStop,
  DEFAULT_POINT,
  DEFAULT_STOP_DETAILS,
  fetchPlaceSuggestions,
  fetchRoutePath,
  formatDistance,
  formatDuration,
  getActiveStop,
  getInitialCoordinates,
  getMapsNavigationUrl,
  getOptimizedRouteData,
  getOptimizedSteps,
  getResolvedAddressSuggestions,
  getResolvedManifestRows,
  getOptimizePayload,
  getPanelModeFromStatus,
  getResponseErrorMessage,
  getRoutePoints,
  getStopBackendId,
  getStopIdentity,
  hasDetailedRoadPath,
  isInTransitStatus,
  isOptimizedStatus,
  isStatus,
  isSuccessResponse,
  normalizeRouteStatus,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_FAILED,
  persistRouteSnapshot,
  ROUTE_STATUS_COMPLETED,
  ROUTE_STATUS_IN_TRANSIT,
  ROUTE_STATUS_OPTIMIZED,
  ROUTE_STATUS_PENDING,
  updateOrderStatusOnBackend,
  unwrapOrderPayload,
  ROUTE_STATUS_CANCELLED,
  isCancelledRouteStatus,
  isPendingOrderStatus,
  buildRouteLocationPayload,
buildRoutePointFromSuggestion,
formatTimeFromDateTime
} from './route-preview.helpers';




type UseRoutePreviewControllerResult = {
  route: AppRoute | null;
  mapRoute: any;
  routeTitle: string;
  previewStartTime: string;
  routeMeta: RouteMeta;
  panelMode: PanelMode;
  resolvedPanelMode: any;
  mapType: RouteMapType;
  centerSignal: number;
  isInitialLoading: boolean;
  isOptimizing: boolean;
  isStartingRoute: boolean;
  isAddingStop: boolean;
  routeStatus: RouteStatus;
  isSidebarOpen: boolean;
  errorMessage: string;
  searchText: string;
  suggestions: PlaceSuggestion[];
  selectedSuggestion: PlaceSuggestion | null;
  stopDetails: StopDetails;
  isUpdatingStopStatus: boolean;
  isCancellingRoute: boolean;
  activeStopInfo: ReturnType<typeof getActiveStop>;
  setSearchText: (value: string) => void;
  setIsSidebarOpen: (value: boolean) => void;
  recenterMap: () => void;
  handleToggleMapType: () => void;
  handleOpenSearch: () => void;
  handleCloseSearch: () => void;
  handleSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  handleOpenStopDetails: (stop: RouteStop) => void;
  handleStopDetailsChange: (details: StopDetails) => void;
  handleConfirmStopDetails: () => Promise<void>;
  handleOptimizeRoute: () => Promise<void>;
  handleRefineRoute: () => void;
  handleConfirmRoute: () => Promise<void>;
  handleStartRoute: () => Promise<void>;
  handleNavigateActiveStop: (stop?: any) => Promise<void>;
  handleMarkStopDelivered: () => Promise<void>;
  handleMarkStopFailed: () => Promise<void>;
  handleCancelRoute: () => Promise<void>;
  handleCreateNewRoute: () => void;
  handleScanAddress: () => Promise<void>;
  handleVoiceAddress: () => Promise<void>;
  handleScanRouteManifest: () => Promise<void>;
  handleImportRouteManifest: () => Promise<void>;
  handleCopyStopsFromPastRoute: () => void;
  handleSkipOptimization: () => Promise<void>;
  handleRemoveStops: () => void;
  editingStop: RouteStop | null;
  isSavingRouteEdit: boolean;
  handleOpenEditRoute: () => void;
  handleCancelEditRoute: () => void;
  handleOpenEditStartLocation: () => void;
  handleOpenEditEndLocation: () => void;
  handleOpenEditStartTime: () => void;
  handleSaveRouteLocation: (target: 'start' | 'end', suggestion: PlaceSuggestion) => Promise<void>;
  handleSaveRouteTime: (target: 'start' | 'end', isoDateTime: string) => Promise<void>;
  handleOpenEditStop: (stop: RouteStop) => void;
  handleSaveEditedStop: (details: StopDetails) => Promise<void>;
  handleOpenEditStopAddress: (stop?: RouteStop) => void;
  handleSaveStopAddress: (suggestion: PlaceSuggestion) => Promise<void>;
  handleRemoveEditedStop: () => Promise<void>;
  handleReOptimizeEditedRoute: () => Promise<void>;
  pendingManifestStops: any[];
  handleConfirmManifestStops: (selectedStops: any[]) => Promise<void>;
  handleCancelManifestStops: () => void;
  isNavigating: boolean;
  navigationTargetStop: any | null;
  handleExitNavigation: () => void;
  userLocation: any;
  setUserLocation: (location: any) => void;
  handleToggleMockingLocation: (active: boolean) => void;
};

function getLatestRouteId(response: any) {
  const rawData = response?.data ?? response;
  const routesList = Array.isArray(rawData) ? rawData : rawData?.routes || [];
  const latest = routesList[0];

  if (!latest) return '';

  return String(latest.route_id || latest.id || latest.routeId || latest._id || '');
}

function emptyRouteFallback(): AppRoute {
  return {
    start: DEFAULT_POINT,
    end: DEFAULT_POINT,
    stops: [],
    coordinates: [DEFAULT_POINT],
  };
}

function getNumericStepValue(...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue >= 0) return numberValue;
  }

  return undefined;
}

function buildStopWithOptimizeTiming(stop: RouteStop, step: any): RouteStop {
  const arrivalOffsetSeconds = getNumericStepValue(
    step?.arrival_seconds,
    step?.arrivalSeconds,
    step?.arrival,
    step?.eta_seconds,
    step?.etaSeconds,
    step?.duration_seconds,
    step?.durationSeconds,
    step?.duration,
  );

  const distanceMeters = getNumericStepValue(
    step?.distance_meters,
    step?.distanceMeters,
    step?.distance,
  );

  return {
    ...stop,
    etaSeconds: arrivalOffsetSeconds,
    eta_seconds: arrivalOffsetSeconds,
    arrivalOffsetSeconds,
    arrival_offset_seconds: arrivalOffsetSeconds,
    cumulativeDurationSeconds: arrivalOffsetSeconds,
    cumulative_duration_seconds: arrivalOffsetSeconds,
    distanceMeters,
    distance_meters: distanceMeters,
  } as RouteStop;
}

function getUpdatedOrderPayload(response: any) {
  const raw = response?.data ?? response;

  return (
    raw?.order ||
    raw?.updatedOrder ||
    raw?.updated_order ||
    raw?.data?.order ||
    raw?.data?.updatedOrder ||
    raw?.data?.updated_order ||
    raw?.data ||
    raw ||
    {}
  );
}

function getStatusTimestamp(updatedOrder: any, fallbackTimestamp: string) {
  return (
    updatedOrder?.actualArrivalTime ||
    updatedOrder?.actual_arrival_time ||
    updatedOrder?.deliveredAt ||
    updatedOrder?.delivered_at ||
    updatedOrder?.failedAt ||
    updatedOrder?.failed_at ||
    updatedOrder?.completedAt ||
    updatedOrder?.completed_at ||
    updatedOrder?.statusUpdatedAt ||
    updatedOrder?.status_updated_at ||
    updatedOrder?.markedAt ||
    updatedOrder?.marked_at ||
    updatedOrder?.updatedAt ||
    updatedOrder?.updated_at ||
    fallbackTimestamp
  );
}

function buildStopWithStatusUpdate(stop: RouteStop, nextStatus: string, updatedOrder: any): RouteStop {
  const nowIso = new Date().toISOString();
  const statusTimestamp = getStatusTimestamp(updatedOrder, nowIso);
  const isDelivered = nextStatus === ORDER_STATUS_DELIVERED;
  const isFailed = nextStatus === ORDER_STATUS_FAILED;

  return {
    ...stop,
    ...updatedOrder,
    status: nextStatus,
    orderStatus: nextStatus,
    order_status: nextStatus,
    statusUpdatedAt: statusTimestamp,
    status_updated_at: statusTimestamp,
    actualArrivalTime: updatedOrder?.actualArrivalTime || updatedOrder?.actual_arrival_time || statusTimestamp,
    actual_arrival_time: updatedOrder?.actual_arrival_time || updatedOrder?.actualArrivalTime || statusTimestamp,
    completedAt: updatedOrder?.completedAt || updatedOrder?.completed_at || statusTimestamp,
    completed_at: updatedOrder?.completed_at || updatedOrder?.completedAt || statusTimestamp,
    deliveredAt: isDelivered ? statusTimestamp : (updatedOrder?.deliveredAt || updatedOrder?.delivered_at || (stop as any)?.deliveredAt),
    delivered_at: isDelivered ? statusTimestamp : (updatedOrder?.delivered_at || updatedOrder?.deliveredAt || (stop as any)?.delivered_at),
    failedAt: isFailed ? statusTimestamp : (updatedOrder?.failedAt || updatedOrder?.failed_at || (stop as any)?.failedAt),
    failed_at: isFailed ? statusTimestamp : (updatedOrder?.failed_at || updatedOrder?.failedAt || (stop as any)?.failed_at),
  } as RouteStop;
}

export function useRoutePreviewController(
  routeIdFromParams: string,
): UseRoutePreviewControllerResult {
  const router = useRouter();

  const [activeRouteId, setActiveRouteId] = useState(routeIdFromParams);
  const [route, setRoute] = useState<AppRoute | null>(null);
  const [routeTitle, setRouteTitle] = useState('Route');
  const [previewStartTime, setPreviewStartTime] = useState('');
  const [routeMeta, setRouteMeta] = useState<RouteMeta>({
    distanceLabel: '0 km',
    durationLabel: '0 min',
  });
  const [panelMode, setPanelMode] = useState<PanelMode>('empty');
  const [mapType, setMapType] = useState<RouteMapType>('standard');
  const [centerSignal, setCenterSignal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>(
    normalizeRouteStatus(ROUTE_STATUS_PENDING),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaceSuggestion | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [stopDetails, setStopDetails] = useState<StopDetails>(DEFAULT_STOP_DETAILS);
  const [isUpdatingStopStatus, setIsUpdatingStopStatus] = useState(false);
  const [isCancellingRoute, setIsCancellingRoute] = useState(false);
  const [isSavingRouteEdit, setIsSavingRouteEdit] = useState(false);
  const [pendingManifestStops, setPendingManifestStops] = useState<any[]>([]);
  const [navigationTargetStop, setNavigationTargetStop] = useState<any | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
  } | null>(null);
  const locationSubscriptionRef = useRef<any>(null);
  const isMockingLocationRef = useRef(false);

  const effectiveRouteId = activeRouteId || routeIdFromParams;

  const mapRoute = useMemo(() => {
    if (!route) return null;
    return buildMapDisplayRoute(route);
  }, [route]);

  const activeStopInfo = useMemo(() => {
    return getActiveStop(route?.stops || []);
  }, [route?.stops]);

const resolvedPanelMode = useMemo<PanelMode>(() => {
  if (isCancelledRouteStatus(routeStatus)) {
    return 'cancelled';
  }

  if (isInTransitStatus(routeStatus) || isStatus(routeStatus, ROUTE_STATUS_COMPLETED)) {
    return 'transit';
  }

  return panelMode;
}, [panelMode, routeStatus]);

  useEffect(() => {
    setActiveRouteId(routeIdFromParams);
  }, [routeIdFromParams]);

  useEffect(() => {
    let mounted = true;

    async function loadRoute() {
      setIsInitialLoading(true);
      setErrorMessage('');

      let targetRouteId = routeIdFromParams;

      if (!targetRouteId) {
        try {
          const response = await routesService.getRoutes(1, 0);
          targetRouteId = getLatestRouteId(response);
        } catch (error) {
          console.log('Error auto-fetching latest route for home:', error);
        }
      }

      if (!targetRouteId) {
        if (!mounted) return;
        setRoute(null);
        setActiveRouteId('');
        setIsInitialLoading(false);
        return;
      }

      try {
        const response = await routesService.getRoute(targetRouteId);
        const result = await buildRouteFromBackendResponse(response, targetRouteId);

        let nextRoute = result.route;
        let nextRouteMeta = result.routeMeta;

       if (
        (isOptimizedStatus(result.routeStatus) ||
          isInTransitStatus(result.routeStatus) ||
          isCancelledRouteStatus(result.routeStatus)) &&
        getRoutePoints(nextRoute).length >= 2 &&
        !hasDetailedRoadPath(nextRoute)
) {
          const roadPath = await fetchRoutePath(getRoutePoints(nextRoute));

          nextRoute = {
            ...nextRoute,
            coordinates: roadPath.coordinates,
          };
          nextRouteMeta = {
            distanceLabel: formatDistance(roadPath.distanceMeters),
            durationLabel: formatDuration(roadPath.durationSeconds),
          };
        }

        if (!mounted) return;

        setActiveRouteId(result.routeId || targetRouteId);
        setRoute(nextRoute);
        setRouteTitle(result.routeTitle);
        setPreviewStartTime(result.startTime);
        setRouteMeta(nextRouteMeta);
        setRouteStatus(result.routeStatus);
        setPanelMode(result.panelMode);
        setCenterSignal((prev) => prev + 1);
      } catch (error) {
        if (!mounted) return;

        setRoute(emptyRouteFallback());
        setRouteTitle('Route');
        setPreviewStartTime('');
        setRouteStatus(normalizeRouteStatus(ROUTE_STATUS_PENDING));
        setPanelMode('empty');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load route details.',
        );
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    }

    loadRoute();

    return () => {
      mounted = false;
    };
  }, [routeIdFromParams]);

useEffect(() => {
  let mounted = true;

  const timer = setTimeout(async () => {
    const shouldFetchSuggestions = [
      'search',
      'edit_start_location',
      'edit_end_location',
      'edit_stop_address',
    ].includes(String(panelMode));

    if (!shouldFetchSuggestions) return;

    const data = await fetchPlaceSuggestions(searchText);

    if (mounted) {
      setSuggestions(data);
    }
  }, 350);

  return () => {
    mounted = false;
    clearTimeout(timer);
  };
}, [searchText, panelMode]);

  const recenterMap = useCallback(() => {
    setCenterSignal((prev) => prev + 1);
  }, []);

  const markRouteNeedsReOptimization = useCallback(async () => {
  if (!effectiveRouteId) return;
  await routesService.updateRoute({
    route_id: effectiveRouteId,
    status: ROUTE_STATUS_PENDING,
  });
  setRouteStatus(ROUTE_STATUS_PENDING);
}, [effectiveRouteId]);


const handleOpenEditRoute = useCallback(() => {
  setErrorMessage('');
  setSelectedStop(null);
  setSelectedSuggestion(null);
  setSearchText('');
  setSuggestions([]);
  setPanelMode('edit_route');
}, []);

const handleCancelEditRoute = useCallback(() => {
  setErrorMessage('');
  setSelectedStop(null);
  setSelectedSuggestion(null);
  setSearchText('');
  setSuggestions([]);
  setPanelMode('confirmed');
}, []);

const handleOpenEditStartLocation = useCallback(() => {
  setSearchText(route?.start?.description || route?.start?.title || '');
  setSuggestions([]);
  setPanelMode('edit_start_location');
}, [route?.start]);

const handleOpenEditEndLocation = useCallback(() => {
  setSearchText(route?.end?.description || route?.end?.title || '');
  setSuggestions([]);
  setPanelMode('edit_end_location');
}, [route?.end]);

const handleOpenEditStartTime = useCallback(() => {
  setPanelMode('edit_start_time');
}, []);

const handleSaveRouteLocation = useCallback(async (target: 'start' | 'end', suggestion: PlaceSuggestion) => {
  if (!route || !effectiveRouteId) return;

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const payload: any = {
      route_id: effectiveRouteId,
      status: ROUTE_STATUS_PENDING,
    };

    payload[target === 'start' ? 'start_location' : 'end_location'] =
      buildRouteLocationPayload(suggestion);

    const response = await routesService.updateRoute(payload);
    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, 'Unable to save location.'));
    }

    const nextPoint = buildRoutePointFromSuggestion(suggestion, target === 'start' ? 'Start location' : 'End location');

    setRoute({
      ...route,
      [target]: nextPoint,
      coordinates: getInitialCoordinates({ ...route, [target]: nextPoint }),
    });
    setRouteStatus(ROUTE_STATUS_PENDING);
    setSelectedSuggestion(null);
    setSuggestions([]);
    setSearchText('');
    setPanelMode('edit_route');
    recenterMap();
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to save location.');
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [effectiveRouteId, recenterMap, route]);

const handleSaveRouteTime = useCallback(async (target: 'start' | 'end', isoDateTime: string) => {
  if (!effectiveRouteId) return;

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const payload: any = {
      route_id: effectiveRouteId,
      status: ROUTE_STATUS_PENDING,
      [target === 'start' ? 'start_datetime' : 'end_datetime']: isoDateTime,
    };

    const response = await routesService.updateRoute(payload);
    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, 'Unable to save time.'));
    }

    if (target === 'start') {
      setPreviewStartTime(formatTimeFromDateTime(isoDateTime));
    }

    setRouteStatus(ROUTE_STATUS_PENDING);
    setPanelMode('edit_route');
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to save time.');
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [effectiveRouteId]);

const handleOpenEditStop = useCallback((stop: RouteStop) => {
  setSelectedStop(stop);
  setSelectedSuggestion(buildSuggestionFromStop(stop));
  setStopDetails(buildStopDetailsFromStop(stop));
  setPanelMode('edit_stop');
}, []);

const handleSaveEditedStop = useCallback(async (details: StopDetails) => {
  if (!route || !selectedStop || !effectiveRouteId) return;
  const orderId = getStopBackendId(selectedStop);
  if (!orderId) {
    setErrorMessage('Order id is missing. Unable to save stop.');
    return;
  }

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const response = await ordersService.editOrder({
      order_id: orderId,
      packages: details.packages,
      order: details.order,
      stopType: details.stopType,
      stop_type: details.stopType,
      notes: details.notes,
    });
    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, 'Unable to save stop.'));
    }

    const selectedKey = getStopIdentity(selectedStop);
    const nextStops = route.stops.map(stop =>
      getStopIdentity(stop) === selectedKey
        ? { ...stop, ...details, packages: Number(details.packages || 1) }
        : stop,
    );

    setRoute({ ...route, stops: nextStops });
    await markRouteNeedsReOptimization();
    setSelectedStop(null);
    setSelectedSuggestion(null);
    setPanelMode('edit_route');
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to save stop.');
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [effectiveRouteId, markRouteNeedsReOptimization, route, selectedStop]);

const handleOpenEditStopAddress = useCallback((stop?: RouteStop) => {
  const targetStop = stop || selectedStop;
  if (!targetStop) return;
  setSelectedStop(targetStop);
  setSearchText(targetStop.address || targetStop.description || targetStop.title || '');
  setSuggestions([]);
  setPanelMode('edit_stop_address');
}, [selectedStop]);

const handleSaveStopAddress = useCallback(async (suggestion: PlaceSuggestion) => {
  if (!route || !selectedStop || !effectiveRouteId) return;
  const orderId = getStopBackendId(selectedStop);
  if (!orderId) {
    setErrorMessage('Order id is missing. Unable to save stop address.');
    return;
  }

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const response = await ordersService.editOrder({
      order_id: orderId,
      location: buildRouteLocationPayload(suggestion),
      address: suggestion.fullAddress,
      title: suggestion.title,
      description: suggestion.subtitle,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    if (!isSuccessResponse(response)) {
      throw new Error(getResponseErrorMessage(response, 'Unable to save stop address.'));
    }

    const selectedKey = getStopIdentity(selectedStop);
    const nextPoint = buildRoutePointFromSuggestion(suggestion, selectedStop.title || 'Stop');
    const nextStops = route.stops.map(stop =>
      getStopIdentity(stop) === selectedKey
        ? { ...stop, ...nextPoint, address: suggestion.fullAddress, description: suggestion.subtitle }
        : stop,
    );

    const nextRoute = {
      ...route,
      stops: nextStops,
      coordinates: getInitialCoordinates({ ...route, stops: nextStops }),
    };

    setRoute(nextRoute);
    await markRouteNeedsReOptimization();
    setSelectedSuggestion(null);
    setSuggestions([]);
    setSearchText('');
    setPanelMode('edit_stop');
    recenterMap();
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to save stop address.');
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [effectiveRouteId, markRouteNeedsReOptimization, recenterMap, route, selectedStop]);

const handleRemoveEditedStop = useCallback(async () => {
  if (!route || !selectedStop || !effectiveRouteId) return;
  const orderId = getStopBackendId(selectedStop);

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const service: any = ordersService as any;
    if (orderId && typeof service.deleteOrder === 'function') {
      await service.deleteOrder(orderId);
    } else if (orderId && typeof service.removeOrder === 'function') {
      await service.removeOrder(orderId);
    } else if (orderId) {
      await ordersService.editOrder({ order_id: orderId, status: 'cancelled' });
    }

    const selectedKey = getStopIdentity(selectedStop);
    const nextStops = route.stops
      .filter(stop => getStopIdentity(stop) !== selectedKey)
      .map((stop, index) => ({ ...stop, sequence: index + 1, sequenceNo: index + 1, markerLabel: String(index + 1) }));

    setRoute({
      ...route,
      stops: nextStops,
      coordinates: getInitialCoordinates({ ...route, stops: nextStops }),
    });
    await markRouteNeedsReOptimization();
    setSelectedStop(null);
    setSelectedSuggestion(null);
    setPanelMode('edit_route');
    recenterMap();
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Unable to remove stop.');
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [effectiveRouteId, markRouteNeedsReOptimization, recenterMap, route, selectedStop]);


  const handleToggleMapType = useCallback(() => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  }, []);

  const handleOpenSearch = useCallback(() => {
    setSearchText('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setSelectedStop(null);
    setPanelMode('search');
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchText('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setSelectedStop(null);
    setPanelMode(getPanelModeFromStatus(routeStatus, route?.stops?.length || 0));
  }, [route?.stops?.length, routeStatus]);

  const handleSelectSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSelectedStop(null);
    setStopDetails({ ...DEFAULT_STOP_DETAILS });
    setPanelMode('details');
  }, []);

  const handleOpenStopDetails = useCallback((stop: RouteStop) => {
    setSelectedStop(stop);
    setSelectedSuggestion(buildSuggestionFromStop(stop));
    setStopDetails(buildStopDetailsFromStop(stop));
    setSearchText('');
    setSuggestions([]);
    setPanelMode('details');
  }, []);

  const handleStopDetailsChange = useCallback((details: StopDetails) => {
    setStopDetails(details);
  }, []);

  const handleConfirmStopDetails = useCallback(async () => {
    if (!route || !selectedSuggestion || isAddingStop) return;

    if (selectedStop) {
      const selectedStopKey = getStopIdentity(selectedStop);
      const orderId = getStopBackendId(selectedStop);

      if (!orderId) {
        setErrorMessage('Order id is missing. Unable to update stop.');
        return;
      }

      setIsAddingStop(true);
      setErrorMessage('');

      try {
        const response = await ordersService.editOrder({
          order_id: orderId,
          packages: stopDetails.packages,
          order: stopDetails.order,
          stopType: stopDetails.stopType,
          stop_type: stopDetails.stopType,
          notes: stopDetails.notes,
        });

        if (!isSuccessResponse(response)) {
          throw new Error(getResponseErrorMessage(response, 'Unable to update stop.'));
        }

        const nextStops = route.stops.map((stop) =>
          getStopIdentity(stop) === selectedStopKey
            ? {
                ...stop,
                packages: Number(stopDetails.packages || 1),
                order: stopDetails.order || 'auto',
                stopType: stopDetails.stopType || 'delivery',
                notes: stopDetails.notes || '',
              }
            : stop,
        );

        setRoute({
          ...route,
          stops: nextStops,
        });
        setSelectedStop(null);
        setSelectedSuggestion(null);
        setStopDetails({ ...DEFAULT_STOP_DETAILS });
        setPanelMode(getPanelModeFromStatus(routeStatus, nextStops.length));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to update stop.',
        );
      } finally {
        setIsAddingStop(false);
      }

      return;
    }

    if (!effectiveRouteId) {
      setErrorMessage('Route id is missing. Unable to add stop.');
      return;
    }

    const nextSequence = route.stops.length + 1;
    const fallbackStop: RouteStop = {
      id: `${Date.now()}-${selectedSuggestion.id}`,
      sequence: nextSequence,
      latitude: selectedSuggestion.latitude,
      longitude: selectedSuggestion.longitude,
      title: selectedSuggestion.title,
      description: selectedSuggestion.subtitle,
      address: selectedSuggestion.fullAddress,
      packages: stopDetails.packages,
      order: stopDetails.order,
      stopType: stopDetails.stopType,
      notes: stopDetails.notes,
      status: ROUTE_STATUS_PENDING,
    };

    setIsAddingStop(true);
    setErrorMessage('');

    try {
      const payload = buildOrderPayload({
        routeId: effectiveRouteId,
        sequence: nextSequence,
        suggestion: selectedSuggestion,
        details: stopDetails,
      });
      const response = await ordersService.addOrder(payload);
      const savedOrder = unwrapOrderPayload(response);
      const newStop = buildStopFromSavedOrder(savedOrder, fallbackStop);

      const nextStops = [...route.stops, newStop].map((stop, index) => ({
        ...stop,
        sequence: index + 1,
      }));

      const nextRoute: AppRoute = {
        ...route,
        stops: nextStops,
        coordinates: getInitialCoordinates({
          ...route,
          stops: nextStops,
        }),
      };

      setRoute(nextRoute);
      setSelectedStop(null);
      setSelectedSuggestion(null);
      setSearchText('');
      setSuggestions([]);
      setStopDetails({ ...DEFAULT_STOP_DETAILS });
      setPanelMode('setup');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add stop on backend.',
      );
    } finally {
      setIsAddingStop(false);
    }
  }, [
    effectiveRouteId,
    isAddingStop,
    recenterMap,
    route,
    routeStatus,
    selectedStop,
    selectedSuggestion,
    stopDetails,
  ]);

  const handleOptimizeRoute = useCallback(async () => {
    if (!route || isOptimizing) return;

    if (!effectiveRouteId) {
      setErrorMessage('Route id is missing.');
      return;
    }

    setIsOptimizing(true);
    setErrorMessage('');

    try {
      const response = await routesService.optimizeRoute(effectiveRouteId);

      if (!isSuccessResponse(response)) {
        throw new Error(getResponseErrorMessage(response, 'Unable to optimize route.'));
      }

      const optimizedSteps = getOptimizedSteps(response);
      const routeData = getOptimizedRouteData(response);

      const jobSteps = optimizedSteps
        .filter((step: any) => step.type === 'job')
        .sort(
          (a: any, b: any) =>
            Number(a.sequence_no || a.sequenceNo || a.sequence || 0) -
            Number(b.sequence_no || b.sequenceNo || b.sequence || 0),
        );

      const usedStopIds = new Set<string>();
      const optimizedStops: RouteStop[] = [];

      jobSteps.forEach((step: any) => {
        let matchedStop = route.stops.find((stop) => {
          const possibleIds = [
            stop.backendOrderId,
            stop.orderId,
            stop.id,
            stop.sequence,
            stop.sequenceNo,
          ]
            .filter(Boolean)
            .map(String);

          return possibleIds.includes(String(step.id || step.order_id || step.orderId));
        });

        if (!matchedStop && Array.isArray(step.location)) {
          const [longitude, latitude] = step.location;

          matchedStop = route.stops.find((stop) => {
            const stopKey = String(stop.backendOrderId || stop.orderId || stop.id);

            if (usedStopIds.has(stopKey)) return false;

            return (
              Number(stop.latitude).toFixed(6) === Number(latitude).toFixed(6) &&
              Number(stop.longitude).toFixed(6) === Number(longitude).toFixed(6)
            );
          });
        }

        if (!matchedStop) return;

        const stopKey = String(
          matchedStop.backendOrderId || matchedStop.orderId || matchedStop.id,
        );

        if (usedStopIds.has(stopKey)) return;

        usedStopIds.add(stopKey);
        optimizedStops.push(buildStopWithOptimizeTiming(matchedStop, step));
      });

      route.stops.forEach((stop) => {
        const stopKey = String(stop.backendOrderId || stop.orderId || stop.id);

        if (!usedStopIds.has(stopKey)) {
          optimizedStops.push(stop);
        }
      });

      const finalStops = optimizedStops.map((stop, index) => ({
        ...stop,
        sequence: index + 1,
        sequenceNo: index + 1,
        markerLabel: String(index + 1),
      }));

      const optimizedRoute: AppRoute = {
        ...route,
        stops: finalStops,
      };

      const path = await fetchRoutePath(getRoutePoints(optimizedRoute));
      const distanceMeters = Number(
        routeData?.distance ||
          getOptimizePayload(response)?.summary?.distance ||
          path.distanceMeters,
      );
      const durationSeconds = Number(
        routeData?.duration ||
          getOptimizePayload(response)?.summary?.duration ||
          path.durationSeconds,
      );
      const nextRoute: AppRoute = {
        ...optimizedRoute,
        coordinates: path.coordinates,
      };

      await persistRouteSnapshot({
        routeId: effectiveRouteId,
        status: ROUTE_STATUS_OPTIMIZED,
        route: nextRoute,
        distanceMeters,
        durationSeconds,
      });

      setRoute(nextRoute);
      setRouteMeta({
        distanceLabel: formatDistance(distanceMeters),
        durationLabel: formatDuration(durationSeconds),
      });
      setRouteStatus(ROUTE_STATUS_OPTIMIZED);
      setPanelMode('confirmed');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to optimize route.',
      );
    } finally {
      setIsOptimizing(false);
    }
  }, [effectiveRouteId, isOptimizing, recenterMap, route]);

  const handleReOptimizeEditedRoute = useCallback(async () => {
  await handleOptimizeRoute();
}, [handleOptimizeRoute]);



  const handleRefineRoute = useCallback(() => {
    setPanelMode('setup');
  }, []);

  const handleConfirmRoute = useCallback(async () => {
    if (!effectiveRouteId || !route) return;

    try {
      setErrorMessage('');

      const path = await fetchRoutePath(getRoutePoints(route));
      const nextRoute: AppRoute = {
        ...route,
        coordinates: path.coordinates,
      };

      await persistRouteSnapshot({
        routeId: effectiveRouteId,
        status: ROUTE_STATUS_OPTIMIZED,
        route: nextRoute,
        distanceMeters: path.distanceMeters,
        durationSeconds: path.durationSeconds,
      });

      setRoute(nextRoute);
      setRouteMeta({
        distanceLabel: formatDistance(path.distanceMeters),
        durationLabel: formatDuration(path.durationSeconds),
      });
      setRouteStatus(ROUTE_STATUS_OPTIMIZED);
      setPanelMode('confirmed');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'An error occurred while confirming the route.',
      );
    }
  }, [effectiveRouteId, recenterMap, route]);

  const handleStartRoute = useCallback(async () => {
    if (!effectiveRouteId || !route || isStartingRoute) return;

    setIsStartingRoute(true);
    setErrorMessage('');

    try {
      const path = await fetchRoutePath(getRoutePoints(route));
      const nextRoute: AppRoute = {
        ...route,
        coordinates: path.coordinates,
      };

      await persistRouteSnapshot({
        routeId: effectiveRouteId,
        status: ROUTE_STATUS_IN_TRANSIT,
        route: nextRoute,
        distanceMeters: path.distanceMeters,
        durationSeconds: path.durationSeconds,
      });

      setRoute(nextRoute);
      setRouteMeta({
        distanceLabel: formatDistance(path.distanceMeters),
        durationLabel: formatDuration(path.durationSeconds),
      });
      setRouteStatus(ROUTE_STATUS_IN_TRANSIT);
      setPanelMode('transit');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to start route.',
      );
    } finally {
      setIsStartingRoute(false);
    }
  }, [effectiveRouteId, isStartingRoute, recenterMap, route]);

  const handleNavigateActiveStop = useCallback(async (stop?: any) => {
    const targetStop = stop || activeStopInfo.stop;

    if (!targetStop) return;

    setNavigationTargetStop(targetStop);
    setIsNavigating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location permission was denied. Unable to navigate live.');
      } else {
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        if (initialLoc) {
          setUserLocation({
            latitude: initialLoc.coords.latitude,
            longitude: initialLoc.coords.longitude,
            heading: initialLoc.coords.heading,
          });
        }

        if (locationSubscriptionRef.current) {
          try {
            locationSubscriptionRef.current.remove();
          } catch (err) {
            console.warn('Silent catch: expo-location remove subscription error:', err);
          }
          locationSubscriptionRef.current = null;
        }

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            if (!isMockingLocationRef.current) {
              setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading,
              });
            }
          }
        );
      }
    } catch (e) {
      console.log('Error watching position:', e);
    }
  }, [activeStopInfo.stop]);

  const handleToggleMockingLocation = useCallback((active: boolean) => {
    isMockingLocationRef.current = active;
  }, []);

  const handleExitNavigation = useCallback(() => {
    isMockingLocationRef.current = false;
    if (locationSubscriptionRef.current) {
      try {
        locationSubscriptionRef.current.remove();
      } catch (err) {
        console.warn('Silent catch: expo-location remove subscription error:', err);
      }
      locationSubscriptionRef.current = null;
    }
    setUserLocation(null);
    setNavigationTargetStop(null);
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    return () => {
      if (locationSubscriptionRef.current) {
        try {
          locationSubscriptionRef.current.remove();
        } catch (err) {
          console.warn('Silent catch: expo-location remove subscription error:', err);
        }
      }
    };
  }, []);

  const handleUpdateActiveStopStatus = useCallback(async (nextStatus: string) => {
    if (!route || isUpdatingStopStatus) return;

    const activeStop = activeStopInfo.stop;

    if (!activeStop) return;

    setIsUpdatingStopStatus(true);
    setErrorMessage('');

    try {
      const response = await updateOrderStatusOnBackend(activeStop, nextStatus);

      if (!isSuccessResponse(response)) {
        throw new Error(
          getResponseErrorMessage(response, 'Unable to update order status.'),
        );
      }

      const activeStopKey = getStopIdentity(activeStop);
      const updatedOrder = getUpdatedOrderPayload(response);
      const nextStops = route.stops.map((stop) =>
        getStopIdentity(stop) === activeStopKey
          ? buildStopWithStatusUpdate(stop, nextStatus, updatedOrder)
          : stop,
      );
      const nextRoute: AppRoute = {
        ...route,
        stops: nextStops,
      };

      setRoute(nextRoute);

      const nextActiveStop = getActiveStop(nextStops).stop;

      if (!nextActiveStop && effectiveRouteId) {
        try {
          await persistRouteSnapshot({
            routeId: effectiveRouteId,
            status: ROUTE_STATUS_COMPLETED,
            route: nextRoute,
          });
          setRouteStatus(ROUTE_STATUS_COMPLETED);
        } catch {
          // Order status was updated; route completion update failed.
        }
      }

      setPanelMode('transit');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update order status.',
      );
    } finally {
      setIsUpdatingStopStatus(false);
    }
  }, [
    activeStopInfo.stop,
    effectiveRouteId,
    isUpdatingStopStatus,
    recenterMap,
    route,
  ]);

  const handleMarkStopDelivered = useCallback(() => {
    return handleUpdateActiveStopStatus(ORDER_STATUS_DELIVERED);
  }, [handleUpdateActiveStopStatus]);

  const handleMarkStopFailed = useCallback(() => {
    return handleUpdateActiveStopStatus(ORDER_STATUS_FAILED);
  }, [handleUpdateActiveStopStatus]);


  const handleCancelRoute = async () => {
      console.log(1)
  if (!effectiveRouteId || isCancellingRoute) return;

  setIsCancellingRoute(true);
  setErrorMessage('');

  try {
    await routesService.cancelRoute(effectiveRouteId);

    const cancelledStatus = normalizeRouteStatus(ROUTE_STATUS_CANCELLED);

    setRouteStatus(cancelledStatus);
    setPanelMode('cancelled');

    // Backend updates only pending orders.
    // Frontend also updates only pending stops locally for instant UI feedback.
    setRoute((currentRoute) => {
      if (!currentRoute) return currentRoute;

      return {
        ...currentRoute,
        stops: currentRoute.stops.map((stop) => {
          const currentStopStatus =
            stop.status ||
            ROUTE_STATUS_PENDING;

          if (!isPendingOrderStatus(currentStopStatus)) {
            return stop;
          }

          return {
            ...stop,
            status: cancelledStatus,
            orderStatus: cancelledStatus,
            order_status: cancelledStatus,
          };
        }),
      };
    });

    recenterMap();
  } catch (error) {
    setErrorMessage(
      error instanceof Error ? error.message : 'Unable to cancel route.',
    );
  } finally {
    setIsCancellingRoute(false);
  }

  };


// const handleCancelRoute = useCallback(async () => {
//   console.log(1)
//   if (!effectiveRouteId || isCancellingRoute) return;

//   setIsCancellingRoute(true);
//   setErrorMessage('');

//   try {
//     await routesService.cancelRoute(effectiveRouteId);

//     const cancelledStatus = normalizeRouteStatus(ROUTE_STATUS_CANCELLED);

//     setRouteStatus(cancelledStatus);
//     setPanelMode('cancelled');

//     // Backend updates only pending orders.
//     // Frontend also updates only pending stops locally for instant UI feedback.
//     setRoute((currentRoute) => {
//       if (!currentRoute) return currentRoute;

//       return {
//         ...currentRoute,
//         stops: currentRoute.stops.map((stop) => {
//           const currentStopStatus =
//             stop.status ||
//             ROUTE_STATUS_PENDING;

//           if (!isPendingOrderStatus(currentStopStatus)) {
//             return stop;
//           }

//           return {
//             ...stop,
//             status: cancelledStatus,
//             orderStatus: cancelledStatus,
//             order_status: cancelledStatus,
//           };
//         }),
//       };
//     });

//     recenterMap();
//   } catch (error) {
//     setErrorMessage(
//       error instanceof Error ? error.message : 'Unable to cancel route.',
//     );
//   } finally {
//     setIsCancellingRoute(false);
//   }
// }, [effectiveRouteId, isCancellingRoute, recenterMap]);


  const showResolvedAddressSuggestions = useCallback((response: any, fallbackQuery: string) => {
    const resolvedSuggestions = getResolvedAddressSuggestions(response, fallbackQuery);

    if (!resolvedSuggestions.length) {
      setErrorMessage('No matching address found. Please try again or type manually.');
      return;
    }

    setPanelMode('search');
    setSearchText(resolvedSuggestions[0].fullAddress || fallbackQuery);
    setSuggestions(resolvedSuggestions);
    setSelectedSuggestion(null);
    setSelectedStop(null);
  }, []);

  const prepareResolvedManifestRowsForReview = useCallback((response: any, source: string) => {
    if (!route || !effectiveRouteId) return;

    const rows = getResolvedManifestRows(response).map((row) => ({
      ...row,
      source,
    }));

    const payloads = buildManifestOrderPayloads({
      routeId: effectiveRouteId,
      rows,
      startSequence: route.stops.length + 1,
    });

    if (!payloads.length) {
      setErrorMessage('No valid geocoded addresses found in this manifest.');
      return;
    }

    setPendingManifestStops(payloads);
  }, [route, effectiveRouteId]);

  const handleConfirmManifestStops = useCallback(async (selectedStops: any[]) => {
    if (!route || !effectiveRouteId || isAddingStop) return;

    if (!selectedStops || selectedStops.length === 0) {
      setPendingManifestStops([]);
      return;
    }

    setIsAddingStop(true);
    setErrorMessage('');

    try {
      const responseFromBackend = await addManifestStopsToBackend(selectedStops);

      if (!isSuccessResponse(responseFromBackend)) {
        throw new Error(
          getResponseErrorMessage(responseFromBackend, 'Unable to add manifest stops.'),
        );
      }

      const rawPayload = responseFromBackend?.data ?? responseFromBackend;
      const createdOrders =
        rawPayload?.created ||
        rawPayload?.data?.created ||
        rawPayload?.orders ||
        rawPayload?.data?.orders ||
        [];

      const fallbackStops: RouteStop[] = selectedStops.map((payload, index) => ({
        id: `${Date.now()}-manifest-${index}`,
        sequence: route.stops.length + index + 1,
        sequenceNo: route.stops.length + index + 1,
        markerLabel: String(route.stops.length + index + 1),
        latitude: payload.latitude,
        longitude: payload.longitude,
        title: payload.title,
        description: payload.address,
        address: payload.address,
        packages: payload.packages,
        order: 'auto',
        stopType: payload.stop_type || 'delivery',
        notes: payload.notes || '',
        status: ROUTE_STATUS_PENDING,
      }));

      const createdStops = Array.isArray(createdOrders) && createdOrders.length
        ? createdOrders.map((item: any, index: number) =>
            buildStopFromSavedOrder(unwrapOrderPayload(item), fallbackStops[index] || fallbackStops[0]),
          )
        : fallbackStops;

      const nextStops = [...route.stops, ...createdStops].map((stop, index) => ({
        ...stop,
        sequence: index + 1,
        sequenceNo: index + 1,
        markerLabel: String(index + 1),
      }));

      const nextRoute: AppRoute = {
        ...route,
        stops: nextStops,
        coordinates: getInitialCoordinates({
          ...route,
          stops: nextStops,
        }),
      };

      if (!isInTransitStatus(routeStatus)) {
        await persistRouteSnapshot({
          routeId: effectiveRouteId,
          status: ROUTE_STATUS_PENDING,
          route: nextRoute,
        });
        setRouteStatus(ROUTE_STATUS_PENDING);
      }

      setRoute(nextRoute);
      setSearchText('');
      setSuggestions([]);
      setSelectedSuggestion(null);
      setSelectedStop(null);
      setStopDetails({ ...DEFAULT_STOP_DETAILS });
      setPanelMode('setup');
      recenterMap();
      setPendingManifestStops([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add manifest stops.',
      );
    } finally {
      setIsAddingStop(false);
    }
  }, [
    effectiveRouteId,
    isAddingStop,
    recenterMap,
    route,
    routeStatus,
  ]);

  const handleScanAddress = useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await scanAddressFromCamera();

      if (!response) return;

      showResolvedAddressSuggestions(response, 'Scanned address');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to scan address.',
      );
    }
  }, [showResolvedAddressSuggestions]);

  const handleVoiceAddress = useCallback(async () => {
    try {
      setErrorMessage('');
      setPanelMode('search');

      const spokenAddress = await listenForVoiceAddress();
      setSearchText(spokenAddress);

      const response = await resolveAddressText(spokenAddress);
      showResolvedAddressSuggestions(response, spokenAddress);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add address by voice.',
      );
    }
  }, [showResolvedAddressSuggestions]);

  const handleScanRouteManifest = useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await scanRouteManifestFromCamera();

      if (!response) return;

      prepareResolvedManifestRowsForReview(response, 'scan_manifest');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to scan route manifest.',
      );
    }
  }, [prepareResolvedManifestRowsForReview]);

  const handleImportRouteManifest = useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await importRouteManifestFromFile();

      if (!response) return;

      prepareResolvedManifestRowsForReview(response, 'import_manifest');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to import route manifest.',
      );
    }
  }, [prepareResolvedManifestRowsForReview]);

  const handleCopyStopsFromPastRoute = useCallback(() => {
    setErrorMessage('Copy stops from past route is not wired yet. Add a route picker here.');
  }, []);

  const handleSkipOptimization = useCallback(async () => {
    await handleConfirmRoute();
  }, [handleConfirmRoute]);

  const handleRemoveStops = useCallback(() => {
    setErrorMessage('Remove stops needs a route-specific delete endpoint before enabling it.');
  }, []);

  const handleCreateNewRoute = useCallback(() => {
    router.push('/setup-locations' as any);
  }, [router]);

  return {
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
    editingStop: selectedStop,
    isSavingRouteEdit,
    handleOpenEditRoute,
    handleCancelEditRoute,
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
    handleCancelManifestStops: () => setPendingManifestStops([]),
    isNavigating,
    navigationTargetStop,
    handleExitNavigation,
    userLocation,
    setUserLocation,
    handleToggleMockingLocation
  };
}
