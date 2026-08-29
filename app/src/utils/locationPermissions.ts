import { jwtDecode } from 'jwt-decode';
import { getAuthToken, restoreAuthToken, getUserEmailFromToken } from '../services/api/client';

export const INDIA_ALLOWED_EMAILS = [
  'vai@gmail.com',
  'saatvikrawat8921@gmail.com',
  'saatvik652@gmail.com',
  'vaibhavgrg2801@gmail.com',
  'vaibh.garg.3010@gmail.com',
  'vaibhavgrg007@gmail.com',
  'visiofytech@gmail.com',
];

let cachedEmail: string | null = null;

export const isIndiaAllowedForEmail = (email?: string | null): boolean => {
  if (__DEV__ || process.env.NODE_ENV !== 'production') return true;
  if (!email) return false;
  return INDIA_ALLOWED_EMAILS.includes(String(email).toLowerCase().trim());
};

export const getCurrentUserEmailSync = (): string | null => {
  if (cachedEmail) return cachedEmail;
  const fromToken = getUserEmailFromToken();
  if (fromToken) {
    cachedEmail = fromToken;
    return cachedEmail;
  }
  const token = getAuthToken();
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const userObj = decoded.user || decoded;
      if (userObj && (userObj.email || decoded.email)) {
        cachedEmail = String(userObj.email || decoded.email).toLowerCase().trim();
        return cachedEmail;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

export const getCurrentUserEmailAsync = async (): Promise<string | null> => {
  const syncEmail = getCurrentUserEmailSync();
  if (syncEmail) return syncEmail;

  try {
    const token = await restoreAuthToken();
    if (token) {
      const fromToken = getUserEmailFromToken();
      if (fromToken) {
        cachedEmail = fromToken;
        return cachedEmail;
      }
      const decoded: any = jwtDecode(token);
      const userObj = decoded.user || decoded;
      if (userObj && (userObj.email || decoded.email)) {
        cachedEmail = String(userObj.email || decoded.email).toLowerCase().trim();
        return cachedEmail;
      }
    }
  } catch {
    // ignore
  }

  return null;
};

export const isUkLocation = (item: any): boolean => {
  const lat = Number(item?.latitude ?? item?.lat);
  const lon = Number(item?.longitude ?? item?.lon);

  if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
    if (lat >= 49.0 && lat <= 61.0 && lon >= -10.0 && lon <= 2.5) {
      return true;
    }
  }

  const address = (
    item?.address ||
    item?.full_address ||
    item?.fullAddress ||
    item?.addressLine1 ||
    ''
  ).toLowerCase();
  const title = (item?.title || '').toLowerCase();
  const country = (item?.country || '').toLowerCase();
  const countryCode = (item?.country_code || item?.countryCode || item?.isoCountryCode || '').toLowerCase();

  return (
    address.includes('united kingdom') ||
    address.includes(', uk') ||
    address.includes(', gb') ||
    country.includes('united kingdom') ||
    country === 'uk' ||
    country === 'gb' ||
    countryCode === 'gb' ||
    countryCode === 'uk' ||
    title.includes('united kingdom')
  );
};

export const isIndiaLocation = (item: any): boolean => {
  const lat = Number(item?.latitude ?? item?.lat);
  const lon = Number(item?.longitude ?? item?.lon);

  if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
    if (lat >= 6.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0) {
      return true;
    }
  }

  const address = (
    item?.address ||
    item?.full_address ||
    item?.fullAddress ||
    item?.addressLine1 ||
    ''
  ).toLowerCase();
  const title = (item?.title || '').toLowerCase();
  const country = (item?.country || '').toLowerCase();
  const countryCode = (item?.country_code || item?.countryCode || item?.isoCountryCode || '').toLowerCase();

  return (
    address.includes('india') ||
    address.includes(', in') ||
    country.includes('india') ||
    country === 'in' ||
    countryCode === 'in' ||
    title.includes('india')
  );
};

export const isLocationAllowedForUser = (
  item: any,
  userEmail?: string | null
): boolean => {
  if (isUkLocation(item)) {
    return true;
  }

  const email = userEmail ?? getCurrentUserEmailSync();
  if (isIndiaAllowedForEmail(email) && isIndiaLocation(item)) {
    return true;
  }

  return false;
};
