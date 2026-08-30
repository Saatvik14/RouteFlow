/**
 * API Client
 * Common HTTP request handler with error handling, interceptors, and common functions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL, API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/api';

/**
 * API Request Options
 */
export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * API Response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * API Error class
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const getApiErrorMessage = (
  data: any,
  fallback = ERROR_MESSAGES.UNKNOWN_ERROR,
): string =>
  data?.error?.message ||
  data?.message ||
  (typeof data?.error === 'string' ? data.error : null) ||
  fallback;

/**
 * Storage for auth token (persisted with AsyncStorage)
 */
let authToken: string | null = null;
let sessionRefreshToken: string | null = null;
let cachedEmailFromToken: string | null = null;
let activeOrganizationId: number | null = null;
let tokenRefreshPromise: Promise<boolean> | null = null;

const TOKEN_STORAGE_KEY = 'authToken';
const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';
const ORGANIZATION_STORAGE_KEY = 'activeOrganizationId';
const REFRESH_ENDPOINT = '/users/refresh';

export const setActiveOrganizationId = async (organizationId: number | null) => {
  const normalizedId = Number(organizationId);
  activeOrganizationId = Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
  if (activeOrganizationId) {
    await AsyncStorage.setItem(ORGANIZATION_STORAGE_KEY, String(activeOrganizationId));
  } else {
    await AsyncStorage.removeItem(ORGANIZATION_STORAGE_KEY);
  }
};

export const getUserEmailFromToken = (): string | null => {
  if (cachedEmailFromToken) return cachedEmailFromToken;
  if (authToken) {
    try {
      const decoded: any = jwtDecode(authToken);
      const userObj = decoded.user || decoded;
      if (userObj && userObj.email) {
        cachedEmailFromToken = String(userObj.email).toLowerCase().trim();
        return cachedEmailFromToken;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

export const setAuthToken = async (token: string | null) => {
  authToken = token;
  cachedEmailFromToken = null;
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    getUserEmailFromToken();
  } else {
    sessionRefreshToken = null;
    activeOrganizationId = null;
    await AsyncStorage.multiRemove([
      TOKEN_STORAGE_KEY,
      REFRESH_TOKEN_STORAGE_KEY,
      ORGANIZATION_STORAGE_KEY,
    ]);
  }
};

export const setAuthSession = async (accessToken: string, refreshToken: string) => {
  authToken = accessToken;
  sessionRefreshToken = refreshToken;
  cachedEmailFromToken = null;
  await AsyncStorage.multiSet([
    [TOKEN_STORAGE_KEY, accessToken],
    [REFRESH_TOKEN_STORAGE_KEY, refreshToken],
  ]);
  getUserEmailFromToken();
};

export const getAuthToken = (): string | null => {
  return authToken;
};

const tokenExpiresSoon = (token: string) => {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    return !decoded.exp || decoded.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
};

export const refreshAuthToken = async (): Promise<boolean> => {
  if (!sessionRefreshToken) return false;
  if (tokenRefreshPromise) return tokenRefreshPromise;

  tokenRefreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: sessionRefreshToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.accessToken) {
        if (response.status === 401 || response.status === 403) await setAuthToken(null);
        return false;
      }
      await setAuthToken(data.accessToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    tokenRefreshPromise = null;
  });

  return tokenRefreshPromise;
};

export const restoreAuthToken = async (): Promise<string | null> => {
  try {
    const [token, storedRefreshToken, storedOrganizationId] = await Promise.all([
      AsyncStorage.getItem(TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(ORGANIZATION_STORAGE_KEY),
    ]);
    sessionRefreshToken = storedRefreshToken;
    const normalizedOrganizationId = Number(storedOrganizationId);
    activeOrganizationId = token && Number.isInteger(normalizedOrganizationId) && normalizedOrganizationId > 0
      ? normalizedOrganizationId
      : null;
    if (token) {
      authToken = token;
      getUserEmailFromToken();
      if (tokenExpiresSoon(token) && sessionRefreshToken) {
        await refreshAuthToken();
        return authToken;
      }
      return authToken;
    }
  } catch (error) {
    console.error('Failed to restore auth token:', error);
  }
  return null;
};

export const getValidAuthToken = async (): Promise<string | null> => {
  if (!authToken) await restoreAuthToken();
  if (authToken && tokenExpiresSoon(authToken) && sessionRefreshToken) {
    await refreshAuthToken();
  }
  return authToken;
};

/**
 * Get default headers
 */
const getDefaultHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeOrganizationId) {
    headers['X-Organization-Id'] = String(activeOrganizationId);
  }

  return headers;
};

/**
 * Main API request function
 * Handles common request logic, error handling, and response parsing
 */
export const makeRequest = async <T = any>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<APIResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeout = API_CONFIG.TIMEOUT,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    if (endpoint !== REFRESH_ENDPOINT) await getValidAuthToken();

    const sendRequest = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          method,
          headers: { ...getDefaultHeaders(), ...headers },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          credentials: 'include', // Include cookies for CORS
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const sentWithAuthentication = Boolean(getAuthToken());
    let result = await sendRequest();
    if (
      result.response.status === HTTP_STATUS.UNAUTHORIZED &&
      sentWithAuthentication &&
      endpoint !== REFRESH_ENDPOINT &&
      await refreshAuthToken()
    ) {
      result = await sendRequest();
    }

    const { response, data } = result;

    // Check for different status codes
    if (!response.ok) {
      const errorMessage = getApiErrorMessage(data);
      
      // Handle specific status codes
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        await setAuthToken(null);
      }

      return {
        success: false,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message,
      statusCode: response.status,
    };
  } catch (error: any) {
    let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;

    if (error.name === 'AbortError') {
      errorMessage = ERROR_MESSAGES.TIMEOUT;
    } else if (error instanceof TypeError) {
      errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
    }

    return {
      success: false,
      error: errorMessage,
      statusCode: 0,
    };
  }
};

/**
 * Convenience methods for common HTTP operations
 */

export const apiGet = <T = any>(
  endpoint: string,
  options?: Omit<APIRequestOptions, 'method' | 'body'>
) => makeRequest<T>(endpoint, { ...options, method: 'GET' });

export const apiPost = <T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<APIRequestOptions, 'method' | 'body'>
) => makeRequest<T>(endpoint, { ...options, method: 'POST', body });

export const apiPut = <T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<APIRequestOptions, 'method' | 'body'>
) => makeRequest<T>(endpoint, { ...options, method: 'PUT', body });

export const apiPatch = <T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<APIRequestOptions, 'method' | 'body'>
) => makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });

export const apiDelete = <T = any>(
  endpoint: string,
  options?: Omit<APIRequestOptions, 'method' | 'body'>
) => makeRequest<T>(endpoint, { ...options, method: 'DELETE' });

/**
 * Batch request function for multiple API calls
 */
export const apiBatch = async <T = any>(
  requests: Array<{ endpoint: string; options?: APIRequestOptions }>
): Promise<APIResponse<T[]>> => {
  try {
    const results = await Promise.all(
      requests.map(({ endpoint, options }) => makeRequest(endpoint, options))
    );

    const hasError = results.some((r) => !r.success);
    if (hasError) {
      return {
        success: false,
        error: 'One or more requests failed',
        data: results as any,
      };
    }

    return {
      success: true,
      data: results.map((r) => r.data),
    };
  } catch (error) {
    return {
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    };
  }
};


export async function apiPostMultipart<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = await getValidAuthToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      // IMPORTANT:
      // Do not set Content-Type here.
      // Browser / React Native will set multipart boundary automatically.
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new APIError(response.status, getApiErrorMessage(data, 'Upload failed'), data);
  }

  return data as T;
}
