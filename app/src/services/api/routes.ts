/**
 * Routes API Service
 * Handles all route-related API calls
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

/**
 * Route/Map Route data
 */
export interface Route {
  id: string;
  title: string;
  description?: string;
  userId: string;
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  distance: number;
  duration: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  isPublic: boolean;
  likes: number;
  createdAt: string;
  updatedAt: string;
    route_id: number;
  status?: string;
}

/**
 * Create route request
 */
export interface CreateRouteRequest {
  name: string;

}

/**
 * Update route request
 */
export interface UpdateRouteRequest extends Partial<CreateRouteRequest> {
  route_id: number;
  status?: string;
}

/**
 * Search query
 */
export interface RouteSearchQuery {
  query: string;
  difficulty?: string;
  distance?: { min: number; max: number };
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Routes Service functions
 */
export const routesService = {
  /**
   * Create a new route
   */
  createRoute: (data: any) =>
    apiPost<Route>(API_ENDPOINTS.ROUTES.CREATE_ROUTE, data),

  /**
   * Get all routes (paginated)
   */
  getRoutes: (limit = 20, offset = 0) =>
    apiGet<{ routes: Route[]; total: number }>(
      `${API_ENDPOINTS.ROUTES.GET_ROUTES}?limit=${limit}&offset=${offset}`
    ),

  /**
   * Get route by ID
   */
  getRoute: (routeId: string) =>
    apiGet<Route>(API_ENDPOINTS.ROUTES.GET_ROUTE(routeId)),

  /**
   * Update route
   */
  updateRoute: (data: any) =>
    apiPut<Route>(API_ENDPOINTS.ROUTES.UPDATE_ROUTE, data),

  /**
   * Delete route
   */
  deleteRoute: (routeId: string) =>
    apiDelete(API_ENDPOINTS.ROUTES.DELETE_ROUTE(routeId)),

  /**
   * Get current user's routes
   */
  getUserRoutes: (limit = 20, offset = 0) =>
    apiGet<{ routes: Route[]; total: number }>(
      `${API_ENDPOINTS.ROUTES.GET_USER_ROUTES}?limit=${limit}&offset=${offset}`
    ),

  /**
   * Search routes
   */
  searchRoutes: (query: RouteSearchQuery) =>
    apiPost<{ routes: Route[]; total: number }>(
      API_ENDPOINTS.ROUTES.SEARCH_ROUTES,
      query
    ),

  /**
   * Get address autocomplete suggestions based on user input
   */
  getAutocompleteAddress: (text: string, limit = 10) =>
    apiGet<any>(
      `${API_ENDPOINTS.ROUTES.AUTOCOMPLETE_ADDRESS}?text=${encodeURIComponent(text)}&limit=${limit}`
    ),


  optimizeRoute: (routeId: any) =>
    apiPost<any>(API_ENDPOINTS.ROUTES.OPTIMIZE, {"route_id": routeId}),

};
