const { runQuery } = require('../config/db');

/**
 * Helper to ensure the drivers table and driver_id column in routes table exist.
 */
const ensureDriverSchemaExists = async () => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS drivers (
        driver_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_driver_user FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    await runQuery(`
      ALTER TABLE routes ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(driver_id) ON DELETE SET NULL;
    `);
  } catch (err) {
    console.error('Error ensuring driver schema exists:', err);
  }
};

// Call once on module load
ensureDriverSchemaExists();

// @desc    Fetch all drivers for logged-in user
// @route   GET /driver/fetch-all
// @access  Private
const fetchAllDrivers = async (req, res) => {
  const user_id = req.user?.user_id;
  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    await ensureDriverSchemaExists();
    const result = await runQuery(
      `
        SELECT d.*
        FROM drivers d
        LEFT JOIN users u ON LOWER(d.email) = LOWER(u.email)
        WHERE d.user_id = $1
          AND d.is_active = true
          AND (d.email IS NULL OR u.user_id IS NOT NULL)
        ORDER BY d.created_at DESC
      `,
      [user_id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch All Drivers Error:', error);
    return res.status(500).json({ message: 'Server error while fetching drivers' });
  }
};

const bcrypt = require('bcryptjs');

// @desc    Create new driver
// @route   POST /driver/create
// @access  Private
const createDriver = async (req, res) => {
  const user_id = req.user?.user_id;
  const { name, phone, email } = req.body;

  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Driver name is required.' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Driver email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone?.trim() || '';

  try {
    await ensureDriverSchemaExists();

    // 1. Check if a user account already exists for this email
    let driverUserId = null;
    let tempPassword = null;
    const existingUserRes = await runQuery('SELECT user_id, role FROM users WHERE email = $1', [cleanEmail]);

    if (existingUserRes.rows.length > 0) {
      driverUserId = existingUserRes.rows[0].user_id;
    } else {
      // 2. Automatically create a user account for the driver with role FLEET_DRIVER
      const tempPhone = cleanPhone || `driver_${Date.now()}`;
      tempPassword = 'Driver@' + Math.floor(1000 + Math.random() * 9000);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      const createUserRes = await runQuery(
        `
          INSERT INTO users (name, phone_no, email, password, role, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING user_id
        `,
        [cleanName, tempPhone, cleanEmail, hashedPassword, 'FLEET_DRIVER', 'active']
      );

      if (createUserRes.rows.length > 0) {
        driverUserId = createUserRes.rows[0].user_id;

        // Initialize user config for the fleet driver
        await runQuery(
          `INSERT INTO config_model (user_id, subscription_type)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO NOTHING`,
          [driverUserId, 'trial']
        );

        // Send welcome email with login credentials to the driver
        try {
          const { sendEmailWithGmailApi } = require('../utils/emailSender');
          const ownerName = req.user?.name || 'Your Business Owner';
          await sendEmailWithGmailApi({
            to: cleanEmail,
            subject: 'Welcome to RouteFloww - Your Fleet Driver Account',
            text: `Hi ${cleanName},\n\n${ownerName} has added you as a Fleet Driver on RouteFloww.\n\nYour Login Credentials:\nEmail: ${cleanEmail}\nTemporary Password: ${tempPassword}\n\nPlease download the RouteFloww app and log in to view your assigned routes.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
                <h2 style="color: #4F46E5;">Welcome to RouteFloww!</h2>
                <p>Hi <strong>${cleanName}</strong>,</p>
                <p><strong>${ownerName}</strong> has added you as a Fleet Driver on RouteFloww.</p>
                <div style="background-color: #F1F5F9; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Email:</strong> ${cleanEmail}</p>
                  <p style="margin: 4px 0;"><strong>Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
                </div>
                <p>You can now log into the RouteFloww app to view your assigned routes and start navigation.</p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('Failed sending welcome email to fleet driver:', emailErr);
        }
      }
    }

    // 3. Create the driver record linked to the business owner user_id
    const result = await runQuery(
      `
        INSERT INTO drivers (user_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [user_id, cleanName, cleanPhone || null, cleanEmail]
    );

    return res.status(201).json({
      message: 'Driver and Fleet Driver account created successfully',
      ...result.rows[0],
      driver_user_id: driverUserId,
      temp_password: tempPassword,
    });
  } catch (error) {
    console.error('Create Driver Error:', error);
    return res.status(500).json({ message: 'Server error during driver creation', error: error.message });
  }
};

// @desc    Edit driver
// @route   PUT /driver/edit
// @access  Private
const editDriver = async (req, res) => {
  const user_id = req.user?.user_id;
  const { driver_id, name, phone, email, is_active } = req.body;

  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  if (!driver_id) {
    return res.status(400).json({ message: 'Driver ID is required.' });
  }

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIdx = 1;

    const addField = (col, val) => {
      if (val !== undefined) {
        updateFields.push(`${col} = $${paramIdx++}`);
        updateValues.push(val);
      }
    };

    addField('name', name?.trim());
    addField('phone', phone?.trim());
    addField('email', email?.trim());
    addField('is_active', is_active);

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(driver_id, user_id);

    const query = `
      UPDATE drivers
      SET ${updateFields.join(', ')}
      WHERE driver_id = $${paramIdx++} AND user_id = $${paramIdx}
      RETURNING *
    `;

    const result = await runQuery(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found or unauthorized' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Edit Driver Error:', error);
    return res.status(500).json({ message: 'Server error while updating driver' });
  }
};

// @desc    Deactivate driver
// @route   DELETE /driver/delete
// @access  Private
const deleteDriver = async (req, res) => {
  const user_id = req.user?.user_id;
  const { driver_id } = req.query;

  if (!user_id) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  if (!driver_id) {
    return res.status(400).json({ message: 'Driver ID is required in query params.' });
  }

  try {
    const result = await runQuery(
      `
        UPDATE drivers
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $1 AND user_id = $2
        RETURNING *
      `,
      [driver_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete Driver Error:', error);
    return res.status(500).json({ message: 'Server error while deleting driver' });
  }
};

module.exports = {
  fetchAllDrivers,
  createDriver,
  editDriver,
  deleteDriver,
};
