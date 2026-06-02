# API Framework Documentation

## Overview

This API framework provides a structured, categorized approach to making API requests from your React Native/Expo application. It includes:

- **Centralized Configuration**: Single place to change backend URLs
- **Categorized Endpoints**: Organized by resource type (auth, users, routes, maps)
- **Common Request Handler**: Unified HTTP client with error handling
- **Service Modules**: Separate services for different API categories
- **Custom Hooks**: React hooks for API calls with loading and error states
- **TypeScript Support**: Full type safety for requests and responses

## File Structure

```
src/
├── constants/
│   └── api.ts                 # API configuration and endpoints
├── services/
│   └── api/
│       ├── index.ts           # Central export point
│       ├── client.ts          # HTTP client and common functions
│       ├── auth.ts            # Authentication service
│       ├── users.ts           # User service
│       ├── routes.ts          # Routes service
│       └── map.ts             # Map service
└── hooks/
    └── useAPI.ts              # Custom React hooks for API calls
```

## Configuration

### Changing Backend URL

Edit [src/constants/api.ts](src/constants/api.ts) to change the backend URL:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',  // Change this
  API_VERSION: 'v1',
  TIMEOUT: 30000,
};
```

You can easily switch between environments:

```typescript
// Development
BASE_URL: 'http://localhost:5000',

// Staging
BASE_URL: 'https://api-staging.yourdomain.com',

// Production
BASE_URL: 'https://api.yourdomain.com',
```

## Usage

### 1. Using Service Functions

Each service module exposes functions for specific API operations:

#### Authentication

```typescript
import { authService } from '@/services/api';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

if (response.success) {
  console.log('User:', response.data?.user);
  // Save token, redirect to home, etc.
} else {
  console.error('Login failed:', response.error);
}
```

#### Users

```typescript
import { userService } from '@/services/api';

// Get current user profile
const response = await userService.getProfile();

if (response.success) {
  console.log('Profile:', response.data);
}

// Update profile
const updateResponse = await userService.updateProfile({
  name: 'New Name',
  bio: 'Updated bio'
});
```

#### Routes

```typescript
import { routesService } from '@/services/api';

// Get all routes
const response = await routesService.getRoutes(20, 0);

if (response.success) {
  console.log('Routes:', response.data?.routes);
  console.log('Total:', response.data?.total);
}

// Create a new route
const createResponse = await routesService.createRoute({
  title: 'My Route',
  description: 'A scenic route',
  coordinates: [
    { latitude: 40.7128, longitude: -74.0060 },
    { latitude: 40.7580, longitude: -73.9855 }
  ],
  distance: 5000,
  duration: 1800,
  isPublic: true
});
```

#### Map

```typescript
import { mapService } from '@/services/api';

// Get directions
const response = await mapService.getDirections(
  { latitude: 40.7128, longitude: -74.0060 },
  { latitude: 40.7580, longitude: -73.9855 },
  'walking'
);

if (response.success) {
  console.log('Distance:', response.data?.distance, 'meters');
  console.log('Duration:', response.data?.duration, 'seconds');
}
```

### 2. Using Custom Hooks

#### useAPI Hook

For simple API calls with loading and error state management:

```typescript
import { useAPI } from '@/hooks/useAPI';
import { userService } from '@/services/api';
import { User } from '@/services/api/users';

export const ProfileScreen = () => {
  const { data: user, loading, error, execute } = useAPI<User>(null);

  const loadProfile = async () => {
    await execute('/users/profile');
  };

  return (
    <View>
      {loading && <Text>Loading...</Text>}
      {error && <Text>Error: {error}</Text>}
      {user && (
        <View>
          <Text>Welcome, {user.name}</Text>
          <TouchableOpacity onPress={loadProfile}>
            <Text>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

#### usePaginatedAPI Hook

For paginated lists:

```typescript
import { usePaginatedAPI } from '@/hooks/useAPI';
import { Route } from '@/services/api/routes';

export const RoutesListScreen = () => {
  const {
    items: routes,
    loading,
    error,
    hasMore,
    fetchMore,
    refresh
  } = usePaginatedAPI<Route>(
    (page, limit) => `/routes?limit=${limit}&offset=${page * limit}`,
    20
  );

  return (
    <FlatList
      data={routes}
      renderItem={({ item }) => <RouteCard route={item} />}
      keyExtractor={(item) => item.id}
      onEndReached={fetchMore}
      onRefresh={refresh}
      refreshing={loading}
      onEndReachedThreshold={0.5}
    />
  );
};
```

### 3. Direct HTTP Calls

You can also use the HTTP client directly:

```typescript
import { apiGet, apiPost, apiPut, apiDelete, makeRequest } from '@/services/api';

// GET request
const response = await apiGet('/users/123');

// POST request
const response = await apiPost('/routes', {
  title: 'New Route',
  coordinates: [...]
});

// PUT request
const response = await apiPut('/users/profile', {
  name: 'Updated Name'
});

// DELETE request
const response = await apiDelete('/routes/123');

// Custom request
const response = await makeRequest('/custom-endpoint', {
  method: 'PATCH',
  headers: { 'Custom-Header': 'value' },
  body: { data: 'value' }
});
```

### 4. Managing Authentication Tokens

```typescript
import { setAuthToken, getAuthToken } from '@/services/api';

// After successful login
const response = await authService.login(credentials);
if (response.success && response.data?.token) {
  setAuthToken(response.data.token);
}

// Get current token
const token = getAuthToken();

// Logout
setAuthToken(null);
```

## API Response Format

All API calls return a standardized response:

```typescript
interface APIResponse<T> {
  success: boolean;      // true if request succeeded
  data?: T;             // Response data (type-safe)
  error?: string;       // Error message if failed
  message?: string;     // Optional message
  statusCode?: number;  // HTTP status code
}
```

## Error Handling

### Built-in Error Messages

Common errors are pre-defined:

```typescript
import { ERROR_MESSAGES } from '@/constants/api';

ERROR_MESSAGES.NETWORK_ERROR          // Network connection issues
ERROR_MESSAGES.TIMEOUT                // Request timeout
ERROR_MESSAGES.UNAUTHORIZED           // 401 - Login required
ERROR_MESSAGES.FORBIDDEN              // 403 - Permission denied
ERROR_MESSAGES.NOT_FOUND              // 404 - Resource not found
ERROR_MESSAGES.SERVER_ERROR           // 500+ - Server error
```

### Handling Specific Status Codes

```typescript
import { HTTP_STATUS } from '@/constants/api';

const response = await apiGet('/users/profile');

if (response.statusCode === HTTP_STATUS.UNAUTHORIZED) {
  // Handle login required
  setAuthToken(null);
  navigation.navigate('Login');
} else if (response.statusCode === HTTP_STATUS.FORBIDDEN) {
  // Handle permission denied
  showAlert('You do not have permission');
} else if (!response.success) {
  // Handle other errors
  showAlert(response.error);
}
```

## Adding New API Endpoints

### 1. Add endpoint to constants

Edit [src/constants/api.ts](src/constants/api.ts):

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  NOTIFICATIONS: {
    GET_NOTIFICATIONS: '/notifications',
    MARK_AS_READ: (id: string) => `/notifications/${id}/read`,
    DELETE_NOTIFICATION: (id: string) => `/notifications/${id}`,
  },
};
```

### 2. Create service module

Create [src/services/api/notifications.ts](src/services/api/notifications.ts):

```typescript
import { apiGet, apiPost, apiDelete } from './client';
import { API_ENDPOINTS } from '../../constants/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: () =>
    apiGet<Notification[]>(API_ENDPOINTS.NOTIFICATIONS.GET_NOTIFICATIONS),

  markAsRead: (notificationId: string) =>
    apiPost(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId)),

  deleteNotification: (notificationId: string) =>
    apiDelete(API_ENDPOINTS.NOTIFICATIONS.DELETE_NOTIFICATION(notificationId)),
};
```

### 3. Export in index

Update [src/services/api/index.ts](src/services/api/index.ts):

```typescript
export * from './notifications';
export { notificationService } from './notifications';
```

## Best Practices

1. **Always use TypeScript types** for better type safety
2. **Check response.success** before accessing response.data
3. **Handle errors gracefully** with user-friendly messages
4. **Use custom hooks** for component state management
5. **Set auth tokens** after successful login
6. **Clear tokens** on logout or 401 responses
7. **Use constants** for all API configuration
8. **Group related endpoints** in the same service
9. **Document your endpoints** with JSDoc comments
10. **Test API calls** with real backend before deployment

## Environment Configuration

Create environment-specific configurations:

```typescript
// Development
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  TIMEOUT: 30000,
};

// Staging
const API_CONFIG = {
  BASE_URL: 'https://api-staging.example.com',
  TIMEOUT: 30000,
};

// Production
const API_CONFIG = {
  BASE_URL: 'https://api.example.com',
  TIMEOUT: 30000,
};
```

## Troubleshooting

### 401 Unauthorized Response

If you get a 401 response, the token may have expired. The framework automatically clears the token. You should redirect to login.

### Network Errors

Ensure:
- Backend is running on the configured URL and port
- CORS is properly configured if backend is on different domain
- Network connection is available

### Timeout Errors

Increase timeout in `API_CONFIG.TIMEOUT` if backend is slow:

```typescript
TIMEOUT: 60000, // 60 seconds
```

## License

MIT
