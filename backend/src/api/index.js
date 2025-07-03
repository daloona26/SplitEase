// backend/src/api/index.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
// const { query, connectDB } = require("../db"); // <--- REMOVED connectDB from destructuring
const { query } = require("../db"); // <--- CORRECTED: Only import query

// --- IMPORTANT: Load environment variables based on environment ---
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
// --- End dotenv config ---

const authRoutes = require("../routes/auth");
const groupRoutes = require("../routes/groups");
const expensesRoutes = require("../routes/expenses");
const paypalRoutes = require("../routes/paypal");
const activityRoutes = require("../routes/activity");

const app = express();

// --- Database Connection ---
// The database connection is likely established as a side-effect when '../db' is required.
// No explicit connectDB() call is needed here if it's handled in ../db.js.
// If your ../db.js file exports a function named connectDB that *must* be called,
// then you need to ensure that function is correctly exported and called.
// Based on the error "connectDB is not a function", it's likely not exported this way,
// or it's a module that connects on import.
// We'll remove the explicit call here.
// connectDB(); // <--- REMOVED THIS LINE
// --- End Database Connection ---

// --- CORS Configuration ---
const frontendUrl = process.env.FRONTEND_URL;

const corsOptions = {
  origin: frontendUrl,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// --- End CORS Configuration ---

// --- Middleware for PayPal webhooks (MUST be before general JSON parser) ---
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));

// --- General JSON body parser middleware ---
app.use(express.json());

// API Routes (mounted relative to this app's base path, which Vercel treats as /api/)
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expensesRoutes);
app.use("/paypal", paypalRoutes);
app.use("/activity", activityRoutes);

// Basic route for the root of this API to confirm backend is running
app.get("/", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});

// Basic route to check /api/ path on Vercel
app.get("/api", (req, res) => {
  res
    .status(200)
    .json({ message: "SplitEase Backend API is running at /api!" });
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// --- Export the Express app for Vercel Serverless Functions ---
module.exports = app;

// --- Local Development Server (only runs if not deployed on Vercel/production) ---
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}
