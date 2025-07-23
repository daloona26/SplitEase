// Complete minimal export route - works with your existing database setup
// Only uses Neon database + Vercel, no external services
// File: routes/export.js

const express = require("express");
const { query } = require("../db"); // Your existing database connection
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// CORS headers for export routes
const setExportCorsHeaders = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Length, Content-Type, X-Filename"
  );

  // Prevent caching
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
};

router.use(setExportCorsHeaders);

// Flexible authentication (supports token in query params for downloads)
const flexibleAuth = async (req, res, next) => {
  try {
    // Try standard header authentication first
    if (req.headers.authorization) {
      return authenticateToken(req, res, next);
    }

    // Fallback: check for token in query params
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

// Helper function to get expenses data from your database
const getExpensesData = async (groupId, userId, startDate, endDate) => {
  try {
    // Get group information
    const groupResult = await query(
      "SELECT name, description FROM groups WHERE id = $1 AND (created_by = $2 OR id IN (SELECT group_id FROM group_members WHERE user_id = $2))",
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      throw new Error("Group not found or access denied");
    }

    const group = groupResult.rows[0];

    // Build date filter
    let dateFilter = "";
    let queryParams = [groupId, userId];
    let paramIndex = 3;

    if (startDate) {
      dateFilter += ` AND e.expense_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND e.expense_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Get expenses with payers and participants
    const expensesQuery = `
      SELECT 
        e.id,
        e.description,
        e.amount,
        e.category,
        e.expense_date,
        COALESCE(
          STRING_AGG(
            DISTINCT u_payer.name || ' ($' || ep.amount || ')', 
            ', ' ORDER BY u_payer.name
          ), 
          ''
        ) as payers,
        COALESCE(
          STRING_AGG(
            DISTINCT u_participant.name || ' ($' || es.amount || ')', 
            ', ' ORDER BY u_participant.name
          ), 
          ''
        ) as participants
      FROM expenses e
      LEFT JOIN expense_payers ep ON e.id = ep.expense_id
      LEFT JOIN users u_payer ON ep.user_id = u_payer.id
      LEFT JOIN expense_splits es ON e.id = es.expense_id
      LEFT JOIN users u_participant ON es.user_id = u_participant.id
      WHERE e.group_id = $1 
        AND (e.created_by = $2 OR e.group_id IN (SELECT group_id FROM group_members WHERE user_id = $2))
        ${dateFilter}
      GROUP BY e.id, e.description, e.amount, e.category, e.expense_date
      ORDER BY e.expense_date DESC
    `;

    const expensesResult = await query(expensesQuery, queryParams);

    // Get member balances
    const balancesQuery = `
      SELECT 
        u.name,
        COALESCE(SUM(ep.amount), 0) as total_paid,
        COALESCE(SUM(es.amount), 0) as total_owed
      FROM users u
      LEFT JOIN expense_payers ep ON u.id = ep.user_id 
        AND ep.expense_id IN (
          SELECT id FROM expenses WHERE group_id = $1 ${dateFilter.replace(
            "e.expense_date",
            "expense_date"
          )}
        )
      LEFT JOIN expense_splits es ON u.id = es.user_id 
        AND es.expense_id IN (
          SELECT id FROM expenses WHERE group_id = $1 ${dateFilter.replace(
            "e.expense_date",
            "expense_date"
          )}
        )
      WHERE u.id IN (
        SELECT user_id FROM group_members WHERE group_id = $1
        UNION
        SELECT created_by FROM groups WHERE id = $1
      )
      GROUP BY u.id, u.name
      ORDER BY u.name
    `;

    const balancesResult = await query(
      balancesQuery,
      queryParams.slice(0, 2).concat(queryParams.slice(2))
    );

    return {
      expenses: expensesResult.rows,
      balances: balancesResult.rows,
      group,
    };
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// Generate CSV in memory
const generateCSV = (expenses, groupName) => {
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Category",
    "Payers",
    "Participants",
  ];

  let csvContent = headers.join(",") + "\n";

  expenses.forEach((expense) => {
    const row = [
      new Date(expense.expense_date).toLocaleDateString(),
      `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
      expense.amount,
      expense.category || "",
      `"${(expense.payers || "").replace(/"/g, '""')}"`,
      `"${(expense.participants || "").replace(/"/g, '""')}"`,
    ];
    csvContent += row.join(",") + "\n";
  });

  return csvContent;
};

// Generate HTML report (can be printed as PDF by browser)
const generateHTMLReport = (expenses, balances, group) => {
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || 0),
    0
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Expense Report - ${group.name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
        }
        h1 { 
          color: #2c3e50; 
          border-bottom: 3px solid #3498db; 
          padding-bottom: 10px;
        }
        h2 { 
          color: #34495e; 
          margin-top: 30px; 
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 12px 8px; 
          text-align: left; 
        }
        th { 
          background-color: #3498db; 
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .amount { text-align: right; font-weight: bold; }
        .summary { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .summary p { margin: 8px 0; }
        .positive { color: #27ae60; font-weight: bold; }
        .negative { color: #e74c3c; font-weight: bold; }
        .print-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin: 10px 5px;
        }
        .print-button:hover {
          background: #2980b9;
        }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .summary { 
            background: #f8f9fa !important; 
            color: #333 !important; 
            border: 2px solid #3498db;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <button class="print-button" onclick="window.close()" style="background: #95a5a6;">❌ Close</button>
      </div>
      
      <h1>💰 Expense Report: ${group.name}</h1>
      
      <div class="summary">
        <p><strong>📅 Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>📊 Total Expenses:</strong> ${expenses.length}</p>
        <p><strong>💵 Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
        ${
          group.description
            ? `<p><strong>📝 Description:</strong> ${group.description}</p>`
            : ""
        }
      </div>
      
      <h2>📋 Expenses</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Payers</th>
            <th>Participants</th>
          </tr>
        </thead>
        <tbody>
          ${expenses
            .map(
              (expense) => `
            <tr>
              <td>${new Date(expense.expense_date).toLocaleDateString()}</td>
              <td>${expense.description}</td>
              <td class="amount">$${parseFloat(expense.amount || 0).toFixed(
                2
              )}</td>
              <td>${expense.category || "N/A"}</td>
              <td>${expense.payers || "N/A"}</td>
              <td>${expense.participants || "N/A"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      
      <h2>⚖️ Member Balances</h2>
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Total Paid</th>
            <th>Total Owed</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${balances
            .map((balance) => {
              const balanceAmount =
                parseFloat(balance.total_paid || 0) -
                parseFloat(balance.total_owed || 0);
              return `
              <tr>
                <td>${balance.name}</td>
                <td class="amount">$${parseFloat(
                  balance.total_paid || 0
                ).toFixed(2)}</td>
                <td class="amount">$${parseFloat(
                  balance.total_owed || 0
                ).toFixed(2)}</td>
                <td class="amount ${
                  balanceAmount >= 0 ? "positive" : "negative"
                }">
                  $${Math.abs(balanceAmount).toFixed(2)} ${
                balanceAmount >= 0 ? "(credit)" : "(owes)"
              }
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
      
      <script>
        // Auto-print when opened with autoprint parameter
        if (window.location.search.includes('autoprint=true')) {
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          };
        }
      </script>
    </body>
    </html>
  `;

  return htmlContent;
};

// CSV Export route
router.get("/:groupId/csv", flexibleAuth, async (req, res) => {
  const { groupId } = req.params;
  const { startDate, endDate, format } = req.query;
  const userId = req.user.id;

  try {
    console.log(
      `[CSV Export] User ${userId} requesting CSV for group ${groupId}`
    );

    const { expenses, group } = await getExpensesData(
      groupId,
      userId,
      startDate,
      endDate
    );
    const fileName = `${group.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_expenses_${Date.now()}.csv`;
    const csvContent = generateCSV(expenses, group.name);

    // Handle different response formats
    if (format === "base64") {
      const base64Data = Buffer.from(csvContent, "utf8").toString("base64");
      return res.json({
        base64Data,
        filename: fileName,
        contentType: "text/csv",
      });
    }

    if (format === "dataurl") {
      const base64Data = Buffer.from(csvContent, "utf8").toString("base64");
      const dataUrl = `data:text/csv;base64,${base64Data}`;
      return res.json({
        dataUrl,
        filename: fileName,
      });
    }

    // Default: download file
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": Buffer.byteLength(csvContent, "utf8"),
      "X-Filename": fileName,
    });

    res.send(csvContent);
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    res.status(500).json({
      message: "Failed to export expenses to CSV",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// PDF Export route (returns HTML for printing)
router.get("/:groupId/pdf", flexibleAuth, async (req, res) => {
  const { groupId } = req.params;
  const { startDate, endDate, format, autoprint } = req.query;
  const userId = req.user.id;

  try {
    console.log(
      `[PDF Export] User ${userId} requesting PDF for group ${groupId}`
    );

    const { expenses, balances, group } = await getExpensesData(
      groupId,
      userId,
      startDate,
      endDate
    );
    const fileName = `${group.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_expenses_${Date.now()}.html`;
    const htmlContent = generateHTMLReport(expenses, balances, group);

    // Handle different response formats
    if (format === "base64") {
      const base64Data = Buffer.from(htmlContent, "utf8").toString("base64");
      return res.json({
        base64Data,
        filename: fileName,
        contentType: "text/html",
      });
    }

    if (format === "dataurl") {
      const base64Data = Buffer.from(htmlContent, "utf8").toString("base64");
      const dataUrl = `data:text/html;base64,${base64Data}`;
      return res.json({
        dataUrl,
        filename: fileName,
      });
    }

    // Default: return HTML page
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition":
        autoprint === "true" ? "inline" : `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });

    res.send(htmlContent);
  } catch (error) {
    console.error("[PDF Export] Error:", error);
    res.status(500).json({
      message: "Failed to export expenses to PDF",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
