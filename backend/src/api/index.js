// backend/src/api/index.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query, connectDB } = require("../db"); // Ensure connectDB is imported correctly

// --- IMPORTANT: Load environment variables based on environment ---
// In development, load from .env.local or .env
// In production (Vercel), Vercel injects them directly, so dotenv.config() is not needed.
// However, including dotenv.config() conditionally or without a specific path is safer
// if you might run it in other non-Vercel production environments.
// For Vercel, the variables are available directly in process.env
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config(); // Loads from .env or .env.local by default
}
// --- End dotenv config ---

const authRoutes = require("../routes/auth");
const groupRoutes = require("../routes/groups");
const expensesRoutes = require("../routes/expenses");
const paypalRoutes = require("../routes/paypal");
const activityRoutes = require("../routes/activity");

const app = express();

// Connect to the database
// Ensure connectDB is a function that establishes the connection
// and handles its own errors/logging.
connectDB();

// --- CORS Configuration ---
const frontendUrl = process.env.FRONTEND_URL;

const corsOptions = {
  origin: frontendUrl, // Dynamically set the allowed origin from Vercel env
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], // Include all necessary methods
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// --- End CORS Configuration ---

// --- Middleware for PayPal webhooks (MUST be before general JSON parser) ---
// This middleware will only apply to requests matching exactly /paypal/webhook
// Vercel routes /api/paypal/webhook to /paypal/webhook within this app's context
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));

// --- General JSON body parser middleware ---
// This should come after raw body parser for webhooks
app.use(express.json());

// API Routes (mounted relative to this app's base path, which Vercel treats as /api/)
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expensesRoutes);
app.use("/paypal", paypalRoutes);
app.use("/activity", activityRoutes);

// Basic route for the root of this API to confirm backend is running
// This will be accessible at https://your-backend-url.vercel.app/
app.get("/", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});

// Basic route to check /api/ path on Vercel
// This will be accessible at https://your-backend-url.vercel.app/api
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
// Vercel automatically calls app.listen() internally.
module.exports = app;

// --- Local Development Server (only runs if not deployed on Vercel/production) ---
// This block ensures app.listen() is only called when running locally.
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}
