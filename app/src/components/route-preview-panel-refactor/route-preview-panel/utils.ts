export function normalizeRouteStatus(status?: string) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}
export function isReadyToStartStatus(status?: string) {
  return normalizeRouteStatus(status) === 'optimized';
}
export function isInTransitStatus(status?: string) {
  return normalizeRouteStatus(status) === 'in_transit';
}
export function isRouteCompletedStatus(status?: string) {
  return ['completed', 'complete', 'route_completed', 'done'].includes(
    normalizeRouteStatus(status),
  );
}
export function getStopTitle(stop: any, fallback = 'Stop') {
  return (
    stop?.title ||
    stop?.address ||
    stop?.description ||
    stop?.customer_name ||
    stop?.customerName ||
    fallback
  );
}
export function getStopSubtitle(stop: any) {
  return (
    stop?.subtitle ||
    stop?.description ||
    stop?.address ||
    stop?.full_address ||
    stop?.fullAddress ||
    'Address not available'
  );
}
export function getStopStatus(stop: any) {
  return normalizeRouteStatus(
    stop?.status ||
    stop?.order_status ||
    stop?.orderStatus ||
    stop?.delivery_status ||
    stop?.deliveryStatus,
  );
}
export function isDeliveredStop(stop: any) {
  return ['delivered', 'success', 'successful', 'completed'].includes(getStopStatus(stop));
}
export function isFailedStop(stop: any) {
  return ['failed', 'failure', 'undelivered', 'cancelled', 'canceled'].includes(
    getStopStatus(stop),
  );
}
export function isResolvedStop(stop: any) {
  return isDeliveredStop(stop) || isFailedStop(stop);
}
export function countStopsByStatus(stops: any[]) {
  const delivered = stops.filter(isDeliveredStop).length;
  const failed = stops.filter(isFailedStop).length;
  const resolved = stops.filter(isResolvedStop).length;

  return {
    delivered,
    failed,
    resolved,
    pending: Math.max(stops.length - resolved, 0),
  };
}
export function formatStopCount(count: number) {
  return `${count} ${count === 1 ? 'stop' : 'stops'}`;
}
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
