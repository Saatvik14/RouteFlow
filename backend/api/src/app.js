const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/env');
const crypto = require('crypto');
const { sendError } = require('./utils/httpError');
const authRoutes = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const configurationRoutes = require('./routes/configurationRoutes');
const supportRoutes = require('./routes/supportRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const driverRoutes = require('./routes/driverRoutes');

const app = express();

// CORS middleware
const configuredOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Mobile apps, Postman, curl
  if (configuredOrigins.includes(origin) || configuredOrigins.includes('*')) return true;

  // Allow any localhost or 127.0.0.1 port (8081, 8082, 19006, 3000, 5173, etc.)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  // Allow local LAN IPs for Expo testing across mobile / local network
  if (/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;

  // Allow common deployment previews (Render, Vercel, Netlify)
  if (/^https:\/\/.*\.onrender\.com$/.test(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https:\/\/.*\.netlify\.app$/.test(origin)) {
    return true;
  }

  return false;
};

app.disable('x-powered-by');
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'apikey',
    'x-client-info',
    'x-retry-count',
    'x-organization-id',
    'x-request-id',
    'idempotency-key',
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json({ limit: '2mb' }));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Auth routes
app.use('/users', authRoutes);
app.use('/route', routeRoutes);
app.use('/order', orderRoutes);
app.use('/config', configurationRoutes);
app.use('/route', require('./routes/routeManifestRoutes'));
app.use('/support', supportRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use('/driver', driverRoutes);

app.use('/api/enterprise', require('./routes/enterpriseRoutes'));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found.' },
    message: 'Endpoint not found.',
  });
});

app.use((error, req, res, _next) => {
  console.log('Error middleware triggered:', error);
  console.error('Request failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    code: error.code,
    statusCode: error.statusCode || 500,
  });
  sendError(res, error);
});

module.exports = app;
