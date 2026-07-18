// const SUBSCRIPTION_PLANS = Object.freeze({
//   routeflow_lite_monthly: {
//     code: "lite",
//     dailyRouteLimit: 10,
//   },
//   routeflow_standard_monthly: {
//     code: "standard",
//     dailyRouteLimit: null,
//   },
// });

function getPlanByProductId(productId) {
  return SUBSCRIPTION_PLANS[productId] || null;
}

const SUBSCRIPTION_PLANS = Object.freeze([
  Object.freeze({
    code: "lite",
    productId: "routeflow_lite_monthly",
    basePlanId: "monthly",
    name: "Lite",
    description: "Essential route planning for occasional drivers.",
    fallbackPrice: "£9.99",
    billingPeriod: "/month",
    routeLabel: "Up to 10 routes per day",
    limits: Object.freeze({
      dailyRoutes: 10,
    }),
    capabilities: Object.freeze({
      cameraAddressScanner: false,
      voiceAddressSearch: false,
      routeManifestImport: false,
      copyPastRouteStops: false,
      reorderOptimisedStops: false,
      advancedStopPreferences: false,
    }),
    badgeLabel: null,
    popular: false,
    sortOrder: 1,
    iconLibrary: "feather",
    iconName: "navigation",
    features: Object.freeze([
      "Plan and optimise up to 10 routes with upto 15 stops every day",
      "Add delivery stops using address search or the map",
      "Navigate to every stop with turn-by-turn directions",
      "Save package counts, notes and delivery details",
      "Track delivered and failed stops",
      "View your route history",
    ]),
  }),
  Object.freeze({
    code: "standard",
    productId: "routeflow_standard_monthly",
    basePlanId: "monthly",
    name: "Standard",
    description: "Unlimited planning and faster tools for daily drivers.",
    fallbackPrice: "£14.99",
    billingPeriod: "/month",
    routeLabel: "Unlimited routes every day",
    limits: Object.freeze({
      dailyRoutes: null,
    }),
    capabilities: Object.freeze({
      cameraAddressScanner: true,
      voiceAddressSearch: true,
      routeManifestImport: true,
      copyPastRouteStops: true,
      reorderOptimisedStops: true,
      advancedStopPreferences: true,
    }),
    badgeLabel: "BEST FOR DAILY DRIVERS",
    popular: true,
    sortOrder: 2,
    iconLibrary: "material-community",
    iconName: "crown-outline",
    features: Object.freeze([
      "Everything included in Lite",
      "Plan and optimise unlimited routes every day",
      "Scan printed addresses using your camera",
      "Add stops hands-free using voice search",
      "Scan or import an entire delivery manifest",
      "Copy stops from previous routes in a few taps",
      "Reorder stops after route optimisation",
      "Set stop timing and visit-order preferences",
    ]),
  }),
]);


module.exports = {
  SUBSCRIPTION_PLANS,
  getPlanByProductId,
};
