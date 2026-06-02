/**
 * API Framework Usage Examples
 * Practical examples of how to use the API framework in components
 */

// ============================================================================
// Example 1: Login Screen with Authentication
// ============================================================================

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { authService, setAuthToken } from '@/services/api';

export const LoginScreenExample = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    const response = await authService.login({
      email,
      password,
    });

    if (response.success && response.data?.token) {
      // Save token for future requests
      setAuthToken(response.data.token);
      // Navigate to home
      navigation.navigate('Home');
    } else {
      setError(response.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <TouchableOpacity onPress={handleLogin} disabled={loading}>
        <Text>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// Example 2: Profile Screen with useAPI Hook
// ============================================================================

import { useAPI } from '@/hooks/useAPI';
import { userService, User } from '@/services/api';

export const ProfileScreenExample = () => {
  const { data: user, loading, error, execute, setData } = useAPI<User>(null);

  // Load profile on mount
  React.useEffect(() => {
    execute('/users/profile');
  }, [execute]);

  const handleUpdateProfile = async () => {
    const response = await userService.updateProfile({
      name: 'Updated Name',
      bio: 'New bio',
    });

    if (response.success && response.data) {
      setData(response.data);
    }
  };

  return (
    <View>
      {loading && <Text>Loading profile...</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {user && (
        <View>
          <Text>Name: {user.name}</Text>
          <Text>Email: {user.email}</Text>
          {user.bio && <Text>Bio: {user.bio}</Text>}
          <TouchableOpacity onPress={handleUpdateProfile}>
            <Text>Update Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// Example 3: Routes List with Pagination
// ============================================================================

import { FlatList } from 'react-native';
import { usePaginatedAPI } from '@/hooks/useAPI';
import { Route } from '@/services/api/routes';

export const RoutesListExample = () => {
  const {
    items: routes,
    loading,
    hasMore,
    fetchMore,
    refresh,
  } = usePaginatedAPI<Route>(
    (page, limit) => `/routes?limit=${limit}&offset=${page * limit}`,
    20
  );

  const renderRoute = ({ item }: { item: Route }) => (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
      <Text>{item.description}</Text>
      <Text>Distance: {item.distance}m | Duration: {item.duration}s</Text>
    </View>
  );

  return (
    <FlatList
      data={routes}
      renderItem={renderRoute}
      keyExtractor={(item) => item.id}
      onEndReached={fetchMore}
      onEndReachedThreshold={0.5}
      onRefresh={refresh}
      refreshing={loading}
      ListFooterComponent={loading && hasMore ? <Text>Loading more...</Text> : null}
    />
  );
};

// ============================================================================
// Example 4: Create Route with Map Service
// ============================================================================

import { routesService, mapService } from '@/services/api';

export const CreateRouteExample = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [coordinates, setCoordinates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoute = async () => {
    if (coordinates.length < 2) {
      setError('Need at least 2 coordinates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get directions between points to calculate distance and duration
      const directions = await mapService.getDirections(
        coordinates[0],
        coordinates[coordinates.length - 1],
        'walking'
      );

      if (!directions.success) {
        setError('Failed to calculate route');
        return;
      }

      // Create the route
      const response = await routesService.createRoute({
        title,
        coordinates,
        distance: directions.data?.distance || 0,
        duration: directions.data?.duration || 0,
        isPublic: true,
      });

      if (response.success) {
        navigation.navigate('Routes', { refresh: true });
      } else {
        setError(response.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Route title"
        value={title}
        onChangeText={setTitle}
        editable={!loading}
      />
      <Text>Coordinates: {coordinates.length}</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <TouchableOpacity onPress={handleCreateRoute} disabled={loading}>
        <Text>{loading ? 'Creating...' : 'Create Route'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// Example 5: Search Routes with Filters
// ============================================================================

import { routesService, Route } from '@/services/api';

export const SearchRoutesExample = () => {
  const [results, setResults] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    setLoading(true);

    const response = await routesService.searchRoutes({
      query: searchQuery,
      difficulty: 'easy',
      limit: 50,
    });

    if (response.success && response.data?.routes) {
      setResults(response.data.routes);
    }

    setLoading(false);
  };

  return (
    <View>
      <TextInput
        placeholder="Search routes..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={!loading}
      />
      <TouchableOpacity onPress={handleSearch} disabled={loading}>
        <Text>{loading ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <View>
            <Text>{item.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

// ============================================================================
// Example 6: Error Handling Best Practices
// ============================================================================

import { HTTP_STATUS } from '@/constants/api';

export const ErrorHandlingExample = async () => {
  const response = await authService.login({
    email: 'user@example.com',
    password: 'password',
  });

  // Check if request was successful
  if (!response.success) {
    // Handle different error types
    switch (response.statusCode) {
      case HTTP_STATUS.UNAUTHORIZED:
        console.log('Invalid credentials');
        break;
      case HTTP_STATUS.NOT_FOUND:
        console.log('User not found');
        break;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        console.log('Server error occurred');
        break;
      default:
        console.log('Error:', response.error);
    }
    return;
  }

  // Handle success
  console.log('Login successful:', response.data);
};

// ============================================================================
// Example 7: Multiple API Calls (Batch)
// ============================================================================

import { apiBatch } from '@/services/api';

export const BatchRequestExample = async () => {
  const response = await apiBatch([
    { endpoint: '/users/profile' },
    { endpoint: '/routes?limit=10&offset=0' },
    { endpoint: '/users/preferences' },
  ]);

  if (response.success && response.data) {
    const [profile, routes, preferences] = response.data;
    console.log('Profile:', profile);
    console.log('Routes:', routes);
    console.log('Preferences:', preferences);
  }
};

// ============================================================================
// Example 8: Handling Loading States in Components
// ============================================================================

export const LoadingStatesExample = () => {
  const { data: user, loading, error } = useAPI<User>(null);

  return (
    <View>
      {loading && (
        <View>
          <Text>Loading user profile...</Text>
          {/* Show skeleton loader or spinner */}
        </View>
      )}

      {error && !loading && (
        <View style={{ backgroundColor: 'red', padding: 10 }}>
          <Text style={{ color: 'white' }}>Error: {error}</Text>
          <TouchableOpacity onPress={() => window.location.reload()}>
            <Text style={{ color: 'white', marginTop: 5 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {user && !loading && !error && (
        <View>
          <Text>Welcome, {user.name}!</Text>
        </View>
      )}
    </View>
  );
};
