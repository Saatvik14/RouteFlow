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

// Default backend host (use your Render URL)
// const DEFAULT_BACKEND_URL = 'https://routeflow-rlu5.onrender.com';
const DEFAULT_BACKEND_URL = getDevelopmentBaseUrl();

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BACKEND_URL;

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
    SEND_OTP: '/users/send-otp',
    VERIFY_OTP: '/users/verify-otp',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/users/refresh',
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

  // Maps/Routes endpoints (for your RouteFloww app)
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
    CANCEL_ROUTE: (id: string) => `/route/cancel?route_id=${id}`,
    REVERSE_GEOCODE: (lat: number, lon: number) => `/route/reverse-geocode?lat=${lat}&lon=${lon}`,
  },

  // Order endpoints
  ORDERS: {
    ADD: '/order/add',
    ADD_BULK: '/order/add/bulk',
    EDIT: '/order/edit',
    BULK_CREATE: '/order/add/bulk',
    REORDER_STOPS: '/order/reorder',
    DELETE_ALL: '/order/delete/all',
    DELETE: (id: string) => `/order/delete?id=${id}`,
    FETCH_ALL: '/order/fetch/all',
    GET_ORDERS_BY_ROUTE: (id: string) => `/order/fetch?routeId=${id}`,
    VEHICLE_PLACE: '/order/vehicleplace',
    GET_VEHICLE_PLACE: (orderId: string) => `/order/vehicleplace?orderId=${orderId}`,
  },

  // Search endpoints
  CONFIG: {
    FETCH_CONFIG: '/config/fetch-config'
  },
  SUPPORT: {
    SUBMIT: '/support/submit',
  },
  DRIVERS: {
    FETCH_ALL: '/driver/fetch-all',
    CREATE: '/driver/create',
    EDIT: '/driver/edit',
    DELETE: (id: string) => `/driver/delete?driver_id=${id}`,
  },
  ENTERPRISE: {
    CONTEXT: '/api/enterprise/context',
    DASHBOARD: '/api/enterprise/dashboard',
    TEAM: '/api/enterprise/team',
    INVITATIONS: '/api/enterprise/invitations',
    INVITATION_PREVIEW: (token: string) => `/api/enterprise/invitations/accept/${encodeURIComponent(token)}`,
    INVITATION_ACCEPT_NEW: (token: string) => `/api/enterprise/invitations/accept/${encodeURIComponent(token)}/new`,
    INVITATION_ACCEPT_EXISTING: (token: string) => `/api/enterprise/invitations/accept/${encodeURIComponent(token)}/existing`,
    INVITATION_RESEND: (id: number) => `/api/enterprise/invitations/${id}/resend`,
    INVITATION_REVOKE: (id: number) => `/api/enterprise/invitations/${id}/revoke`,
    DRIVER: (id: number) => `/api/enterprise/team/drivers/${id}`,
    DRIVER_HISTORY: (id: number) => `/api/enterprise/team/drivers/${id}/history`,
    MY_ASSIGNMENTS: '/api/enterprise/assignments/mine',
    ROUTE_ASSIGN: (id: number) => `/api/enterprise/routes/${id}/assign`,
    ROUTE_ACCEPT: (id: number) => `/api/enterprise/routes/${id}/accept`,
    ROUTE_REJECT: (id: number) => `/api/enterprise/routes/${id}/reject`,
    ROUTE_START: (id: number) => `/api/enterprise/routes/${id}/start`,
    ROUTE_COMPLETE: (id: number) => `/api/enterprise/routes/${id}/complete`,
    ROUTE_CANCEL: (id: number) => `/api/enterprise/routes/${id}/cancel`,
    ROUTE_DETAIL: (id: number) => `/api/enterprise/routes/${id}/detail`,
    ROUTE_PROGRESS: (id: number) => `/api/enterprise/routes/${id}/progress`,
    ROUTE_LOCATION: (id: number) => `/api/enterprise/routes/${id}/location`,
    ROUTE_CHANGE_REQUEST: (id: number) => `/api/enterprise/routes/${id}/change-requests`,
    STOP_ARRIVE: (id: number) => `/api/enterprise/stops/${id}/arrive`,
    STOP_COMPLETE: (id: number) => `/api/enterprise/stops/${id}/complete`,
    PROOF_CONTENT: (id: number) => `/api/enterprise/proofs/${id}/content`,
    REPORT: '/api/enterprise/reports/daily',
    REPORT_CSV: '/api/enterprise/reports/daily.csv',
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
  DRAFT: 'draft',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  FAILED: 'failed',
  PENDING: 'pending',
  OPTIMIZED: 'optimized',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DELIVERED: 'delivered'
} as const;


export const SUBSCRIPTION_TYPES = {
  FREE: 'free',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
  LITE: 'lite',
  STANDARD: 'standard'
} as const;
