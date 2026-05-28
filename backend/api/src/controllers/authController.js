const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery } = require('../config/db');
const { 
  JWT_ACCESS_SECRET, 
  JWT_REFRESH_SECRET, 
  JWT_ACCESS_EXPIRES_IN, 
  JWT_REFRESH_EXPIRES_IN 
} = require('../config/env');

// Helper functions to generate tokens
const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { name, phone_no, email, password, role } = req.body;

  // Basic validation
  if (!name || !phone_no || !password) {
    return res.status(400).json({ message: 'Please enter all required fields: name, phone_no, password' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists by phone_no
    const phoneCheck = await runQuery('SELECT user_id FROM users WHERE phone_no = $1', [phone_no]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    // Check if user already exists by email (if provided)
    if (email) {
      const emailCheck = await runQuery('SELECT user_id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in Supabase
    const insertQuery = `
      INSERT INTO users (name, phone_no, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, name, phone_no, email, role, status, created_at, updated_at
    `;
    
    const newUserResult = await runQuery(insertQuery, [
      name, 
      phone_no, 
      email || null, 
      hashedPassword, 
      role || 'user', 
      'active'
    ]);

    const newUser = newUserResult.rows[0];

    res.status(201).json({
      user: newUser,
      accessToken: generateAccessToken(newUser.user_id),
      refreshToken: generateRefreshToken(newUser.user_id),
    });
  } catch (error) {
    console.error('Signup Error Detailed:', error.message || error);
    res.status(500).json({ message: 'Server error during signup', detail: error.code === 'ECONNREFUSED' ? 'Database connection failed' : 'Internal error' });
  }
};

// @desc    Authenticate user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
  const { identifier, password } = req.body; // 'identifier' can be phone_no or email

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Please enter identifier (phone number or email) and password' });
  }

  try {
    // Find user by email OR phone number
    const userResult = await runQuery(
      'SELECT * FROM users WHERE email = $1 OR phone_no = $1',
      [identifier]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Remove password from response
    delete user.password;

    res.status(200).json({
      user,
      accessToken: generateAccessToken(user.user_id),
      refreshToken: generateRefreshToken(user.user_id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Check if user still exists and is active
    const userResult = await runQuery(
      'SELECT user_id, status FROM users WHERE user_id = $1',
      [decoded.id]
    );
    const user = userResult.rows[0];

    if (!user || user.status !== 'active') {
      return res.status(403).json({ message: 'Invalid refresh token or inactive user' });
    }

    // Issue a new access token
    const newAccessToken = generateAccessToken(user.user_id);

    res.status(200).json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// @desc    Check DB Connection and Table status
// @route   GET /users/health
// @access  Public
const checkHealth = async (req, res) => {
  try {
    // Try to perform a simple count query on the users table
    const result = await runQuery('SELECT COUNT(*) FROM users');

    if (!result) {
      return res.status(500).json({
        status: 'error',
        message: 'Could not access the "users" table.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Database connection verified and "users" table is accessible.'
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

module.exports = { signup, login, refresh, checkHealth };