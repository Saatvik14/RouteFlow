const { runQuery } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { positiveInteger } = require('../utils/validation');

/**
 * List recent in-app notifications for the authenticated user and get unread count.
 */
const listNotifications = async (req, res) => {
  const userId = req.user.user_id;

  const [notificationsRes, unreadRes] = await Promise.all([
    runQuery(
      `SELECT notification_id, user_id, organization_id, title, message, type, data, is_read, read_at, created_at
       FROM in_app_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    ),
    runQuery(
      `SELECT COUNT(*)::integer AS unread_count
       FROM in_app_notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    ),
  ]);

  return res.json({
    success: true,
    unreadCount: unreadRes.rows[0]?.unread_count || 0,
    notifications: notificationsRes.rows.map((row) => ({
      notificationId: Number(row.notification_id),
      title: row.title,
      message: row.message,
      type: row.type,
      data: row.data || {},
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    })),
  });
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (req, res) => {
  const userId = req.user.user_id;
  const notificationId = positiveInteger(req.params.id, 'notificationId');

  const result = await runQuery(
    `UPDATE in_app_notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE notification_id = $1 AND user_id = $2
     RETURNING notification_id, is_read, read_at`,
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  }

  return res.json({
    success: true,
    message: 'Notification marked as read.',
    notification: result.rows[0],
  });
};

/**
 * Mark all notifications as read for the user.
 */
const markAllAsRead = async (req, res) => {
  const userId = req.user.user_id;

  await runQuery(
    `UPDATE in_app_notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return res.json({
    success: true,
    message: 'All notifications marked as read.',
  });
};

/**
 * Register or update an Expo Push Token for the authenticated user.
 */
const registerPushToken = async (req, res) => {
  const userId = req.user.user_id;
  const { pushToken, platform, deviceId } = req.body || {};

  if (!pushToken || typeof pushToken !== 'string' || !pushToken.trim()) {
    throw new HttpError(400, 'INVALID_PUSH_TOKEN', 'A valid pushToken string is required.');
  }

  const cleanToken = pushToken.trim();

  // Ensure table exists defensively
  await runQuery(
    `CREATE TABLE IF NOT EXISTS user_push_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      push_token TEXT NOT NULL,
      platform VARCHAR(32) DEFAULT 'mobile',
      device_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_user_push_token UNIQUE (user_id, push_token)
    )`
  ).catch(() => {});

  await runQuery(
    `INSERT INTO user_push_tokens (user_id, push_token, platform, device_id, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, push_token)
     DO UPDATE SET platform = EXCLUDED.platform, device_id = EXCLUDED.device_id, updated_at = NOW()`,
    [userId, cleanToken, String(platform || 'mobile').slice(0, 32), deviceId || null]
  );

  console.log(`[PushToken] Successfully registered push token for user_id=${userId} (platform=${platform || 'mobile'})`);

  return res.json({
    success: true,
    message: 'Push token registered successfully.',
  });
};

/**
 * Remove an Expo Push Token on logout or device reset.
 */
const unregisterPushToken = async (req, res) => {
  const userId = req.user.user_id;
  const { pushToken } = req.body || {};

  if (!pushToken || typeof pushToken !== 'string') {
    throw new HttpError(400, 'INVALID_PUSH_TOKEN', 'pushToken is required.');
  }

  await runQuery(
    `DELETE FROM user_push_tokens WHERE user_id = $1 AND push_token = $2`,
    [userId, pushToken.trim()]
  );

  return res.json({
    success: true,
    message: 'Push token removed successfully.',
  });
};

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  registerPushToken,
  unregisterPushToken,
};
