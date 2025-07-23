// backend/src/routes/export.js
console.log(
  "export.js: V10 - Data-Only Endpoints for Client-Side PDF - Timestamp:",
  new Date().toISOString()
);

const express = require("express");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// --- Middleware (no changes) ---
router.use(authenticateToken);

// --- The ONLY function we need now ---
async function getExportData(groupId, userId, startDate, endDate) {
  const groupResult = await query(
    `SELECT g.id, g.name, g.description FROM groups g WHERE g.id = $1 AND (g.creator_user_id = $2 OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $2))`,
    [groupId, userId]
  );
  if (groupResult.rows.length === 0) {
    throw new Error("Access Denied or Group Not Found");
  }
  const group = groupResult.rows[0];

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

  const expensesQuery = `SELECT e.id, e.description, e.amount, e.category, e.expense_date, (SELECT STRING_AGG(u.name || ' ($' || ep.amount_paid::text || ')', ', ') FROM expense_payments ep JOIN users u ON ep.user_id = u.id WHERE ep.expense_id = e.id) as payers, (SELECT STRING_AGG(u.name || ' ($' || pt.share_amount::text || ')', ', ') FROM expense_participants pt JOIN users u ON pt.user_id = u.id WHERE pt.expense_id = e.id) as participants FROM expenses e WHERE e.group_id = $1 ${dateFilter} GROUP BY e.id ORDER BY e.expense_date DESC`;
  const expensesResult = await query(expensesQuery, queryParams);

  const balancesQuery = `SELECT u.id, u.name, u.email, COALESCE(paid.total_paid, 0) as total_paid, COALESCE(owed.total_owed, 0) as total_owed, (COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0)) as balance FROM users u LEFT JOIN (SELECT ep.user_id, SUM(ep.amount_paid) as total_paid FROM expense_payments ep JOIN expenses e ON ep.expense_id = e.id WHERE e.group_id = $1 ${dateFilter} GROUP BY ep.user_id) paid ON u.id = paid.user_id LEFT JOIN (SELECT pt.user_id, SUM(pt.share_amount) as total_owed FROM expense_participants pt JOIN expenses e ON pt.expense_id = e.id WHERE e.group_id = $1 ${dateFilter} GROUP BY pt.user_id) owed ON u.id = owed.user_id WHERE u.id IN (SELECT user_id FROM group_members WHERE group_id = $1 UNION SELECT creator_user_id FROM groups WHERE id = $1) ORDER BY u.name`;
  const balancesResult = await query(balancesQuery, queryParams);

  return {
    expenses: expensesResult.rows,
    balances: balancesResult.rows,
    group,
  };
}

// --- New, single data endpoint ---
router.get("/group/:groupId/data", async (req, res) => {
  const { groupId } = req.params;
  console.log(`[Data Route] Request for group: ${groupId}`);
  try {
    const data = await getExportData(
      groupId,
      req.user.id,
      req.query.startDate,
      req.query.endDate
    );
    res.status(200).json(data);
  } catch (error) {
    console.error(`[Data Route] FAILED for group ${groupId}:`, error);
    res
      .status(500)
      .json({ message: "Failed to fetch export data.", error: error.message });
  }
});

module.exports = router;
