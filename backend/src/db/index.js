// backend/src/db/index.js
// Database connection setup for PostgreSQL

const { Pool } = require("pg");
require("dotenv").config({ path: __dirname + "/../../.env.local" }); // Load .env.local for local dev

// Log the DATABASE_URL being used at startup for debugging purposes
console.log(
  "DB_CONNECTION_DEBUG: DATABASE_URL being used:",
  process.env.DATABASE_URL ? "URL_LOADED" : "URL_NOT_LOADED"
);

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false, // Required for cloud databases like Neon.tech
});

// Test database connection on startup
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release(); // Release client back to the pool
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    console.error(
      "Please check your DATABASE_URL in backend/.env.local or Vercel environment variables."
    );
    // Do NOT exit process.exit(1) here for serverless, it can cause Vercel build issues.
  }
})();

// Helper function to execute a SQL query
async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Export query function and pool (for transaction management in routes)
module.exports = { query, pool };
