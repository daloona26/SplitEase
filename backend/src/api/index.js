// backend/src/api/index.js

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

let allowedOrigin;
if (process.env.NODE_ENV === "production") {
  let rawFrontendUrl = process.env.FRONTEND_URL;

  if (rawFrontendUrl && rawFrontendUrl.endsWith("/")) {
    allowedOrigin = rawFrontendUrl.slice(0, -1);
  } else {
    allowedOrigin = rawFrontendUrl;
  }

  if (!allowedOrigin) {
    allowedOrigin = "https://splitease-pearl.vercel.app";
    console.warn(
      "CORS: WARNING! FRONTEND_URL environment variable was not found in production. Using hardcoded fallback: https://splitease-pearl.vercel.app"
    );
  }

  console.log(`CORS: Production FRONTEND_URL env var (raw): ${rawFrontendUrl}`);
} else {
  allowedOrigin = "http://localhost:5173";
}

console.log(`CORS: Final allowed origin configured: ${allowedOrigin}`);

const corsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use("/paypal/webhook", bodyParser.raw({ type: "application/json" }));

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/groups", groupRoutes);
app.use("/expenses", expensesRoutes);
app.use("/paypal", paypalRoutes);
app.use("/activity", activityRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "SplitEase Backend API is running!" });
});

app.get("/api", (req, res) => {
  res
    .status(200)
    .json({ message: "SplitEase Backend API is running at /api!" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

module.exports = app;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    console.log(`Node Environment: ${process.env.NODE_ENV}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}
