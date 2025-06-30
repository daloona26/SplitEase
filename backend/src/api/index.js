// backend/src/api/index.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config({ path: __dirname + "/../../.env.local" });

const { query } = require("../db");

const authRoutes = require("../routes/auth");
const groupRoutes = require("../routes/groups");
const expensesRoutes = require("../routes/expenses");
const paypalRoutes = require("../routes/paypal");
const activityRoutes = require("../routes/activity");

const app = express();

// Middleware
app.use(
  cors({
    // IMPORTANT CHANGE HERE: Allow your Vite frontend's port
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  if (req.originalUrl === "/api/paypal/webhook") {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

(async () => {
  try {
    await query("SELECT NOW()");
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api/activity", activityRoutes);

app.get("/api", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});

module.exports = app;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}
