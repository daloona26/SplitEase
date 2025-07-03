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

// Load routes individually to identify which one is causing the path-to-regexp error
const routesToLoad = [
  { name: "auth", path: "../routes/auth", mount: "/auth" },
  { name: "groups", path: "../routes/groups", mount: "/groups" },
  { name: "expenses", path: "../routes/expenses", mount: "/expenses" },
  { name: "paypal", path: "../routes/paypal", mount: "/paypal" },
  { name: "activity", path: "../routes/activity", mount: "/activity" },
];

const loadedRoutes = [];
const failedRoutes = [];

for (const route of routesToLoad) {
  try {
    console.log(`Loading ${route.name} routes...`);
    const routeModule = require(route.path);
    app.use(route.mount, routeModule);
    console.log(`${route.name} routes loaded successfully`);
    loadedRoutes.push(route.name);
  } catch (error) {
    console.error(`ERROR loading ${route.name} routes:`, error.message);
    console.error(`Stack trace for ${route.name}:`, error.stack);
    failedRoutes.push({ name: route.name, error: error.message });

    // Create a fallback route for the failed module
    app.use(route.mount, (req, res) => {
      res.status(503).json({
        message: `${route.name} routes are temporarily unavailable`,
        error: error.message,
      });
    });
  }
}

// Add a debug endpoint to show which routes loaded
app.get("/debug/routes", (req, res) => {
  res.json({
    loadedRoutes,
    failedRoutes,
    timestamp: new Date().toISOString(),
  });
});

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
