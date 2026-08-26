const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { runQuery, withTransaction } = require('../config/db');
const { APP_BASE_URL, INVITATION_EXPIRES_HOURS } = require('../config/env');
const { sendEmailWithGmailApi } = require('../utils/emailSender');
const { invitationEmail } = require('../utils/emailTemplates');
const { HttpError } = require('../utils/httpError');
const { normalizeEmail, positiveInteger, requireString } = require('../utils/validation');
const { generateAccessToken, generateRefreshToken } = require('../services/tokenService');

// Fleet drivers are provisioned directly by the business so they receive an
// access code. Invitations remain for password-based business team accounts.
const INVITABLE_ROLES = new Set(['admin', 'dispatcher', 'viewer']);

const createSecret = () => crypto.randomBytes(32).toString('base64url');
const hashSecret = (secret) => crypto.createHash('sha256').update(secret).digest('hex');
const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  if (!domain) return '';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
};

const invitationStatusAt = (invitation, now = Date.now()) => {
  if (
    invitation.status === 'pending' &&
    new Date(invitation.expires_at).getTime() <= Number(now)
  ) return 'expired';
  return invitation.status;
};

const publicInvitation = (row) => ({
  invitationId: Number(row.invitation_id),
  inviteeName: row.name,
  maskedEmail: maskEmail(row.email),
  organizationName: row.organization_name,
  role: row.role,
  status: row.status,
  expiresAt: row.expires_at,
  existingUser: Boolean(row.existing_user_id),
});

const internalInvitation = (row) => ({
  invitationId: Number(row.invitation_id),
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  expiresAt: row.expires_at,
  acceptedAt: row.accepted_at,
  revokedAt: row.revoked_at,
  resentAt: row.resent_at,
  emailDeliveryStatus: row.email_delivery_status,
  createdAt: row.created_at,
});

const getExpiryHours = () => {
  const configured = Number(INVITATION_EXPIRES_HOURS);
  return Number.isFinite(configured) && configured >= 1 && configured <= 168
    ? configured
    : 48;
};

const parseToken = (rawToken) => {
  const token = String(rawToken || '').trim();
  if (token.length < 32 || token.length > 160) {
    throw new HttpError(404, 'INVITATION_INVALID', 'This invitation link is invalid.');
  }
  return token;
};

const selectInvitationByToken = async (queryable, rawToken, { lock = false } = {}) => {
  const token = parseToken(rawToken);
  const result = await queryable.query(
    `
      SELECT
        i.*,
        o.name AS organization_name,
        u.user_id AS existing_user_id
      FROM driver_invitations i
      JOIN organizations o ON o.organization_id = i.organization_id
      LEFT JOIN users u ON LOWER(u.email) = LOWER(i.email)
      WHERE i.token_hash = $1
      LIMIT 1
      ${lock ? 'FOR UPDATE OF i' : ''}
    `,
    [hashSecret(token)]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'INVITATION_INVALID', 'This invitation link is invalid.');
  }

  let invitation = result.rows[0];
  if (invitationStatusAt(invitation) === 'expired' && invitation.status === 'pending') {
    const expired = await queryable.query(
      `UPDATE driver_invitations
       SET status = 'expired', updated_at = NOW()
       WHERE invitation_id = $1
       RETURNING *`,
      [invitation.invitation_id]
    );
    invitation = { ...invitation, ...expired.rows[0], status: 'expired' };
  }

  return invitation;
};

const assertPendingInvitation = (invitation) => {
  if (invitation.status === 'expired') {
    throw new HttpError(410, 'INVITATION_EXPIRED', 'This invitation has expired. Ask the business to resend it.');
  }
  if (invitation.status !== 'pending') {
    const message = invitation.status === 'accepted'
      ? 'This invitation has already been accepted.'
      : 'This invitation is no longer active.';
    throw new HttpError(409, `INVITATION_${String(invitation.status).toUpperCase()}`, message);
  }
};

const createInvitationRecord = async ({ client, organizationId, invitedByUserId, email, name, role, resentFromId }) => {
  const token = createSecret();
  const expiresHours = getExpiryHours();
  const result = await client.query(
    `
      INSERT INTO driver_invitations (
        organization_id, invited_by_user_id, email, name, role,
        token_hash, expires_at, resent_from_invitation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' hours')::interval, $8)
      RETURNING *
    `,
    [organizationId, invitedByUserId, email, name, role, hashSecret(token), String(expiresHours), resentFromId || null]
  );
  return { invitation: result.rows[0], token, expiresHours };
};

const sendInvitation = async ({ invitation, token, organizationName, inviterName, expiresHours }) => {
  const acceptanceUrl = `${String(APP_BASE_URL).replace(/\/$/, '')}/invite?token=${encodeURIComponent(token)}`;
  const message = invitationEmail({
    inviteeName: invitation.name,
    organizationName,
    inviterName,
    acceptanceUrl,
    expiresHours,
  });

  try {
    await sendEmailWithGmailApi({ to: invitation.email, ...message });
    await runQuery(
      `UPDATE driver_invitations
       SET email_delivery_status = 'sent', email_last_attempt_at = NOW()
       WHERE invitation_id = $1`,
      [invitation.invitation_id]
    );
    return true;
  } catch (error) {
    console.error('Invitation email delivery failed', {
      invitationId: invitation.invitation_id,
      code: error.code,
    });
    await runQuery(
      `UPDATE driver_invitations
       SET email_delivery_status = 'failed', email_last_attempt_at = NOW()
       WHERE invitation_id = $1`,
      [invitation.invitation_id]
    );
    return false;
  }
};

const previewInvitation = async (req, res) => {
  const invitation = await selectInvitationByToken(
    { query: runQuery },
    req.params.token
  );
  return res.json({ success: true, invitation: publicInvitation(invitation) });
};

const listInvitations = async (req, res) => {
  await runQuery(
    `UPDATE driver_invitations
     SET status = 'expired', updated_at = NOW()
     WHERE organization_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
    [req.organization.id]
  );
  const result = await runQuery(
    `SELECT * FROM driver_invitations
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT 250`,
    [req.organization.id]
  );
  return res.json({ success: true, invitations: result.rows.map(internalInvitation) });
};

const createInvitation = async (req, res) => {
  const name = requireString(req.body.name, 'Name', { min: 2, max: 160 });
  const email = normalizeEmail(req.body.email);
  const role = String(req.body.role || 'driver').trim().toLowerCase();

  if (!INVITABLE_ROLES.has(role)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Select a valid team role.', { field: 'role' });
  }
  if (req.membership.role === 'dispatcher' && role !== 'viewer') {
    throw new HttpError(403, 'PERMISSION_DENIED', 'Dispatchers can invite view-only users.');
  }

  let created;
  try {
    created = await withTransaction(async (client) => {
      await client.query(
        `UPDATE driver_invitations SET status = 'expired', updated_at = NOW()
         WHERE organization_id = $1 AND status = 'pending' AND expires_at <= NOW()`,
        [req.organization.id]
      );

      const activeMember = await client.query(
        `SELECT om.membership_id
         FROM organization_memberships om
         JOIN users u ON u.user_id = om.user_id
         WHERE om.organization_id = $1 AND LOWER(u.email) = LOWER($2) AND om.status = 'active'
         LIMIT 1`,
        [req.organization.id, email]
      );
      if (activeMember.rows.length > 0) {
        throw new HttpError(409, 'ALREADY_A_MEMBER', 'This person is already an active team member.');
      }

      const pending = await client.query(
        `SELECT invitation_id FROM driver_invitations
         WHERE organization_id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending'
         LIMIT 1`,
        [req.organization.id, email]
      );
      if (pending.rows.length > 0) {
        throw new HttpError(409, 'INVITATION_ALREADY_PENDING', 'An active invitation already exists for this email.');
      }

      return createInvitationRecord({
        client,
        organizationId: req.organization.id,
        invitedByUserId: req.user.user_id,
        email,
        name,
        role,
      });
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'INVITATION_ALREADY_PENDING', 'An active invitation already exists for this email.');
    }
    throw error;
  }

  const delivered = await sendInvitation({
    ...created,
    organizationName: req.organization.name,
    inviterName: req.user.name,
  });

  return res.status(delivered ? 201 : 202).json({
    success: true,
    invitation: internalInvitation({
      ...created.invitation,
      email_delivery_status: delivered ? 'sent' : 'failed',
    }),
    message: delivered
      ? 'Invitation sent.'
      : 'The invitation was saved, but email delivery failed. You can resend it.',
  });
};

const resendInvitation = async (req, res) => {
  const invitationId = positiveInteger(req.params.invitationId, 'invitationId');
  const created = await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT * FROM driver_invitations
       WHERE invitation_id = $1 AND organization_id = $2
       FOR UPDATE`,
      [invitationId, req.organization.id]
    );
    if (result.rows.length === 0) throw new HttpError(404, 'INVITATION_NOT_FOUND', 'Invitation not found.');
    const original = result.rows[0];
    if (!['pending', 'expired'].includes(original.status)) {
      throw new HttpError(409, 'INVITATION_NOT_RESENDABLE', 'Only pending or expired invitations can be resent.');
    }
    await client.query(
      `UPDATE driver_invitations
       SET status = 'resent', resent_at = NOW(), updated_at = NOW()
       WHERE invitation_id = $1`,
      [invitationId]
    );
    return createInvitationRecord({
      client,
      organizationId: req.organization.id,
      invitedByUserId: req.user.user_id,
      email: original.email,
      name: original.name,
      role: original.role,
      resentFromId: invitationId,
    });
  });

  const delivered = await sendInvitation({
    ...created,
    organizationName: req.organization.name,
    inviterName: req.user.name,
  });
  return res.status(delivered ? 200 : 202).json({
    success: true,
    invitation: internalInvitation({
      ...created.invitation,
      email_delivery_status: delivered ? 'sent' : 'failed',
    }),
    message: delivered ? 'A new invitation link was sent.' : 'A new invitation was saved, but email delivery failed.',
  });
};

const revokeInvitation = async (req, res) => {
  const invitationId = positiveInteger(req.params.invitationId, 'invitationId');
  const result = await runQuery(
    `UPDATE driver_invitations
     SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
     WHERE invitation_id = $1 AND organization_id = $2 AND status = 'pending'
     RETURNING *`,
    [invitationId, req.organization.id]
  );
  if (result.rows.length === 0) {
    throw new HttpError(409, 'INVITATION_NOT_REVOCABLE', 'The invitation is not pending or does not exist.');
  }
  return res.json({ success: true, invitation: internalInvitation(result.rows[0]), message: 'Invitation revoked.' });
};

const attachAcceptedMember = async (client, invitation, user) => {
  const membershipResult = await client.query(
    `INSERT INTO organization_memberships (organization_id, user_id, role, status, joined_at)
     VALUES ($1, $2, $3, 'active', NOW())
     ON CONFLICT (organization_id, user_id) DO UPDATE
     SET role = EXCLUDED.role, status = 'active', joined_at = NOW(),
         deactivated_at = NULL, removed_at = NULL, updated_at = NOW()
     RETURNING *`,
    [invitation.organization_id, user.user_id, invitation.role]
  );
  const membership = membershipResult.rows[0];

  if (invitation.role === 'driver') {
    const existingDriver = await client.query(
      `SELECT driver_id FROM drivers
       WHERE organization_id = $1
         AND (account_user_id = $2 OR LOWER(email) = LOWER($3))
         AND removed_at IS NULL
       ORDER BY driver_id ASC
       LIMIT 1
       FOR UPDATE`,
      [invitation.organization_id, user.user_id, invitation.email]
    );

    if (existingDriver.rows.length > 0) {
      await client.query(
        `UPDATE drivers
         SET account_user_id = $1, membership_id = $2, name = $3, email = $4,
             is_active = TRUE, deactivated_at = NULL, updated_at = NOW()
         WHERE driver_id = $5`,
        [user.user_id, membership.membership_id, invitation.name, invitation.email, existingDriver.rows[0].driver_id]
      );
    } else {
      const organizationResult = await client.query(
        'SELECT legacy_owner_user_id FROM organizations WHERE organization_id = $1',
        [invitation.organization_id]
      );
      await client.query(
        `INSERT INTO drivers (
          user_id, organization_id, account_user_id, membership_id,
          name, phone, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [
          organizationResult.rows[0]?.legacy_owner_user_id || invitation.invited_by_user_id,
          invitation.organization_id,
          user.user_id,
          membership.membership_id,
          invitation.name,
          user.phone_no || null,
          invitation.email,
        ]
      );
    }

    if (!['BUSINESS_OWNER', 'PLATFORM_ADMIN'].includes(String(user.role || '').toUpperCase())) {
      await client.query(
        `UPDATE users SET role = 'FLEET_DRIVER', updated_at = NOW() WHERE user_id = $1`,
        [user.user_id]
      );
      user.role = 'FLEET_DRIVER';
    }
  } else if (String(user.role || '').toUpperCase() !== 'PLATFORM_ADMIN') {
    // Business team roles use the dispatcher/business application. Detailed
    // permissions continue to come from the organization membership.
    await client.query(
      `UPDATE users SET role = 'BUSINESS_OWNER', updated_at = NOW() WHERE user_id = $1`,
      [user.user_id]
    );
    user.role = 'BUSINESS_OWNER';
  }

  await client.query(
    `UPDATE driver_invitations
     SET status = 'accepted', accepted_at = NOW(), accepted_by_user_id = $1, updated_at = NOW()
     WHERE invitation_id = $2`,
    [user.user_id, invitation.invitation_id]
  );

  return membership;
};

const acceptExistingInvitation = async (req, res) => {
  const result = await withTransaction(async (client) => {
    const invitation = await selectInvitationByToken(client, req.params.token, { lock: true });
    assertPendingInvitation(invitation);
    if (!req.user.email || String(req.user.email).toLowerCase() !== String(invitation.email).toLowerCase()) {
      throw new HttpError(403, 'INVITATION_EMAIL_MISMATCH', 'Sign in with the email address that received this invitation.');
    }
    const user = { ...req.user };
    const membership = await attachAcceptedMember(client, invitation, user);
    return { invitation, membership, user };
  });

  return res.json({
    success: true,
    accessToken: generateAccessToken(result.user),
    refreshToken: generateRefreshToken(result.user.user_id),
    organization: { id: Number(result.invitation.organization_id), name: result.invitation.organization_name },
    membership: { id: Number(result.membership.membership_id), role: result.membership.role },
    message: `You joined ${result.invitation.organization_name}.`,
  });
};

const acceptNewInvitation = async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Use at least 8 characters with a letter and a number.', { field: 'password' });
  }
  const phone = req.body.phone ? requireString(req.body.phone, 'Phone', { min: 5, max: 50 }) : null;
  const passwordHash = await bcrypt.hash(password, 12);

  const accepted = await withTransaction(async (client) => {
    const invitation = await selectInvitationByToken(client, req.params.token, { lock: true });
    assertPendingInvitation(invitation);
    if (invitation.existing_user_id) {
      throw new HttpError(409, 'EXISTING_ACCOUNT_REQUIRES_LOGIN', 'An account already exists for this email. Sign in to accept the invitation.');
    }

    const phoneNumber = phone || `invite_${crypto.randomBytes(12).toString('hex')}`;
    let inserted;
    try {
      inserted = await client.query(
        `INSERT INTO users (name, phone_no, email, password, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING user_id, name, phone_no, email, role, status, created_at`,
        [invitation.name, phoneNumber, invitation.email, passwordHash, invitation.role === 'driver' ? 'FLEET_DRIVER' : 'BUSINESS_OWNER']
      );
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already exists. Sign in to accept this invitation.');
      }
      throw error;
    }
    const user = inserted.rows[0];
    await client.query(
      `INSERT INTO config_model (user_id, subscription_type)
       VALUES ($1, 'trial') ON CONFLICT (user_id) DO NOTHING`,
      [user.user_id]
    );
    const membership = await attachAcceptedMember(client, invitation, user);
    return { invitation, membership, user };
  });

  return res.status(201).json({
    success: true,
    accessToken: generateAccessToken(accepted.user),
    refreshToken: generateRefreshToken(accepted.user.user_id),
    organization: { id: Number(accepted.invitation.organization_id), name: accepted.invitation.organization_name },
    membership: { id: Number(accepted.membership.membership_id), role: accepted.membership.role },
    message: `Your account is ready. You joined ${accepted.invitation.organization_name}.`,
  });
};

module.exports = {
  acceptExistingInvitation,
  acceptNewInvitation,
  createInvitation,
  createSecret,
  hashSecret,
  invitationStatusAt,
  listInvitations,
  maskEmail,
  previewInvitation,
  resendInvitation,
  revokeInvitation,
};
