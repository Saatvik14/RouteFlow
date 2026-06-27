// Replace route-preview-panel.tsx with this version.
import { useWindowDimensions } from 'react-native';

import { CancelledRoutePanel } from './route-preview-panel/components/cancelled-route-panel';
import { RouteCompletedPanel } from './route-preview-panel/components/completion-panels';
import { ConfirmedRoutePanel } from './route-preview-panel/components/confirmed-route-panel';
import { EmptyStopsPanel } from './route-preview-panel/components/empty-stops-panel';
import {
  EditLocationPanel,
  EditRoutePanel,
  EditStopPanel,
  EditTimePanel,
} from './route-preview-panel/components/edit-route-panels';
import { RouteSetupPanel } from './route-preview-panel/components/route-setup-panel';
import { SearchPanel } from './route-preview-panel/components/search-panel';
import { StopDetailsPanel } from './route-preview-panel/components/stop-details-panel';
import { TransitStopPanel } from './route-preview-panel/components/transit-stop-panel';
import type { PanelMode, RoutePreviewPanelProps } from './route-preview-panel/types';
import { isRouteCompletedStatus, normalizeRouteStatus } from './route-preview-panel/utils';

export type { PanelMode, PlaceSuggestion, RoutePreviewPanelProps, StopDetails } from './route-preview-panel/types';

function isCancelledStatus(status: string) {
  return status === 'cancelled' || status === 'canceled';
}

export function RoutePreviewPanel(props: RoutePreviewPanelProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const normalizedStatus = normalizeRouteStatus(props.routeStatus);

  if (props.mode === 'cancelled' || isCancelledStatus(normalizedStatus)) {
    return <CancelledRoutePanel {...props} isWide={isWide} />;
  }

  if (isRouteCompletedStatus(normalizedStatus)) {
    return <RouteCompletedPanel {...props} isWide={isWide} />;
  }

  const resolvedMode: PanelMode =
    props.mode === 'transit' || normalizedStatus === 'in_transit' ? 'transit' : props.mode;

  switch (resolvedMode) {
    case 'edit_route':
      return <EditRoutePanel {...props} isWide={isWide} />;

    case 'edit_start_location':
      return <EditLocationPanel {...props} isWide={isWide} target="start" currentLocation={props.start} />;

    case 'edit_end_location':
      return <EditLocationPanel {...props} isWide={isWide} target="end" currentLocation={props.end} />;

    case 'edit_start_time':
      return <EditTimePanel {...props} isWide={isWide} target="start" />;

    case 'edit_stop':
      return <EditStopPanel {...props} isWide={isWide} />;

    case 'edit_stop_address':
      return <EditLocationPanel {...props} isWide={isWide} target="stop" currentLocation={(props as any).editingStop} />;

    case 'cancelled':
      return <CancelledRoutePanel {...props} isWide={isWide} />;

    case 'transit':
      return <TransitStopPanel {...props} isWide={isWide} />;

    case 'search':
      return <SearchPanel {...props} isWide={isWide} />;

    case 'details':
      return <StopDetailsPanel {...props} isWide={isWide} />;

    case 'setup':
      return <RouteSetupPanel {...props} isWide={isWide} />;

    case 'confirmed':
      return <ConfirmedRoutePanel {...props} isWide={isWide} />;

    default:
      return <EmptyStopsPanel {...props} isWide={isWide} />;
  }
}

export default RoutePreviewPanel;
