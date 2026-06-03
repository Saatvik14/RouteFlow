# 🔧 CORS Configuration Guide

## Problem
```
CORS policy: Response to preflight request doesn't pass access control check
```

Your backend (running on `http://localhost:5000`) is blocking requests from your frontend (running on `http://localhost:8081`).

---

## ✅ Frontend Fixes (Already Applied)

I've updated your frontend API configuration:

1. **Fixed API_BASE_URL** - Now includes `/api/v1` prefix
   ```typescript
   // Before: http://localhost:5000/users/signup
   // After:  http://localhost:5000/api/v1/users/signup
   ```

2. **Added CORS credentials** - Frontend now sends credentials with requests
   ```typescript
   credentials: 'include'
   ```

---

## 🔧 Backend CORS Configuration (Required)

You **must** configure CORS on your backend. Choose based on your backend framework:

### Node.js / Express

```bash
npm install cors
```

```javascript
const cors = require('cors');
const express = require('express');
const app = express();

// Enable CORS for development
const corsOptions = {
  origin: [
    'http://localhost:8081',      // Expo web
    'http://localhost:3000',      // React dev
    'http://127.0.0.1:8081',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Use CORS middleware BEFORE routes
app.use(cors(corsOptions));

// Rest of your routes
app.post('/api/v1/users/signup', (req, res) => {
  // Your signup logic
});
```

### Python / Flask

```bash
pip install flask-cors
```

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for development
CORS(app, 
     origins=[
         'http://localhost:8081',
         'http://localhost:3000',
         'http://127.0.0.1:8081',
         'http://127.0.0.1:3000'
     ],
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization']
)

@app.route('/api/v1/users/signup', methods=['POST'])
def signup():
    # Your signup logic
    pass
```

### Python / Django

```bash
pip install django-cors-headers
```

```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add at top
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:3000',
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

CORS_ALLOW_HEADERS = [
    'Content-Type',
    'Authorization',
]
```

### Node.js / Fastify

```bash
npm install @fastify/cors
```

```javascript
const fastify = require('fastify')();
const cors = require('@fastify/cors');

await fastify.register(cors, {
  origin: [
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

fastify.post('/api/v1/users/signup', async (request, reply) => {
  // Your signup logic
});
```

### Go / Gin

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()

    // CORS middleware
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{
        "http://localhost:8081",
        "http://localhost:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:3000",
    }
    config.AllowCredentials = true
    config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Content-Type", "Authorization"}

    r.Use(cors.New(config))

    r.POST("/api/v1/users/signup", signup)
    r.Run(":5000")
}

func signup(c *gin.Context) {
    // Your signup logic
}
```

---

## 📋 CORS Settings Explained

| Setting | Purpose |
|---------|---------|
| `origin` | Allowed frontend URLs |
| `credentials: true` | Allow cookies/auth headers |
| `methods` | Allowed HTTP methods |
| `allowedHeaders` | Allowed request headers |
| `optionsSuccessStatus` | Status for preflight success |

---

## 🚀 Steps to Fix

1. **Update your backend** with CORS configuration from above
2. **Restart your backend** server
3. **Test signup** in your Expo app

---

## 🧪 Test CORS Configuration

Run this in your browser console or curl to test:

```bash
curl -X POST http://localhost:5000/api/v1/users/signup \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8081" \
  -d '{"name": "Test", "email": "test@test.com", "phone_no": "1234567890", "password": "123456", "role": "user"}' \
  -v
```

Look for these response headers:
```
Access-Control-Allow-Origin: http://localhost:8081
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## 🏭 Production Configuration

For production, use specific domains:

```typescript
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://api.yourdomain.com'
  ],
  credentials: true,
  // ... other settings
};
```

Never use `origin: '*'` with `credentials: true` in production.

---

## ❓ FAQ

**Q: Why do I get CORS errors?**
A: Your backend doesn't have CORS middleware configured.

**Q: Why credentials?**
A: Allows authentication headers and cookies to be sent with requests.

**Q: Can I use `origin: '*'`?**
A: Only if you don't need credentials. For auth, you must specify exact origins.

**Q: Do I need to configure CORS for web only?**
A: CORS is a browser security feature. Native apps (iOS/Android) don't enforce it, only web.

**Q: What if signup is under different URL?**
A: Update `API_ENDPOINTS.AUTH.SIGNUP` in `src/constants/api.ts`.

---

## ✅ After Fixing Backend

Once your backend CORS is configured, signup should work! The frontend will:
1. Make request to `http://localhost:5000/api/v1/users/signup`
2. Backend receives request and responds with CORS headers
3. Browser allows response through
4. App receives user token and routes to home screen
