import { useWindowDimensions } from 'react-native';

import type { PanelMode, RoutePreviewPanelProps } from './route-preview-panel/types';
import { isRouteCompletedStatus, normalizeRouteStatus } from './route-preview-panel/utils';
import { ConfirmedRoutePanel } from './route-preview-panel/components/confirmed-route-panel';
import { EmptyStopsPanel } from './route-preview-panel/components/empty-stops-panel';
import { RouteCompletedPanel } from './route-preview-panel/components/completion-panels';
import { RouteSetupPanel } from './route-preview-panel/components/route-setup-panel';
import { SearchPanel } from './route-preview-panel/components/search-panel';
import { StopDetailsPanel } from './route-preview-panel/components/stop-details-panel';
import { TransitStopPanel } from './route-preview-panel/components/transit-stop-panel';

export type { PanelMode, PlaceSuggestion, RoutePreviewPanelProps, StopDetails } from './route-preview-panel/types';

export function RoutePreviewPanel(props: RoutePreviewPanelProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const normalizedStatus = normalizeRouteStatus(props.routeStatus);

  if (isRouteCompletedStatus(normalizedStatus)) {
    return <RouteCompletedPanel {...props} isWide={isWide} />;
  }

  const resolvedMode: PanelMode =
    props.mode === 'transit' || normalizedStatus === 'in_transit'
      ? 'transit'
      : props.mode;

  switch (resolvedMode) {
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
