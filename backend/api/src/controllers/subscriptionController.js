const { runQuery } = require("../config/db");
const { getPlanByProductId, SUBSCRIPTION_PLANS } = require("./../constants/subscription");
const { sendEmailWithGmailApi } = require("../utils/emailSender");
const {
  acknowledgeGoogleSubscription,
  getGoogleSubscription,
} = require("./../services/googlePlaySubscriptionServices");

function getAuthenticatedUserId(req) {
  const userId = req.user?.user_id || req.user?.id;

  if (!userId) {
    const error = new Error("Authenticated user was not found.");
    error.statusCode = 401;
    throw error;
  }

  return String(userId);
}

function toPublicSubscription(row) {
  if (!row) {
    return null;
  }

  return {
    planCode: row.plan_code,
    productId: row.product_id,
    provider: row.provider,
    status: row.status,
    autoRenew: row.auto_renew,
    expiresAt: row.expires_at,
  };
}

async function ensureTokenBelongsToUser({ userId, provider, purchaseToken }) {
  const result = await runQuery(
    `
      SELECT user_id
      FROM user_subscriptions
      WHERE provider = $1 AND purchase_token = $2
      LIMIT 1
    `,
    [provider, purchaseToken],
  );

  const existing = result.rows[0];

  if (existing && String(existing.user_id) !== userId) {
    const error = new Error(
      "This store purchase is already linked to another account.",
    );
    error.statusCode = 409;
    throw error;
  }
}

async function saveVerifiedSubscription({ userId, plan, verification }) {
  const result = await runQuery(
    `
      INSERT INTO user_subscriptions (
        user_id,
        provider,
        plan_code,
        product_id,
        purchase_token,
        order_id,
        status,
        is_active,
        auto_renew,
        started_at,
        expires_at,
        acknowledged,
        last_verified_at,
        raw_data,
        updated_at
      )
      VALUES (
        $1, 'google_play', $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, NOW(), $12::jsonb, NOW()
      )
      ON CONFLICT (provider, purchase_token)
      DO UPDATE SET
        plan_code = EXCLUDED.plan_code,
        product_id = EXCLUDED.product_id,
        order_id = EXCLUDED.order_id,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        auto_renew = EXCLUDED.auto_renew,
        started_at = EXCLUDED.started_at,
        expires_at = EXCLUDED.expires_at,
        acknowledged = EXCLUDED.acknowledged,
        last_verified_at = NOW(),
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      plan.code,
      verification.productId,
      verification.purchaseToken,
      verification.latestOrderId,
      verification.status,
      verification.active,
      verification.autoRenew,
      verification.startedAt,
      verification.expiresAt,
      verification.acknowledgementState ===
        "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
      JSON.stringify(verification.rawData),
    ],
  );

  const newType = verification.active ? plan.code : 'trial';

  await runQuery(
    `
      INSERT INTO config_model (user_id, subscription_type, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        subscription_type = EXCLUDED.subscription_type,
        updated_at = NOW()
    `,
    [userId, newType]
  );

  return result.rows[0];
}

async function markAcknowledged(purchaseToken) {
  await runQuery(
    `
      UPDATE user_subscriptions
      SET acknowledged = TRUE, updated_at = NOW()
      WHERE provider = 'google_play' AND purchase_token = $1
    `,
    [purchaseToken],
  );
}

async function verifyPurchase(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const { platform, productId, purchaseToken } = req.body || {};

    if (platform !== "android") {
      return res.status(400).json({
        message: "This endpoint currently supports Google Play purchases only.",
      });
    }

    if (!productId || !purchaseToken) {
      return res.status(400).json({
        message: "productId and purchaseToken are required.",
      });
    }

    const plan = getPlanByProductId(productId);

    if (!plan) {
      return res.status(400).json({
        message: "Unknown subscription product.",
      });
    }

    await ensureTokenBelongsToUser({
      userId,
      provider: "google_play",
      purchaseToken,
    });

    const verification = await getGoogleSubscription({
      purchaseToken,
      expectedProductId: productId,
    });

    const savedSubscription = await saveVerifiedSubscription({
      userId,
      plan,
      verification,
    });

    if (verification.active && verification.needsAcknowledgement) {
      await acknowledgeGoogleSubscription({
        productId,
        purchaseToken,
      });
      await markAcknowledged(purchaseToken);
      savedSubscription.acknowledged = true;
    }

    return res.status(200).json({
      active: verification.active,
      message: verification.active
        ? "Subscription verified successfully."
        : "The subscription is not active.",
      subscription: toPublicSubscription(savedSubscription),
    });
  } catch (error) {
    console.error("verifyPurchase error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to verify subscription.",
    });
  }
}

async function getMySubscription(req, res) {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await runQuery(
      `
        SELECT *
        FROM user_subscriptions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [userId],
    );

    let subscription = result.rows[0];

    if (!subscription) {
      return res.status(200).json({
        active: false,
        subscription: null,
      });
    }

    // Recheck Google whenever the app loads this endpoint so cancellations,
    // payment failures and expirations are reflected without trusting the app.
    if (subscription.provider === "google_play") {
      try {
        const plan = getPlanByProductId(subscription.product_id);
        const verification = await getGoogleSubscription({
          purchaseToken: subscription.purchase_token,
          expectedProductId: subscription.product_id,
        });

        subscription = await saveVerifiedSubscription({
          userId,
          plan,
          verification,
        });
      } catch (syncError) {
        // A temporary Google API outage should not immediately remove access.
        console.error("Subscription refresh failed:", syncError);
      }
    }

    const active = Boolean(
      subscription.is_active &&
        subscription.expires_at &&
        new Date(subscription.expires_at) > new Date(),
    );

    return res.status(200).json({
      active,
      subscription: active ? toPublicSubscription(subscription) : null,
    });
  } catch (error) {
    console.error("getMySubscription error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load subscription.",
    });
  }
}

const getSubscriptionPlans = (_req, res) => {
  res.set("Cache-Control", "no-store");

  return res.status(200).json({
    success: true,
    data: {
      plans: SUBSCRIPTION_PLANS,
    },
  });
};

const requestEnterprisePlan = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    
    const userRes = await runQuery(
      'SELECT user_id, name, email, phone_no, role FROM users WHERE user_id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userRes.rows[0];
    const recipientEmail = process.env.GOOGLE_SENDER_EMAIL || 'support@routefloww.com';

    const subject = `[Enterprise Plan Inquiry] Request from ${user.name}`;
    const text = `Business Owner Request:\nName: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone_no || 'N/A'}\nUser ID: ${user.user_id}\n\nThis user wants to purchase the Enterprise Plan.`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
        <h2 style="color: #4F46E5;">Enterprise Plan Purchase Request</h2>
        <p>A Business Owner has requested to upgrade to the Enterprise Plan.</p>
        <table style="width: 100%; max-width: 500px; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${user.name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${user.email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${user.phone_no || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">User ID:</td><td style="padding: 8px;">${user.user_id}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Role:</td><td style="padding: 8px;">${user.role}</td></tr>
        </table>
      </div>
    `;

    try {
      await sendEmailWithGmailApi({
        to: recipientEmail,
        subject,
        text,
        html,
      });
    } catch (emailErr) {
      console.error('Failed sending Enterprise Plan email notification:', emailErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Enterprise plan request sent to support team. We will contact you shortly.',
    });
  } catch (error) {
    console.error('requestEnterprisePlan error:', error);
    return res.status(500).json({ message: error.message || 'Server error processing request.' });
  }
};

module.exports = {
  verifyPurchase,
  getMySubscription,
  getSubscriptionPlans,
  requestEnterprisePlan,
};
