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
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : [
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      'http://localhost:19006',
      'http://localhost:3000',
    ];

app.disable('x-powered-by');
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
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
}));

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
