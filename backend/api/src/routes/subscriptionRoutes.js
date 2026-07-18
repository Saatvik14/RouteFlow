const express = require("express");
const {
  getMySubscription,
  verifyPurchase,
  getSubscriptionPlans
} = require("../controllers/subscriptionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/verify", protect, verifyPurchase);
router.get("/me", protect, getMySubscription);

router.get("/plans", getSubscriptionPlans);

module.exports = router;
