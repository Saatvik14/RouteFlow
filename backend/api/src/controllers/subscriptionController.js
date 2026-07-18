const { runQuery } = require("../config/db");
const { getPlanByProductId, SUBSCRIPTION_PLANS } = require("./../constants/subscription");
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

module.exports = {
  verifyPurchase,
  getMySubscription,
  getSubscriptionPlans
};
