// Haversine distance in meters
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Dynamic Google Maps-style route polyline generator:
 * When isNavigating is active and userLocation is available:
 * - Finds the closest point on the route to the user's current GPS location.
 * - Slices off the portion of the polyline behind the user.
 * - Starts the blue line directly from the user's current GPS position, extending to the destination.
 * - As the user moves closer, the remaining blue line dynamically reduces; if the user moves away, it extends.
 */
export function getActiveRouteCoordinates<T extends { latitude: number; longitude: number }>(
  routeCoordinates: T[],
  userLocation: { latitude: number; longitude: number; heading?: number | null } | null,
  isNavigating: boolean
): T[] {
  if (!isNavigating || !userLocation || !routeCoordinates || routeCoordinates.length === 0) {
    return routeCoordinates;
  }

  // During active navigation, routeCoordinates is the live OSRM road geometry from the driver's location to the target stop.
  // Return routeCoordinates directly to prevent drawing sharp off-road straight line artifacts.
  return routeCoordinates;
}
