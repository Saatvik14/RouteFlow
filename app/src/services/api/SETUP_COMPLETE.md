# 🚀 API Framework - Complete Setup Summary

## ✅ What's Been Created

### 📁 Directory Structure
```
src/
├── constants/
│   └── api.ts                          # ⚙️ Configuration (1 file)
│
├── services/
│   └── api/
│       ├── client.ts                   # 🔌 HTTP Client
│       ├── auth.ts                     # 🔐 Auth Service
│       ├── users.ts                    # 👤 User Service  
│       ├── routes.ts                   # 🗺️ Routes Service
│       ├── map.ts                      # 🧭 Map Service
│       ├── index.ts                    # 📤 Exports
│       ├── README.md                   # 📖 Full Docs
│       ├── EXAMPLES.md                 # 💡 Code Examples
│       ├── QUICK_START.ts              # ⚡ Quick Guide
│       └── ARCHITECTURE.md             # 🏗️ System Design
│
└── hooks/
    └── useAPI.ts                       # 🎣 React Hooks
```

**Total: 14 files created**

---

## 🎯 How to Use

### 1️⃣ Change Backend URL (Most Important!)
Edit **[src/constants/api.ts](../constants/api.ts)**:
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',  // 👈 Change this to your backend URL
  API_VERSION: 'v1',
  TIMEOUT: 30000,
};
```

### 2️⃣ Import and Use in Components

#### Option A: Direct Service Calls
```typescript
import { authService, userService, routesService, mapService } from '@/services/api';

// Login
const response = await authService.login({ email, password });
if (response.success) {
  setAuthToken(response.data.token);
}

// Get user profile
const profile = await userService.getProfile();

// Get routes
const routes = await routesService.getRoutes(20, 0);

// Get directions
const directions = await mapService.getDirections(from, to, 'walking');
```

#### Option B: React Hooks (Recommended)
```typescript
import { useAPI, usePaginatedAPI } from '@/hooks/useAPI';

// Single item with loading/error states
const { data: user, loading, error, execute } = useAPI(null);

// Paginated list
const {
  items: routes,
  loading,
  hasMore,
  fetchMore,
  refresh
} = usePaginatedAPI((page, limit) => `/routes?limit=${limit}&offset=${page * limit}`, 20);
```

---

## 🔑 Key Features

### ✨ Easy Configuration
- Change backend URL in **one place** (`API_CONFIG.BASE_URL`)
- Supports development, staging, and production URLs

### 🏗️ Organized Endpoints
```
AUTH          → Login, signup, password reset
USERS         → Profile, preferences
ROUTES        → CRUD operations, search
MAP           → Geocoding, directions, nearby places
```

### 🔌 Reusable HTTP Client
```typescript
apiGet(endpoint)          // GET request
apiPost(endpoint, body)   // POST request
apiPut(endpoint, body)    // PUT request
apiPatch(endpoint, body)  // PATCH request
apiDelete(endpoint)       // DELETE request
```

### 🎣 React Hooks
```typescript
useAPI()              // Single item with loading/error
usePaginatedAPI()     // Paginated lists
```

### 🔐 Authentication
```typescript
setAuthToken(token)   // Save token after login
getAuthToken()        // Get current token
// Token automatically included in all requests
// Automatically cleared on 401 response
```

### 🚨 Error Handling
```typescript
// Pre-defined error messages
ERROR_MESSAGES.NETWORK_ERROR
ERROR_MESSAGES.TIMEOUT
ERROR_MESSAGES.UNAUTHORIZED
ERROR_MESSAGES.FORBIDDEN
// ... and more

// HTTP status codes
HTTP_STATUS.OK
HTTP_STATUS.UNAUTHORIZED
HTTP_STATUS.NOT_FOUND
// ... and more
```

---

## 📊 Service Categories

### 🔐 Authentication Service
```typescript
authService.login()
authService.signup()
authService.logout()
authService.refreshToken()
authService.forgotPassword()
authService.resetPassword()
authService.verifyEmail()
```

### 👤 User Service
```typescript
userService.getProfile()
userService.updateProfile()
userService.getUser(id)
userService.updateUser(id, data)
userService.getPreferences()
userService.updatePreferences()
```

### 🗺️ Routes Service
```typescript
routesService.createRoute()
routesService.getRoutes()
routesService.getRoute(id)
routesService.updateRoute(id, data)
routesService.deleteRoute(id)
routesService.getUserRoutes()
routesService.searchRoutes(query)
```

### 🧭 Map Service
```typescript
mapService.getCoordinates(address)
mapService.getLocation(coords)
mapService.getDirections(from, to, mode)
mapService.getNearbyPlaces(coords, radius)
mapService.geocode(address)
```

---

## 💡 Common Patterns

### Pattern 1: Login and Save Token
```typescript
const response = await authService.login({ email, password });
if (response.success) {
  setAuthToken(response.data.token);
  navigation.navigate('Home');
}
```

### Pattern 2: Get Profile with Hook
```typescript
export const ProfileScreen = () => {
  const { data: user, loading, error } = useAPI(null);

  useEffect(() => {
    execute('/users/profile');
  }, []);

  return (
    <>
      {loading && <Text>Loading...</Text>}
      {error && <Text>Error: {error}</Text>}
      {user && <Text>Welcome {user.name}</Text>}
    </>
  );
};
```

### Pattern 3: Paginated List
```typescript
const { items, loading, hasMore, fetchMore } = usePaginatedAPI(
  (page, limit) => `/routes?limit=${limit}&offset=${page * limit}`,
  20
);

return (
  <FlatList
    data={items}
    onEndReached={fetchMore}
    refreshing={loading}
  />
);
```

### Pattern 4: Error Handling
```typescript
const response = await apiGet('/users/profile');

if (!response.success) {
  if (response.statusCode === HTTP_STATUS.UNAUTHORIZED) {
    navigation.navigate('Login');
  } else {
    alert(response.error);
  }
}
```

---

## 📋 Response Format

Every API call returns:
```typescript
{
  success: boolean,        // true/false
  data?: T,               // Response data (typed)
  error?: string,         // Error message
  message?: string,       // Optional info
  statusCode?: number     // HTTP status
}
```

Example:
```typescript
const response = await authService.login(credentials);

if (response.success) {
  const user = response.data.user;     // Type-safe
  const token = response.data.token;
} else {
  console.error(response.error);       // Error message
  console.log(response.statusCode);    // e.g., 401
}
```

---

## 🚀 Next Steps

1. **Change Backend URL**
   - Edit `src/constants/api.ts`
   - Set `API_CONFIG.BASE_URL` to your backend

2. **Test Connection**
   - Try a simple API call in browser console
   - Check Network tab for requests

3. **Integrate into Screens**
   - Import services in your screens
   - Use hooks for state management
   - Handle loading and error states

4. **Add More Endpoints**
   - Add to `API_ENDPOINTS` in constants
   - Create service file
   - Export in index

---

## 📚 Documentation Files

- **[README.md](./README.md)** - Complete documentation
- **[EXAMPLES.md](./EXAMPLES.md)** - Working code examples
- **[QUICK_START.ts](./QUICK_START.ts)** - Quick reference guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend URL not working | Check `API_CONFIG.BASE_URL` in constants/api.ts |
| 401 Unauthorized | Save token with `setAuthToken()` after login |
| CORS errors | Configure CORS on backend |
| Timeout errors | Increase `API_CONFIG.TIMEOUT` |
| Endpoints not found | Verify endpoint matches backend routes |
| Loading stuck | Check network in browser DevTools |

---

## ✨ You're Ready!

Everything is set up. Just:
1. ✅ Configure backend URL
2. ✅ Import services in your components
3. ✅ Start making API calls!

For more details, see the documentation files in this directory.
