/**
 * QUICK START GUIDE - API Framework
 * 
 * This file serves as a quick reference for using the API framework.
 * For detailed documentation, see README.md and EXAMPLES.md
 */

// ============================================================================
// 1. CONFIGURATION - Change backend URL here
// ============================================================================

// File: src/constants/api.ts
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000', // Change this to your backend URL
  API_VERSION: 'v1',
  TIMEOUT: 30000,
};

// ============================================================================
// 2. AUTHENTICATION - Set/Get auth tokens
// ============================================================================

import { setAuthToken, getAuthToken, authService } from '@/services/api';

// After login, save the token
const loginResponse = await authService.login({ email, password });
if (loginResponse.success) {
  setAuthToken(loginResponse.data.token);
}

// Get current token
const token = getAuthToken();

// On logout, clear token
setAuthToken(null);

// ============================================================================
// 3. IMPORT SERVICES
// ============================================================================

// Auth Service
import { authService } from '@/services/api';

// User Service
import { userService } from '@/services/api';

// Routes Service
import { routesService } from '@/services/api';

// Map Service
import { mapService } from '@/services/api';

// HTTP Client (for custom requests)
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/services/api';

// ============================================================================
// 4. BASIC API CALLS
// ============================================================================

// GET request
const { data, error, success } = await apiGet('/users/profile');

// POST request
const response = await apiPost('/routes', {
  title: 'My Route',
  coordinates: [...]
});

// PUT request
const response = await apiPut('/users/profile', { name: 'New Name' });

// PATCH request
const response = await apiPatch('/users/preferences', { theme: 'dark' });

// DELETE request
const response = await apiDelete('/routes/123');

// ============================================================================
// 5. SERVICE-SPECIFIC FUNCTIONS
// ============================================================================

// Auth
await authService.login({ email, password });
await authService.signup({ email, password, name });
await authService.logout();
await authService.forgotPassword({ email });

// Users
await userService.getProfile();
await userService.updateProfile({ name: 'New Name' });
await userService.getPreferences();
await userService.updatePreferences({ theme: 'dark' });

// Routes
await routesService.getRoutes(20, 0);           // Get with pagination
await routesService.getRoute('routeId');       // Get single route
await routesService.createRoute({ ... });      // Create route
await routesService.updateRoute('id', { ... }); // Update route
await routesService.deleteRoute('id');         // Delete route
await routesService.searchRoutes({ query: 'hiking' }); // Search

// Map
await mapService.getCoordinates('New York');   // Geocode address
await mapService.getLocation({ lat, lng });   // Reverse geocode
await mapService.getDirections(from, to, 'walking'); // Get directions
await mapService.getNearbyPlaces(coords, 1000); // Find nearby

// ============================================================================
// 6. REACT HOOK - useAPI (with loading/error states)
// ============================================================================

import { useAPI } from '@/hooks/useAPI';
import { User } from '@/services/api/users';

export const MyComponent = () => {
  const { data, loading, error, execute, setData, reset } = useAPI<User>(null);

  React.useEffect(() => {
    execute('/users/profile');
  }, [execute]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (data) return <Text>Hello {data.name}</Text>;

  return null;
};

// ============================================================================
// 7. REACT HOOK - usePaginatedAPI (for lists)
// ============================================================================

import { usePaginatedAPI } from '@/hooks/useAPI';
import { Route } from '@/services/api/routes';

export const RoutesList = () => {
  const {
    items,
    loading,
    error,
    hasMore,
    fetchMore,
    refresh,
  } = usePaginatedAPI<Route>(
    (page, limit) => `/routes?limit=${limit}&offset=${page * limit}`,
    20
  );

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <RouteCard route={item} />}
      onEndReached={fetchMore}
      onRefresh={refresh}
      refreshing={loading}
    />
  );
};

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================

import { HTTP_STATUS, ERROR_MESSAGES } from '@/constants/api';

const response = await apiGet('/users/profile');

// Check if successful
if (!response.success) {
  // Handle specific HTTP status codes
  if (response.statusCode === HTTP_STATUS.UNAUTHORIZED) {
    // Token expired - redirect to login
    navigation.navigate('Login');
  } else if (response.statusCode === HTTP_STATUS.NOT_FOUND) {
    // Resource not found
    console.log('Resource not found');
  } else {
    // General error
    console.log(response.error);
  }
}

// Pre-defined error messages
const message = ERROR_MESSAGES.NETWORK_ERROR;
const message = ERROR_MESSAGES.TIMEOUT;
const message = ERROR_MESSAGES.UNAUTHORIZED;

// ============================================================================
// 9. RESPONSE FORMAT
// ============================================================================

interface APIResponse<T> {
  success: boolean;      // true/false
  data?: T;             // Response data (type-safe)
  error?: string;       // Error message
  message?: string;     // Optional message
  statusCode?: number;  // HTTP status code
}

// ============================================================================
// 10. ADD NEW ENDPOINTS
// ============================================================================

// Step 1: Add to src/constants/api.ts
export const API_ENDPOINTS = {
  NOTIFICATIONS: {
    GET: '/notifications',
    CREATE: '/notifications',
    DELETE: (id: string) => `/notifications/${id}`,
  }
};

// Step 2: Create src/services/api/notifications.ts
export const notificationService = {
  getNotifications: () => apiGet(API_ENDPOINTS.NOTIFICATIONS.GET),
  create: (data) => apiPost(API_ENDPOINTS.NOTIFICATIONS.CREATE, data),
  delete: (id) => apiDelete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id)),
};

// Step 3: Export in src/services/api/index.ts
export { notificationService } from './notifications';

// ============================================================================
// 11. REAL-WORLD EXAMPLE - Complete Screen
// ============================================================================

import React from 'react';
import { View, FlatList, TouchableOpacity, Text } from 'react-native';
import { useAPI } from '@/hooks/useAPI';
import { routesService, Route } from '@/services/api';

export const RoutesScreen = ({ navigation }) => {
  const { data: routes, loading, error, execute } = useAPI<Route[]>([]);

  React.useEffect(() => {
    // Load routes on mount
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    const response = await routesService.getRoutes(20, 0);
    if (response.success) {
      // data is auto-populated by useAPI
    }
  };

  const deleteRoute = async (routeId) => {
    const response = await routesService.deleteRoute(routeId);
    if (response.success) {
      loadRoutes(); // Refresh list
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading && <Text>Loading routes...</Text>}
      {error && <Text>Error: {error}</Text>}
      
      <FlatList
        data={routes}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 16 }}>{item.title}</Text>
            <TouchableOpacity onPress={() => deleteRoute(item.id)}>
              <Text>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('CreateRoute')}
        style={{ padding: 10, backgroundColor: 'blue' }}
      >
        <Text style={{ color: 'white' }}>Create Route</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern 1: Retry failed request
const retryRequest = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await apiGet('/endpoint');
    if (response.success) return response;
    await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
  }
  return { success: false, error: 'Max retries exceeded' };
};

// Pattern 2: Timeout wrapper
const withTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
};

// Pattern 3: Cache results
const cache = new Map();
const cachedGet = async (endpoint) => {
  if (cache.has(endpoint)) return cache.get(endpoint);
  const response = await apiGet(endpoint);
  cache.set(endpoint, response);
  return response;
};

// ============================================================================
// DEBUGGING
// ============================================================================

// Enable debug logging - check browser console
// The framework logs all requests/responses to console:
// [API] GET http://localhost:5000/api/v1/users/profile
// [API] Success: GET http://localhost:5000/api/v1/users/profile

// Check token
const token = getAuthToken();
console.log('Current token:', token);

// Manual API call for testing
const testResponse = await apiGet('/test');
console.log('Test response:', testResponse);
