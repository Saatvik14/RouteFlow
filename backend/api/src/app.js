const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const { PORT } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Auth routes
app.use('/users', authRoutes);
app.use('/route', routeRoutes);

module.exports = app;