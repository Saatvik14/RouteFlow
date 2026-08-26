import type { 
  RoutePoint,
  RouteStop
   } from '../../maps/RouteMap.native';

export type PanelMode = any;

export type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
  details?: any;
  provider?: string;
  sessionToken?: string;
};

export type StopDetails = {
  packages: number;
  order: 'first' | 'auto' | 'last';
  stopType: 'delivery' | 'pickup';
  notes: string;
  priority?: number | null;
};

export type RoutePreviewPanelProps = {
  mode: PanelMode;
  routeId?: string;
  subscriptionType?: string;
  errorMessage?: string | null;
  routeName: string;
  startTime: string;
  start: RoutePoint;
  end: RoutePoint;
  stops: any;
  durationLabel: string;
  distanceLabel: string;
  routeStatus?: string;

  activeStop?: any;
  activeStopIndex?: number;
  totalActiveStops?: number;
  isUpdatingStopStatus?: boolean;

  searchText: string;
  suggestions: PlaceSuggestion[];
  selectedSuggestion: PlaceSuggestion | null;
  stopDetails: StopDetails;
  isAddingStop?: boolean;
  isStartingRoute?: boolean;

  onSearchTextChange: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
  onStopDetailsChange: (details: any) => void | Promise<void>;
  onConfirmStopDetails: () => void | Promise<void>;
  onOptimizeRoute: () => void;
  onRefine: () => void;
  onConfirm: () => void | Promise<void>;
  onStartRoute?: () => void | Promise<void>;

  onNavigateActiveStop?: (stop?: any) => void | Promise<void>;
  onMarkStopDelivered?: () => void | Promise<void>;
  onMarkStopFailed?: () => void | Promise<void>;

  isCompletingRoute?: boolean;
  onMarkRouteCompleted?: () => void | Promise<void>;
  onCopyStopsToNewRoute?: () => void | Promise<void>;
  onCreateNewRoute?: () => void | Promise<void>;
  editingStop?: RouteStop | null;
  isSavingRouteEdit?: boolean;
  onOpenEditRoute?: () => void;
  onCancelEditRoute?: () => void;
  onBackFromEditStop ?: () => void;
  onOpenEditStartLocation?: () => void;
  onOpenEditEndLocation?: () => void;
  onOpenEditStartTime?: () => void;
  onSaveRouteLocation?: (target: 'start' | 'end', suggestion: PlaceSuggestion) => void;
  onSaveRouteTime?: (target: 'start' | 'end', isoDateTime: string) => void;
  onOpenEditStop?: (stop: RouteStop) => void;
  onSaveEditedStop?: (details: any) => void | Promise<void>;
  onOpenEditStopAddress?: (stop?: RouteStop) => void;
  onSaveStopAddress?: (suggestion: PlaceSuggestion) => void;
  onRemoveEditedStop?: () => void;
  onReOptimizeEditedRoute?: () => void;
  pendingManifestStops?: any[];
  onConfirmManifestStops?: (stops: any[]) => Promise<void>;
  onCancelManifestStops?: () => void;
  onOpenStopDetails?: (stop: any) => void;
  onSelectStop?: (stop: any) => void;
  onStopPress?: (stop: any) => void;
  onScanAddress?: () => void;
  onVoiceAddress?: () => void;
  onScanRouteManifest?: () => void;
  onImportRouteManifest?: () => void;
  onCopyStopsFromPastRoute?: () => void;
  onSkipOptimization?: () => void;
  onRemoveStops?: () => void;
  onAddAnotherStop?: () => void;
  onOpenReorderStops?: () => void;
  onCancelReorderStops?: () => void;
  onSaveStopOrder?: (orderedStops: any[]) => void | Promise<void>;
  isSavingStopOrder?: boolean;
  isOptimizing?: boolean;
  isCancellingRoute?: boolean;
  onCancelRoute?: () => void | Promise<void>;
  onSaveStopPriority?: (stopId: string, priority: number | null) => Promise<void>;
};


