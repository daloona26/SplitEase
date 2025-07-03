// backend/src/api/index.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query } = require("../db"); // Ensure query is imported correctly

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

// --- CORS Configuration ---
let allowedOrigin;
if (process.env.NODE_ENV === "production") {
  // Log the actual value of FRONTEND_URL in production for debugging Vercel deployments
  console.log(
    `CORS: Production FRONTEND_URL env var: ${process.env.FRONTEND_URL}`
  );

  // Use the environment variable, but provide a direct fallback to your known frontend URL
  // if the environment variable is not set or empty.
  allowedOrigin =
    process.env.FRONTEND_URL || "https://splitease-pearl.vercel.app";

  if (!process.env.FRONTEND_URL) {
    console.warn(
      "CORS: WARNING! FRONTEND_URL environment variable was not found in production. Using hardcoded fallback: https://splitease-pearl.vercel.app"
    );
  }
} else {
  allowedOrigin = "http://localhost:5173"; // Allow Vite's default dev server port locally
}

console.log(`CORS: Final allowed origin configured: ${allowedOrigin}`); // DEBUG: Log final allowed origin

const corsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], // Include all necessary methods
  credentials: true,
  optionsSuccessStatus: 204, // For preflight requests
};

app.use(cors(corsOptions));
// --- End CORS Configuration ---

// --- Middleware for PayPal webhooks (MUST be before general JSON parser) ---
// This middleware will only apply to requests matching exactly /paypal/webhook
// Vercel routes /api/paypal/webhook to /paypal/webhook within this app's context
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" })); // <--- REMOVED /api prefix

// --- General JSON body parser middleware ---
// This should come after raw body parser for webhooks
app.use(express.json());

// API Routes (mounted relative to this app's base path, which Vercel treats as /api/)
// <--- REMOVED /api prefix from all these routes
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
  // <--- This route is now correct for /api
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
// backend/src/api/index.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query } = require("../db"); // Ensure query is imported correctly

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

// --- CORS Configuration ---
let allowedOrigin;
if (process.env.NODE_ENV === "production") {
  // Log the actual value of FRONTEND_URL in production for debugging Vercel deployments
  console.log(
    `CORS: Production FRONTEND_URL env var: ${process.env.FRONTEND_URL}`
  );

  // Use the environment variable, but provide a direct fallback to your known frontend URL
  // if the environment variable is not set or empty.
  allowedOrigin =
    process.env.FRONTEND_URL || "https://splitease-pearl.vercel.app";

  if (!process.env.FRONTEND_URL) {
    console.warn(
      "CORS: WARNING! FRONTEND_URL environment variable was not found in production. Using hardcoded fallback: https://splitease-pearl.vercel.app"
    );
  }
} else {
  allowedOrigin = "http://localhost:5173"; // Allow Vite's default dev server port locally
}

console.log(`CORS: Final allowed origin configured: ${allowedOrigin}`); // DEBUG: Log final allowed origin

const corsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], // Include all necessary methods
  credentials: true,
  optionsSuccessStatus: 204, // For preflight requests
};

app.use(cors(corsOptions));
// --- End CORS Configuration ---

// --- Middleware for PayPal webhooks (MUST be before general JSON parser) ---
// This middleware will only apply to requests matching exactly /paypal/webhook
// Vercel routes /api/paypal/webhook to /paypal/webhook within this app's context
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" })); // <--- REMOVED /api prefix

// --- General JSON body parser middleware ---
// This should come after raw body parser for webhooks
app.use(express.json());

// API Routes (mounted relative to this app's base path, which Vercel treats as /api/)
// <--- REMOVED /api prefix from all these routes
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
  // <--- This route is now correct for /api
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
