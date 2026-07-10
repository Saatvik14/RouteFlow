const { getAndroidPublisherClient } = require("../config/googlePlay");

const ENTITLED_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  // A cancelled subscription remains usable until its paid expiry time.
  "SUBSCRIPTION_STATE_CANCELED",
]);

function requirePackageName() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;

  if (!packageName) {
    throw new Error("GOOGLE_PLAY_PACKAGE_NAME is not configured.");
  }

  return packageName;
}

async function getGoogleSubscription({ purchaseToken, expectedProductId }) {
  const androidPublisher = getAndroidPublisherClient();
  const packageName = requirePackageName();

  const { data } = await androidPublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const lineItem = data.lineItems?.find(
    (item) => item.productId === expectedProductId,
  );

  if (!lineItem) {
    const error = new Error(
      "The Google Play purchase does not match the selected product.",
    );
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = lineItem.expiryTime
    ? new Date(lineItem.expiryTime)
    : null;
  const hasNotExpired = Boolean(
    expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt > new Date(),
  );
  const active =
    ENTITLED_STATES.has(data.subscriptionState) && hasNotExpired;

  return {
    active,
    packageName,
    productId: lineItem.productId,
    purchaseToken,
    status: data.subscriptionState || "SUBSCRIPTION_STATE_UNSPECIFIED",
    acknowledgementState:
      data.acknowledgementState || "ACKNOWLEDGEMENT_STATE_UNSPECIFIED",
    needsAcknowledgement:
      data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
    autoRenew: Boolean(lineItem.autoRenewingPlan?.autoRenewEnabled),
    startedAt: data.startTime ? new Date(data.startTime) : null,
    expiresAt,
    latestOrderId:
      lineItem.latestSuccessfulOrderId || data.latestOrderId || null,
    rawData: data,
  };
}

async function acknowledgeGoogleSubscription({ productId, purchaseToken }) {
  const androidPublisher = getAndroidPublisherClient();
  const packageName = requirePackageName();

  await androidPublisher.purchases.subscriptions.acknowledge({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
    requestBody: {},
  });
}

module.exports = {
  getGoogleSubscription,
  acknowledgeGoogleSubscription,
};
