const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Get the token part

  console.log(
    "AUTH_MIDDLEWARE DEBUG: Received token:",
    token ? "YES (present)" : "NO (missing)"
  );
  console.log(
    "AUTH_MIDDLEWARE DEBUG: JWT_SECRET used for verification (length):",
    process.env.JWT_SECRET ? process.env.JWT_SECRET.length : "UNDEFINED"
  );

  if (token == null) {
    console.warn("AUTH_MIDDLEWARE: No token provided. Access denied (401).");
    return res.status(401).json({ message: "Authentication token required." });
  }

  // Check if JWT_SECRET is loaded before attempting to verify
  if (!process.env.JWT_SECRET) {
    console.error(
      "AUTH_MIDDLEWARE ERROR: JWT_SECRET is not defined in environment variables."
    );
    return res
      .status(500)
      .json({ message: "Server configuration error: JWT secret not found." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err.name, err.message);
      // Distinguish between token errors and general server errors
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired." });
      }
      return res.status(403).json({ message: "Invalid token." });
    }
    req.user = user;
    console.log("AUTH_MIDDLEWARE DEBUG: Token valid. User ID:", user.id);
    next();
  });
}

module.exports = authenticateToken;
