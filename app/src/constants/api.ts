/**
 * API Configuration Constants
 * Centralized configuration for backend connectivity
 */

// Backend URL - Change this to switch environments instantly
export const API_CONFIG = {
  // Development, Staging, Production URLs
  BASE_URL: 'http://localhost:5000',
  // BASE_URL: 'https://api-staging.yourdomain.com',
  // BASE_URL: 'https://api.yourdomain.com',
  
  API_VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
};

// Construct full API base URL with version
export const API_BASE_URL = `${API_CONFIG.BASE_URL}`;

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
    GET_ROUTES: '/route',
    GET_ROUTE: (id: string) => `/route/${id}`,
    UPDATE_ROUTE: (id: string) => `/route/${id}`,
    DELETE_ROUTE: (id: string) => `/route/${id}`,
    GET_USER_ROUTES: '/route/user/all',
    SEARCH_ROUTES: '/route/search',
    AUTOCOMPLETE_ADDRESS: '/route/autocomplete',
  },

  // Search endpoints
  SEARCH: {
    SEARCH_ROUTES: '/search/routes',
    SEARCH_USERS: '/search/users',
    SEARCH_LOCATIONS: '/search/locations',
  },

  // File upload endpoints
  FILES: {
    UPLOAD_IMAGE: '/files/upload/image',
    UPLOAD_DOCUMENT: '/files/upload/document',
    DELETE_FILE: (id: string) => `/files/${id}`,
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
