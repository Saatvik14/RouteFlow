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
 * Notifies all active fleet drivers in the organization about a new route in the fleet pool.
 * Creates both in-app notification records and dispatches email notifications.
 */
const notifyFleetDriversOfNewPoolRoute = async ({ organizationId, route, creatorUser }) => {
  if (!organizationId || !route) return;

  try {
    // 1. Fetch organization details and all active drivers
    const [orgResult, driversResult] = await Promise.all([
      runQuery(`SELECT name FROM organizations WHERE organization_id = $1`, [organizationId]),
      runQuery(
        `SELECT u.user_id, u.name, u.email
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

    // 2. Batch insert in-app notifications for all active drivers
    const insertValues = [];
    const params = [organizationId, title, message, 'fleet_pool_route', notificationData];

    drivers.forEach((driver, idx) => {
      params.push(driver.user_id);
      const userParamIdx = params.length;
      insertValues.push(`($${userParamIdx}, $1, $2, $3, $4, $5::jsonb, FALSE, NOW())`);
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

    // 3. Dispatch Email notifications asynchronously to drivers with email
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
