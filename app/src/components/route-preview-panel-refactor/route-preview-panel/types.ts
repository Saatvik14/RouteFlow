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
  latitude: number;
  longitude: number;
};

export type StopDetails = {
  packages: number;
  order: 'first' | 'auto' | 'last';
  stopType: 'delivery' | 'pickup';
  notes: string;
};

export type RoutePreviewPanelProps = {
  mode: PanelMode;
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
  onStopDetailsChange: (details: StopDetails) => void;
  onConfirmStopDetails: () => void | Promise<void>;
  onOptimizeRoute: () => void;
  onRefine: () => void;
  onConfirm: () => void | Promise<void>;
  onStartRoute?: () => void | Promise<void>;

  onNavigateActiveStop?: () => void | Promise<void>;
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
  onOpenEditStartLocation?: () => void;
  onOpenEditEndLocation?: () => void;
  onOpenEditStartTime?: () => void;
  onSaveRouteLocation?: (target: 'start' | 'end', suggestion: PlaceSuggestion) => void;
  onSaveRouteTime?: (target: 'start' | 'end', isoDateTime: string) => void;
  onOpenEditStop?: (stop: RouteStop) => void;
  onSaveEditedStop?: (details: StopDetails) => void;
  onOpenEditStopAddress?: (stop?: RouteStop) => void;
  onSaveStopAddress?: (suggestion: PlaceSuggestion) => void;
  onRemoveEditedStop?: () => void;
  onReOptimizeEditedRoute?: () => void;
  pendingManifestStops?: any[];
  onConfirmManifestStops?: (stops: any[]) => Promise<void>;
  onCancelManifestStops?: () => void;
};


