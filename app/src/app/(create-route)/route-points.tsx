import { useAuth } from './../_layout';
import { fetchAndStoreConfig, restoreAuthToken } from './../../services/api';
import { routesService } from './../../services/api/routes';
import { driversService, Driver } from './../../services/api/drivers';
import { useUserRole } from './../../hooks/useUserRole';
import { isTokenValid } from './../../services/auth/jwtUtils';
import { addManifestStopsToBackend } from '../(route-preview)/route-preview-input.service';
import { ROUTE_STATUS_PENDING } from './../(route-preview)/route-preview.helpers';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigStore } from './../../store/useConfigStore';
import { createLocationSessionToken } from './../../utils/locationSession';
import {
  isLocationAllowedForUser,
  isIndiaAllowedForEmail,
  getCurrentUserEmailSync,
} from './../../utils/locationPermissions';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EndMode = 'round_trip' | 'other_address' | 'no_end';
type PickerTarget = 'start' | 'end';

type LocationMode = 'current_location' | 'manual_address';

type AddressDetails = {
  housenumber: string;
  street: string;
  placeId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  country: string;
  countryCode: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

type LocationValue = {
  mode: LocationMode;
  address: string;
  latitude: number | null;
  longitude: number | null;
  selectedFromSuggestion: boolean;
  details: AddressDetails | null;
};

type PlaceSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
  details: AddressDetails;
  provider?: string;
  sessionToken?: string;
};



function getParam(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayTime(date: Date) {
  return date
    .toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
}

function getReadableAddress(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return 'Current location';

  return [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ')
    .replace(/[\s\-,]+$/, '')
    .trim();
}

function emptyAddressDetails(): AddressDetails {
  return {
    housenumber: '',
    street: '',
    placeId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    country: '',
    countryCode: '',
    postalCode: '',
    latitude: null,
    longitude: null,
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseSuggestion(
  item: any,
  index: number,
  fallbackQuery: string,
  sessionToken?: string,
): PlaceSuggestion {
  const properties = item?.properties || item || {};
  const geometryCoordinates = item?.geometry?.coordinates || [];

  const latitude = toNumberOrNull(
    properties.latitude ??
      properties.lat ??
      item?.latitude ??
      item?.lat ??
      geometryCoordinates?.[1]
  );

  const longitude = toNumberOrNull(
    properties.longitude ??
      properties.lon ??
      properties.lng ??
      item?.longitude ??
      item?.lon ??
      item?.lng ??
      geometryCoordinates?.[0]
  );

  const fullAddress =
    properties.fullAddress ||
    properties.formatted ||
    properties.address ||
    properties.display_name ||
    item?.fullAddress ||
    item?.address ||
    item?.display_name ||
    fallbackQuery;

  const title =
    properties.title ||
    properties.name ||
    properties.address_line1 ||
    item?.title ||
    item?.name ||
    item?.text ||
    String(fullAddress).split(',')[0] ||
    fallbackQuery;

  const subtitle =
    properties.subtitle ||
    properties.address_line2 ||
    properties.description ||
    item?.subtitle ||
    item?.description ||
    String(fullAddress).replace(String(title), '').trim().replace(/^,/, '').trim() ||
    'Address suggestion';

  const details: any = {
    placeId: String(
      properties.place_id ||
        properties.placeId ||
        item?.place_id ||
        item?.placeId ||
        item?.id ||
        index
    ),
    addressLine1: String(properties.address_line1 || title || ''),
    addressLine2: String(properties.address_line2 || subtitle || ''),
    city: String(properties.city || properties.county || properties.locality || ''),
    district: String(properties.district || properties.state_district || ''),
    state: String(properties.state || properties.region || ''),
    country: String(properties.country || ''),
    countryCode: String(properties.country_code || properties.countryCode || '').toUpperCase(),
    postalCode: String(properties.postcode || properties.postalCode || properties.postal_code || ''),
    latitude,
    longitude,
  };

  return {
    id: details.placeId || `${fallbackQuery}-${index}`,
    title: String(title),
    subtitle: String(subtitle),
    fullAddress: String(fullAddress),
    latitude,
    longitude,
    details,
    provider: String(properties.provider || item?.provider || ''),
    sessionToken,
  };
}

function parseDisplayTimeToHours(time: string) {
  const cleanTime = time.trim().toLowerCase();
  const match = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
    };
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const meridiem = match[3];

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return {
    hours,
    minutes,
  };
}

function buildDateTimeISOString(date: Date, time: string) {
  const { hours, minutes } = parseDisplayTimeToHours(time);

  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);

  return value.toISOString();
}

function buildBackendLocationPayload(
  location: LocationValue | null,
  fallbackName: string
) {
  const details = location?.details || emptyAddressDetails();
  const cleanAddress = location?.address?.trim() || '';

  return {
    housenumber: details.housenumber || '',
    street: details.street || '',
    city: details.city || '',
    postcode: details.postalCode || '',
    country: details.country || '',
    full_address: cleanAddress,

    // extra fields
    latitude:
      location?.selectedFromSuggestion || location?.mode === 'current_location'
        ? location.latitude
        : null,
    longitude:
      location?.selectedFromSuggestion || location?.mode === 'current_location'
        ? location.longitude
        : null,

    state: details.state || '',
    district: details.district || '',
    country_code: details.countryCode || '',
    place_id: details.placeId || '',
    selected_from_suggestion: Boolean(location?.selectedFromSuggestion),
    mode: location?.mode || 'manual_address',
  };
}

function buildLocationPayload(location: LocationValue | null) {
  if (!location) return null;

  const cleanAddress = location.address.trim();

  return {
    mode: location.mode,
    address: cleanAddress,
    selectedFromSuggestion: location.selectedFromSuggestion,
    latitude:
      location.selectedFromSuggestion || location.mode === 'current_location'
        ? location.latitude
        : null,
    longitude:
      location.selectedFromSuggestion || location.mode === 'current_location'
        ? location.longitude
        : null,
    details:
      location.selectedFromSuggestion || location.mode === 'current_location'
        ? location.details || emptyAddressDetails()
        : emptyAddressDetails(),
  };
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startWeekDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days: (Date | null)[] = [];

  for (let index = 0; index < startWeekDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function buildDateFromISO(dateISO: string) {
  const date = new Date(dateISO);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

async function fetchPlaceSuggestions(
  query: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) return [];

  try {
    const response = await routesService.getAutocompleteAddress(cleanQuery, 7, sessionToken);

    if (response.success && response.data) {
      const rawList = Array.isArray(response.data) 
        ? response.data 
        : (response.data.suggestions || response.data.results || response.data.features || []);

      return rawList.map((item: any, index: number) =>
        parseSuggestion(item, index, cleanQuery, sessionToken)
      );
    }
    
    throw new Error('No data from backend');
  } catch {
    const result = await Location.geocodeAsync(cleanQuery);

    return result.slice(0, 5).map((item, index) => ({
      id: `${cleanQuery}-${index}`,
      title: cleanQuery,
      subtitle: 'Suggested location',
      fullAddress: cleanQuery,
      latitude: item.latitude,
      longitude: item.longitude,
      details: {
        ...emptyAddressDetails(),
        placeId: `${cleanQuery}-${index}`,
        addressLine1: cleanQuery,
        latitude: item.latitude,
        longitude: item.longitude,
      },
    }));
  }
}

async function resolveSelectedSuggestion(suggestion: PlaceSuggestion): Promise<PlaceSuggestion> {
  if (
    suggestion.latitude !== null &&
    suggestion.longitude !== null &&
    Number.isFinite(suggestion.latitude) &&
    Number.isFinite(suggestion.longitude)
  ) {
    return suggestion;
  }

  const response = await routesService.getPlaceDetails(
    suggestion.id,
    suggestion.provider || 'google',
    suggestion.fullAddress,
    suggestion.sessionToken,
  );
  const rawData = response?.data ?? response;
  const rawResult = rawData?.results?.[0] || rawData?.suggestions?.[0];
  if (!rawResult) throw new Error('Unable to resolve the selected address.');

  const resolved = parseSuggestion(rawResult, 0, suggestion.fullAddress);
  if (resolved.latitude === null || resolved.longitude === null) {
    throw new Error('The selected address does not have valid coordinates.');
  }
  return resolved;
}

export default function RoutePointsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, logout } = useAuth();
  const { canAddDriver, isFleetDriver } = useUserRole();

  useEffect(() => {
    if (isFleetDriver) {
      Alert.alert('Permission Denied', 'Fleet drivers cannot create new routes. Routes are created by Business Owners.');
      router.back();
    }
  }, [isFleetDriver, router]);

  // Check for valid JWT token
  useEffect(() => {
    const validateToken = async () => {
      const token = await restoreAuthToken();
      if (!isTokenValid(token)) {
        // Token is invalid or missing, redirect to login
        console.log('Invalid or missing token, redirecting to login');
        logout();
        router.replace('/login');
      }
    };

    validateToken();
  }, [router, logout]);

  const routeName = useMemo(
    () => getParam(params.routeName, 'My route'),
    [params.routeName]
  );

  const routeDate = useMemo(
    () => getParam(params.routeDate, toISODate(new Date())),
    [params.routeDate]
  );

  const routeDateLabel = useMemo(
    () => getParam(params.routeDateLabel, formatDisplayDate(buildDateFromISO(routeDate))),
    [params.routeDateLabel, routeDate]
  );

  const carryPastStops = useMemo(
    () => getParam(params.carryPastStops, 'false') === 'true',
    [params.carryPastStops]
  );

  const stopsToCopy = useMemo(() => {
    const stopsParam = getParam(params.stopsToCopy, '');
    try {
      return stopsParam ? JSON.parse(stopsParam) : [];
    } catch (e) {
      console.error('Error parsing stopsToCopy:', e);
      return [];
    }
  }, [params.stopsToCopy]);

  const defaultStartAddress = useConfigStore(
    (state) => state.config?.defaultStartAddress
  );

  const defaultEndAddress = useConfigStore(
    (state) => state.config?.defaultEndAddress
  );

  const initialDate = useMemo(() => buildDateFromISO(routeDate), [routeDate]);

  const [startLocation, setStartLocation] = useState<LocationValue>({
    mode: 'current_location',
    address: '',
    latitude: null,
    longitude: null,
    selectedFromSuggestion: false,
    details: null,
  });

  const [startDate, setStartDate] = useState<Date>(initialDate);
  const [startTime, setStartTime] = useState(formatDisplayTime(new Date()));

  const [endMode, setEndMode] = useState<EndMode>('round_trip');
  const [endLocation, setEndLocation] = useState<LocationValue>({
    mode: 'manual_address',
    address: '',
    latitude: null,
    longitude: null,
    selectedFromSuggestion: false,
    details: null,
  });

  const [endDate, setEndDate] = useState<Date>(initialDate);
  const [endTime, setEndTime] = useState(formatDisplayTime(new Date()));

  const [showEndSheet, setShowEndSheet] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverSheet, setShowDriverSheet] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const response = await driversService.getDrivers();
        if (response.success && Array.isArray(response.data)) {
          setDrivers(response.data);
        }
      } catch (err) {
        console.log('Error loading drivers:', err);
      }
    };
    loadDrivers();
  }, []);

  const [dateTimePickerTarget, setDateTimePickerTarget] =
    useState<PickerTarget | null>(null);

  useEffect(() => {
    if (defaultStartAddress) {
      const initStart: LocationValue = {
        mode: 'manual_address',
        address: defaultStartAddress.fullAddress || defaultStartAddress.name || '',
        latitude: null,
        longitude: null,
        selectedFromSuggestion: false,
        details: null,
      };
      setStartLocation(initStart);
      if (endMode === 'round_trip') {
        setEndLocation(initStart);
      }
    }
  }, [defaultStartAddress, endMode]);

  useEffect(() => {
    if (defaultEndAddress) {
      setEndMode('other_address');
      setEndLocation({
        mode: 'manual_address',
        address: defaultEndAddress.fullAddress || defaultEndAddress.name || '',
        latitude: null,
        longitude: null,
        selectedFromSuggestion: false,
        details: null,
      });
    }
  }, [defaultEndAddress]);

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSearch, setActiveSearch] = useState<'start' | 'end' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autocompleteSessionTokenRef = useRef(createLocationSessionToken());
  const previousSearchTargetRef = useRef<'start' | 'end' | null>(null);

  const isStartValid =
    startLocation.mode === 'current_location'
      ? startLocation.latitude !== null && startLocation.longitude !== null && Boolean(startLocation.selectedFromSuggestion)
      : Boolean(startLocation.address.trim()) &&
        Boolean(startLocation.selectedFromSuggestion) &&
        startLocation.latitude !== null &&
        startLocation.longitude !== null;

  const isEndValid =
    endMode === 'no_end'
      ? true
      : endMode === 'round_trip'
        ? isStartValid
        : Boolean(endLocation.address.trim()) &&
          Boolean(endLocation.selectedFromSuggestion) &&
          endLocation.latitude !== null &&
          endLocation.longitude !== null;

  const canSubmit = isStartValid && isEndValid && !isSubmitting && !isFetchingSuggestions;

  console.log('[DEBUG canSubmit]', {
    canSubmit,
    isStartValid,
    isEndValid,
    startMode: startLocation.mode,
    startLat: startLocation.latitude,
    startLng: startLocation.longitude,
    startSelectedFromSuggestion: startLocation.selectedFromSuggestion,
    startAddress: startLocation.address,
    endMode,
    isSubmitting,
    isFetchingSuggestions,
  });

  const endTitle = useMemo(() => {
    if (endMode === 'round_trip') return 'Round trip';
    if (endMode === 'no_end') return "Don’t use end location";
    return endLocation.address.trim() || 'End at other address';
  }, [endLocation.address, endMode]);

  const endSubtitle = useMemo(() => {
    if (endMode === 'round_trip') {
      return startLocation.address || 'Same as start location';
    }

    if (endMode === 'no_end') return 'No end location will be used';

    return endLocation.address.trim() ? 'Custom destination' : 'Enter end address';
  }, [endLocation.address, endMode, startLocation.address]);

  useEffect(() => {
    if (activeSearch && previousSearchTargetRef.current !== activeSearch) {
      autocompleteSessionTokenRef.current = createLocationSessionToken();
    }
    previousSearchTargetRef.current = activeSearch;
  }, [activeSearch]);

  useEffect(() => {
    let mounted = true;
    const query = activeSearch === 'start' ? startLocation.address : endLocation.address;

    if (!activeSearch || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const data = await fetchPlaceSuggestions(
          query,
          autocompleteSessionTokenRef.current,
        );

        if (mounted) {
          setSuggestions(data);
        }
      } finally {
        if (mounted) {
          setIsFetchingSuggestions(false);
        }
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [startLocation.address, endLocation.address, activeSearch]);

  const handleUseCurrentLocation = async () => {
    try {
      setIsFetchingLocation(true);
      setErrorMessage(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setStartLocation({
          mode: 'manual_address',
          address: '',
          latitude: null,
          longitude: null,
          selectedFromSuggestion: false,
          details: null,
        });
        return;
      }

      // Try last known location first to be super responsive
      let currentLocation: Location.LocationObject | null = null;
      try {
        currentLocation = await Location.getLastKnownPositionAsync();
        // If last known is older than 2 minutes, don't use it
        if (currentLocation && Date.now() - currentLocation.timestamp > 120000) {
          currentLocation = null;
        }
      } catch (err) {
        console.log('Error getting last known position:', err);
      }

      // If no last known or it is too old, get fresh position with a 6-second timeout
      if (!currentLocation) {
        const freshLocationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 6000)
        );
        currentLocation = await Promise.race([freshLocationPromise, timeoutPromise]);
      }

      if (!currentLocation) {
        throw new Error('Unable to retrieve location');
      }

      const userEmail = getCurrentUserEmailSync();
      const isIndiaAllowed = isIndiaAllowedForEmail(userEmail);

      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;

      let details: AddressDetails | null = null;
      let addressString = '';

      // 1. Try Native Device Reverse Geocoding first for exact local GPS address (Google/Apple Maps on device)
      try {
        const reverseAddress = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });
        if (reverseAddress && reverseAddress.length > 0) {
          const item = reverseAddress[0];
          addressString = getReadableAddress(item);
          details = {
            ...emptyAddressDetails(),
            street: String(item.street || item.name || ''),
            addressLine1: String(item.name || item.street || addressString),
            city: String(item.city || item.subregion || ''),
            district: String(item.district || item.subregion || ''),
            state: String(item.region || ''),
            country: String(item.country || ''),
            countryCode: String(item.isoCountryCode || ''),
            postalCode: String(item.postalCode || ''),
            latitude: lat,
            longitude: lon,
          };
        }
      } catch (err) {
        console.warn('Native device reverse geocode failed, using provider fallback:', err);
      }

      // 2. Use the configured backend provider chain if native reverse geocoding has no address.
      if (!addressString) {
        try {
          const response = await routesService.reverseGeocode(lat, lon);
          if (response.success && response.data?.results?.length > 0) {
            const result = response.data.results[0];
            details = {
              housenumber: String(result.housenumber || ''),
              street: String(result.street || ''),
              placeId: String(result.place_id || ''),
              addressLine1: String(result.address_line1 || result.name || ''),
              addressLine2: String(result.address_line2 || result.formatted || ''),
              city: String(result.city || ''),
              district: String(result.county || result.district || ''),
              state: String(result.state || ''),
              country: String(result.country || ''),
              countryCode: String(result.country_code || ''),
              postalCode: String(result.postcode || ''),
              latitude: lat,
              longitude: lon,
            };
            addressString = (result.formatted || details.addressLine1 || '')
              .replace(/[\s\-,]+$/, '')
              .trim();
          }
        } catch (error) {
          console.error('Provider reverse geocoding failed:', error);
        }
      }

      const isAllowed = isLocationAllowedForUser(
        {
          latitude: lat,
          longitude: lon,
          address: addressString,
          country: details?.country,
          countryCode: details?.countryCode,
        },
        userEmail
      );

      if (!isAllowed) {
        setErrorMessage(
          isIndiaAllowed
            ? 'Only locations within the United Kingdom and India are supported. Your current location is outside supported regions.'
            : 'Only locations within the United Kingdom are supported. Your current location is outside the UK.'
        );
        return;
      }

      const nextStart: LocationValue = {
        mode: 'current_location',
        address: addressString || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        selectedFromSuggestion: true,
        details: details,
      };
      setStartLocation(nextStart);
      if (endMode === 'round_trip') {
        setEndLocation(nextStart);
      }
    } catch (err: any) {
      console.error('Error fetching current location:', err);
      setErrorMessage(
        err?.message === 'Location request timed out'
          ? 'Location request timed out. Please ensure GPS/location services are enabled and try again.'
          : 'Failed to retrieve your current location. Please ensure location services are enabled.'
      );
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleManualStartAddress = (value: string) => {
    setErrorMessage(null);
    const newStart: LocationValue = {
      mode: 'manual_address',
      address: value,
      latitude: null,
      longitude: null,
      selectedFromSuggestion: false,
      details: null,
    };
    setStartLocation(newStart);
    if (endMode === 'round_trip') {
      setEndLocation(newStart);
    }
    setActiveSearch('start');
  };

  const handleManualEndAddress = (value: string) => {
    setErrorMessage(null);
    setEndLocation({
      mode: 'manual_address',
      address: value,
      latitude: null,
      longitude: null,
      selectedFromSuggestion: false,
      details: null,
    });
    setActiveSearch('end');
  };

  const handleSelectEndMode = (mode: EndMode) => {
    setEndMode(mode);

    if (mode === 'round_trip') {
      setEndLocation({
        ...startLocation,
      });
    }

    if (mode === 'no_end') {
      setEndLocation({
        mode: 'manual_address',
        address: '',
        latitude: null,
        longitude: null,
        selectedFromSuggestion: false,
        details: null,
      });
    }

    setShowEndSheet(false);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setErrorMessage(null);
    setIsFetchingSuggestions(true);

    try {
      const resolvedSuggestion = await resolveSelectedSuggestion(suggestion);
      if (activeSearch === 'start') {
      const selectedStart: LocationValue = {
        mode: 'manual_address',
        address: resolvedSuggestion.fullAddress,
        latitude: resolvedSuggestion.latitude,
        longitude: resolvedSuggestion.longitude,
        selectedFromSuggestion: true,
        details: resolvedSuggestion.details,
      };
      setStartLocation(selectedStart);
      if (endMode === 'round_trip') {
        setEndLocation(selectedStart);
      }
      } else if (activeSearch === 'end') {
        setEndLocation({
          mode: 'manual_address',
          address: resolvedSuggestion.fullAddress,
          latitude: resolvedSuggestion.latitude,
          longitude: resolvedSuggestion.longitude,
          selectedFromSuggestion: true,
          details: resolvedSuggestion.details,
        });
      }
      setSuggestions([]);
      setActiveSearch(null);
      autocompleteSessionTokenRef.current = createLocationSessionToken();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resolve the selected address.');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const buildPayload = () => {
    const finalEndLocation =
      endMode === 'round_trip'
        ? buildLocationPayload(startLocation)
        : endMode === 'no_end'
          ? null
          : buildLocationPayload(endLocation);

   return {
  // Backend required fields
  name: routeName,
  start_location: buildBackendLocationPayload(startLocation, 'Start Location'),
  end_location: buildBackendLocationPayload(finalEndLocation, 'End Location'),
  start_datetime: buildDateTimeISOString(startDate, startTime),
  end_datetime: buildDateTimeISOString(endDate, endTime),
  driver_id: selectedDriver?.driver_id || null,

  // Extra frontend fields
  routeName,
  routeDate,
  routeDateLabel,
  carryPastStops,
  end_mode: endMode,
  saveAddressDefault: saveAsDefault,
};
  };

  const handleDone = async () => {
    if (!canSubmit) return;

    const userEmail = getCurrentUserEmailSync();
    const isIndiaAllowed = isIndiaAllowedForEmail(userEmail);

    const isLocationValid = (location: LocationValue) => {
      if (!location.address) return true;
      if (location.mode === 'current_location' && !location.details) {
        return true;
      }
      return isLocationAllowedForUser(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          country: location.details?.country,
          countryCode: location.details?.countryCode,
        },
        userEmail
      );
    };

    if (!isLocationValid(startLocation)) {
      setErrorMessage(
        `Start Location must be within ${isIndiaAllowed ? 'the United Kingdom or India' : 'the United Kingdom'}.`
      );
      return;
    }

    if (endMode === 'other_address' && !isLocationValid(endLocation)) {
      setErrorMessage(
        `End Location must be within ${isIndiaAllowed ? 'the United Kingdom or India' : 'the United Kingdom'}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = buildPayload();

      const response = await routesService.createRoute(payload);

      if (!response.success) {
        throw new Error(response.error || 'Unable to create route.');
      }

      const responseData = response.data;
      console.log('Route created successfully:', responseData);

      const newRouteId = responseData ? String((responseData as any).route_id || (responseData as any).id || '') : '';

      if (newRouteId && stopsToCopy.length > 0) {
        const orderPayloads = stopsToCopy.map((stop: any, index: number) => {
          return {
            route_id: newRouteId,
            sequence: index + 1,
            latitude: stop.latitude,
            longitude: stop.longitude,
            title: stop.title || `Stop ${index + 1}`,
            address: stop.address || stop.description || '',
            packages: Number(stop.packages || 1),
            stop_type: stop.stopType || 'delivery',
            notes: stop.notes || '',
            status: ROUTE_STATUS_PENDING,
          };
        });
        const payloadData = {
          stops: orderPayloads,
          route_id: newRouteId,
        };
        const stopsResponse = await addManifestStopsToBackend(payloadData);
        console.log('Copied stops saved successfully:', stopsResponse);
      }

      await fetchAndStoreConfig();
      
      router.push({
        pathname: '/route-preview',
        params: {
         id : String(newRouteId),
        },
      } as never);
    } catch (error: any) {
      console.log('Create route error:', error);
      const msg = error.message || 'Unable to create route. Please try again.';
      setErrorMessage(msg);
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <KeyboardAvoidingView
      style={[styles.root, isWeb && styles.webRoot]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, isWeb && styles.webRoot]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            isWeb
              ? styles.webScrollContainer
              : {
                  paddingTop: insets.top + 22,
                  paddingBottom: 142 + insets.bottom,
                },
          ]}
        >
          <View style={isWeb ? styles.webCard : null}>
            {isWeb ? (
              <View style={styles.webHeader}>
                <View style={styles.webHeaderLeft}>
                  <Pressable style={styles.webBackButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={15} color="#475569" />
                    <Text style={styles.webBackText}>Back</Text>
                  </Pressable>
                  <View style={styles.webBadge}>
                    <Feather name="map" size={12} color="#2563EB" />
                    <Text style={styles.webBadgeText}>Route Setup</Text>
                  </View>
                </View>
                <Pressable style={styles.webCloseBtn} onPress={() => router.back()}>
                  <Feather name="x" size={16} color="#64748B" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.closeButton} onPress={() => router.back()}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            )}

            <Text style={[styles.title, isWeb && styles.webTitle]}>Route details</Text>
            {isWeb && (
              <Text style={styles.webSubtitle}>
                Configure your starting depot, destination, delivery schedule, and driver assignments.
              </Text>
            )}

            <View style={[styles.routeSummaryCard, isWeb && styles.webRouteSummaryCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.routeSummaryLabel}>SCHEDULED ROUTE</Text>
                <View style={styles.webDateBadge}>
                  <Feather name="calendar" size={11} color="#2563EB" />
                  <Text style={styles.webDateBadgeText}>{routeDateLabel}</Text>
                </View>
              </View>
              <Text style={[styles.routeSummaryTitle, isWeb && styles.webRouteSummaryTitle]}>{routeName}</Text>
            </View>

            {!!errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Start Location Section */}
            <View style={[styles.section, isWeb && styles.webSection]}>
              <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>START LOCATION</Text>

              <TextInput
                style={[styles.addressInput, isWeb && styles.webAddressInput]}
                placeholder="Enter start address"
                placeholderTextColor="#98A2B3"
                value={
                  startLocation.mode === 'current_location' &&
                  !startLocation.address.trim()
                    ? ''
                    : startLocation.address
                }
                onChangeText={handleManualStartAddress}
                onFocus={() => setActiveSearch('start')}
              />

              {activeSearch === 'start' && suggestions.length > 0 && (
                <View style={styles.suggestionsList}>
                  {suggestions.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Text style={styles.suggestionTitle}>{item.title}</Text>
                      <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable
                style={[
                  styles.currentLocationButton,
                  isWeb && styles.webCurrentLocationBtn,
                  isFetchingLocation && styles.disabledLightButton,
                ]}
                disabled={isFetchingLocation}
                onPress={handleUseCurrentLocation}
              >
                {isFetchingLocation ? (
                  <ActivityIndicator size="small" color="#2F76F6" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="navigation" size={14} color="#2F76F6" />
                    <Text style={styles.currentLocationText}>Use current location</Text>
                  </View>
                )}
              </Pressable>

              <InfoCard
                icon="◷"
                iconColor="#2F76F6"
                title="Start date & time"
                subtitle={`${formatDisplayDate(startDate)} • ${startTime}`}
                showChevron
                onPress={() => setDateTimePickerTarget('start')}
              />
            </View>

            {/* End Location Section */}
            <View style={[styles.section, isWeb && styles.webSection]}>
              <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>END LOCATION</Text>

              <InfoCard
                icon={endMode === 'round_trip' ? '↩' : endMode === 'no_end' ? '×' : '⌖'}
                iconColor={endMode === 'no_end' ? '#98A2B3' : '#2F76F6'}
                title={endTitle}
                subtitle={endSubtitle}
                showChevron
                onPress={() => setShowEndSheet(true)}
              />

              {endMode === 'other_address' ? (
                <>
                  <TextInput
                    style={[styles.addressInput, isWeb && styles.webAddressInput]}
                    placeholder="Enter end address"
                    placeholderTextColor="#98A2B3"
                    value={endLocation.address}
                    onChangeText={handleManualEndAddress}
                    onFocus={() => setActiveSearch('end')}
                  />

                  {activeSearch === 'end' && suggestions.length > 0 && (
                    <View style={styles.suggestionsList}>
                      {suggestions.map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <Text style={styles.suggestionTitle}>{item.title}</Text>
                          <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              ) : null}

              {endMode !== 'no_end' ? (
                <InfoCard
                  icon="◷"
                  iconColor="#2F76F6"
                  title="End date & time"
                  subtitle={`${formatDisplayDate(endDate)} • ${endTime}`}
                  showChevron
                  onPress={() => setDateTimePickerTarget('end')}
                />
              ) : null}
            </View>

            {/* Driver Details Section */}
            {canAddDriver ? (
              <View style={[styles.section, isWeb && styles.webSection]}>
                <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>DRIVER ASSIGNMENT</Text>

                <InfoCard
                  icon="👤"
                  iconColor="#2F76F6"
                  title={selectedDriver ? selectedDriver.name : 'Assign Driver'}
                  subtitle={
                    selectedDriver
                      ? selectedDriver.phone || selectedDriver.email || 'Assigned driver'
                      : 'Tap to select or add driver'
                  }
                  showChevron
                  onPress={() => setShowDriverSheet(true)}
                />
              </View>
            ) : null}

            {/* Web Inline Action Row */}
            {isWeb && (
              <View style={styles.webActionRow}>
                <Pressable
                  style={styles.webDefaultRow}
                  onPress={() => setSaveAsDefault(prev => !prev)}
                >
                  <View style={[styles.checkbox, saveAsDefault && styles.checkboxActive]}>
                    {saveAsDefault ? <Text style={styles.checkText}>✓</Text> : null}
                  </View>
                  <Text style={styles.webDefaultText}>Save as default</Text>
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable style={styles.webCancelBtn} onPress={() => router.back()}>
                    <Text style={styles.webCancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.webDoneBtn,
                      !canSubmit && styles.webDoneBtnDisabled,
                    ]}
                    disabled={!canSubmit}
                    onPress={handleDone}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.webDoneBtnText}>Done</Text>
                        <Feather name="arrow-right" size={15} color="#FFFFFF" />
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Mobile Fixed Screen-Bottom Footer */}
        {!isWeb && (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom + 12, 24),
              },
            ]}
          >
            <Pressable
              style={[
                styles.doneButton,
                !canSubmit && styles.doneButtonDisabled,
              ]}
              disabled={!canSubmit}
              onPress={handleDone}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.doneText}>Done</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.defaultRow}
              onPress={() => setSaveAsDefault(prev => !prev)}
            >
              <View style={[styles.checkbox, saveAsDefault && styles.checkboxActive]}>
                {saveAsDefault ? <Text style={styles.checkText}>✓</Text> : null}
              </View>

              <Text style={styles.defaultText}>Save as default</Text>
            </Pressable>
          </View>
        )}

        <DriverPickerSheet
          visible={showDriverSheet}
          drivers={drivers}
          selectedDriver={selectedDriver}
          onClose={() => setShowDriverSheet(false)}
          onSelect={(driver) => {
            setSelectedDriver(driver);
            setShowDriverSheet(false);
          }}
          onOpenAddDriver={() => setShowAddDriverModal(true)}
        />

        <AddDriverSheet
          visible={showAddDriverModal}
          name={newDriverName}
          phone={newDriverPhone}
          email={newDriverEmail}
          isSubmitting={isCreatingDriver}
          onChangeName={setNewDriverName}
          onChangePhone={setNewDriverPhone}
          onChangeEmail={setNewDriverEmail}
          onClose={() => setShowAddDriverModal(false)}
          onSubmit={async () => {
            if (!newDriverName.trim()) {
              Alert.alert('Required', 'Please enter a driver name.');
              return;
            }
            if (!newDriverEmail.trim()) {
              Alert.alert('Required', 'Driver email is required to create their Fleet Driver user account.');
              return;
            }
            try {
              setIsCreatingDriver(true);
              const res = await driversService.createDriver({
                name: newDriverName.trim(),
                phone: newDriverPhone.trim() || undefined,
                email: newDriverEmail.trim(),
              });
              if (res.success && res.data) {
                const created = res.data as any;
                setDrivers((prev) => [created, ...prev]);
                setSelectedDriver(created);
                setShowAddDriverModal(false);
                setShowDriverSheet(false);
                setNewDriverName('');
                setNewDriverPhone('');
                setNewDriverEmail('');

                if (created.temp_password) {
                  Alert.alert(
                    'Fleet Driver Account Created',
                    `Fleet Driver account created for ${created.name}.\n\nCredentials sent to email: ${created.email}\nTemporary Password: ${created.temp_password}`
                  );
                }
              } else {
                Alert.alert('Error', res.error || 'Failed to create driver');
              }
            } catch (err) {
              console.log('Create driver error:', err);
              Alert.alert('Error', 'Failed to create driver');
            } finally {
              setIsCreatingDriver(false);
            }
          }}
        />

        <EndLocationSheet
          visible={showEndSheet}
          selectedMode={endMode}
          onClose={() => setShowEndSheet(false)}
          onSelect={handleSelectEndMode}
        />

        <DateTimePickerSheet
          visible={Boolean(dateTimePickerTarget)}
          title={
            dateTimePickerTarget === 'start'
              ? 'Select start date & time'
              : 'Select end date & time'
          }
          date={dateTimePickerTarget === 'start' ? startDate : endDate}
          time={dateTimePickerTarget === 'start' ? startTime : endTime}
          onClose={() => setDateTimePickerTarget(null)}
          onConfirm={(date, time) => {
            if (dateTimePickerTarget === 'start') {
              setStartDate(date);
              setStartTime(time);
            }

            if (dateTimePickerTarget === 'end') {
              setEndDate(date);
              setEndTime(time);
            }

            setDateTimePickerTarget(null);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function InfoCard({
  icon,
  iconColor,
  title,
  subtitle,
  showChevron,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.infoCard} onPress={onPress}>
      <Text style={[styles.cardIcon, { color: iconColor }]}>{icon}</Text>

      <View style={styles.cardTextBox}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {title}
        </Text>

        {subtitle ? (
          <Text numberOfLines={1} style={styles.cardSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showChevron ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

function EndLocationSheet({
  visible,
  selectedMode,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedMode: EndMode;
  onClose: () => void;
  onSelect: (mode: EndMode) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom + 24, 36),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>End location</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </Pressable>
          </View>

          <SheetOption
            icon="↩"
            title="Return to start"
            subtitle="Use same address and details as start location"
            selected={selectedMode === 'round_trip'}
            onPress={() => onSelect('round_trip')}
          />

          <SheetOption
            icon="⌖"
            title="End at other address"
            subtitle="Enter a custom destination"
            selected={selectedMode === 'other_address'}
            onPress={() => onSelect('other_address')}
          />

          <SheetOption
            icon="×"
            title="Don’t use end location"
            subtitle="No end location will be sent"
            selected={selectedMode === 'no_end'}
            onPress={() => onSelect('no_end')}
          />
        </View>
      </View>
    </Modal>
  );
}

function SheetOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.sheetOption, selected && styles.selectedSheetOption]}
      onPress={onPress}
    >
      <Text style={styles.sheetOptionIcon}>{icon}</Text>

      <View style={styles.sheetOptionText}>
        <Text style={styles.sheetOptionTitle}>{title}</Text>
        <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text>
      </View>

      {selected ? <Text style={styles.selectedTick}>✓</Text> : null}
    </Pressable>
  );
}

function DateTimePickerSheet({
  visible,
  title,
  date,
  time,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  date: Date;
  time: string;
  onClose: () => void;
  onConfirm: (date: Date, time: string) => void;
}) {
  const insets = useSafeAreaInsets();

  const [visibleMonth, setVisibleMonth] = useState(date);
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState(time);

  const days = getCalendarDays(visibleMonth);

  const monthTitle = visibleMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const quickTimes = [
    '8:00 am',
    '9:00 am',
    '10:00 am',
    '12:00 pm',
    '3:00 pm',
    '6:00 pm',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.dateTimeSheet,
            {
              paddingBottom: Math.max(insets.bottom + 20, 32),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.sheetDone}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setVisibleMonth(prev => addMonths(prev, -1))}>
              <Text style={styles.calendarNav}>‹</Text>
            </Pressable>

            <Text style={styles.calendarTitle}>{monthTitle}</Text>

            <Pressable onPress={() => setVisibleMonth(prev => addMonths(prev, 1))}>
              <Text style={styles.calendarNav}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((item, index) => {
              const selected = item ? isSameDate(item, draftDate) : false;

              return (
                <Pressable
                  key={item ? toISODate(item) : `empty-${index}`}
                  disabled={!item}
                  style={[styles.dayCell, selected && styles.selectedDayCell]}
                  onPress={() => item && setDraftDate(item)}
                >
                  <Text
                    style={[styles.dayText, selected && styles.selectedDayText]}
                  >
                    {item ? item.getDate() : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.timeLabel}>Time</Text>

          <TextInput
            style={styles.timeInput}
            placeholder="10:00 am"
            placeholderTextColor="#98A2B3"
            value={draftTime}
            onChangeText={setDraftTime}
          />

          <View style={styles.quickTimeGrid}>
            {quickTimes.map(item => (
              <Pressable
                key={item}
                style={[
                  styles.quickTimeButton,
                  draftTime === item && styles.quickTimeButtonActive,
                ]}
                onPress={() => setDraftTime(item)}
              >
                <Text
                  style={[
                    styles.quickTimeText,
                    draftTime === item && styles.quickTimeTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.dateTimeConfirmButton}
            onPress={() => onConfirm(draftDate, draftTime)}
          >
            <Text style={styles.dateTimeConfirmText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },

  errorBannerText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginBottom: 22,
  },

  closeText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
    color: '#7B8798',
  },

  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#101828',
    marginBottom: 18,
    letterSpacing: -0.3,
  },

  routeSummaryCard: {
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 22,
  },

  routeSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },

  routeSummaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#101828',
  },

  routeSummaryDate: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    color: '#526071',
    marginBottom: 10,
  },

  addressInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#101828',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },

  currentLocationButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  disabledLightButton: {
    opacity: 0.65,
  },

  currentLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2F76F6',
  },

  infoCard: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 36,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '400',
  },

  cardTextBox: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: '#101828',
    letterSpacing: -0.1,
  },

  cardSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    color: '#98A2B3',
  },

  chevron: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
    color: '#8A96A8',
    marginLeft: 6,
    marginTop: -1,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  doneButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },

  doneText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  defaultRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: '#B8C2D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxActive: {
    backgroundColor: '#2F76F6',
    borderColor: '#2F76F6',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },

  defaultText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    color: '#98A2B3',
  },

  modalRoot: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
    padding: Platform.OS === 'web' ? 24 : 0,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'web' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'web' ? 20 : 24,
    borderRadius: Platform.OS === 'web' ? 20 : undefined,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    width: Platform.OS === 'web' ? '100%' : undefined,
    paddingTop: 18,
    shadowColor: Platform.OS === 'web' ? '#0F172A' : undefined,
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 16 } : undefined,
    shadowOpacity: Platform.OS === 'web' ? 0.16 : undefined,
    shadowRadius: Platform.OS === 'web' ? 32 : undefined,
    elevation: Platform.OS === 'web' ? 10 : undefined,
  },

  dateTimeSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'web' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'web' ? 20 : 24,
    borderRadius: Platform.OS === 'web' ? 20 : undefined,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    width: Platform.OS === 'web' ? '100%' : undefined,
    paddingHorizontal: 18,
    paddingTop: 18,
    shadowColor: Platform.OS === 'web' ? '#0F172A' : undefined,
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 16 } : undefined,
    shadowOpacity: Platform.OS === 'web' ? 0.16 : undefined,
    shadowRadius: Platform.OS === 'web' ? 32 : undefined,
    elevation: Platform.OS === 'web' ? 10 : undefined,
  },

  sheetHeader: {
    height: 58,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sheetTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#101828',
    letterSpacing: -0.2,
  },

  sheetDone: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#2F76F6',
  },

  sheetOption: {
    minHeight: 82,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedSheetOption: {
    backgroundColor: '#F6FAFF',
  },

  sheetOptionIcon: {
    width: 42,
    fontSize: 27,
    lineHeight: 32,
    color: '#526071',
  },

  sheetOptionText: {
    flex: 1,
  },

  sheetOptionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    color: '#101828',
    letterSpacing: -0.1,
  },

  sheetOptionSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
    color: '#98A2B3',
  },

  selectedTick: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2F76F6',
  },

  calendarHeader: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },

  calendarNav: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
    color: '#2F76F6',
    paddingHorizontal: 12,
  },

  weekRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 6,
  },

  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  selectedDayCell: {
    backgroundColor: '#2F76F6',
  },

  dayText: {
    fontSize: 14,
    color: '#111827',
  },

  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  timeLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '500',
    color: '#475467',
  },

  timeInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#101828',
  },

  quickTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  quickTimeButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTimeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2F76F6',
  },

  quickTimeText: {
    fontSize: 13,
    color: '#526071',
  },

  quickTimeTextActive: {
    color: '#2F76F6',
    fontWeight: '600',
  },

  dateTimeConfirmButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  dateTimeConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  suggestionsList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE3EC',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    overflow: 'hidden',
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#101828',
  },

  suggestionSubtitle: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },

  driverModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 420,
  },

  driverModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  driverModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#344054',
    marginBottom: 6,
    marginTop: 10,
  },

  driverInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#101828',
    backgroundColor: '#FFFFFF',
  },

  createDriverButton: {
    height: 48,
    backgroundColor: '#2F76F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  createDriverText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  addDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 14,
  },

  addDriverText: {
    color: '#2F76F6',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  driverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },

  selectedDriverOption: {
    borderColor: '#2F76F6',
    backgroundColor: '#F0F5FF',
  },

  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },

  driverMeta: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
  },

  // Web Specific Styles
  webRoot: {
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
  },
  webScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCard: {
    maxWidth: 720,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 36,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  webBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  webBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  webCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  webSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  webRouteSummaryCard: {
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
  },
  webRouteSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  webDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  webDateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  webSection: {
    marginBottom: 24,
  },
  webSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  webAddressInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  webCurrentLocationBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  webActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  webDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webDefaultText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  webCancelBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  webCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  webDoneBtn: {
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#2F76F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  webDoneBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  webDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

function DriverPickerSheet({
  visible,
  drivers,
  selectedDriver,
  onClose,
  onSelect,
  onOpenAddDriver,
}: {
  visible: boolean;
  drivers: Driver[];
  selectedDriver: Driver | null;
  onClose: () => void;
  onSelect: (driver: Driver | null) => void;
  onOpenAddDriver: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom + 24, 36),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Assign Driver</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.addDriverRow}
            onPress={() => {
              onClose();
              onOpenAddDriver();
            }}
          >
            <Text style={styles.addDriverText}>+ Add New Driver</Text>
          </Pressable>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <Pressable
              style={[
                styles.driverOption,
                selectedDriver === null && styles.selectedDriverOption,
              ]}
              onPress={() => onSelect(null)}
            >
              <View>
                <Text style={styles.driverName}>Unassigned</Text>
                <Text style={styles.driverMeta}>No driver assigned to this route</Text>
              </View>
              {selectedDriver === null ? <Text style={styles.selectedTick}>✓</Text> : null}
            </Pressable>

            {drivers.map((driver) => {
              const isSelected = selectedDriver?.driver_id === driver.driver_id;
              return (
                <Pressable
                  key={driver.driver_id}
                  style={[styles.driverOption, isSelected && styles.selectedDriverOption]}
                  onPress={() => onSelect(driver)}
                >
                  <View>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    {driver.phone || driver.email ? (
                      <Text style={styles.driverMeta}>
                        {[driver.phone, driver.email].filter(Boolean).join(' • ')}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? <Text style={styles.selectedTick}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AddDriverSheet({
  visible,
  name,
  phone,
  email,
  isSubmitting,
  onChangeName,
  onChangePhone,
  onChangeEmail,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  name: string;
  phone: string;
  email: string;
  isSubmitting: boolean;
  onChangeName: (val: string) => void;
  onChangePhone: (val: string) => void;
  onChangeEmail: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.driverModalCard}>
          <View style={styles.driverModalHeader}>
            <Text style={styles.driverModalTitle}>Add New Driver</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.inputLabel}>Driver Name *</Text>
          <TextInput
            style={styles.driverInput}
            placeholder="e.g. John Smith"
            placeholderTextColor="#98A2B3"
            value={name}
            onChangeText={onChangeName}
          />

          <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
          <TextInput
            style={styles.driverInput}
            placeholder="e.g. +44 7911 123456"
            placeholderTextColor="#98A2B3"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={onChangePhone}
          />

          <Text style={styles.inputLabel}>Driver Email * (Creates Fleet Account)</Text>
          <TextInput
            style={styles.driverInput}
            placeholder="e.g. driver@example.com"
            placeholderTextColor="#98A2B3"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={onChangeEmail}
          />

          <Pressable
            style={[styles.createDriverButton, isSubmitting && { opacity: 0.6 }]}
            disabled={isSubmitting}
            onPress={onSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createDriverText}>Create & Select Driver</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
