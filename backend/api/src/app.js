const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PORT } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// CORS middleware
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006',
    'http://localhost:3000',
  ],
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
  ],
  optionsSuccessStatus: 200,
}));

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: '10mb' }));

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Auth routes
app.use('/users', authRoutes);
app.use('/route', routeRoutes);
app.use('/order', orderRoutes);

module.exports = app;