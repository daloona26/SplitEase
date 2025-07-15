const express = require("express");
const path = require("path");
const fs = require("fs");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");
const { exportToCsv } = require("../utils/csvExport");
const { exportToPdf } = require("../utils/pdfExport");

const router = express.Router();

// Helper to round to 2 decimal places
const roundToTwoDecimals = (num) => Math.round(num * 100) / 100;

// Enhanced CORS middleware for export routes
const setExportCorsHeaders = (req, res, next) => {
  // Allow all origins and methods
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "false");
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Length, Content-Type, Accept-Ranges, X-Filename"
  );

  // Anti-caching headers to prevent IDM interference
  res.header("Cache-Control", "no-cache, no-store, must-revalidate, private");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  res.header("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.header("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
};

// Apply CORS middleware to all export routes
router.use(setExportCorsHeaders);

// Enhanced authentication middleware that supports token in query params
const flexibleAuth = async (req, res, next) => {
  try {
    // Try standard authentication first
    if (req.headers.authorization) {
      return authenticateToken(req, res, next);
    }

    // Fallback: check for token in query params or body
    const token = req.query.token || req.body.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token manually
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Helper function to get expenses data
const getExpensesData = async (groupId, userId, startDate, endDate) => {
  // Authorization check
  const isMember = await query(
    "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, userId]
  );
  if (isMember.rows.length === 0) {
    throw new Error("Not authorized to export data from this group.");
  }

  // Get group info
  const groupResult = await query(
    "SELECT name, description FROM groups WHERE id = $1",
    [groupId]
  );
  const group = groupResult.rows[0] || {
    name: "Unknown Group",
    description: "",
  };

  // Build expenses query
  let expensesQuery = `
    SELECT 
      e.id,
      e.description,
      e.amount,
      e.category,
      e.expense_date,
      STRING_AGG(DISTINCT u_payer.name || ' ($' || ep.amount_paid || ')', ', ') AS payers,
      STRING_AGG(DISTINCT u_participant.name || ' ($' || epart.share_amount || ')', ', ') AS participants
    FROM expenses e
    LEFT JOIN expense_payments ep ON e.id = ep.expense_id
    LEFT JOIN users u_payer ON ep.user_id = u_payer.id
    LEFT JOIN expense_participants epart ON e.id = epart.expense_id
    LEFT JOIN users u_participant ON epart.user_id = u_participant.id
    WHERE e.group_id = $1
  `;

  const queryParams = [groupId];
  let paramIndex = 2;

  if (startDate) {
    expensesQuery += ` AND e.expense_date >= $${paramIndex++}`;
    queryParams.push(startDate);
  }
  if (endDate) {
    expensesQuery += ` AND e.expense_date <= $${paramIndex++}`;
    queryParams.push(endDate);
  }

  expensesQuery += ` GROUP BY e.id, e.description, e.amount, e.category, e.expense_date ORDER BY e.expense_date DESC`;

  const expensesResult = await query(expensesQuery, queryParams);

  // Get balances for PDF
  const balancesQuery = `
    SELECT 
      u.name,
      COALESCE(SUM(ep.amount_paid), 0) AS total_paid,
      COALESCE(SUM(epart.share_amount), 0) AS total_owed
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    LEFT JOIN expense_payments ep ON ep.user_id = u.id 
      AND ep.expense_id IN (SELECT id FROM expenses WHERE group_id = $1)
    LEFT JOIN expense_participants epart ON epart.user_id = u.id 
      AND epart.expense_id IN (SELECT id FROM expenses WHERE group_id = $1)
    WHERE gm.group_id = $1
    GROUP BY u.id, u.name
    ORDER BY u.name
  `;

  const balancesResult = await query(balancesQuery, [groupId]);

  return {
    expenses: expensesResult.rows,
    balances: balancesResult.rows,
    group,
  };
};

// CSV Export route with multiple response formats
router.get("/:groupId/csv", flexibleAuth, async (req, res) => {
  const { groupId } = req.params;
  const { startDate, endDate, format, download } = req.query;
  const userId = req.user.id;

  try {
    console.log(
      `[CSV Export] User ${userId} requested CSV export for group ${groupId}`
    );

    const { expenses, group } = await getExpensesData(
      groupId,
      userId,
      startDate,
      endDate
    );

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate CSV file
    const csvPath = await exportToCsv(expenses, group.name, tempDir);
    const fileName = `${group.name}_expenses_${Date.now()}.csv`;

    // Handle different response formats
    if (format === "base64") {
      // Return base64 encoded data
      const fileBuffer = fs.readFileSync(csvPath);
      const base64Data = fileBuffer.toString("base64");

      // Clean up temp file
      fs.unlinkSync(csvPath);

      return res.json({
        base64Data,
        filename: fileName,
        contentType: "text/csv",
      });
    }

    if (format === "dataurl") {
      // Return data URL
      const fileBuffer = fs.readFileSync(csvPath);
      const base64Data = fileBuffer.toString("base64");
      const dataUrl = `data:text/csv;base64,${base64Data}`;

      // Clean up temp file
      fs.unlinkSync(csvPath);

      return res.json({
        dataUrl,
        filename: fileName,
      });
    }

    // Default: stream file
    const stats = fs.statSync(csvPath);

    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": stats.size,
      "X-Filename": fileName,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    const fileStream = fs.createReadStream(csvPath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        fs.unlink(csvPath, (err) => {
          if (err) console.error("[CSV Export] Error deleting temp file:", err);
        });
      }, 5000);
    });
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to export expenses to CSV",
        error: error.message,
      });
    }
  }
});

// PDF Export route with multiple response formats
router.get("/:groupId/pdf", flexibleAuth, async (req, res) => {
  const { groupId } = req.params;
  const { startDate, endDate, format, download } = req.query;
  const userId = req.user.id;

  try {
    console.log(
      `[PDF Export] User ${userId} requested PDF export for group ${groupId}`
    );

    const { expenses, balances, group } = await getExpensesData(
      groupId,
      userId,
      startDate,
      endDate
    );

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate PDF file
    const { path: pdfPath, fileName } = await exportToPdf(
      expenses,
      balances,
      group,
      tempDir
    );

    // Handle different response formats
    if (format === "base64") {
      // Return base64 encoded data
      const fileBuffer = fs.readFileSync(pdfPath);
      const base64Data = fileBuffer.toString("base64");

      // Clean up temp file
      fs.unlinkSync(pdfPath);

      return res.json({
        base64Data,
        filename: fileName,
        contentType: "application/pdf",
      });
    }

    if (format === "dataurl") {
      // Return data URL
      const fileBuffer = fs.readFileSync(pdfPath);
      const base64Data = fileBuffer.toString("base64");
      const dataUrl = `data:application/pdf;base64,${base64Data}`;

      // Clean up temp file
      fs.unlinkSync(pdfPath);

      return res.json({
        dataUrl,
        filename: fileName,
      });
    }

    // Default: stream file
    const stats = fs.statSync(pdfPath);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": stats.size,
      "X-Filename": fileName,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error("[PDF Export] Error deleting temp file:", err);
        });
      }, 5000);
    });
  } catch (error) {
    console.error("[PDF Export] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to export expenses to PDF",
        error: error.message,
      });
    }
  }
});

module.exports = router;
