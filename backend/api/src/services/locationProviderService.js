const DEFAULT_PROVIDER_ORDER = ['google', 'tomtom', 'geoapify'];
const SUPPORTED_PROVIDERS = new Set(DEFAULT_PROVIDER_ORDER);
const providerCooldowns = new Map();

const fetch = (...args) =>
  import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

class LocationProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'LocationProviderError';
    this.provider = options.provider || '';
    this.status = options.status || 0;
    this.code = options.code || '';
    this.quota = Boolean(options.quota);
  }
}

const toBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const normalizeSessionToken = value => {
  const token = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,36}$/.test(token) ? token : '';
};

const getProviderOrder = () => {
  const configured = String(process.env.LOCATION_PROVIDER_ORDER || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(value => SUPPORTED_PROVIDERS.has(value));

  return configured.length > 0 ? [...new Set(configured)] : DEFAULT_PROVIDER_ORDER;
};

const getProviderKey = provider => {
  if (provider === 'google') return process.env.GOOGLE_MAPS_API_KEY || '';
  if (provider === 'tomtom') return process.env.TOMTOM_API_KEY || '';
  if (provider === 'geoapify') return process.env.GEOAPIFY_API_KEY || '';
  return '';
};

const isProviderEnabled = provider => {
  const envName = `LOCATION_${provider.toUpperCase()}_ENABLED`;
  const isEnabledFlag = toBoolean(process.env[envName], true);

  // If Geoapify is marked disabled in configuration, but no other provider (like Google)
  // has an API key configured yet, temporarily keep Geoapify active so existing functionality
  // does not break before the user provides their GOOGLE_MAPS_API_KEY. Once GOOGLE_MAPS_API_KEY
  // is provided, Geoapify is disabled immediately as configured.
  if (provider === 'geoapify' && !isEnabledFlag) {
    const hasActiveProviderKey = Boolean(getProviderKey('google')) || Boolean(getProviderKey('tomtom'));
    if (!hasActiveProviderKey && Boolean(getProviderKey('geoapify'))) {
      return true;
    }
  }

  return isEnabledFlag && Boolean(getProviderKey(provider));
};

const isCoolingDown = provider => (providerCooldowns.get(provider) || 0) > Date.now();

const startCooldown = provider => {
  const cooldownSeconds = toPositiveInteger(
    process.env.LOCATION_PROVIDER_COOLDOWN_SECONDS,
    900,
  );
  providerCooldowns.set(provider, Date.now() + cooldownSeconds * 1000);
};

const parseResponseBody = async response => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
};

const getErrorCode = data =>
  data?.error?.status ||
  data?.error?.code ||
  data?.detailedError?.code ||
  data?.status ||
  '';

const isQuotaResponse = (status, code) => {
  const normalizedCode = String(code || '').toUpperCase();
  return (
    status === 429 ||
    normalizedCode === 'RESOURCE_EXHAUSTED' ||
    normalizedCode === 'OVER_QUERY_LIMIT' ||
    normalizedCode === 'OVER_DAILY_LIMIT' ||
    normalizedCode.includes('RATE_LIMIT') ||
    normalizedCode.includes('QUOTA')
  );
};

const shouldCooldownProvider = error => {
  const code = String(error?.code || '').toUpperCase();
  return (
    error?.quota ||
    [401, 403, 429].includes(error?.status) ||
    ['REQUEST_DENIED', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'API_KEY_INVALID'].includes(code)
  );
};

const requestJson = async (provider, url, options = {}) => {
  const timeoutMs = toPositiveInteger(process.env.LOCATION_REQUEST_TIMEOUT_MS, 8000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await parseResponseBody(response);
    const code = getErrorCode(data);

    if (!response.ok) {
      throw new LocationProviderError(
        `${provider} location request failed with HTTP ${response.status}`,
        {
          provider,
          status: response.status,
          code,
          quota: isQuotaResponse(response.status, code),
        },
      );
    }

    return data;
  } catch (error) {
    if (error instanceof LocationProviderError) throw error;

    throw new LocationProviderError(
      error?.name === 'AbortError'
        ? `${provider} location request timed out`
        : `${provider} location request failed`,
      { provider, code: error?.name || 'NETWORK_ERROR' },
    );
  } finally {
    clearTimeout(timeout);
  }
};

const countryCodeAliases = {
  GBR: 'GB',
  UK: 'GB',
  IND: 'IN',
};

const normalizeCountryCode = value => {
  const code = String(value || '').trim().toUpperCase();
  return countryCodeAliases[code] || code;
};

const firstComponent = (components, types) => {
  for (const type of types) {
    const match = components.find(component => (component.types || []).includes(type));
    if (match) {
      return {
        long: match.long_name || match.longText || '',
        short: match.short_name || match.shortText || '',
      };
    }
  }
  return { long: '', short: '' };
};

const buildNormalizedResult = ({
  provider,
  placeId,
  formatted,
  name,
  housenumber,
  street,
  city,
  district,
  state,
  country,
  countryCode,
  postcode,
  latitude,
  longitude,
  confidence,
  requiresPlaceDetails = false,
}) => {
  const lat = latitude === null || latitude === undefined ? null : Number(latitude);
  const lon = longitude === null || longitude === undefined ? null : Number(longitude);
  const addressLine1 = [housenumber, street].filter(Boolean).join(' ').trim() || name || formatted;
  const addressLine2 = [city, district, state, postcode, country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');

  return {
    place_id: String(placeId || ''),
    provider,
    requires_place_details: requiresPlaceDetails,
    formatted: formatted || [addressLine1, addressLine2].filter(Boolean).join(', '),
    name: name || addressLine1,
    address_line1: addressLine1,
    address_line2: addressLine2,
    housenumber: housenumber || '',
    street: street || '',
    city: city || '',
    county: district || '',
    district: district || '',
    state: state || '',
    country: country || '',
    country_code: normalizeCountryCode(countryCode).toLowerCase(),
    postcode: postcode || '',
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    rank: { confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : 0.8 },
  };
};

const normalizeGoogleResult = (result, provider = 'google') => {
  const components = result.address_components || result.addressComponents || [];
  const streetNumber = firstComponent(components, ['street_number']);
  const route = firstComponent(components, ['route']);
  const premise = firstComponent(components, ['premise', 'subpremise']);
  const city = firstComponent(components, [
    'postal_town',
    'locality',
    'administrative_area_level_3',
  ]);
  const district = firstComponent(components, [
    'administrative_area_level_2',
    'sublocality_level_1',
    'sublocality',
  ]);
  const state = firstComponent(components, ['administrative_area_level_1']);
  const country = firstComponent(components, ['country']);
  const postcode = firstComponent(components, ['postal_code']);
  const location = result.geometry?.location || result.location || {};
  const displayName = result.displayName?.text || result.name || premise.long || route.long;

  return buildNormalizedResult({
    provider,
    placeId: result.place_id || result.id || String(result.name || '').replace(/^places\//, ''),
    formatted: result.formatted_address || result.formattedAddress || '',
    name: displayName,
    housenumber: streetNumber.long,
    street: route.long || premise.long,
    city: city.long,
    district: district.long,
    state: state.long,
    country: country.long,
    countryCode: country.short,
    postcode: postcode.long,
    latitude: location.lat ?? location.latitude,
    longitude: location.lng ?? location.longitude,
    confidence: result.partial_match ? 0.65 : 0.95,
  });
};

const normalizeGooglePrediction = prediction => {
  const place = prediction.placePrediction || {};
  const formatted = place.text?.text || '';
  const name = place.structuredFormat?.mainText?.text || formatted.split(',')[0];
  const secondary = place.structuredFormat?.secondaryText?.text || '';

  return {
    ...buildNormalizedResult({
      provider: 'google',
      placeId: place.placeId || String(place.place || '').replace(/^places\//, ''),
      formatted,
      name,
      latitude: null,
      longitude: null,
      confidence: 0.95,
      requiresPlaceDetails: true,
    }),
    address_line2: secondary,
  };
};

const normalizeTomTomResult = result => {
  const address = result.address || {};
  const position = result.position || result.entryPoints?.[0]?.position || {};
  const poiName = result.poi?.name || '';

  return buildNormalizedResult({
    provider: 'tomtom',
    placeId: result.id,
    formatted: address.freeformAddress || poiName,
    name: poiName || address.streetName || address.municipality || address.freeformAddress,
    housenumber: address.streetNumber,
    street: address.streetName,
    city: address.municipality || address.localName,
    district:
      address.municipalitySubdivision ||
      address.countrySecondarySubdivision ||
      address.countryTertiarySubdivision,
    state: address.countrySubdivision || address.countrySubdivisionName,
    country: address.country,
    countryCode: address.countryCode || address.countryCodeISO3,
    postcode: address.postalCode,
    latitude: position.lat,
    longitude: position.lon,
    confidence: result.score ? Math.min(1, Number(result.score) / 10) : 0.85,
  });
};

const normalizeGeoapifyResult = result =>
  buildNormalizedResult({
    provider: 'geoapify',
    placeId: result.place_id,
    formatted: result.formatted,
    name: result.name || result.address_line1,
    housenumber: result.housenumber,
    street: result.street || result.address_line1,
    city: result.city,
    district: result.district || result.county,
    state: result.state,
    country: result.country,
    countryCode: result.country_code,
    postcode: result.postcode,
    latitude: result.lat,
    longitude: result.lon,
    confidence: result.rank?.confidence,
  });

const hasResults = value => Array.isArray(value) && value.length > 0;

const runWithFallback = async (operation, invoke, options = {}) => {
  const fallbackOnEmpty = toBoolean(
    process.env.LOCATION_FALLBACK_ON_EMPTY_RESULTS,
    options.fallbackOnEmpty !== false,
  );
  const attempted = [];
  let lastError = null;

  for (const provider of getProviderOrder()) {
    if (!isProviderEnabled(provider) || isCoolingDown(provider)) continue;
    attempted.push(provider);

    try {
      const results = await invoke(provider);
      if (!fallbackOnEmpty || hasResults(results)) {
        return { provider, results: results || [] };
      }
    } catch (error) {
      lastError = error;
      if (shouldCooldownProvider(error)) {
        startCooldown(provider);
      }
      console.warn(
        `[location] ${provider} ${operation} failed (${error?.code || error?.status || 'network'}); trying fallback`,
      );
    }
  }

  if (attempted.length === 0) {
    throw new LocationProviderError(
      'No location provider is configured. Add a provider API key and enable its LOCATION_*_ENABLED flag.',
      { code: 'NO_PROVIDER_CONFIGURED' },
    );
  }

  if (lastError) throw lastError;
  return { provider: attempted[attempted.length - 1], results: [] };
};

const filterByCountries = (results, countryCodes) => {
  const allowed = (countryCodes || []).map(normalizeCountryCode).filter(Boolean);
  if (allowed.length === 0) return results;
  return results.filter(result => allowed.includes(normalizeCountryCode(result.country_code)));
};

const googleGeocode = async ({ text, latitude, longitude, countryCodes, limit }) => {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  if (text) url.searchParams.set('address', text);
  else url.searchParams.set('latlng', `${latitude},${longitude}`);
  if (countryCodes?.length) {
    url.searchParams.set(
      'components',
      countryCodes.map(code => `country:${code.toLowerCase()}`).join('|'),
    );
    if (countryCodes.length === 1) {
      url.searchParams.set('region', countryCodes[0].toLowerCase());
    }
  }
  url.searchParams.set('key', getProviderKey('google'));

  const data = await requestJson('google', url.toString());
  if (data.status && !['OK', 'ZERO_RESULTS'].includes(data.status)) {
    throw new LocationProviderError(`Google geocoding failed with ${data.status}`, {
      provider: 'google',
      code: data.status,
      quota: isQuotaResponse(200, data.status),
    });
  }

  return filterByCountries(
    (data.results || []).map(normalizeGoogleResult),
    countryCodes,
  ).slice(0, limit);
};

const googleAutocomplete = async ({ text, language, countryCodes, sessionToken, limit }) => {
  const body = {
    input: text,
    languageCode: language || 'en',
    includeQueryPredictions: false,
  };
  if (countryCodes?.length) body.includedRegionCodes = countryCodes.map(code => code.toLowerCase());
  const safeSessionToken = normalizeSessionToken(sessionToken);
  if (safeSessionToken) body.sessionToken = safeSessionToken;

  const data = await requestJson('google', 'https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getProviderKey('google'),
      'X-Goog-FieldMask': 'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify(body),
  });

  return (data.suggestions || [])
    .filter(suggestion => suggestion.placePrediction)
    .map(normalizeGooglePrediction)
    .slice(0, limit);
};

const googlePlaceDetails = async (placeId, sessionToken) => {
  const safePlaceId = encodeURIComponent(String(placeId || '').replace(/^places\//, ''));
  const url = new URL(`https://places.googleapis.com/v1/places/${safePlaceId}`);
  const safeSessionToken = normalizeSessionToken(sessionToken);
  if (safeSessionToken) url.searchParams.set('sessionToken', safeSessionToken);
  const data = await requestJson('google', url.toString(), {
    headers: {
      'X-Goog-Api-Key': getProviderKey('google'),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
    },
  });
  const normalized = normalizeGoogleResult(data);
  return normalized.lat === null || normalized.lon === null ? [] : [normalized];
};

const tomTomSearch = async ({ text, latitude, longitude, countryCodes, language, limit }) => {
  const isReverse = latitude !== undefined && longitude !== undefined;
  const encodedQuery = isReverse ? `${latitude},${longitude}` : encodeURIComponent(text);
  const operation = isReverse ? 'reverseGeocode' : 'search';
  const url = new URL(`https://api.tomtom.com/search/2/${operation}/${encodedQuery}.json`);
  url.searchParams.set('key', getProviderKey('tomtom'));
  url.searchParams.set('limit', String(limit));
  if (countryCodes?.length) url.searchParams.set('countrySet', countryCodes.join(','));
  if (language) url.searchParams.set('language', language.includes('-') ? language : `${language}-GB`);
  if (!isReverse) url.searchParams.set('typeahead', 'true');

  const data = await requestJson('tomtom', url.toString());
  const rawResults = isReverse ? data.addresses || [] : data.results || [];
  return rawResults.map(normalizeTomTomResult).slice(0, limit);
};

const geoapifySearch = async ({ operation, text, latitude, longitude, countryCodes, language, limit }) => {
  const path = operation === 'autocomplete' ? 'autocomplete' : operation === 'reverse' ? 'reverse' : 'search';
  const url = new URL(`https://api.geoapify.com/v1/geocode/${path}`);
  if (text) url.searchParams.set('text', text);
  if (latitude !== undefined) url.searchParams.set('lat', String(latitude));
  if (longitude !== undefined) url.searchParams.set('lon', String(longitude));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('format', 'json');
  if (language) url.searchParams.set('lang', language);
  if (countryCodes?.length) {
    url.searchParams.set('filter', `countrycode:${countryCodes.map(code => code.toLowerCase()).join(',')}`);
  }
  url.searchParams.set('apiKey', getProviderKey('geoapify'));

  const data = await requestJson('geoapify', url.toString());
  return (data.results || []).map(normalizeGeoapifyResult).slice(0, limit);
};

const geocodeText = async (text, options = {}) => {
  const limit = toPositiveInteger(options.limit, 5);
  return runWithFallback('geocode', provider => {
    if (provider === 'google') {
      return googleGeocode({ text, countryCodes: options.countryCodes, limit });
    }
    if (provider === 'tomtom') {
      return tomTomSearch({ text, countryCodes: options.countryCodes, language: options.language, limit });
    }
    return geoapifySearch({
      operation: 'geocode',
      text,
      countryCodes: options.countryCodes,
      language: options.language,
      limit,
    });
  });
};

const autocomplete = async (text, options = {}) => {
  const limit = toPositiveInteger(options.limit, 5);
  return runWithFallback('autocomplete', provider => {
    if (provider === 'google') {
      return googleAutocomplete({
        text,
        language: options.language,
        countryCodes: options.countryCodes,
        sessionToken: options.sessionToken,
        limit,
      });
    }
    if (provider === 'tomtom') {
      return tomTomSearch({
        text,
        countryCodes: options.countryCodes,
        language: options.language,
        limit,
      });
    }
    return geoapifySearch({
      operation: 'autocomplete',
      text,
      countryCodes: options.countryCodes,
      language: options.language,
      limit,
    });
  });
};

const reverseGeocode = async (latitude, longitude, options = {}) => {
  const limit = toPositiveInteger(options.limit, 1);
  return runWithFallback('reverse geocode', provider => {
    if (provider === 'google') {
      return googleGeocode({ latitude, longitude, countryCodes: options.countryCodes, limit });
    }
    if (provider === 'tomtom') {
      return tomTomSearch({ latitude, longitude, language: options.language, limit });
    }
    return geoapifySearch({
      operation: 'reverse',
      latitude,
      longitude,
      language: options.language,
      limit,
    });
  });
};

const resolvePlaceDetails = async ({ placeId, provider, text, countryCodes, sessionToken }) => {
  const isGoogle = provider === 'google' || (!provider && isProviderEnabled('google'));
  if (isGoogle && placeId && isProviderEnabled('google') && !isCoolingDown('google')) {
    try {
      const results = filterByCountries(await googlePlaceDetails(placeId, sessionToken), countryCodes);
      if (results.length > 0) return { provider: 'google', results };
    } catch (error) {
      if (shouldCooldownProvider(error)) startCooldown('google');
      console.warn(
        `[location] google place details failed (${error?.code || error?.status || 'network'}); geocoding suggestion text with fallback`,
      );
    }
  }

  if (!text) {
    throw new LocationProviderError('Suggestion text is required when place details cannot be resolved.', {
      provider,
      code: 'PLACE_DETAILS_UNAVAILABLE',
    });
  }

  return geocodeText(text, { countryCodes, limit: 1 });
};

const resetProviderCooldowns = () => providerCooldowns.clear();

module.exports = {
  LocationProviderError,
  autocomplete,
  geocodeText,
  reverseGeocode,
  resolvePlaceDetails,
  resetProviderCooldowns,
};
