const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query } = require("../db");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Route imports
const authRoutes = require("../routes/auth");
const groupRoutes = require("../routes/groups");
const expensesRoutes = require("../routes/expenses");
const paypalRoutes = require("../routes/paypal");
const activityRoutes = require("../routes/activity");
const exportRoutes = require("../routes/export");
const recurringRoutes = require("../routes/recurring");
const uploadRoutes = require("../routes/upload");

// Job import and initializer
const { startRecurringExpensesJob } = require("../../jobs/recurringExpenses");
const path = require("path");
const fs = require("fs");
const app = express();

// Ensure uploads directory exists and is writable
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    "https://splitease-pearl.vercel.app",
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Expires",
    "X-Content-Type-Options",
    "Content-Transfer-Encoding",
  ],
  exposedHeaders: [
    "Content-Disposition",
    "Content-Length",
    "Content-Type",
    "Accept-Ranges",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Body parsing
app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files: Serve uploads directory
app.use("/uploads", express.static(uploadsDir));

// Middleware for export routes to prevent IDM interference
app.use("/export", (req, res, next) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  res.header("X-Content-Type-Options", "nosniff");
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Disposition",
    "Content-Length",
    "Content-Type",
    "Accept-Ranges"
  );
  if (req.method === "GET" && !req.query.t) {
    req.query.t = Date.now().toString();
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expensesRoutes);
app.use("/paypal", paypalRoutes);
app.use("/activity", activityRoutes);
app.use("/export", exportRoutes);
app.use("/recurring", recurringRoutes);
app.use("/upload", uploadRoutes);

// Diagnostics
app.get("/", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    cors: {
      allowedOrigins,
      nodeEnv: process.env.NODE_ENV,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "Invalid JSON payload" });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Payload Too Large", message: "File size too large" });
  }
  if (err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ error: "Forbidden", message: "CORS policy blocked the request" });
  }
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start server and cron job in dev
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌐 Frontend Origins: ${allowedOrigins.join(", ")}`);
    console.log(`🔧 Starting recurring expense job scheduler...`);
    startRecurringExpensesJob();
  });
}

module.exports = app;
