// backend/src/routes/auth.js
// Defines API routes for user authentication (signup, login, get current user, profile update)

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Added for generating reset tokens
const { query } = require("../db"); // Import database helper
const authenticateToken = require("../middleware/auth"); // Import auth middleware
const { sendEmail } = require("../utils/email"); // Import the email utility

const router = express.Router();

// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// --- Signup Route ---
// POST /api/auth/signup
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

    // Calculate trial end date: 7 days from now for initial signup trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Insert new user with trial status
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
        trialEndsAt: user.trial_ends_at, // Send as ISO string
      },
      process.env.JWT_SECRET, // IMPORTANT: Ensure this is correctly loaded from .env
      { expiresIn: "72h" } // Changed from '1h' to '72h' (3 days)
    );

    // --- Email: Send Welcome Email on Signup ---
    const welcomeSubject = "Welcome to SplitEase!";
    const welcomeText = `Hello ${user.name},\n\nWelcome to SplitEase! We're excited to have you on board. Your 7-day free trial has started.\n\nStart splitting expenses easily today!\n\nThe SplitEase Team`;
    const welcomeHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>Welcome to SplitEase! We're excited to have you on board. Your 7-day free trial has started.</p>
      <p>Start splitting expenses easily today!</p>
      <p>The SplitEase Team</p>
    `;
    sendEmail(user.email, welcomeSubject, welcomeText, welcomeHtml);
    // --- End Email ---

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at, // Send as ISO string
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// --- Login Route ---
// POST /api/auth/login
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

    // Generate new JWT with the latest user data including trial status
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at, // Send as ISO string
      },
      process.env.JWT_SECRET, // IMPORTANT: Ensure this is correctly loaded from .env
      { expiresIn: "72h" } // Changed from '1h' to '72h' (3 days)
    );

    // --- Email: Send Login Notification (Optional) ---
    // Uncommented to enable sending email on login
    const loginSubject = "Successful Login to SplitEase";
    const loginText = `Hello ${user.name},\n\nThis is a notification that your SplitEase account was just accessed.\n\nIf this was not you, please change your password immediately.\n\nThe SplitEase Team`;
    const loginHtml = `
      <p>Hello <strong>${user.name}</strong>,</p>
      <p>This is a notification that your SplitEase account was just accessed.</p>
      <p>If this was not you, please change your password immediately.</p>
      <p>The SplitEase Team</p>
    `;
    sendEmail(user.email, loginSubject, loginText, loginHtml);
    // --- End Email ---

    res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at, // Send as ISO string
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- Get Current User (authenticated) ---
// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  const userId = req.user.id; // req.user is set by authenticateToken middleware

  try {
    const userResult = await query(
      "SELECT id, name, email, is_subscribed, is_trial_active, trial_ends_at FROM users WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate a NEW JWT with the latest user data (important for refresh)
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        isSubscribed: user.is_subscribed,
        isTrialActive: user.is_trial_active,
        trialEndsAt: user.trial_ends_at,
      },
      process.env.JWT_SECRET, // IMPORTANT: Ensure this is correctly loaded from .env
      { expiresIn: "72h" } // Changed from '1h' to '72h' (3 days)
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
      token: newToken, // Send the new token back
    });
  } catch (error) {
    console.error("Error fetching user data for /me route:", error);
    res.status(500).json({ message: "Server error while fetching user data." });
  }
});

// --- Start Free Trial Route ---
// POST /api/auth/start-trial
router.post("/start-trial", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get user ID from authenticated token

  try {
    const userResult = await query(
      "SELECT is_subscribed, is_trial_active FROM users WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Prevent starting a trial if already subscribed or on an active trial
    if (user.is_subscribed || user.is_trial_active) {
      return res
        .status(409)
        .json({ message: "You are already subscribed or on an active trial." });
    }

    // Calculate trial end date: 3 days from now
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    // Update user to activate trial
    await query(
      "UPDATE users SET is_trial_active = TRUE, trial_ends_at = $1 WHERE id = $2",
      [trialEndsAt.toISOString(), userId]
    );

    // Fetch updated user data to return in the response
    const updatedUserResult = await query(
      "SELECT id, name, email, is_subscribed, is_trial_active, trial_ends_at FROM users WHERE id = $1",
      [userId]
    );
    const updatedUser = updatedUserResult.rows[0];

    // Generate a new JWT with updated trial status
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
      { expiresIn: "72h" } // Changed from '1h' to '72h' (3 days)
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
// PUT /api/auth/profile
router.put("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    // Check if the new email already exists for another user
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

    // Generate a new JWT with the updated user data
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
      { expiresIn: "72h" } // Changed from '1h' to '72h' (3 days)
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

// --- New Endpoint: Forgot Password (Request Reset Link) ---
// POST /api/auth/forgot-password
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
      // For security, always return a generic success message even if email not found
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate a unique token
    const resetToken = crypto.randomBytes(32).toString("hex");
    // Set token expiry (e.g., 1 hour from now)
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, resetExpires.toISOString(), user.id]
    );

    // Create the reset URL for the frontend
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // --- Email: Send Password Reset Link ---
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

// --- New Endpoint: Reset Password (with Token) ---
// POST /api/auth/reset-password
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

    // Check if token has expired
    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({
        message: "Password reset token has expired. Please request a new one.",
      });
    }

    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token fields
    await query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    // --- Email: Send Password Changed Notification ---
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
    );
    // --- End Email ---

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

module.exports = router;
