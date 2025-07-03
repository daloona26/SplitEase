const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Load environment variables first
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

// --- CORS Configuration ---
let allowedOrigin;

if (process.env.NODE_ENV === "production") {
  console.log(
    `CORS: Production FRONTEND_URL env var: ${process.env.FRONTEND_URL}`
  );
  allowedOrigin =
    process.env.FRONTEND_URL || "https://splitease-pearl.vercel.app";
} else {
  allowedOrigin = "http://localhost:5173";
}

console.log(`CORS: Final allowed origin configured: ${allowedOrigin}`);

const corsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// --- Middleware for PayPal webhooks (before JSON parser) ---
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));

// --- General JSON body parser ---
app.use(express.json());

// Basic logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "SplitEase Backend API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Load routes after basic setup to catch any route parsing errors
try {
  console.log("Loading auth routes...");
  const authRoutes = require("../routes/auth");
  app.use("/auth", authRoutes);
  console.log("Auth routes loaded successfully");

  console.log("Loading group routes...");
  const groupRoutes = require("../routes/groups");
  app.use("/groups", groupRoutes);
  console.log("Group routes loaded successfully");

  console.log("Loading expenses routes...");
  const expensesRoutes = require("../routes/expenses");
  app.use("/expenses", expensesRoutes);
  console.log("Expenses routes loaded successfully");

  console.log("Loading paypal routes...");
  const paypalRoutes = require("../routes/paypal");
  app.use("/paypal", paypalRoutes);
  console.log("PayPal routes loaded successfully");

  console.log("Loading activity routes...");
  const activityRoutes = require("../routes/activity");
  app.use("/activity", activityRoutes);
  console.log("Activity routes loaded successfully");
} catch (error) {
  console.error("Error loading routes:", error.message);
  console.error("Stack trace:", error.stack);

  // Still start the server even if some routes fail
  app.get("/error", (req, res) => {
    res.status(500).json({
      message: "Some routes failed to load",
      error: error.message,
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express error:", err.message);
  console.error("Stack:", err.stack);

  res.status(500).json({
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

module.exports = app;

// Local development server
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}
