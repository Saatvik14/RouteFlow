const { runQuery } = require('../config/db');
const { sendEmailWithGmailApi } = require('../utils/emailSender');

const formatDateTime = (value) => {
  if (!value) return 'Flexible';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Flexible';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Sends push notification chunks to the official Expo Push Notification API.
 */
const sendExpoPushNotifications = async (messages) => {
  if (!messages || messages.length === 0) return;

  // Expo push service accepts arrays of up to 100 tickets
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[fleetNotificationService] Expo Push API responded with status ${response.status}:`, errorText);
      } else {
        const result = await response.json();
        console.log(`[fleetNotificationService] Dispatched ${chunk.length} Expo push notifications. Result:`, result?.data?.length || 0, 'tickets.');
      }
    } catch (pushErr) {
      console.error('[fleetNotificationService] Failed sending Expo push notifications:', pushErr?.message || pushErr);
    }
  }
};

/**
 * Notifies all active fleet drivers in the organization about a new route in the fleet pool.
 * Creates in-app notification records, dispatches Expo push notifications, and sends email notifications.
 */
const notifyFleetDriversOfNewPoolRoute = async ({ organizationId, route, creatorUser }) => {
  if (!organizationId || !route) return;

  try {
    // 1. Fetch organization details and all active drivers (both from drivers table and organization_memberships)
    const [orgResult, driversResult] = await Promise.all([
      runQuery(`SELECT name FROM organizations WHERE organization_id = $1`, [organizationId]),
      runQuery(
        `SELECT DISTINCT
           COALESCE(u.user_id, d.account_user_id) AS user_id,
           COALESCE(u.name, d.name, 'Fleet Driver') AS name,
           COALESCE(u.email, d.email) AS email
         FROM drivers d
         LEFT JOIN users u ON (u.user_id = d.account_user_id OR (d.email IS NOT NULL AND LOWER(u.email) = LOWER(d.email)))
         WHERE d.organization_id = $1
           AND d.is_active = TRUE
           AND d.removed_at IS NULL
         UNION
         SELECT DISTINCT
           u.user_id,
           u.name,
           u.email
         FROM organization_memberships om
         JOIN users u ON u.user_id = om.user_id
         WHERE om.organization_id = $1
           AND om.role = 'driver'
           AND om.status = 'active'`,
        [organizationId]
      ),
    ]);

    const organizationName = orgResult.rows[0]?.name || 'Your fleet organization';
    const drivers = driversResult.rows;

    console.log(`[fleetNotificationService] Found ${drivers.length} active fleet drivers for org ${organizationId}:`, drivers.map(d => ({ id: d.user_id, email: d.email })));

    if (!drivers || drivers.length === 0) {
      console.log(`[fleetNotificationService] No active fleet drivers found for org ${organizationId}`);
      return;
    }

    const routeName = route.name || `Route #${route.route_id}`;
    const startAddress = route.start_full_address || 'Start location';
    const endAddress = route.end_full_address || 'End location';
    const plannedStart = formatDateTime(route.start_datetime);
    const deadline = formatDateTime(route.opt_in_deadline);

    const title = `New Route in Fleet Pool: ${routeName}`;
    const message = `${organizationName} posted "${routeName}" to the driver pool. Opt in by ${deadline} to drive this route.`;

    const notificationData = JSON.stringify({
      routeId: route.route_id,
      routeName: route.name,
      startAddress,
      endAddress,
      plannedStart: route.start_datetime,
      plannedEnd: route.end_datetime,
      optInDeadline: route.opt_in_deadline,
      organizationName,
    });

    // 2. Batch insert in-app notifications for drivers with user_id
    const insertValues = [];
    const params = [organizationId, title, message, 'fleet_pool_route', notificationData];

    drivers.forEach((driver) => {
      if (driver.user_id) {
        params.push(driver.user_id);
        const userParamIdx = params.length;
        insertValues.push(`($${userParamIdx}, $1, $2, $3, $4, $5::jsonb, FALSE, NOW())`);
      }
    });

    if (insertValues.length > 0) {
      const query = `
        INSERT INTO in_app_notifications (
          user_id, organization_id, title, message, type, data, is_read, created_at
        )
        VALUES ${insertValues.join(', ')}
      `;
      await runQuery(query, params);
      console.log(`[fleetNotificationService] Created ${insertValues.length} in-app notifications for org ${organizationId}`);
    }

    // 3. Dispatch Expo Push Notifications to all active drivers with registered devices
    const driverUserIds = drivers.map((d) => d.user_id).filter(Boolean);
    if (driverUserIds.length > 0) {
      const pushTokensResult = await runQuery(
        `SELECT push_token FROM user_push_tokens WHERE user_id = ANY($1::int[])`,
        [driverUserIds]
      );

      if (pushTokensResult.rows.length > 0) {
        const pushMessages = pushTokensResult.rows
          .map((r) => r.push_token)
          .filter((token) => token && typeof token === 'string' && (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')))
          .map((token) => ({
            to: token,
            sound: 'default',
            title: `New Route in Fleet Pool: ${routeName}`,
            body: `${organizationName} posted "${routeName}". Opt in before ${deadline}!`,
            data: {
              routeId: route.route_id,
              type: 'fleet_pool_route',
              screen: 'marketplace',
            },
            channelId: 'fleet-routes',
            priority: 'high',
          }));

        if (pushMessages.length > 0) {
          sendExpoPushNotifications(pushMessages).catch((pushErr) => {
            console.error('[fleetNotificationService] Background push notification error:', pushErr);
          });
        }
      }
    }

    // 4. Dispatch Email notifications asynchronously to drivers with email
    const emailDrivers = drivers.filter((d) => d.email && d.email.includes('@'));
    for (const driver of emailDrivers) {
      const firstName = driver.name ? driver.name.split(' ')[0] : 'Driver';
      const emailSubject = `New Route Available in Fleet Pool: ${routeName}`;
      const emailText = `Hello ${firstName},\n\n`
        + `A new route has been posted to the Fleet Driver Pool by ${organizationName}:\n\n`
        + `Route: ${routeName}\n`
        + `Start Time: ${plannedStart}\n`
        + `Start Location: ${startAddress}\n`
        + `End Location: ${endAddress}\n`
        + `Opt-In Deadline: ${deadline}\n\n`
        + `Log in to RouteFlow to mark your availability (Opt In) or decline.\n\n`
        + `Best regards,\n${organizationName} Dispatch`;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0;">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 10px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; border-radius: 999px; letter-spacing: 0.5px; text-transform: uppercase;">Fleet Route Pool</span>
          </div>
          <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">New Route Available to Drive</h2>
          <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">Hello ${firstName}, <strong>${organizationName}</strong> has posted a new route to the internal driver pool.</p>
          
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
            <div style="font-size: 16px; font-weight: 700; color: #1E293B; margin-bottom: 12px;">${routeName}</div>
            <div style="font-size: 13px; color: #475569; margin-bottom: 6px;"><strong>Departure:</strong> ${plannedStart}</div>
            <div style="font-size: 13px; color: #475569; margin-bottom: 6px;"><strong>From:</strong> ${startAddress}</div>
            <div style="font-size: 13px; color: #475569; margin-bottom: 10px;"><strong>To:</strong> ${endAddress}</div>
            <div style="padding-top: 10px; border-top: 1px dashed #CBD5E1; color: #DC2626; font-size: 13px; font-weight: 600;">
              ⏰ Opt-in Deadline: ${deadline}
            </div>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="https://routefloww.com/marketplace" style="display: inline-block; background: #2563EB; color: #FFFFFF; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
              Open App & Opt In
            </a>
          </div>

          <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">
            Respond before the deadline to be considered by your dispatcher.
          </p>
        </div>
      `;

      sendEmailWithGmailApi({
        to: driver.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      }).catch((emailErr) => {
        console.error(`[fleetNotificationService] Failed sending email to ${driver.email}:`, emailErr?.message || emailErr);
      });
    }
  } catch (err) {
    console.error('[fleetNotificationService] Error notifying fleet drivers:', err);
  }
};

module.exports = {
  notifyFleetDriversOfNewPoolRoute,
};
