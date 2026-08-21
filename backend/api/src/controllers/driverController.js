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
        SELECT *
        FROM drivers
        WHERE user_id = $1
          AND is_active = true
        ORDER BY created_at DESC
      `,
      [user_id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch All Drivers Error:', error);
    return res.status(500).json({ message: 'Server error while fetching drivers' });
  }
};

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

  try {
    await ensureDriverSchemaExists();
    const result = await runQuery(
      `
        INSERT INTO drivers (user_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [user_id, name.trim(), phone?.trim() || null, email?.trim() || null]
    );

    return res.status(201).json({
      message: 'Driver created successfully',
      ...result.rows[0],
    });
  } catch (error) {
    console.error('Create Driver Error:', error);
    return res.status(500).json({ message: 'Server error during driver creation' });
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
