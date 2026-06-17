import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API Configuration Constants
 * Centralized configuration for backend connectivity
 */

const BACKEND_PORT = '5000';

function getExpoDevHost() {
  const constants = Constants as any;

  const hostUri =
    constants?.expoConfig?.hostUri ||
    constants?.manifest2?.extra?.expoClient?.hostUri ||
    constants?.manifest?.debuggerHost ||
    constants?.manifest?.hostUri ||
    '';

  if (!hostUri) return null;

  return String(hostUri)
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

function getWebHost() {
  if (typeof window === 'undefined') return null;
  return window.location.hostname;
}

function getDevelopmentBaseUrl() {
  const host = getExpoDevHost() || getWebHost();

  if (!host) {
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${BACKEND_PORT}`;
    }

    return `http://localhost:${BACKEND_PORT}`;
  }

  const normalizedHost =
    Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')
      ? '10.0.2.2'
      : host;

  return `http://${normalizedHost}:${BACKEND_PORT}`;
}

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (__DEV__
    ? getDevelopmentBaseUrl()
    : 'https://api.yourdomain.com');

export const API_CONFIG = {
  BASE_URL,
  API_VERSION: 'v1',
  TIMEOUT: 30000,
};

export const API_BASE_URL = API_CONFIG.BASE_URL;
/**
 * API Endpoints categorized by resource
 */
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/users/login',
    SIGNUP: '/users/signup',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  // User endpoints
  USERS: {
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    GET_USER: (id: string) => `/users/${id}`,
    UPDATE_USER: (id: string) => `/users/${id}`,
    DELETE_USER: (id: string) => `/users/${id}`,
    GET_PREFERENCES: '/users/preferences',
    UPDATE_PREFERENCES: '/users/preferences',
  },

  // Maps/Routes endpoints (for your RouteFlow app)
  ROUTES: {
    CREATE_ROUTE: '/route/create',
    GET_ROUTES: '/route/fetch/all',
    GET_ROUTE: (id: string) => `/route/fetch?id=${id}`,
    UPDATE_ROUTE: `/route/edit`,
    DELETE_ROUTE: (id: string) => `/route/${id}`,
    GET_USER_ROUTES: '/route/user/all',
    SEARCH_ROUTES: '/route/search',
    AUTOCOMPLETE_ADDRESS: '/route/autocomplete',
    OPTIMIZE: '/route/optimize',
  },

  // Order endpoints
  ORDERS: {
    ADD: '/order/add',
    EDIT: '/order/edit',
    DELETE_ALL: '/order/delete/all',
    DELETE: (id: string) => `/order/delete?id=${id}`,
    FETCH: '/order/fetch',
    VEHICLE_PLACE: '/order/vehicleplace',
    GET_VEHICLE_PLACE: (orderId: string) => `/order/vehicleplace?orderId=${orderId}`,
  },

  // Search endpoints
  CONFIG: {
    FETCH_CONFIG: '/config/fetch-config'
  },

};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
  INVALID_REQUEST: 'Invalid request. Please check your input.',
};

/**
 * Route and Order Status Constants
 */
export const ROUTE_STATUS = {
  PENDING: 'pending',
  OPTIMIZED: 'optimized',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DELIVERED: 'delivered'
} as const;
