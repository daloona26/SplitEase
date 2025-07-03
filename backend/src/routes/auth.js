const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");
const { sendEmail } = require("../utils/email");

const router = express.Router();

// Add CORS headers to all auth routes
router.use((req, res, next) => {
  const origin = req.get("Origin");
  const allowedOrigin =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://splitease-pearl.vercel.app"
      : "http://localhost:5173";

  if (origin === allowedOrigin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-HTTP-Method-Override"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// --- Signup Route ---
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const userExists = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await hashPassword(password);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const newUserResult = await query(
      "INSERT INTO users (name, email, password_hash, is_subscribed, is_trial_active, trial_ends_at) VALUES ($1, $2, $3, FALSE, TRUE, $4) RETURNING id, name, email, is_subscribed, is_trial_active, trial_ends_at",
      [name, email, passwordHash, trialEndsAt]
    );

    const user = newUserResult.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: "72h" }
    );

    // Send welcome email
    const welcomeSubject = "Welcome to SplitEase!";
    const welcomeText = `Hello ${user.name},\n\nWelcome to SplitEase! We're excited to have you on board. Your 7-day free trial has started.\n\nStart splitting expenses easily today!\n\nThe SplitEase Team`;
    const welcomeHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Welcome to SplitEase! We're excited to have you on board. Your 7-day free trial has started.</p>
      <p>Start splitting expenses easily today!</p>
      <p>The SplitEase Team</p>
    `;

    sendEmail(user.email, welcomeSubject, welcomeText, welcomeHtml)
      .then((sent) => {
        if (sent) console.log(`Welcome email sent to ${user.email}`);
        else console.warn(`Failed to send welcome email to ${user.email}`);
      })
      .catch((err) =>
        console.error(`Error sending welcome email to ${user.email}:`, err)
      );

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// --- Login Route ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const userResult = await query(
      "SELECT id, name, email, password_hash, is_subscribed, is_trial_active, trial_ends_at FROM users WHERE email = $1",
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: "72h" }
    );

    // Send login notification
    const loginSubject = "Successful Login to SplitEase";
    const loginText = `Hello ${user.name},\n\nThis is a notification that your SplitEase account was just accessed.\n\nIf this was not you, please change your password immediately.\n\nThe SplitEase Team`;
    const loginHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>This is a notification that your SplitEase account was just accessed.</p>
      <p>If this was not you, please change your password immediately.</p>
      <p>The SplitEase Team</p>
    `;

    sendEmail(user.email, loginSubject, loginText, loginHtml)
      .then((sent) => {
        if (sent) console.log(`Login notification sent to ${user.email}`);
        else console.warn(`Failed to send login notification to ${user.email}`);
      })
      .catch((err) =>
        console.error(`Error sending login notification to ${user.email}:`, err)
      );

    res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- Get Current User (authenticated) ---
router.get("/me", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await query(
      "SELECT id, name, email, is_subscribed, is_trial_active, trial_ends_at FROM users WHERE id = $1",
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: "72h" }
    );

    res.status(200).json({
      message: "User data refreshed successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
      token: newToken,
    });
  } catch (error) {
    console.error("Error fetching user data for /me route:", error);
    res.status(500).json({ message: "Server error while fetching user data." });
  }
});

// --- Start Free Trial Route ---
router.post("/start-trial", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const userResult = await query(
      "SELECT is_subscribed, is_trial_active FROM users WHERE id = $1",
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.is_subscribed || user.is_trial_active) {
      return res
        .status(409)
        .json({ message: "You are already subscribed or on an active trial." });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    await query(
      "UPDATE users SET is_trial_active = TRUE, trial_ends_at = $1 WHERE id = $2",
      [trialEndsAt.toISOString(), userId]
    );

    const updatedUserResult = await query(
      "SELECT id, name, email, is_subscribed, is_trial_active, trial_ends_at FROM users WHERE id = $1",
      [userId]
    );

    const updatedUser = updatedUserResult.rows[0];

    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isSubscribed: updatedUser.is_subscribed,
        isTrialActive: updatedUser.is_trial_active,
        trialEndsAt: updatedUser.trial_ends_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: "72h" }
    );

    res.status(200).json({
      message: "Free trial activated successfully for 3 days!",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isSubscribed: updatedUser.is_subscribed,
        isTrialActive: updatedUser.is_trial_active,
        trialEndsAt: updatedUser.trial_ends_at,
      },
      token: newToken,
    });
  } catch (error) {
    console.error("Start trial error:", error);
    res.status(500).json({ message: "Server error during trial activation." });
  }
});

// --- Update User Profile Route ---
router.put("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    const emailExists = await query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, userId]
    );

    if (emailExists.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Email is already in use by another account." });
    }

    const updateResult = await query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, is_subscribed, is_trial_active, trial_ends_at",
      [name, email, userId]
    );

    const updatedUser = updateResult.rows[0];

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isSubscribed: updatedUser.is_subscribed,
        isTrialActive: updatedUser.is_trial_active,
        trialEndsAt: updatedUser.trial_ends_at,
      },
      process.env.JWT_SECRET,
      { expiresIn: "72h" }
    );

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        isSubscribed: updatedUser.is_subscribed,
        isTrialActive: updatedUser.is_trial_active,
        trialEndsAt: updatedUser.trial_ends_at,
      },
      token: newToken,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error during profile update." });
  }
});

// --- Forgot Password Route ---
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const userResult = await query(
      "SELECT id, name FROM users WHERE email = $1",
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, resetExpires.toISOString(), user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const resetSubject = "Password Reset Request for your SplitEase Account";
    const resetText = `Hello ${user.name},\n\nYou have requested to reset your password for your SplitEase account.\n\nPlease click on the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\nIf you did not request this, please ignore this email.\n\nThe SplitEase Team`;
    const resetHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>You have requested to reset your password for your SplitEase account.</p>
      <p>Please click on the following link to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>The SplitEase Team</p>
    `;

    const emailSent = await sendEmail(
      email,
      resetSubject,
      resetText,
      resetHtml
    );

    if (emailSent) {
      res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } else {
      console.error("Failed to send password reset email.");
      res.status(500).json({
        message: "Failed to send password reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "Server error during password reset request." });
  }
});

// --- Reset Password Route ---
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required." });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    const userResult = await query(
      "SELECT id, name, email, password_reset_expires FROM users WHERE password_reset_token = $1",
      [token]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token." });
    }

    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({
        message: "Password reset token has expired. Please request a new one.",
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    const notificationSubject = "Your SplitEase Password Has Been Changed";
    const notificationText = `Hello ${user.name},\n\nYour password for your SplitEase account has been successfully changed.\n\nIf you did not make this change, please contact support immediately.\n\nThe SplitEase Team`;
    const notificationHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Your password for your SplitEase account has been successfully changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
      <p>The SplitEase Team</p>
    `;

    sendEmail(
      user.email,
      notificationSubject,
      notificationText,
      notificationHtml
    )
      .then((sent) => {
        if (sent)
          console.log(`Password change notification sent to ${user.email}`);
        else
          console.warn(
            `Failed to send password change notification to ${user.email}`
          );
      })
      .catch((err) =>
        console.error(
          `Error sending password change notification to ${user.email}:`,
          err
        )
      );

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

module.exports = router;
