/**
 * Map API Service
 * Handles map and location-related API calls
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiPost } from './client';

/**
 * Coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Location information
 */
export interface LocationInfo {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
  coordinates: Coordinates;
}

/**
 * Directions response
 */
export interface Directions {
  distance: number; // in meters
  duration: number; // in seconds
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
  polyline: string; // encoded polyline
}

/**
 * Nearby place
 */
export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  coordinates: Coordinates;
  distance: number; // in meters
  rating?: number;
  address?: string;
}

/**
 * Geocoding result
 */
export interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
  types?: string[];
}

/**
 * Map Service functions
 */
export const mapService = {
  /**
   * Get coordinates for an address (geocoding)
   */
  getCoordinates: (address: string) =>
    apiPost<Coordinates>(API_ENDPOINTS.MAP.GET_COORDINATES, { address }),

  /**
   * Get location information from coordinates (reverse geocoding)
   */
  getLocation: (coordinates: Coordinates) =>
    apiPost<LocationInfo>(API_ENDPOINTS.MAP.GET_LOCATION, coordinates),

  /**
   * Get directions between two points
   */
  getDirections: (
    origin: Coordinates,
    destination: Coordinates,
    mode?: 'driving' | 'walking' | 'cycling'
  ) =>
    apiPost<Directions>(API_ENDPOINTS.MAP.GET_DIRECTIONS, {
      origin,
      destination,
      mode: mode || 'walking',
    }),

  /**
   * Find nearby places
   */
  getNearbyPlaces: (
    coordinates: Coordinates,
    radius: number = 1000,
    type?: string
  ) =>
    apiPost<NearbyPlace[]>(API_ENDPOINTS.MAP.GET_NEARBY_PLACES, {
      coordinates,
      radius,
      type,
    }),

  /**
   * Geocode address to coordinates
   */
  geocode: (address: string) =>
    apiPost<GeocodingResult[]>(API_ENDPOINTS.MAP.GEOCODE, { address }),
};
