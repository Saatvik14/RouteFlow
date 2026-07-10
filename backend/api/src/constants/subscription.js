const SUBSCRIPTION_PLANS = Object.freeze({
  routeflow_lite_monthly: {
    code: "lite",
    dailyRouteLimit: 10,
  },
  routeflow_standard_monthly: {
    code: "standard",
    dailyRouteLimit: null,
  },
});

function getPlanByProductId(productId) {
  return SUBSCRIPTION_PLANS[productId] || null;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlanByProductId,
};
