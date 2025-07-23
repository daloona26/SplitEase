// backend/src/routes/export.js
console.log(
  "export.js: V9 - The Definitive, Bulletproof Version - Timestamp:",
  new Date().toISOString()
);

const express = require("express");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// =================================================================
// SECTION 1: CORE LOGIC - ROBUST AND MODULAR
// =================================================================

/**
 * Fetches all necessary data from the database for an export.
 * This is the single source of truth for data fetching.
 */
async function getExportData(groupId, userId, startDate, endDate) {
  console.log(`[Data Fetcher] Starting data fetch for group: ${groupId}`);

  // 1. Verify user has access and get group info
  const groupResult = await query(
    `SELECT g.id, g.name, g.description FROM groups g WHERE g.id = $1 AND (g.creator_user_id = $2 OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $2))`,
    [groupId, userId]
  );
  if (groupResult.rows.length === 0) {
    throw new Error(
      `Access Denied: User ${userId} cannot access group ${groupId} or group does not exist.`
    );
  }
  const group = groupResult.rows[0];
  console.log(`[Data Fetcher] Group "${group.name}" found.`);

  // 2. Prepare date filters
  let dateFilter = "";
  let queryParams = [groupId];
  let paramIndex = 2;
  if (startDate) {
    dateFilter += ` AND e.expense_date >= $${paramIndex++}`;
    queryParams.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND e.expense_date <= $${paramIndex++}`;
    queryParams.push(endDate);
  }

  // 3. Fetch all expenses with aggregated payer and participant names
  const expensesQuery = `
    SELECT 
      e.id, e.description, e.amount, e.category, e.expense_date,
      (SELECT STRING_AGG(u.name || ' ($' || ep.amount_paid::text || ')', ', ')
       FROM expense_payments ep JOIN users u ON ep.user_id = u.id
       WHERE ep.expense_id = e.id) as payers,
      (SELECT STRING_AGG(u.name || ' ($' || pt.share_amount::text || ')', ', ')
       FROM expense_participants pt JOIN users u ON pt.user_id = u.id
       WHERE pt.expense_id = e.id) as participants
    FROM expenses e
    WHERE e.group_id = $1 ${dateFilter}
    GROUP BY e.id
    ORDER BY e.expense_date DESC
  `;
  const expensesResult = await query(expensesQuery, queryParams);
  console.log(`[Data Fetcher] Found ${expensesResult.rows.length} expenses.`);

  // 4. Fetch all member balances
  const balancesQuery = `
    SELECT 
      u.id, u.name, u.email,
      COALESCE(paid.total_paid, 0) as total_paid,
      COALESCE(owed.total_owed, 0) as total_owed,
      (COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0)) as balance
    FROM users u
    LEFT JOIN (
      SELECT ep.user_id, SUM(ep.amount_paid) as total_paid
      FROM expense_payments ep JOIN expenses e ON ep.expense_id = e.id
      WHERE e.group_id = $1 ${dateFilter} GROUP BY ep.user_id
    ) paid ON u.id = paid.user_id
    LEFT JOIN (
      SELECT pt.user_id, SUM(pt.share_amount) as total_owed
      FROM expense_participants pt JOIN expenses e ON pt.expense_id = e.id
      WHERE e.group_id = $1 ${dateFilter} GROUP BY pt.user_id
    ) owed ON u.id = owed.user_id
    WHERE u.id IN (
      SELECT user_id FROM group_members WHERE group_id = $1
      UNION
      SELECT creator_user_id FROM groups WHERE id = $1
    )
    ORDER BY u.name
  `;
  const balancesResult = await query(balancesQuery, queryParams);
  console.log(
    `[Data Fetcher] Found ${balancesResult.rows.length} member balances.`
  );

  return {
    expenses: expensesResult.rows,
    balances: balancesResult.rows,
    group,
  };
}

/**
 * Generates CSV content from expenses data.
 * This function is now highly defensive against bad data.
 */
function createCsvContent(expenses) {
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Category",
    "Payers",
    "Participants",
  ];
  const rows = expenses.map((expense) => {
    // Defensively handle the date
    const expenseDate = expense.expense_date
      ? new Date(expense.expense_date)
      : null;
    const dateString =
      expenseDate && !isNaN(expenseDate)
        ? expenseDate.toLocaleDateString()
        : "N/A";

    // Sanitize all other fields
    const description = `"${(expense.description || "N/A").replace(
      /"/g,
      '""'
    )}"`;
    const amount = (parseFloat(expense.amount) || 0).toFixed(2);
    const category = `"${(expense.category || "N/A").replace(/"/g, '""')}"`;
    const payers = `"${(expense.payers || "N/A").replace(/"/g, '""')}"`;
    const participants = `"${(expense.participants || "N/A").replace(
      /"/g,
      '""'
    )}"`;

    return [
      dateString,
      description,
      amount,
      category,
      payers,
      participants,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates a PDF buffer from HTML content using Puppeteer.
 */
async function createPdfBuffer(htmlContent) {
  let browser = null;
  try {
    console.log("[PDF Generator] Loading Puppeteer...");
    const { default: puppeteer } = await import("puppeteer");

    console.log("[PDF Generator] Launching browser...");
    const launchOptions = process.env.VERCEL ? { args: ["--no-sandbox"] } : {};
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    console.log("[PDF Generator] Creating PDF...");
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    return pdfBuffer;
  } finally {
    if (browser) {
      console.log("[PDF Generator] Closing browser.");
      await browser.close();
    }
  }
}

/**
 * Generates an HTML report string.
 */
function generateHTMLReport(expenses, balances, group) {
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || 0),
    0
  );
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Expense Report - ${
    group.name
  }</title><style>body{font-family: Arial, sans-serif; margin: 20px; color: #333;}h1{color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;}h2{color: #34495e; margin-top: 30px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;}table{width: 100%; border-collapse: collapse; margin-top: 20px;}th, td{border: 1px solid #ddd; padding: 8px; text-align: left;}th{background-color: #3498db; color: white;}.amount{text-align: right; font-weight: bold;}.positive{color: #27ae60;}.negative{color: #e74c3c;}</style></head><body><h1>💰 Expense Report: ${
    group.name
  }</h1><h2>📋 Expenses</h2><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Payers</th><th>Participants</th></tr></thead><tbody>${expenses
    .map(
      (e) =>
        `<tr><td>${new Date(e.expense_date).toLocaleDateString()}</td><td>${
          e.description || "N/A"
        }</td><td class="amount">$${parseFloat(e.amount || 0).toFixed(
          2
        )}</td><td>${e.category || "N/A"}</td><td>${
          e.payers || "N/A"
        }</td><td>${e.participants || "N/A"}</td></tr>`
    )
    .join(
      ""
    )}</tbody></table><h2>⚖️ Member Balances</h2><table><thead><tr><th>Member</th><th>Total Paid</th><th>Total Owed</th><th>Balance</th></tr></thead><tbody>${balances
    .map((b) => {
      const bal = parseFloat(b.balance || 0);
      return `<tr><td>${
        b.name || "Unknown"
      }</td><td class="amount">$${parseFloat(b.total_paid || 0).toFixed(
        2
      )}</td><td class="amount">$${parseFloat(b.total_owed || 0).toFixed(
        2
      )}</td><td class="amount ${
        bal >= 0 ? "positive" : "negative"
      }">$${Math.abs(bal).toFixed(2)} ${
        bal >= 0 ? "(credit)" : "(owes)"
      }</td></tr>`;
    })
    .join("")}</tbody></table></body></html>`;
}

// =================================================================
// SECTION 2: ROUTES - CLEAN AND FOCUSED
// =================================================================

// --- Middleware for all export routes ---
router.use(authenticateToken); // Use standard authentication for all export routes

// --- CSV Export Route ---
router.get("/group/:groupId/csv", async (req, res) => {
  const { groupId } = req.params;
  console.log(`[CSV Route] Received request for group: ${groupId}`);

  try {
    // 1. Get Data
    const { expenses, group } = await getExportData(
      groupId,
      req.user.id,
      req.query.startDate,
      req.query.endDate
    );

    // 2. Generate CSV Content
    console.log(`[CSV Route] Generating CSV content...`);
    const csvContent = createCsvContent(expenses);

    // 3. Send Response
    const fileName = `${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_expenses.csv`;
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });
    console.log(`[CSV Route] Sending CSV file: ${fileName}`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(`[CSV Route] FAILED for group ${groupId}:`, error);
    res
      .status(500)
      .json({ message: "Failed to export CSV.", error: error.message });
  }
});

// --- PDF Export Route ---
router.get("/group/:groupId/pdf", async (req, res) => {
  const { groupId } = req.params;
  console.log(`[PDF Route] Received request for group: ${groupId}`);

  try {
    // 1. Get Data
    const { expenses, balances, group } = await getExportData(
      groupId,
      req.user.id,
      req.query.startDate,
      req.query.endDate
    );

    // 2. Generate HTML
    console.log(`[PDF Route] Generating HTML report...`);
    const htmlContent = generateHTMLReport(expenses, balances, group);

    // 3. Convert HTML to PDF
    console.log(`[PDF Route] Starting PDF conversion...`);
    const pdfBuffer = await createPdfBuffer(htmlContent);

    // 4. Send Response
    const fileName = `${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_report.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length,
    });
    console.log(`[PDF Route] Sending PDF file: ${fileName}`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error(`[PDF Route] FAILED for group ${groupId}:`, error);
    res
      .status(500)
      .json({ message: "Failed to export PDF.", error: error.message });
  }
});

module.exports = router;
