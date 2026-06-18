const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { runQuery } = require('../config/db');
const { 
  JWT_ACCESS_SECRET, 
  JWT_REFRESH_SECRET, 
  JWT_ACCESS_EXPIRES_IN, 
  JWT_REFRESH_EXPIRES_IN,
} = require('../config/env');

// Helper functions to generate tokens
const generateAccessToken = (id, email, role, name) => {
  return jwt.sign({ id, email, role, name }, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
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
  console.log('Signup request body:', req.body); // Debug log
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

    // Create default configuration entry for the new user
    await runQuery(
      `INSERT INTO config_model (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.user_id]
    );

    res.status(201).json({
      accessToken: generateAccessToken(newUser.user_id, newUser.email, newUser.role, newUser.name),
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

    res.status(200).json({
      accessToken: generateAccessToken(user.user_id, user.email, user.role, user.name),
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
      'SELECT user_id, status, email, role, name FROM users WHERE user_id = $1',
      [decoded.id]
    );
    const user = userResult.rows[0];

    if (!user || user.status !== 'active') {
      return res.status(403).json({ message: 'Invalid refresh token or inactive user' });
    }

    // Issue a new access token
    const newAccessToken = generateAccessToken(user.user_id, user.email, user.role, user.name);

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

// --- Email OTP Logic ---

// Function to generate a random 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Transporter configuration for Google SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GOOGLE_SMTP_USER,
      pass: process.env.GOOGLE_SMTP_PASS,
    },
  });
};

// @desc    Send OTP email
// @route   POST /auth/send-otp
// @access  Public
const sendOtpEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  if (!process.env.GOOGLE_SMTP_USER || !process.env.GOOGLE_SMTP_PASS) {
    console.error('SMTP credentials not set in environment variables.');
    return res.status(500).json({ message: 'Server email configuration error.' });
  }

  try {
    const otp = generateOTP();
    const transporter = createTransporter();

    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Securely hash the OTP before storing it
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Timely cleanup: Delete expired records globally and old records for this specific user
    await runQuery('DELETE FROM otps WHERE expires_at < NOW() OR email = $1', [email]);

    // Store hashed OTP in the database
    await runQuery(
      `INSERT INTO otps (email, otp_code, expires_at, is_used)
       VALUES ($1, $2, $3, FALSE)`,
      [email, hashedOtp, expiresAt]
    );

    console.log(`Hashed OTP stored safely for ${email} in database, expires at ${expiresAt.toISOString()}`);

    // Send email
    const mailOptions = {
      from: `"RouteFlow Team" <${process.env.GOOGLE_SMTP_USER}>`,
      to: email,
      subject: `${otp} is your RouteFlow verification code`,
      text: `Hello,\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis code is valid for a limited time. Please do not share it with anyone.\n\nRegards,\nRouteFlow Team`,
      html: `
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
        <p>This OTP is valid for a limited time. Please do not share it with anyone.</p>
        <p>Regards,<br>RouteFlow Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'OTP email sent successfully.'
    });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ message: 'Failed to send OTP email.' });
  }
};

// @desc    Verify OTP
// @route   POST /auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    // Retrieve the latest active OTP for this email
    const result = await runQuery(
      `SELECT id, otp_code, expires_at FROM otps 
       WHERE email = $1 AND is_used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or OTP has expired.' });
    }

    const storedOtpData = result.rows[0];

    // Validate the incoming OTP against the cryptographic hash stored in the database
    const isMatch = await bcrypt.compare(otp, storedOtpData.otp_code);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Invalidate the record to prevent replay attacks
    await runQuery('UPDATE otps SET is_used = TRUE WHERE id = $1', [storedOtpData.id]);

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Database error during OTP verification:', error);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

module.exports = { signup, login, refresh, checkHealth, sendOtpEmail, verifyOtp };