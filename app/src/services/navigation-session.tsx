import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVIGATION_SESSION_KEY = 'routeflow_active_navigation_session';

export type NavigationDestination = {
  id?: string | number;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  orderId?: string | number;
};

export type NavigationSession = {
  routeName?: string;
  activeStopIndex: number;
  totalStops: number;
  destination: NavigationDestination;
};

export async function saveNavigationSession(session: NavigationSession) {
  await AsyncStorage.setItem(NAVIGATION_SESSION_KEY, JSON.stringify(session));
}

export async function getNavigationSession() {
  const raw = await AsyncStorage.getItem(NAVIGATION_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as NavigationSession;
  } catch {
    return null;
  }
}

export async function clearNavigationSession() {
  await AsyncStorage.removeItem(NAVIGATION_SESSION_KEY);
}

export function getStopLatLng(stop: any) {
  const latitude = Number(
    stop?.latitude ??
      stop?.lat ??
      stop?.location?.latitude ??
      stop?.location?.lat ??
      stop?.coordinates?.latitude ??
      stop?.coordinates?.[1],
  );

  const longitude = Number(
    stop?.longitude ??
      stop?.lng ??
      stop?.lon ??
      stop?.location?.longitude ??
      stop?.location?.lng ??
      stop?.location?.lon ??
      stop?.coordinates?.longitude ??
      stop?.coordinates?.[0],
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function getStopAddress(stop: any) {
  const direct =
    stop?.full_address ||
    stop?.fullAddress ||
    stop?.address ||
    stop?.subtitle ||
    stop?.description;

  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const location = stop?.location;

  if (location && typeof location === 'object') {
    return [
      location.name,
      location.housenumber,
      location.houseNumber,
      location.street,
      location.area,
      location.city,
      location.postcode,
      location.postalCode,
      location.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  return 'Address not available';
}

export function getStopTitle(stop: any, fallback: string) {
  return (
    stop?.title ||
    stop?.name ||
    stop?.customerName ||
    stop?.customer_name ||
    stop?.locationName ||
    stop?.location_name ||
    getStopAddress(stop).split(',')[0] ||
    fallback
  );
}

export function getStopOrderId(stop: any, fallback: string) {
  return (
    stop?.orderId ||
    stop?.order_id ||
    stop?.backendOrderId ||
    stop?.backend_order_id ||
    stop?.id ||
    fallback
  );
}