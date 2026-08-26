const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { withTransaction } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { EMAIL_PATTERN, requireString } = require('../utils/validation');

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateAccessCode = () => {
  const bytes = crypto.randomBytes(8);
  const characters = Array.from(bytes, (byte) => ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]);
  return `RF-${characters.slice(0, 4).join('')}-${characters.slice(4).join('')}`;
};

const normalizePhone = (value) => String(value || '').trim();

const provisionFleetDriver = async (req, res) => {
  const name = requireString(req.body.name, 'Name', { min: 2, max: 160 });
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = normalizePhone(req.body.phone);

  if (!email && !phone) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Enter an email address or phone number for the driver.');
  }
  if (email && (!EMAIL_PATTERN.test(email) || email.length > 320)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please enter a valid email address.', { field: 'email' });
  }
  if (phone && (phone.length < 5 || phone.length > 50)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Phone number must be between 5 and 50 characters.', { field: 'phone' });
  }

  const accessCode = generateAccessCode();
  const [accessCodeHash, placeholderPasswordHash] = await Promise.all([
    bcrypt.hash(accessCode.replace(/-/g, ''), 12),
    bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12),
  ]);

  let created;
  try {
    created = await withTransaction(async (client) => {
      const duplicate = await client.query(
        `SELECT user_id FROM users
         WHERE ($1::text <> '' AND LOWER(email) = LOWER($1))
            OR ($2::text <> '' AND phone_no = $2)
         LIMIT 1`,
        [email, phone]
      );
      if (duplicate.rows.length > 0) {
        throw new HttpError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already uses this email address or phone number.');
      }

      const phoneNumber = phone || `fleet_${crypto.randomBytes(12).toString('hex')}`;
      const userResult = await client.query(
        `INSERT INTO users (
          name, phone_no, email, password, role, status,
          fleet_access_code_hash, fleet_access_code_updated_at
        ) VALUES ($1, $2, $3, $4, 'FLEET_DRIVER', 'active', $5, NOW())
        RETURNING user_id, name, email, phone_no, role`,
        [name, phoneNumber, email || null, placeholderPasswordHash, accessCodeHash]
      );
      const user = userResult.rows[0];

      const membershipResult = await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status, joined_at)
         VALUES ($1, $2, 'driver', 'active', NOW())
         RETURNING membership_id`,
        [req.organization.id, user.user_id]
      );

      const driverResult = await client.query(
        `INSERT INTO drivers (
          user_id, organization_id, account_user_id, membership_id,
          name, phone, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING driver_id, name, phone, email`,
        [
          req.user.user_id,
          req.organization.id,
          user.user_id,
          membershipResult.rows[0].membership_id,
          name,
          phone || null,
          email || null,
        ]
      );

      return { user, driver: driverResult.rows[0] };
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already uses this email address or phone number.');
    }
    throw error;
  }

  return res.status(201).json({
    success: true,
    driver: {
      driverId: Number(created.driver.driver_id),
      name: created.driver.name,
      email: created.driver.email,
      phone: created.driver.phone,
    },
    accessCode,
    message: 'Fleet driver created. Share this private access code securely.',
  });
};

const resetFleetDriverAccessCode = async (req, res) => {
  const driverId = Number(req.params.driverId);
  if (!Number.isInteger(driverId) || driverId < 1) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'A valid driver ID is required.');
  }

  const accessCode = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(accessCode.replace(/-/g, ''), 12);

  const updated = await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT d.account_user_id, d.is_active, om.status AS membership_status
       FROM drivers d
       LEFT JOIN organization_memberships om ON om.membership_id = d.membership_id
       WHERE d.driver_id = $1 AND d.organization_id = $2 AND d.removed_at IS NULL
       FOR UPDATE OF d`,
      [driverId, req.organization.id]
    );
    const driver = result.rows[0];
    if (!driver) throw new HttpError(404, 'DRIVER_NOT_FOUND', 'Driver not found.');
    if (!driver.account_user_id) {
      throw new HttpError(409, 'DRIVER_ACCOUNT_MISSING', 'This driver does not have a sign-in account yet.');
    }
    if (!driver.is_active || driver.membership_status !== 'active') {
      throw new HttpError(409, 'DRIVER_INACTIVE', 'Activate this driver before resetting their access code.');
    }

    await client.query(
      `UPDATE users
       SET fleet_access_code_hash = $1,
           fleet_access_code_updated_at = NOW(),
           role = 'FLEET_DRIVER',
           updated_at = NOW()
       WHERE user_id = $2`,
      [accessCodeHash, driver.account_user_id]
    );
    return true;
  });

  return res.json({
    success: updated,
    accessCode,
    message: 'A new access code was created. The previous code no longer works.',
  });
};

module.exports = {
  generateAccessCode,
  provisionFleetDriver,
  resetFleetDriverAccessCode,
};
