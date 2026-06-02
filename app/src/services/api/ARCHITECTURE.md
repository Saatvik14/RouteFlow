# API Framework - Complete Setup

## 📁 Directory Structure

```
src/
├── constants/
│   └── api.ts                           # ⚙️ Configuration & endpoints
│                                         # - API_CONFIG (backend URL)
│                                         # - API_ENDPOINTS (all endpoints)
│                                         # - HTTP_STATUS constants
│                                         # - ERROR_MESSAGES
│
├── services/
│   └── api/
│       ├── index.ts                     # 📤 Central export point
│       ├── client.ts                    # 🔌 HTTP client & common functions
│       │                                # - makeRequest (main function)
│       │                                # - apiGet, apiPost, apiPut, etc.
│       │                                # - setAuthToken, getAuthToken
│       │                                # - Error handling & logging
│       │
│       ├── auth.ts                      # 🔐 Authentication service
│       │                                # - login, signup, logout
│       │                                # - forgotPassword, resetPassword
│       │
│       ├── users.ts                     # 👤 User service
│       │                                # - getProfile, updateProfile
│       │                                # - getPreferences, updatePreferences
│       │
│       ├── routes.ts                    # 🗺️ Routes service
│       │                                # - createRoute, getRoutes
│       │                                # - updateRoute, deleteRoute
│       │                                # - searchRoutes
│       │
│       ├── map.ts                       # 🧭 Map service
│       │                                # - getCoordinates, getLocation
│       │                                # - getDirections, getNearbyPlaces
│       │
│       ├── README.md                    # 📖 Full documentation
│       ├── EXAMPLES.md                  # 💡 Code examples
│       ├── QUICK_START.ts              # ⚡ Quick reference guide
│       └── ARCHITECTURE.md             # 🏗️ This file
│
└── hooks/
    └── useAPI.ts                        # 🎣 React hooks
                                         # - useAPI (with loading/error)
                                         # - usePaginatedAPI (for lists)
```

## 🚀 Quick Start Steps

### 1️⃣ Change Backend URL
Edit [src/constants/api.ts](../constants/api.ts):
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000', // Your backend URL
};
```

### 2️⃣ Login and Save Token
```typescript
import { authService, setAuthToken } from '@/services/api';

const response = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

if (response.success) {
  setAuthToken(response.data.token); // Save token
  navigation.navigate('Home');
}
```

### 3️⃣ Make API Calls
```typescript
import { userService } from '@/services/api';

// Get user profile
const profile = await userService.getProfile();

// Get routes
const routes = await routesService.getRoutes();

// Create route
const newRoute = await routesService.createRoute({ ... });
```

### 4️⃣ Use in Components
```typescript
import { useAPI } from '@/hooks/useAPI';

export const MyScreen = () => {
  const { data, loading, error } = useAPI(null);
  
  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (data) return <Text>Data: {JSON.stringify(data)}</Text>;
};
```

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Component                       │
│  (LoginScreen, ProfileScreen, RoutesScreen, etc.)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │   React Hooks              │
        ├────────────────────────────┤
        │ • useAPI()                 │
        │ • usePaginatedAPI()        │
        │ (State management)         │
        └────────────────┬───────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │   API Services                     │
        ├────────────────────────────────────┤
        │ • authService                      │
        │ • userService                      │
        │ • routesService                    │
        │ • mapService                       │
        │ (Business logic)                   │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │   HTTP Client (client.ts)          │
        ├────────────────────────────────────┤
        │ • makeRequest()                    │
        │ • apiGet, apiPost, apiPut, etc.   │
        │ • Error handling                   │
        │ • Token management                 │
        │ • Request logging                  │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │   Constants (constants/api.ts)     │
        ├────────────────────────────────────┤
        │ • API_CONFIG (backend URL)         │
        │ • API_ENDPOINTS (all endpoints)    │
        │ • HTTP_STATUS codes                │
        │ • ERROR_MESSAGES                   │
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │   Fetch API / Network              │
        ├────────────────────────────────────┤
        │   http://localhost:5000/api/v1/... │
        └────────────────────────────────────┘
```

## 🔄 Data Flow Example: Login

```
User taps Login
         ↓
LoginScreen.handleLogin()
         ↓
authService.login(email, password)
         ↓
apiPost('/auth/login', { email, password })
         ↓
makeRequest('/auth/login', { method: 'POST', body })
         ↓
fetch('http://localhost:5000/api/v1/auth/login', options)
         ↓
Backend Response
         ↓
Parse JSON response
         ↓
Return APIResponse<LoginResponse>
         ↓
Check response.success
         ↓
Save token with setAuthToken()
         ↓
Navigate to Home
```

## 📝 File Relationships

```
api.ts (Constants)
    ↑
    │ imports
    │
client.ts (HTTP Client)
    ↑
    ├─ imports
    ├─ auth.ts (Auth Service)
    ├─ users.ts (User Service)
    ├─ routes.ts (Routes Service)
    └─ map.ts (Map Service)
         ↑
         │ imports
         │
      index.ts (Export Point)
         ↑
         │ imports
         │
    Components (Login, Profile, Routes, etc.)
         ↑
         │ uses
         │
    useAPI.ts (React Hook)
```

## 🛠️ Adding New Features

### Add a new API service:

1. **Create endpoint in constants:**
   ```typescript
   // src/constants/api.ts
   export const API_ENDPOINTS = {
     NOTIFICATIONS: {
       GET: '/notifications',
       CREATE: '/notifications',
     }
   };
   ```

2. **Create service file:**
   ```typescript
   // src/services/api/notifications.ts
   export const notificationService = {
     getNotifications: () => apiGet(API_ENDPOINTS.NOTIFICATIONS.GET),
     create: (data) => apiPost(API_ENDPOINTS.NOTIFICATIONS.CREATE, data),
   };
   ```

3. **Export in index:**
   ```typescript
   // src/services/api/index.ts
   export { notificationService } from './notifications';
   ```

4. **Use in component:**
   ```typescript
   import { notificationService } from '@/services/api';
   
   const notifications = await notificationService.getNotifications();
   ```

## 🔐 Authentication Flow

```
START
  ↓
User enters credentials
  ↓
Call authService.login(email, password)
  ↓
Server validates & returns token
  ↓
Call setAuthToken(token) ← Token stored globally
  ↓
All future requests include: Authorization: Bearer {token}
  ↓
User navigates to authenticated screens
  ↓
DONE
---
If token expires (401 response):
  → setAuthToken(null) clears token
  → Redirect to login screen
```

## 🌍 Environment Configuration

Change backend URL instantly by editing one line:

```typescript
// Development
BASE_URL: 'http://localhost:5000'

// Staging
BASE_URL: 'https://api-staging.yourdomain.com'

// Production
BASE_URL: 'https://api.yourdomain.com'
```

## ✅ Testing Checklist

- [ ] Backend running on correct port
- [ ] API_CONFIG.BASE_URL points to backend
- [ ] API_ENDPOINTS match backend routes
- [ ] Types match backend response format
- [ ] Token is saved after login
- [ ] Token is included in requests
- [ ] 401 responses trigger logout
- [ ] Error messages display properly
- [ ] Loading states work
- [ ] Pagination works for lists

## 🐛 Debugging

1. **Check console logs**: All API requests/responses logged
2. **Check Network tab**: See actual HTTP requests
3. **Check token**: `getAuthToken()` in console
4. **Check response**: Log `response` object
5. **Check headers**: Verify Authorization header

## 📚 File Reference

| File | Purpose | Example |
|------|---------|---------|
| [src/constants/api.ts](../constants/api.ts) | Configuration & endpoints | `API_CONFIG.BASE_URL`, `API_ENDPOINTS.AUTH.LOGIN` |
| [src/services/api/client.ts](./client.ts) | HTTP client | `apiGet()`, `apiPost()`, `setAuthToken()` |
| [src/services/api/auth.ts](./auth.ts) | Auth API | `authService.login()`, `authService.signup()` |
| [src/services/api/users.ts](./users.ts) | User API | `userService.getProfile()`, `userService.updateProfile()` |
| [src/services/api/routes.ts](./routes.ts) | Routes API | `routesService.getRoutes()`, `routesService.createRoute()` |
| [src/services/api/map.ts](./map.ts) | Map API | `mapService.getDirections()`, `mapService.getCoordinates()` |
| [src/hooks/useAPI.ts](../../hooks/useAPI.ts) | React hooks | `useAPI()`, `usePaginatedAPI()` |

## 🎯 Best Practices

✅ Do:
- Use constants for configuration
- Check `response.success` before accessing data
- Use TypeScript types for type safety
- Use custom hooks for component state
- Handle errors gracefully
- Set token after login
- Clear token on logout

❌ Don't:
- Hardcode URLs in components
- Ignore error responses
- Skip TypeScript types
- Mix API logic in components
- Store sensitive data in plaintext
- Make requests during render

## 📞 Support

For detailed documentation:
- Read [README.md](./README.md) for full docs
- Check [EXAMPLES.md](./EXAMPLES.md) for code samples
- See [QUICK_START.ts](./QUICK_START.ts) for quick reference
