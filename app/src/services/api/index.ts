/**
 * API Services Index
 * Central export point for all API services
 */

// Export client
export * from './client';

// Export services
export * from './auth';
export * from './orders';
export * from './routes';
export * from './users';

// Export constants
export { API_BASE_URL, API_CONFIG, API_ENDPOINTS, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/api';

/**
 * All services combined for easy access
 */
export { authService } from './auth';
export { ordersService } from './orders';
export { routesService } from './routes';
export { userService } from './users';

