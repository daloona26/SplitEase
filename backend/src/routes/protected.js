// backend/src/routes/protected.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const checkSubscription = require("../middleware/checkSubscription");

// A route that requires both authentication and an active subscription
router.get(
  "/premium-content",
  authenticateToken,
  checkSubscription,
  (req, res) => {
    // If we reach here, the user is authenticated AND subscribed
    res
      .status(200)
      .json({
        message: "Welcome to the premium content, subscribed user!",
        userId: req.user.id,
      });
  }
);

// A route that only requires authentication (no subscription needed)
router.get("/user-profile", authenticateToken, (req, res) => {
  res
    .status(200)
    .json({ message: `User profile for ${req.user.name}`, user: req.user });
});

module.exports = router;
