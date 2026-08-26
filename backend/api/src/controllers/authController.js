const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { runQuery, withTransaction } = require('../config/db');
const { 
  JWT_ACCESS_SECRET, 
  JWT_REFRESH_SECRET, 
  JWT_ACCESS_EXPIRES_IN, 
  JWT_REFRESH_EXPIRES_IN,
} = require('../config/env');
const { sendEmailWithGmailApi } = require('../utils/emailSender');
const { generateAccessToken: createAccessToken, generateRefreshToken } = require('../services/tokenService');

// Helper functions to generate tokens
const generateAccessToken = (id, email, role, name) => {
  return createAccessToken({ user_id: id, email, role, name });
};

const PUBLIC_SIGNUP_ROLES = new Set(['INDEPENDENT_DRIVER', 'BUSINESS_OWNER']);
const VEHICLE_TYPES = new Set(['car', 'van', 'truck', 'motorbike']);
const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();
const normalizeAccessCode = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const publicUser = (user) => ({
  id: Number(user.user_id),
  email: user.email,
  name: user.name,
  role: user.role,
});

// @desc    Resolve which credential an account uses
// @route   POST /users/identify
// @access  Public (rate limited by the router)
const identify = async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier);
  if (!identifier) {
    return res.status(400).json({ message: 'Enter your email address or phone number.' });
  }

  try {
    const result = await runQuery(
      `SELECT u.user_id, u.name, u.role, u.status, u.fleet_access_code_hash,
              EXISTS (
                SELECT 1
                FROM organization_memberships om
                JOIN drivers d ON d.membership_id = om.membership_id
                WHERE om.user_id = u.user_id
                  AND om.role = 'driver'
                  AND om.status = 'active'
                  AND d.is_active = TRUE
                  AND d.removed_at IS NULL
              ) AS has_active_fleet_access
       FROM users u
       WHERE LOWER(u.email) = $1 OR u.phone_no = $1
       LIMIT 1`,
      [identifier]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'We could not find an account with those details.' });
    }
    if (String(user.status || '').toLowerCase() !== 'active') {
      return res.status(403).json({ message: 'This account is inactive. Contact your administrator.' });
    }

    const role = String(user.role || '').toUpperCase();
    if (role === 'FLEET_DRIVER' && !user.has_active_fleet_access) {
      return res.status(403).json({ message: 'This driver account is inactive. Contact your business admin.' });
    }
    const usesAccessCode = role === 'FLEET_DRIVER' && Boolean(user.fleet_access_code_hash);
    return res.json({
      authMethod: usesAccessCode ? 'access_code' : 'password',
      role,
      roleLabel: role === 'BUSINESS_OWNER'
        ? 'Business admin'
        : role === 'FLEET_DRIVER'
          ? 'Fleet driver'
          : 'Independent driver',
    });
  } catch (error) {
    console.error('Account identification error:', error);
    return res.status(500).json({ message: 'Server error while checking this account.' });
  }
};

// @desc    Register new user
// @route   POST /api/v1/auth/signup
// @access  Public
const signup = async (req, res) => {
  const {
    name,
    phone_no,
    password,
    role,
    company_name,
    companyName,
    address,
    vehicle_type,
    email_verification_token,
    emailVerificationToken,
  } = req.body;
  const email = req.body.email?.trim().toLowerCase() || null;
  const cleanName = String(name || '').trim();
  const cleanPhone = String(phone_no || '').trim();
  const userRole = String(role || '').trim().toUpperCase();
  const cleanCompanyName = String(company_name || companyName || '').trim();
  const cleanAddress = String(address || '').trim();
  const cleanVehicleType = String(vehicle_type || '').trim().toLowerCase();
  const verificationToken = String(email_verification_token || emailVerificationToken || '').trim();

  // Basic validation 
  if (!cleanName || !cleanPhone || !email || !password) {
    return res.status(400).json({ message: 'Name, email, phone number and password are required.' });
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ message: 'Use at least 8 characters with a letter and a number.' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!PUBLIC_SIGNUP_ROLES.has(userRole)) {
    return res.status(400).json({ message: 'Choose Independent Driver or Business Admin to create an account.' });
  }

  if (userRole === 'BUSINESS_OWNER' && !cleanCompanyName) {
    return res.status(400).json({ message: 'Business name is required for Business Admin registration.' });
  }

  if (userRole === 'INDEPENDENT_DRIVER' && !VEHICLE_TYPES.has(cleanVehicleType)) {
    return res.status(400).json({ message: 'Choose the vehicle you use most often.' });
  }

  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
  }

  try {
    let verified;
    try {
      verified = jwt.verify(verificationToken, JWT_ACCESS_SECRET);
    } catch {
      return res.status(400).json({ message: 'Email verification expired. Request a new code.' });
    }
    if (verified?.purpose !== 'signup_email' || normalizeIdentifier(verified.email) !== email) {
      return res.status(400).json({ message: 'Verify the email address used for this account.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT user_id FROM users
         WHERE phone_no = $1 OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
         LIMIT 1`,
        [cleanPhone, email]
      );
      if (existingResult.rows.length > 0) {
        const duplicate = new Error('An account with this phone number or email already exists.');
        duplicate.statusCode = 409;
        throw duplicate;
      }

      const inserted = await client.query(
        `INSERT INTO users (name, phone_no, email, password, role, status, vehicle_type)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)
         RETURNING user_id, name, phone_no, email, role, status, vehicle_type, created_at, updated_at`,
        [cleanName, cleanPhone, email, hashedPassword, userRole, userRole === 'INDEPENDENT_DRIVER' ? cleanVehicleType : null]
      );
      const user = inserted.rows[0];

      await client.query(
        `INSERT INTO config_model (user_id, subscription_type)
         VALUES ($1, 'trial')
         ON CONFLICT (user_id) DO UPDATE SET subscription_type = EXCLUDED.subscription_type`,
        [user.user_id]
      );

      // Both public account types own a private workspace. Independent drivers
      // keep the independent app experience while retaining the full legacy
      // route, stop and driver-management workflow inside their own tenant.
      if (['BUSINESS_OWNER', 'INDEPENDENT_DRIVER'].includes(userRole)) {
        const orgName = (userRole === 'BUSINESS_OWNER' && cleanCompanyName)
          ? cleanCompanyName
          : (userRole === 'BUSINESS_OWNER' ? `${cleanName}'s business` : `${cleanName}'s workspace`);

        const organizationResult = await client.query(
          `INSERT INTO organizations (name, address, legacy_owner_user_id)
           VALUES ($1, $2, $3)
           RETURNING organization_id`,
          [orgName, cleanAddress || null, user.user_id]
        );
        await client.query(
          `INSERT INTO organization_memberships (organization_id, user_id, role, status)
           VALUES ($1, $2, 'owner', 'active')`,
          [organizationResult.rows[0].organization_id, user.user_id]
        );
      }

      return user;
    });

    res.status(201).json({
      accessToken: generateAccessToken(newUser.user_id, newUser.email, newUser.role, newUser.name),
      refreshToken: generateRefreshToken(newUser.user_id),
      user: publicUser(newUser),
    });
  } catch (error) {
    console.error('Signup Error Detailed:', error.message || error);
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this phone number or email already exists.' });
    }
    res.status(500).json({ message: 'Server error during signup', detail: error.code === 'ECONNREFUSED' ? 'Database connection failed' : 'Internal error' });
  }
};

// @desc    Authenticate user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
  const identifier = normalizeIdentifier(req.body.identifier);
  const password = String(req.body.password || '');
  const accessCode = normalizeAccessCode(req.body.accessCode);

  if (!identifier) {
    return res.status(400).json({ message: 'Enter your email address or phone number.' });
  }

  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
  }

  try {
    // Find user by email OR phone number
    const userResult = await runQuery(
      `SELECT u.*,
              EXISTS (
                SELECT 1
                FROM organization_memberships om
                JOIN drivers d ON d.membership_id = om.membership_id
                WHERE om.user_id = u.user_id
                  AND om.role = 'driver'
                  AND om.status = 'active'
                  AND d.is_active = TRUE
                  AND d.removed_at IS NULL
              ) AS has_active_fleet_access
       FROM users u
       WHERE LOWER(u.email) = $1 OR u.phone_no = $1
       LIMIT 1`,
      [identifier]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (String(user.status || '').toLowerCase() !== 'active') {
      return res.status(403).json({ message: 'This account is inactive. Contact your administrator.' });
    }

    const role = String(user.role || '').toUpperCase();
    if (role === 'FLEET_DRIVER' && !user.has_active_fleet_access) {
      return res.status(403).json({ message: 'This driver account is inactive. Contact your business admin.' });
    }
    const usesAccessCode = role === 'FLEET_DRIVER' && Boolean(user.fleet_access_code_hash);
    if (usesAccessCode && !accessCode) {
      return res.status(400).json({ message: 'Enter the access code provided by your business.' });
    }
    if (!usesAccessCode && !password) {
      return res.status(400).json({ message: 'Enter your password.' });
    }

    const isMatch = usesAccessCode
      ? await bcrypt.compare(accessCode, user.fleet_access_code_hash)
      : await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({
      accessToken: generateAccessToken(user.user_id, user.email, user.role, user.name),
      refreshToken: generateRefreshToken(user.user_id),
      user: publicUser(user),
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

  if (!JWT_REFRESH_SECRET || !JWT_ACCESS_SECRET) {
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
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
// const sendOtpEmail = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: 'Email is required.' });
//   }

//   if (!process.env.GOOGLE_SMTP_USER || !process.env.GOOGLE_SMTP_PASS) {
//     console.error('SMTP credentials not set in environment variables.');
//     return res.status(500).json({ message: 'Server email configuration error.' });
//   }

//   try {
//     const otp = generateOTP();
//     const transporter = createTransporter();

//     // Calculate expiration time (5 minutes from now)
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     // Securely hash the OTP before storing it
//     const salt = await bcrypt.genSalt(10);
//     const hashedOtp = await bcrypt.hash(otp, salt);

//     // Timely cleanup: Delete expired records globally and old records for this specific user
//     await runQuery('DELETE FROM otps WHERE expires_at < NOW() OR email = $1', [email]);

//     // Store hashed OTP in the database
//     await runQuery(
//       `INSERT INTO otps (email, otp_code, expires_at, is_used)
//        VALUES ($1, $2, $3, FALSE)`,
//       [email, hashedOtp, expiresAt]
//     );

//     console.log(`Hashed OTP stored safely for ${email} in database, expires at ${expiresAt.toISOString()}`);
//     console.log(`[DEVELOPMENT OTP] Generated OTP for ${email}: ${otp}`);

//     // Send email
//     const mailOptions = {
//       from: `"RouteFlow Team" <${process.env.GOOGLE_SMTP_USER}>`,
//       to: email,
//       subject: `${otp} is your RouteFlow verification code`,
//       text: `Hello,\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis code is valid for a limited time. Please do not share it with anyone.\n\nRegards,\nRouteFlow Team`,
//       html: `
//         <p>Hello,</p>
//         <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
//         <p>This OTP is valid for a limited time. Please do not share it with anyone.</p>
//         <p>Regards,<br>RouteFlow Team</p>
//       `,
//     };

//     // Send email asynchronously to prevent blocking the HTTP response and causing a timeout
//     transporter.sendMail(mailOptions)
//       .then(() => {
//         console.log(`OTP email sent successfully to ${email}`);
//       })
//       .catch((err) => {
//         console.error(`Failed to send OTP email to ${email}:`, err.message);
//       });

//     res.status(200).json({
//       message: 'OTP email sent successfully.'
//     });
//   } catch (error) {
//     console.error('Error sending OTP email:', error);
//     res.status(500).json({ message: 'Failed to send OTP email.' });
//   }
// };

// @desc    Send OTP email
// @route   POST /auth/send-otp
// @access  Public
// const sendOtpEmail = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({
//       message: 'Email is required.',
//     });
//   }

//   if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
//     console.error('Brevo email environment variables are missing.');

//     return res.status(500).json({
//       message: 'Server email configuration error.',
//     });
//   }

//   let otpStored = false;

//   try {
//     const otp = generateOTP();
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     // Hash OTP before saving
//     const salt = await bcrypt.genSalt(10);
//     const hashedOtp = await bcrypt.hash(otp, salt);

//     // Remove expired OTPs and previous OTPs for this email
//     await runQuery(
//       'DELETE FROM otps WHERE expires_at < NOW() OR email = $1',
//       [email]
//     );

//     // Save new hashed OTP
//     await runQuery(
//       `INSERT INTO otps (
//         email,
//         otp_code,
//         expires_at,
//         is_used
//       )
//       VALUES ($1, $2, $3, FALSE)`,
//       [email, hashedOtp, expiresAt]
//     );

//     otpStored = true;

//     const emailResponse = await fetch(
//       'https://api.brevo.com/v3/smtp/email',
//       {
//         method: 'POST',
//         headers: {
//           accept: 'application/json',
//           'content-type': 'application/json',
//           'api-key': process.env.BREVO_API_KEY,
//         },
//         body: JSON.stringify({
//           sender: {
//             name: 'RouteFlow Team',
//             email: process.env.EMAIL_FROM,
//           },
//           to: [
//             {
//               email,
//             },
//           ],
//           subject: `${otp} is your RouteFlow verification code`,
//           textContent: `Hello,

// Your RouteFlow verification code is: ${otp}

// This code is valid for 5 minutes. Please do not share it with anyone.

// Regards,
// RouteFlow Team`,
//           htmlContent: `
//             <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
//               <h2 style="margin-bottom: 8px;">RouteFlow verification</h2>

//               <p>Hello,</p>

//               <p>Your verification code is:</p>

//               <div
//                 style="
//                   font-size: 32px;
//                   font-weight: 700;
//                   letter-spacing: 8px;
//                   margin: 24px 0;
//                 "
//               >
//                 ${otp}
//               </div>

//               <p>This code is valid for 5 minutes.</p>

//               <p>Please do not share this code with anyone.</p>

//               <p>
//                 Regards,<br />
//                 RouteFlow Team
//               </p>
//             </div>
//           `,
//         }),
//       }
//     );

//     const responseText = await emailResponse.text();

//     if (!emailResponse.ok) {
//       throw new Error(
//         `Brevo email failed with status ${emailResponse.status}: ${responseText}`
//       );
//     }

//     let emailResult = {};

//     if (responseText) {
//       try {
//         emailResult = JSON.parse(responseText);
//       } catch {
//         emailResult = { response: responseText };
//       }
//     }

//     console.log(`OTP email sent successfully to ${email}`, emailResult);

//     return res.status(200).json({
//       message: 'OTP email sent successfully.',
//       expiresIn: 300,
//     });
//   } catch (error) {
//     console.error('Error sending OTP email:', {
//       message: error.message,
//       stack: error.stack,
//     });

//     // Delete OTP if email sending failed
//     if (otpStored) {
//       try {
//         await runQuery('DELETE FROM otps WHERE email = $1', [email]);
//       } catch (cleanupError) {
//         console.error('Failed to remove unsent OTP:', cleanupError);
//       }
//     }

//     return res.status(500).json({
//       message: 'Failed to send verification email. Please try again.',
//     });
//   }
// };


// @desc    Send OTP email
// @route   POST /auth/send-otp
// @access  Public
const sendOtpEmail = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      message: 'Email is required.',
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      message: 'Please enter a valid email address.',
    });
  }

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN ||
    !process.env.GOOGLE_SENDER_EMAIL
  ) {
    console.error('Gmail API environment variables are missing.');

    return res.status(500).json({
      message: 'Server email configuration error.',
    });
  }

  let otpSaved = false;

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Delete expired OTPs and any previous OTP for this email.
    await runQuery(
      `
        DELETE FROM otps
        WHERE expires_at < NOW()
        OR email = $1
      `,
      [email]
    );

    // Store the new hashed OTP.
    await runQuery(
      `
        INSERT INTO otps (
          email,
          otp_code,
          expires_at,
          is_used
        )
        VALUES ($1, $2, $3, FALSE)
      `,
      [email, hashedOtp, expiresAt]
    );

    otpSaved = true;

    const emailResult = await sendEmailWithGmailApi({
      to: email,
      subject: `${otp} is your RouteFloww verification code`,
      text: `Hello,

Your RouteFloww verification code is: ${otp}

This code is valid for 5 minutes.

Please do not share this verification code with anyone.

Regards,
RouteFloww Team`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:#f5f5f7;">
            <div
              style="
                max-width:520px;
                margin:30px auto;
                padding:32px;
                background:#ffffff;
                border-radius:12px;
                font-family:Arial,Helvetica,sans-serif;
                color:#1f2937;
              "
            >
              <h2 style="margin-top:0;">
                Verify your RouteFloww account
              </h2>

              <p>Hello,</p>

              <p>Use the verification code below to continue:</p>

              <div
                style="
                  margin:24px 0;
                  padding:16px;
                  background:#f3f0ff;
                  border-radius:10px;
                  text-align:center;
                  font-size:32px;
                  font-weight:600;
                  letter-spacing:8px;
                "
              >
                ${otp}
              </div>

              <p>This code will expire in 5 minutes.</p>

              <p>
                Please do not share this verification code with anyone.
              </p>

              <p style="margin-bottom:0;">
                Regards,<br />
                RouteFloww Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    return res.status(200).json({
      message: 'OTP email sent successfully.',
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Gmail OTP sending failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      response: error.response?.data,
    });

    // Remove the OTP if the email could not be sent.
    if (otpSaved) {
      try {
        await runQuery(
          'DELETE FROM otps WHERE email = $1',
          [email]
        );
      } catch (cleanupError) {
        console.error(
          'Failed to remove unsent OTP:',
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      message: 'Failed to send verification code. Please try again.',
    });
  }
};


// @desc    Verify OTP
// @route   POST /auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const email = normalizeIdentifier(req.body.email);
  const otp = String(req.body.otp || '').trim();

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  if (!JWT_ACCESS_SECRET) {
    return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
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

    const verificationToken = jwt.sign(
      { email, purpose: 'signup_email' },
      JWT_ACCESS_SECRET,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      message: 'OTP verified successfully.',
      verificationToken,
    });
  } catch (error) {
    console.error('Database error during OTP verification:', error);
    return res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

// @desc    Admin: Delete any user by email or user_id
// @route   DELETE /users/admin/delete-user
// @access  Public / Protected
const adminDeleteUser = async (req, res) => {
  const targetEmail = req.query?.email || req.body?.email;
  const targetId = req.query?.user_id || req.body?.user_id;

  if (!targetEmail && !targetId) {
    return res.status(400).json({ message: 'Provide email or user_id in query params or body.' });
  }

  try {
    let result;
    if (targetEmail) {
      const cleanEmail = targetEmail.trim().toLowerCase();
      // 1. Delete associated driver entries in drivers table
      await runQuery('DELETE FROM drivers WHERE LOWER(email) = $1', [cleanEmail]);
      // 2. Delete user account from users table
      result = await runQuery(
        'DELETE FROM users WHERE LOWER(email) = $1 RETURNING user_id, name, email, role',
        [cleanEmail]
      );
    } else {
      // Get user's email if possible
      const uRes = await runQuery('SELECT email FROM users WHERE user_id = $1', [targetId]);
      if (uRes.rows.length > 0 && uRes.rows[0].email) {
        await runQuery('DELETE FROM drivers WHERE LOWER(email) = LOWER($1)', [uRes.rows[0].email]);
      }
      await runQuery('DELETE FROM drivers WHERE user_id = $1', [targetId]);
      result = await runQuery(
        'DELETE FROM users WHERE user_id = $1 RETURNING user_id, name, email, role',
        [targetId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User and driver profile deleted successfully',
      deletedUser: result.rows[0],
    });
  } catch (error) {
    console.error('Admin Delete User Error:', error);
    return res.status(500).json({ message: 'Server error while deleting user', error: error.message });
  }
};

// @desc    Admin: Change any user role
// @route   PUT /users/admin/change-role
// @access  Public / Protected
const adminChangeUserRole = async (req, res) => {
  const { email, user_id, role } = req.body;
  const targetRole = String(role || '').toUpperCase().trim();

  const VALID_ROLES = ['INDEPENDENT_DRIVER', 'FLEET_DRIVER', 'BUSINESS_OWNER'];
  if (!targetRole || !VALID_ROLES.includes(targetRole)) {
    return res.status(400).json({
      message: `Invalid role. Allowed values: ${VALID_ROLES.join(', ')}`,
    });
  }

  const targetEmail = email || req.query?.email;
  const targetId = user_id || req.query?.user_id;

  if (!targetEmail && !targetId) {
    return res.status(400).json({ message: 'Provide email or user_id' });
  }

  try {
    let result;
    if (targetEmail) {
      result = await runQuery(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2 RETURNING user_id, name, email, role',
        [targetRole, targetEmail]
      );
    } else {
      result = await runQuery(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, name, email, role',
        [targetRole, targetId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User role updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Admin Change User Role Error:', error);
    return res.status(500).json({ message: 'Server error while updating user role', error: error.message });
  }
};

module.exports = {
  signup,
  identify,
  login,
  refresh,
  checkHealth,
  sendOtpEmail,
  verifyOtp,
  adminDeleteUser,
  adminChangeUserRole,
};
