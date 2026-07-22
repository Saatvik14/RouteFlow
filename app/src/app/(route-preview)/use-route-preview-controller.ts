import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ordersService } from './../../services/api/orders';
import { routesService } from './../../services/api/routes';
import { userService } from './../../services/api/users';
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
  formatMiles,
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
  subscriptionType: string;
  searchText: string;
  suggestions: PlaceSuggestion[];
  selectedSuggestion: PlaceSuggestion | null;
  stopDetails: StopDetails;
  isUpdatingStopStatus: boolean;
  isCancellingRoute: boolean;
  isCompletingRoute: boolean;
  isRetryingFailedStops: boolean;
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
  handleMarkRouteCompleted: () => Promise<void>;
  handleRetryFailedStops: (failedStops: RouteStop[]) => Promise<void>;
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
  isSavingStopOrder: boolean;
  handleOpenReorderStops: () => void;
  handleCancelReorderStops: () => void;
  handleSaveStopOrder: (orderedStops: RouteStop[]) => Promise<void>;
  handleOpenEditRoute: () => void;
  handleCancelEditRoute: () => void;
  handleBackFromEditStop: () => void;
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
  isCopyStopsModalOpen: boolean;
  setIsCopyStopsModalOpen: (value: boolean) => void;
  allPastRoutes: any[];
  pastRouteStops: RouteStop[];
  pastRouteTitle: string;
  selectedPastRouteId: string;
  selectedPastStopKeys: Record<string, boolean>;
  isLoadingPastRoutes: boolean;
  isLoadingStops: boolean;
  togglePastStopSelection: (stopId: string) => void;
  togglePastStopsBatch: (stopIds: string[], select: boolean) => void;
  handleSwitchPastRoute: (routeId: string, title: string) => Promise<void>;
  handleConfirmCopyStops: () => Promise<void>;
  handleToggleMockingLocation: (active: boolean) => void;
  handleSaveStopPriority: (stopId: string, priority: number | null) => Promise<void>;
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

function buildStopWithOptimizeTiming(stop: any, step: any): RouteStop {
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

  const distanceMiles = Number.isFinite(Number(step?.distance))
    ? Number(step.distance) * 0.000621371
    : null;

  return {
    ...stop,
    etaSeconds: arrivalOffsetSeconds,
    eta_seconds: arrivalOffsetSeconds,
    arrivalOffsetSeconds,
    arrival_offset_seconds: arrivalOffsetSeconds,
    cumulativeDurationSeconds: arrivalOffsetSeconds,
    cumulative_duration_seconds: arrivalOffsetSeconds,
    eta_duration: arrivalOffsetSeconds,
    distanceMeters,
    distance_meters: distanceMeters,
    eta_distance: distanceMiles,
    approx_eta_time: step?.approx_eta_time
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
    updatedOrder?.failed_at ||
    updatedOrder?.status_updated_at ||
    updatedOrder?.updated_at ||
    updatedOrder?.arrive_at 
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
    actual_arrival_time: updatedOrder?.actual_arrival_time || updatedOrder?.actualArrivalTime || statusTimestamp,
    arrive_at: isDelivered ? statusTimestamp : (updatedOrder?.arrive_at),
    failed_at: isFailed ? statusTimestamp : (updatedOrder?.failed_at),
    approx_eta_time: updatedOrder?.approx_eta_time || (stop as any)?.approx_eta_time
  } as RouteStop;
}


function getCreatedRouteId(response: any) {
  const payload = response?.data ?? response;

  return String(
    payload?.route_id ||
      payload?.routeId ||
      payload?.id ||
      payload?._id ||
      payload?.route?.route_id ||
      payload?.route?.routeId ||
      payload?.route?.id ||
      payload?.data?.route_id ||
      payload?.data?.routeId ||
      payload?.data?.id ||
      payload?.data?.route?.route_id ||
      payload?.data?.route?.id ||
      '',
  );
}

function buildRetryRouteLocation(point: any) {
  const address = String(point?.description || point?.address || point?.title || '');

  return {
    mode: 'manual_address',
    address,
    selectedFromSuggestion: true,
    latitude: Number(point?.latitude),
    longitude: Number(point?.longitude),
    details: {
      placeId: '',
      addressLine1: String(point?.title || address),
      addressLine2: address,
      city: '',
      district: '',
      state: '',
      country: '',
      countryCode: '',
      postalCode: '',
      latitude: Number(point?.latitude),
      longitude: Number(point?.longitude),
    },
  };
}

function isUnitedKingdomSuggestion(suggestion: PlaceSuggestion) {
  const searchableAddress = [
    suggestion?.fullAddress,
    suggestion?.subtitle,
    suggestion?.title,
  ]
    .filter(Boolean)
    .join(', ')
    .toLowerCase();

  return (
    searchableAddress.includes('united kingdom') ||
    searchableAddress.includes(', uk') ||
    searchableAddress.includes(', gb') ||
    searchableAddress.endsWith(' uk') ||
    searchableAddress.endsWith(' gb')
  );
}

export function useRoutePreviewController(
  routeIdFromParams: string,
): UseRoutePreviewControllerResult {
  const router = useRouter();

  const [activeRouteId, setActiveRouteId] = useState(routeIdFromParams);
  const [route, setRoute] = useState<AppRoute | null>(null);
  const [routeTitle, setRouteTitle] = useState('Route');
  const [previewStartTime, setPreviewStartTime] = useState('');
  const [routeStartDatetime, setRouteStartDatetime] = useState('');
  const [routeMeta, setRouteMeta] = useState<RouteMeta>({
    distanceLabel: '0 mi',
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
  const [stopDetailsReturnMode, setStopDetailsReturnMode] =
    useState<PanelMode>('setup');
  const [stopAddressReturnMode, setStopAddressReturnMode] =
    useState<PanelMode>('edit_stop');
  const [isUpdatingStopStatus, setIsUpdatingStopStatus] = useState(false);
  const [isCancellingRoute, setIsCancellingRoute] = useState(false);
  const [isCompletingRoute, setIsCompletingRoute] = useState(false);
  const [isRetryingFailedStops, setIsRetryingFailedStops] = useState(false);
  const [isSavingRouteEdit, setIsSavingRouteEdit] = useState(false);
  const [isSavingStopOrder, setIsSavingStopOrder] = useState(false);
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
  const [subscriptionType, setSubscriptionType] = useState<string>('trial');

  useEffect(() => {
    async function loadSubscription() {
      try {
        const response = await userService.getProfile();
        const profile = response?.success ? (response.data ?? response) as any : (response || null);
        const userObj = profile?.user || profile;
        if (userObj) {
          const subType = String(userObj.subscription_type || userObj.subscriptionType || 'trial').toLowerCase();
          setSubscriptionType(subType);
        }
      } catch (err) {
        console.error('Error fetching subscription type for route preview permissions:', err);
      }
    }
    loadSubscription();
  }, []);

  const [isCopyStopsModalOpen, setIsCopyStopsModalOpen] = useState(false);
  const [allPastRoutes, setAllPastRoutes] = useState<any[]>([]);
  const [pastRouteStops, setPastRouteStops] = useState<RouteStop[]>([]);
  const [pastRouteTitle, setPastRouteTitle] = useState('');
  const [selectedPastRouteId, setSelectedPastRouteId] = useState('');
  const [selectedPastStopKeys, setSelectedPastStopKeys] = useState<Record<string, boolean>>({});
  const [isLoadingPastRoutes, setIsLoadingPastRoutes] = useState(false);
  const [isLoadingStops, setIsLoadingStops] = useState(false);

  const effectiveRouteId = activeRouteId || routeIdFromParams;

  const mapRoute = useMemo(() => {
    if (!route) return null;
    return buildMapDisplayRoute(route);
  }, [route]);

  const activeStopInfo = useMemo(() => {
    return getActiveStop(route?.stops || []);
  }, [route?.stops]);

const resolvedPanelMode = useMemo<PanelMode>(() => {
  const stopsCount = route?.stops?.length || 0;

  // Modes opened directly by a user action must always win over the route
  // status. Otherwise a status-derived mode can replace the requested panel.
  const explicitUiModes: PanelMode[] = [
    'reorder_stops',
    'edit_route',
    'edit_start_location',
    'edit_end_location',
    'edit_start_time',
    'edit_stop',
    'edit_stop_address',
    'search',
    'details',
    'setup',
  ];

  if (explicitUiModes.includes(panelMode)) {
    return panelMode;
  }

  if (isCancelledRouteStatus(routeStatus)) {
    return 'cancelled';
  }

  if (
    isInTransitStatus(routeStatus) ||
    isStatus(routeStatus, ROUTE_STATUS_COMPLETED)
  ) {
    return 'transit';
  }

  if (panelMode === 'empty' && stopsCount > 0) {
    return getPanelModeFromStatus(routeStatus, stopsCount);
  }

  return panelMode;
}, [panelMode, routeStatus, route?.stops?.length]);


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
        setRouteStartDatetime(result.rawStartDatetime || '');
        setRouteMeta(nextRouteMeta);
        setRouteStatus(result.routeStatus);
        setPanelMode(result.panelMode);
        setCenterSignal((prev) => prev + 1);
      } catch (error) {
        if (!mounted) return;

        setRoute(emptyRouteFallback());
        setRouteTitle('Route');
        setPreviewStartTime('');
        setRouteStartDatetime('');
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

    if (searchText.trim().length < 3) {
      if (mounted) {
        setSuggestions([]);
        setErrorMessage('');
      }
      return;
    }

    const data = await fetchPlaceSuggestions(searchText);

    if (mounted) {
      setSuggestions(data);
      if (data.length === 0) {
        setErrorMessage('Address does not exists, Please type the correct address.');
      } else {
        setErrorMessage('');
      }
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

const handleBackFromEditStop = useCallback(() => {
  setErrorMessage('');
  setSearchText('');
  setSuggestions([]);

  // The address editor can be opened from either the dedicated stop-details
  // panel or the older edit-stop panel. Return to the panel that opened it
  // and keep the selected stop/details available.
  if (panelMode === 'edit_stop_address') {
    setSelectedSuggestion(
      selectedStop ? buildSuggestionFromStop(selectedStop) : null,
    );
    setPanelMode(stopAddressReturnMode);
    return;
  }

  setSelectedStop(null);
  setSelectedSuggestion(null);
  setPanelMode('edit_route');
}, [panelMode, selectedStop, stopAddressReturnMode]);

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
      setRouteStartDatetime(isoDateTime);
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

const handleSaveEditedStop = useCallback(
  async (details: StopDetails) => {
    if (!route || !selectedStop || !effectiveRouteId) return;

    const orderId = getStopBackendId(selectedStop);

    if (!orderId) {
      setErrorMessage('Order id is missing. Unable to save stop.');
      return;
    }

    setIsSavingRouteEdit(true);
    setErrorMessage('');

    try {
      const stopDetails = details as any;
      const currentStop = selectedStop as any;

      const stopType =
        stopDetails.stop_type ??
        stopDetails.stopType ??
        currentStop.stop_type ??
        currentStop.stopType ??
        'delivery';

      const orderPreference =
        stopDetails.order_preference ??
        stopDetails.order ??
        currentStop.order_preference ??
        currentStop.order ??
        'auto';

      const timeAtStop = Math.max(
        1,
        Number(
          stopDetails.timeAtStopMinutes ??
            stopDetails.time_at_stop ??
            currentStop.timeAtStopMinutes ??
            currentStop.time_at_stop ??
            1,
        ),
      );

      const rawArrivalTime =
        stopDetails.arrivalTime ??
        stopDetails.arrival_time ??
        currentStop.arrivalTime ??
        currentStop.arrival_time ??
        '';

      const arrivalTime =
        typeof rawArrivalTime === 'string' && rawArrivalTime.trim()
          ? rawArrivalTime.trim()
          : null;

      const address = String(
        stopDetails.address ??
          currentStop.address ??
          currentStop.description ??
          '',
      );

      const latitude =
        stopDetails.latitude !== undefined &&
        stopDetails.latitude !== null
          ? Number(stopDetails.latitude)
          : Number(currentStop.latitude);

      const longitude =
        stopDetails.longitude !== undefined &&
        stopDetails.longitude !== null
          ? Number(stopDetails.longitude)
          : Number(currentStop.longitude);

      const payload = {
        order_id: orderId,

        notes: String(stopDetails.notes || '').trim(),
        packages: Math.max(1, Number(stopDetails.packages || 1)),

        stop_type: stopType,
        time_at_stop: timeAtStop,
        arrival_time: arrivalTime,
        order_preference: orderPreference,

        address,
        latitude,
        longitude,

        priority:
          stopDetails.priority !== undefined
            ? stopDetails.priority
            : currentStop.priority,
      };

      const response = await ordersService.editOrder(payload);

      if (!isSuccessResponse(response)) {
        throw new Error(
          getResponseErrorMessage(response, 'Unable to save stop.'),
        );
      }

      const selectedKey = getStopIdentity(selectedStop);

      const updatedStop = {
        ...selectedStop,

        notes: payload.notes,
        packages: payload.packages,

        stopType,
        stop_type: stopType,

        order: orderPreference,
        order_preference: orderPreference,

        arrivalTime: arrivalTime || '',
        arrival_time: arrivalTime,

        timeAtStopMinutes: timeAtStop,
        time_at_stop: timeAtStop,

        address,
        description: address || selectedStop.description,

        latitude,
        longitude,
      } as RouteStop;

      const nextStops = route.stops.map((stop) =>
        getStopIdentity(stop) === selectedKey ? updatedStop : stop,
      );

      setRoute({
        ...route,
        stops: nextStops,
        coordinates: getInitialCoordinates({
          ...route,
          stops: nextStops,
        }),
      });

      setStopDetails({
        ...details,

        packages: payload.packages,

        stop_type: stopType,
        stopType,

        order_preference: orderPreference,
        order: orderPreference,

        arrivalTime: arrivalTime || '',
        timeAtStopMinutes: timeAtStop,

        address,
        latitude,
        longitude,
      } as any);

      await markRouteNeedsReOptimization();

      setSelectedStop(null);
      setSelectedSuggestion(null);
      setPanelMode('edit_route');
    } catch (error) {
      console.error('Unable to save edited stop:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save stop.',
      );
    } finally {
      setIsSavingRouteEdit(false);
    }
  },
  [
    effectiveRouteId,
    markRouteNeedsReOptimization,
    route,
    selectedStop,
  ],
);


const handleSaveStopPriority = useCallback(async (stopId: string, priority: number | null) => {
  if (!route || !effectiveRouteId) return;
  const targetStop = route.stops.find(s => s.id === stopId);
  if (!targetStop) return;
  const orderId = getStopBackendId(targetStop);
  if (!orderId) return;

  try {
    const response = await ordersService.editOrder({
      order_id: orderId,
      priority: priority,
    });

    if (isSuccessResponse(response)) {
      const nextStops = route.stops.map(stop =>
        stop.id === stopId
          ? { ...stop, priority: priority }
          : stop,
      );
      setRoute({ ...route, stops: nextStops });
      await markRouteNeedsReOptimization();
    }
  } catch (error) {
    console.error('Error saving stop priority:', error);
  }
}, [route, effectiveRouteId, markRouteNeedsReOptimization]);

const handleOpenEditStopAddress = useCallback((stop?: RouteStop) => {
  if (isInTransitStatus(routeStatus)) {
    setErrorMessage('The stop address cannot be changed after the route has started.');
    return;
  }

  const targetStop = stop || selectedStop;
  if (!targetStop) return;

  setStopAddressReturnMode(panelMode === 'details' ? 'details' : 'edit_stop');
  setSelectedStop(targetStop);
  setSelectedSuggestion(buildSuggestionFromStop(targetStop));
  setSearchText(
    targetStop.address ||
      targetStop.description ||
      targetStop.title ||
      '',
  );
  setSuggestions([]);
  setErrorMessage('');
  setPanelMode('edit_stop_address');
}, [panelMode, routeStatus, selectedStop]);

const handleSaveStopAddress = useCallback(async (suggestion: PlaceSuggestion) => {
  if (!route || !selectedStop || !effectiveRouteId) return;

  if (!isUnitedKingdomSuggestion(suggestion)) {
    setErrorMessage('Only locations within the United Kingdom are supported.');
    return;
  }

  const orderId = getStopBackendId(selectedStop);
  if (!orderId) {
    setErrorMessage('Order id is missing. Unable to save stop address.');
    return;
  }

  setIsSavingRouteEdit(true);
  setErrorMessage('');

  try {
    const fullAddress = String(
      suggestion.fullAddress || suggestion.subtitle || suggestion.title || '',
    ).trim();

    const response = await ordersService.editOrder({
      order_id: orderId,
      location: buildRouteLocationPayload(suggestion),
      address: fullAddress,
      title: suggestion.title,
      description: suggestion.subtitle || fullAddress,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });

    if (!isSuccessResponse(response)) {
      throw new Error(
        getResponseErrorMessage(response, 'Unable to save stop address.'),
      );
    }

    const selectedKey = getStopIdentity(selectedStop);
    const nextPoint = buildRoutePointFromSuggestion(
      suggestion,
      selectedStop.title || 'Stop',
    );

    const updatedStop = {
      ...selectedStop,
      ...nextPoint,
      title: suggestion.title || selectedStop.title,
      address: fullAddress,
      description: suggestion.subtitle || fullAddress,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    } as RouteStop;

    const nextStops = route.stops.map((stop) =>
      getStopIdentity(stop) === selectedKey ? updatedStop : stop,
    );

    const nextRoute = {
      ...route,
      stops: nextStops,
      coordinates: getInitialCoordinates({ ...route, stops: nextStops }),
    };

    setRoute(nextRoute);
    setSelectedStop(updatedStop);
    setSelectedSuggestion(buildSuggestionFromStop(updatedStop));
    setStopDetails((current) => ({
      ...current,
      address: fullAddress,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }) as StopDetails);

    await markRouteNeedsReOptimization();

    setSuggestions([]);
    setSearchText('');
    setPanelMode(stopAddressReturnMode);
    recenterMap();
  } catch (error) {
    setErrorMessage(
      error instanceof Error
        ? error.message
        : 'Unable to save stop address.',
    );
  } finally {
    setIsSavingRouteEdit(false);
  }
}, [
  effectiveRouteId,
  markRouteNeedsReOptimization,
  recenterMap,
  route,
  selectedStop,
  stopAddressReturnMode,
]);

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
    setErrorMessage('');
    setPanelMode('search');
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchText('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setSelectedStop(null);
    setErrorMessage('');
    setPanelMode(getPanelModeFromStatus(routeStatus, route?.stops?.length || 0));
  }, [route?.stops?.length, routeStatus]);

  const handleSelectSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    setStopDetailsReturnMode('setup');
    setSelectedSuggestion(suggestion);
    setSelectedStop(null);
    setStopDetails({ ...DEFAULT_STOP_DETAILS });
    setErrorMessage('');
    setPanelMode('details');
  }, []);

  const handleOpenStopDetails = useCallback((stop: RouteStop) => {
    setStopDetailsReturnMode(
      isInTransitStatus(routeStatus) ? 'transit' : 'setup',
    );
    setSelectedStop(stop);
    setSelectedSuggestion(buildSuggestionFromStop(stop));
    setStopDetails(buildStopDetailsFromStop(stop));
    setSearchText('');
    setSuggestions([]);
    setPanelMode('details');
  }, [routeStatus]);

  const handleStopDetailsChange = useCallback((details: StopDetails) => {
    setStopDetails(details);
  }, []);

  const handleConfirmStopDetails = useCallback(async () => {
    if (!route || !selectedSuggestion || isAddingStop) return;

    if (!selectedStop) {
      if (!isUnitedKingdomSuggestion(selectedSuggestion)) {
        setErrorMessage('Only locations within the United Kingdom are supported.');
        return;
      }
    }

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
        const currentDetails = stopDetails as any;
        const orderPreference =
          currentDetails.order_preference ?? currentDetails.order ?? 'auto';
        const stopType =
          currentDetails.stop_type ?? currentDetails.stopType ?? 'delivery';
        const arrivalTime =
          currentDetails.arrivalTime ?? currentDetails.arrival_time ?? '';
        const timeAtStop = Math.max(
          1,
          Number(
            currentDetails.timeAtStopMinutes ??
              currentDetails.time_at_stop ??
              1,
          ),
        );

        const response = await ordersService.editOrder({
          order_id: orderId,
          packages: Math.max(1, Number(currentDetails.packages || 1)),
          order_preference: orderPreference,
          stop_type: stopType,
          notes: String(currentDetails.notes || '').trim(),
          arrival_time: arrivalTime || null,
          time_at_stop: timeAtStop,
        });

        if (!isSuccessResponse(response)) {
          throw new Error(getResponseErrorMessage(response, 'Unable to update stop.'));
        }

        const nextStops = route.stops.map((stop) =>
          getStopIdentity(stop) === selectedStopKey
            ? {
                ...stop,
                packages: Math.max(1, Number(currentDetails.packages || 1)),
                order: orderPreference,
                order_preference: orderPreference,
                stopType,
                stop_type: stopType,
                notes: String(currentDetails.notes || '').trim(),
                arrivalTime: arrivalTime || '',
                arrival_time: arrivalTime || null,
                timeAtStopMinutes: timeAtStop,
                time_at_stop: timeAtStop,
              }
            : stop,
        );

        setRoute({
          ...route,
          stops: nextStops,
        });

        if (stopDetailsReturnMode !== 'transit') {
          await markRouteNeedsReOptimization();
        }

        setSelectedStop(null);
        setSelectedSuggestion(null);
        setStopDetails({ ...DEFAULT_STOP_DETAILS });
        setPanelMode(stopDetailsReturnMode);
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
      order_preference: stopDetails.order_preference,
      stop_type: stopDetails.stop_type,
      notes: stopDetails.notes,
      status: ROUTE_STATUS_PENDING,
      timeAtStopMinutes: stopDetails.timeAtStopMinutes,
      planned_arrival_time: stopDetails.arrivalTime,
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
      if (!isSuccessResponse(response)) {
        throw new Error(
          getResponseErrorMessage(response, 'Unable to add stop.'),
        );
      }
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
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unable to add stop on backend.';
      setErrorMessage(msg);
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsAddingStop(false);
    }
  }, [
    effectiveRouteId,
    isAddingStop,
    recenterMap,
    markRouteNeedsReOptimization,
    route,
    routeStatus,
    selectedStop,
    selectedSuggestion,
    stopDetails,
    stopDetailsReturnMode,
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
      const isFromBackend = routeData?.distance !== undefined || getOptimizePayload(response)?.summary?.distance !== undefined;
      const distanceMiles = isFromBackend
        ? Number(routeData?.distance || getOptimizePayload(response)?.summary?.distance || 0)
        : Number(path.distanceMeters) * 0.000621371;

      const distanceMeters = isFromBackend
        ? distanceMiles / 0.000621371
        : Number(path.distanceMeters);

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
        distanceLabel: formatMiles(distanceMiles),
        durationLabel: formatDuration(durationSeconds),
      });
      setRouteStatus(ROUTE_STATUS_OPTIMIZED);
      setPanelMode('confirmed');
      recenterMap();
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unable to optimize route.';
      setErrorMessage(msg);
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
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

      const actualStartTimeIso = new Date().toISOString();
      await persistRouteSnapshot({
        routeId: effectiveRouteId,
        status: ROUTE_STATUS_IN_TRANSIT,
        route: nextRoute,
        distanceMeters: path.distanceMeters,
        durationSeconds: path.durationSeconds,
        startDatetime: actualStartTimeIso,
      });

      setRoute(nextRoute);
      setRouteMeta({
        distanceLabel: formatDistance(path.distanceMeters),
        durationLabel: formatDuration(path.durationSeconds),
      });
      setRouteStartDatetime(actualStartTimeIso);
      setPreviewStartTime(formatTimeFromDateTime(actualStartTimeIso));
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

      // Keep the route in transit after the last stop is resolved.
      // The user must explicitly confirm completion from the completion panel.
      setRouteStatus(normalizeRouteStatus(ROUTE_STATUS_IN_TRANSIT));
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

  const handleMarkRouteCompleted = useCallback(async () => {
    if (!route || !effectiveRouteId || isCompletingRoute) return;

    const unresolvedStop = getActiveStop(route.stops).stop;
    if (unresolvedStop) {
      setErrorMessage('Resolve every stop before completing this route.');
      return;
    }

    setIsCompletingRoute(true);
    setErrorMessage('');

    try {
      const completionTime = new Date();
      const startTime = routeStartDatetime ? new Date(routeStartDatetime) : new Date();
      const durationSeconds = Math.max(0, Math.round((completionTime.getTime() - startTime.getTime()) / 1000));

      await persistRouteSnapshot({
        routeId: effectiveRouteId,
        status: ROUTE_STATUS_COMPLETED,
        route,
        durationSeconds,
        endDatetime: completionTime.toISOString(),
      });

      setRouteMeta((prev) => ({
        ...prev,
        durationLabel: formatDuration(durationSeconds),
      }));

      setRouteStatus(normalizeRouteStatus(ROUTE_STATUS_COMPLETED));
      setPanelMode('transit');
      recenterMap();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to complete this route.',
      );
    } finally {
      setIsCompletingRoute(false);
    }
  }, [effectiveRouteId, isCompletingRoute, recenterMap, route, routeStartDatetime]);

  const handleRetryFailedStops = useCallback(async (failedStops: RouteStop[]) => {
    if (
      !route ||
      !effectiveRouteId ||
      isRetryingFailedStops ||
      !Array.isArray(failedStops) ||
      failedStops.length === 0
    ) {
      return;
    }

    setIsRetryingFailedStops(true);
    setErrorMessage('');

    try {
      const routeService = routesService as any;
      const failedStopIds = failedStops
        .map((stop) => getStopBackendId(stop))
        .filter(Boolean);

      let retryResponse: any;
      let retryRouteId = '';
      let retryWasCreatedWithStops = false;

      // Prefer a dedicated backend endpoint when the service already exposes one.
      if (typeof routeService.retryFailedStops === 'function') {
        retryResponse = await routeService.retryFailedStops(effectiveRouteId, {
          failed_stop_ids: failedStopIds,
        });
        retryWasCreatedWithStops = true;
      } else if (typeof routeService.createRetryRoute === 'function') {
        retryResponse = await routeService.createRetryRoute({
          source_route_id: effectiveRouteId,
          failed_stop_ids: failedStopIds,
        });
        retryWasCreatedWithStops = true;
      } else if (typeof routeService.createRoute === 'function') {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        retryResponse = await routeService.createRoute({
          name: `${routeTitle || 'Route'} - Failed stops retry`,
          start_location: buildRetryRouteLocation(route.start),
          end_location: buildRetryRouteLocation(route.end),
          start_datetime: startDate.toISOString(),
          end_datetime: endDate.toISOString(),
          status: ROUTE_STATUS_PENDING,
          source_route_id: effectiveRouteId,
          route_type: 'failed_stops_retry',
        });
      } else {
        throw new Error(
          'Retry route API is missing. Add createRoute, createRetryRoute, or retryFailedStops to routesService.',
        );
      }

      if (!isSuccessResponse(retryResponse)) {
        throw new Error(
          getResponseErrorMessage(retryResponse, 'Unable to create retry route.'),
        );
      }

      retryRouteId = getCreatedRouteId(retryResponse);
      if (!retryRouteId) {
        throw new Error('The retry route was created without returning a route id.');
      }

      // A generic createRoute call creates only the route shell, so copy failed
      // stops as fresh pending orders. The original completed route remains unchanged.
      if (!retryWasCreatedWithStops) {
        for (let index = 0; index < failedStops.length; index += 1) {
          const failedStop = failedStops[index];
          const suggestion = buildSuggestionFromStop(failedStop);
          const details = buildStopDetailsFromStop(failedStop);
          const payload = buildOrderPayload({
            routeId: retryRouteId,
            sequence: index + 1,
            suggestion,
            details,
          });

          const orderResponse = await ordersService.addOrder({
            ...payload,
            status: ROUTE_STATUS_PENDING,
            source_order_id: getStopBackendId(failedStop),
          });

          if (!isSuccessResponse(orderResponse)) {
            throw new Error(
              getResponseErrorMessage(
                orderResponse,
                `Unable to copy failed stop ${index + 1}.`,
              ),
            );
          }
        }
      }

      router.replace({
        pathname: '/route-preview',
        params: {
          id: retryRouteId,
          mode: 'retry-failed',
          sourceRouteId: effectiveRouteId,
        },
      } as any);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to prepare failed stops.',
      );
    } finally {
      setIsRetryingFailedStops(false);
    }
  }, [
    effectiveRouteId,
    isRetryingFailedStops,
    route,
    routeTitle,
    router,
  ]);


  const handleCancelRoute = async () => {
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
      setErrorMessage('Address does not exists, Please type the correct address.');
      return;
    }

    setPanelMode('search');
    setSearchText(resolvedSuggestions[0].fullAddress || fallbackQuery);
    setSuggestions(resolvedSuggestions);
    setSelectedSuggestion(null);
    setSelectedStop(null);
    setErrorMessage('');
  }, []);

  const prepareResolvedManifestRowsForReview = useCallback((response: any, source: string) => {
    if (!route || !effectiveRouteId) return;

    const rows = getResolvedManifestRows(response).map((row) => ({
      ...row,
      source,
    }));

    const invalidRows = rows.filter((row) => row && row.valid === false);
    if (invalidRows.length > 0) {
      setErrorMessage('Address does not exists, Please type the correct address.');
    } else {
      setErrorMessage('');
    }

    const payloads = buildManifestOrderPayloads({
      routeId: effectiveRouteId,
      rows,
      startSequence: route.stops.length + 1,
    });

    if (!payloads.length) {
      if (invalidRows.length === 0) {
        setErrorMessage('No valid geocoded addresses found in this manifest.');
      }
      return;
    }

    setPendingManifestStops(payloads);
  }, [route, effectiveRouteId]);

  const addStopsInBulk = useCallback(async (selectedStops: any[]) => {
    if (!route || !effectiveRouteId || isAddingStop) return false;

    if (!Array.isArray(selectedStops) || selectedStops.length === 0) {
      setPendingManifestStops([]);
      return false;
    }

    setIsAddingStop(true);
    setErrorMessage('');

    try {
      const payloadData = {
        stops: selectedStops,
        route_id: effectiveRouteId,
      }
      const responseFromBackend = await addManifestStopsToBackend(payloadData);

      if (!isSuccessResponse(responseFromBackend)) {
        throw new Error(
          getResponseErrorMessage(responseFromBackend, 'Unable to add stops.'),
        );
      }

      const bulkResult =
        (responseFromBackend as any)?.data ?? responseFromBackend;
      const createdOrders = Array.isArray(bulkResult?.created)
        ? bulkResult.created
        : [];

      const failedCount = Number(
        bulkResult?.failed_count ?? bulkResult?.failedCount ?? 0,
      );
      const createdCount = Number(
        bulkResult?.created_count ??
          bulkResult?.createdCount ??
          createdOrders.length ??
          0,
      );

      if (failedCount > 0 || createdCount !== selectedStops.length) {
        throw new Error(
          `Only ${createdCount} of ${selectedStops.length} stops were created. No local stops were added.`,
        );
      }

      const fallbackStops: RouteStop[] = selectedStops.map((payload, index) => ({
        id: `${Date.now()}-manifest-${index}`,
        sequence: route.stops.length + index + 1,
        sequenceNo: route.stops.length + index + 1,
        markerLabel: String(route.stops.length + index + 1),
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        title: payload.title,
        description: payload.address,
        address: payload.address,
        packages: Number(payload.packages || 1),
        order:
          payload.order_preference ?? payload.order ?? 'auto',
        order_preference:
          payload.order_preference ?? payload.order ?? 'auto',
        stopType: payload.stop_type || payload.stopType || 'delivery',
        stop_type: payload.stop_type || payload.stopType || 'delivery',
        notes: payload.notes || '',
        status: ROUTE_STATUS_PENDING,
        timeAtStopMinutes:
          payload.time_at_stop ??
          payload.timeAtStopMinutes ??
          null,
        time_at_stop:
          payload.time_at_stop ??
          payload.timeAtStopMinutes ??
          null,
        planned_arrival_time:
          payload.planned_arrival_time ??
          payload.arrival_time ??
          null,
      }));

      const createdStops =
        createdOrders.length === selectedStops.length
          ? createdOrders.map((item: any, index: number) =>
              buildStopFromSavedOrder(
                unwrapOrderPayload(item),
                fallbackStops[index],
              ),
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

      return true;
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unable to add stops.';
      setErrorMessage(msg);
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return false;
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

  const handleConfirmManifestStops = useCallback(
    async (selectedStops: any[]) => {
      await addStopsInBulk(selectedStops);
    },
    [addStopsInBulk],
  );

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

  const handleCopyStopsFromPastRoute = useCallback(async () => {
    setIsCopyStopsModalOpen(true);
    setIsLoadingPastRoutes(true);
    setErrorMessage('');
    setPastRouteStops([]);
    setPastRouteTitle('');
    setSelectedPastRouteId('');
    setSelectedPastStopKeys({});
    try {
      const response = (await routesService.getRoutes(50, 0)) as any;
      const rawData = response?.data ?? response;
      const routesList = Array.isArray(rawData) ? rawData : rawData?.routes || [];

      // Filter out current route
      const filteredRoutes = routesList.filter((r: any) => {
        const rId = String(r.route_id || r.id || r.routeId || '');
        return rId && rId !== String(effectiveRouteId);
      });

      setAllPastRoutes(filteredRoutes);

      const lastRoute = filteredRoutes[0];
      if (!lastRoute) {
        throw new Error('No past routes found to copy stops from.');
      }

      const lastRouteId = String(lastRoute.route_id || lastRoute.id || lastRoute.routeId);
      setSelectedPastRouteId(lastRouteId);
      setPastRouteTitle(lastRoute.name || lastRoute.routeName || lastRoute.title || 'Last Route');

      setIsLoadingStops(true);
      const routeDetailResponse = await routesService.getRoute(lastRouteId);
      const result = await buildRouteFromBackendResponse(routeDetailResponse, lastRouteId);
      const stops = result.route.stops;

      setPastRouteStops(stops);

      // Initialize selection: default to all stops checked
      const initialSelection: Record<string, boolean> = {};
      stops.forEach((stop) => {
        initialSelection[stop.id] = true;
      });
      setSelectedPastStopKeys(initialSelection);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load past route stops.');
      setIsCopyStopsModalOpen(false);
    } finally {
      setIsLoadingPastRoutes(false);
      setIsLoadingStops(false);
    }
  }, [effectiveRouteId]);

  const handleSwitchPastRoute = useCallback(async (routeId: string, title: string) => {
    setSelectedPastRouteId(routeId);
    setPastRouteTitle(title);
    setIsLoadingStops(true);
    setErrorMessage('');
    try {
      const routeDetailResponse = await routesService.getRoute(routeId);
      const result = await buildRouteFromBackendResponse(routeDetailResponse, routeId);
      const stops = result.route.stops;

      setPastRouteStops(stops);

      // Initialize selection: default to all stops checked
      const initialSelection: Record<string, boolean> = {};
      stops.forEach((stop) => {
        initialSelection[stop.id] = true;
      });
      setSelectedPastStopKeys(initialSelection);
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to load stops for selected route.');
    } finally {
      setIsLoadingStops(false);
    }
  }, []);

  const togglePastStopSelection = useCallback((stopId: string) => {
    setSelectedPastStopKeys((prev) => ({
      ...prev,
      [stopId]: !prev[stopId],
    }));
  }, []);

  const togglePastStopsBatch = useCallback((stopIds: string[], select: boolean) => {
    setSelectedPastStopKeys((prev) => {
      const next = { ...prev };
      stopIds.forEach((id) => {
        next[id] = select;
      });
      return next;
    });
  }, []);

  const handleConfirmCopyStops = useCallback(async () => {
    if (!route || !effectiveRouteId || isAddingStop) return;

    const stopsToCopy = pastRouteStops.filter(
      (stop) => selectedPastStopKeys[stop.id],
    );

    if (stopsToCopy.length === 0) {
      setErrorMessage('Please select at least one stop to copy.');
      return;
    }

    const payloads = stopsToCopy.map((stop, index) => {
      const sequence = route.stops.length + index + 1;
      const stopData = stop as any;

      return {
        sequence_no: sequence,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        title: stop.title || `Stop ${sequence}`,
        address: stop.address || stop.description || '',
        packages: Math.max(1, Number(stop.packages || 1)),
        order_preference:
          stopData.order_preference ?? stopData.order ?? 'auto',
        stop_type:
          stopData.stop_type ?? stopData.stopType ?? 'delivery',
        notes: stop.notes || '',
        status: ROUTE_STATUS_PENDING,
        planned_arrival_time:
          stopData.planned_arrival_time ??
          stopData.arrival_time ??
          null,
        time_at_stop:
          stopData.time_at_stop ??
          stopData.timeAtStopMinutes ??
          null,
        source_order_id: getStopBackendId(stop) || null,
        source_route_id: selectedPastRouteId || null,
      };
    });

    setErrorMessage('');

    const copiedSuccessfully = await addStopsInBulk(payloads);

    if (copiedSuccessfully) {
      setIsCopyStopsModalOpen(false);
      setSelectedPastStopKeys({});
    }
  }, [
    effectiveRouteId,
    addStopsInBulk,
    isAddingStop,
    pastRouteStops,
    route,
    selectedPastRouteId,
    selectedPastStopKeys,
  ]);

  const handleSkipOptimization = useCallback(async () => {
    await handleConfirmRoute();
  }, [handleConfirmRoute]);

  const handleRemoveStops = useCallback(() => {
    setErrorMessage('Remove stops needs a route-specific delete endpoint before enabling it.');
  }, []);

  const handleCreateNewRoute = useCallback(() => {
    router.push('/setup-locations' as any);
  }, [router]);


  const handleOpenReorderStops = useCallback(() => {
    if (!route || route.stops.length < 2) {
      setErrorMessage('Add at least two stops before reordering.');
      return;
    }

    // This action comes from the optimized route panel. Open the requested
    // UI mode directly instead of resolving another mode from routeStatus.
    setErrorMessage('');
    setSelectedStop(null);
    setSelectedSuggestion(null);
    setSearchText('');
    setSuggestions([]);
    setPanelMode('reorder_stops');
  }, [route]);

const handleCancelReorderStops = useCallback(() => {
  if (isSavingStopOrder) return;
  setErrorMessage('');
  setPanelMode('confirmed');
}, [isSavingStopOrder]);

const handleSaveStopOrder = useCallback(
  async (orderedStops: RouteStop[]) => {
    if (
      !route ||
      !effectiveRouteId ||
      isSavingStopOrder ||
      !Array.isArray(orderedStops) ||
      orderedStops.length === 0
    ) {
      return;
    }

    setIsSavingStopOrder(true);
    setErrorMessage('');

    try {
      const nextStops = orderedStops.map((stop, index) => ({
        ...stop,
        sequence: index + 1,
        sequenceNo: index + 1,
        sequence_no: index + 1,
        markerLabel: String(index + 1),

        // Previous optimized ETAs are no longer valid after manual reordering.
        arrival_time: undefined,
        arrivalTime: undefined,
        eta: undefined,
        estimated_arrival: undefined,
        estimatedArrival: undefined,
        arrivalOffsetSeconds: undefined,
        arrival_offset_seconds: undefined,
        cumulativeDurationSeconds: undefined,
        cumulative_duration_seconds: undefined,
      })) as RouteStop[];

      const orders = nextStops.map((stop, index) => {
        const orderId = getStopBackendId(stop);

        if (!orderId) {
          throw new Error(`Order id is missing for stop ${index + 1}.`);
        }

        return {
          order_id: orderId,
          sequence_no: index + 1,
        };
      });

      const orderService = ordersService as any;

      if (typeof orderService.reorderOrders !== 'function') {
        throw new Error(
          'ordersService.reorderOrders is missing. Add the PUT /order/reorder service method.',
        );
      }

      const response = await orderService.reorderOrders({
        route_id: effectiveRouteId,
        orders,
      });

      if (!isSuccessResponse(response)) {
        throw new Error(
          getResponseErrorMessage(response, 'Unable to save the stop order.'),
        );
      }

      // Rebuild the road path using the manually selected order. This does not
      // call the optimization API, so the user's sequence remains unchanged.
      const reorderedRoute: AppRoute = {
        ...route,
        stops: nextStops,
        coordinates: getInitialCoordinates({
          ...route,
          stops: nextStops,
        }),
      };

      const path = await fetchRoutePath(getRoutePoints(reorderedRoute));

      const nextRoute: AppRoute = {
        ...reorderedRoute,
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
          : 'Unable to save the stop order.',
      );
    } finally {
      setIsSavingStopOrder(false);
    }
  }, [
    effectiveRouteId,
    isSavingStopOrder,
    recenterMap,
    route,
  ],
);

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
    handleScanAddress,
    handleVoiceAddress,
    handleScanRouteManifest,
    handleImportRouteManifest,
    handleCopyStopsFromPastRoute,
    handleSkipOptimization,
    handleRemoveStops,
    editingStop: selectedStop,
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
    handleCancelManifestStops: () => setPendingManifestStops([]),
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
    handleSaveStopPriority
  };
}
