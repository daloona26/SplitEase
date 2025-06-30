// backend/src/middleware/checkSubscription.js
// Middleware to check user's subscription or active trial status

const { query } = require("../db");

const checkSubscription = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    // Fetch the latest subscription and trial status directly from the database
    const userResult = await query(
      "SELECT is_subscribed, is_trial_active, trial_ends_at FROM users WHERE id = $1",
      [req.user.id]
    );

    const userFromDb = userResult.rows[0];

    if (!userFromDb) {
      console.warn(
        `SUBSCRIPTION CHECK: User ID ${req.user.id} not found in DB during subscription check.`
      );
      return res.status(404).json({ message: "User not found." });
    }

    const { is_subscribed, is_trial_active, trial_ends_at } = userFromDb;

    // Determine if trial is still active
    const isTrialStillActive =
      is_trial_active && trial_ends_at && new Date(trial_ends_at) > new Date();

    console.log(
      `SUBSCRIPTION CHECK: User ID ${
        req.user.id
      } - is_subscribed: ${is_subscribed}, is_trial_active: ${is_trial_active}, trial_ends_at: ${
        trial_ends_at ? new Date(trial_ends_at).toISOString() : "N/A"
      }, isTrialStillActive: ${isTrialStillActive}`
    );

    if (!is_subscribed && !isTrialStillActive) {
      // If NOT subscribed AND NOT on an active trial, deny access
      console.log(
        `SUBSCRIPTION CHECK: User ID ${req.user.id} is NOT subscribed and trial is NOT active. Blocking.`
      );
      return res
        .status(403)
        .json({
          message:
            "Subscription or active trial required to access this feature.",
        });
    }

    // If subscribed OR on an active trial, proceed
    console.log(
      `SUBSCRIPTION CHECK: User ID ${req.user.id} IS subscribed or trial is active. Proceeding.`
    );
    next();
  } catch (error) {
    console.error("Subscription check middleware error:", error);
    res
      .status(500)
      .json({ message: "Server error during subscription check." });
  }
};

module.exports = checkSubscription;
