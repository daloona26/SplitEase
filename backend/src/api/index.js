const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query } = require("../db");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const authRoutes = require("../routes/auth");
const groupRoutes = require("../routes/groups");
const expensesRoutes = require("../routes/expenses");
const paypalRoutes = require("../routes/paypal");
const activityRoutes = require("../routes/activity");

const app = express();

// --- CORS Configuration ---
let allowedOrigin;

if (process.env.NODE_ENV === "production") {
  console.log(
    `CORS: Production FRONTEND_URL env var: ${process.env.FRONTEND_URL}`
  );
  allowedOrigin =
    process.env.FRONTEND_URL || "https://splitease-pearl.vercel.app";

  if (!process.env.FRONTEND_URL) {
    console.warn(
      "CORS: WARNING! FRONTEND_URL environment variable was not found in production. Using hardcoded fallback: https://splitease-pearl.vercel.app"
    );
  }
} else {
  allowedOrigin = "http://localhost:5173";
}

console.log(`CORS: Final allowed origin configured: ${allowedOrigin}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (origin === allowedOrigin) {
      return callback(null, true);
    } else {
      console.log(`CORS: Blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-HTTP-Method-Override",
  ],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false, // Pass control to the next handler
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));

// --- Middleware for PayPal webhooks (MUST be before general JSON parser) ---
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));

// --- General JSON body parser middleware ---
app.use(express.json());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get("Origin")}`);
  next();
});

// API Routes
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expensesRoutes);
app.use("/paypal", paypalRoutes);
app.use("/activity", activityRoutes);

// Root route
app.get("/", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle CORS errors specifically
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "CORS policy violation",
      origin: req.get("Origin"),
    });
  }

  res.status(500).json({ message: "Something broke!" });
});

module.exports = app;

// Local Development Server
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}
