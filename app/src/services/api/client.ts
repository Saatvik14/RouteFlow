/**
 * API Client
 * Common HTTP request handler with error handling, interceptors, and common functions
 */

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

/**
 * Storage for auth token (can be replaced with AsyncStorage or similar)
 */
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = (): string | null => {
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
  const finalHeaders = {
    ...getDefaultHeaders(),
    ...headers,
  };

  try {
    console.log(`[API] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    // Check for different status codes
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || ERROR_MESSAGES.UNKNOWN_ERROR;
      
      // Handle specific status codes
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        // Token expired or invalid - can trigger logout here
        setAuthToken(null);
      }

      console.error(`[API] Error: ${response.status} - ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    console.log(`[API] Success: ${method} ${url}`);

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

    console.error(`[API] Exception: ${errorMessage}`, error);

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
