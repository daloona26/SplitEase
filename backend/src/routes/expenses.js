// backend/src/routes/expenses.js - **CRITICAL ROUNDING FIXES FOR BALANCES** AND CREATOR AUTH

console.log(
  "expenses.js: Critical rounding fixes for balances and CREATOR AUTH - Version 2.1.0 - Timestamp:",
  new Date().toISOString()
);

const express = require("express");
const { query, pool } = require("../db");
const authenticateToken = require("../middleware/auth");
const checkSubscription = require("../middleware/checkSubscription");

const router = express.Router();

// Helper to round to 2 decimal places
const roundToTwoDecimals = (num) => Math.round(num * 100) / 100;

// NEW Helper: Check if a user is the creator of a group (duplicated from groups.js for modularity, could be a shared helper)
async function isCreatorOfGroup(userId, groupId) {
  try {
    const result = await query(
      "SELECT creator_user_id FROM groups WHERE id = $1",
      [groupId]
    );
    return result.rows.length > 0 && result.rows[0].creator_user_id === userId;
  } catch (error) {
    console.error(
      "Error checking creator status (isCreatorOfGroup helper):",
      error
    );
    return false;
  }
}

function calculateShares(
  totalAmount,
  participants,
  splitType = "equal",
  customShares = null
) {
  if (!participants || participants.length === 0) return [];

  const parsedTotalAmount = roundToTwoDecimals(Number.parseFloat(totalAmount));
  const numParticipants = participants.length;

  let calculatedShares = [];

  if (splitType === "equal") {
    let baseShareAmount = roundToTwoDecimals(
      parsedTotalAmount / numParticipants
    );
    let baseSharePercentage = roundToTwoDecimals(100 / numParticipants); // Calculate initial shares

    for (let i = 0; i < numParticipants; i++) {
      calculatedShares.push({
        user_id: participants[i],
        share_amount: baseShareAmount,
        share_percentage: baseSharePercentage,
      });
    }
    // Distribute remainder for share_amount to ensure sum equals totalAmount
    let currentSumAmounts = calculatedShares.reduce(
      (sum, s) => sum + s.share_amount,
      0
    );
    let diffAmount = roundToTwoDecimals(parsedTotalAmount - currentSumAmounts);

    if (diffAmount !== 0) {
      // Distribute the small difference to the first few participants
      for (let i = 0; i < calculatedShares.length && diffAmount !== 0; i++) {
        if (Math.abs(diffAmount) >= 0.01) {
          // If difference is significant enough to add/subtract a cent
          calculatedShares[i].share_amount = roundToTwoDecimals(
            calculatedShares[i].share_amount + (diffAmount > 0 ? 0.01 : -0.01)
          );
          diffAmount = roundToTwoDecimals(
            diffAmount + (diffAmount > 0 ? -0.01 : 0.01)
          );
        } else if (Math.abs(diffAmount) > 0) {
          // Catch any remaining tiny floating point errors (e.g., 0.000000001)
          calculatedShares[i].share_amount = roundToTwoDecimals(
            calculatedShares[i].share_amount + diffAmount
          );
          diffAmount = 0; // Remainder handled
        }
      }
    }
    // Re-calculate percentages based on final adjusted amounts for precision
    if (parsedTotalAmount > 0) {
      calculatedShares = calculatedShares.map((share) => ({
        ...share,
        share_percentage: roundToTwoDecimals(
          (share.share_amount / parsedTotalAmount) * 100
        ),
      }));
    } else {
      // Handle zero total amount case
      calculatedShares = calculatedShares.map((share) => ({
        ...share,
        share_percentage: 0,
      }));
    }
    // Distribute remainder for share_percentage to ensure sum equals 100%
    let currentSumPercentages = calculatedShares.reduce(
      (sum, s) => sum + s.share_percentage,
      0
    );
    let diffPercentage = roundToTwoDecimals(100 - currentSumPercentages);

    if (diffPercentage !== 0) {
      for (
        let i = 0;
        i < calculatedShares.length && diffPercentage !== 0;
        i++
      ) {
        if (Math.abs(diffPercentage) >= 0.01) {
          calculatedShares[i].share_percentage = roundToTwoDecimals(
            calculatedShares[i].share_percentage +
              (diffPercentage > 0 ? 0.01 : -0.01)
          );
          diffPercentage = roundToTwoDecimals(
            diffPercentage + (diffPercentage > 0 ? -0.01 : 0.01)
          );
        } else if (Math.abs(diffPercentage) > 0) {
          calculatedShares[i].share_percentage = roundToTwoDecimals(
            calculatedShares[i].share_percentage + diffPercentage
          );
          diffPercentage = 0;
        }
      }
    }
  } else if (splitType === "custom" && customShares) {
    const totalCustomAmount = Object.values(customShares).reduce(
      (sum, amount) =>
        sum + roundToTwoDecimals(Number.parseFloat(amount || "0")),
      0
    );
    if (
      Math.abs(roundToTwoDecimals(totalCustomAmount) - parsedTotalAmount) > 0.01
    ) {
      throw new Error("Custom shares must add up to the total expense amount.");
    }
    calculatedShares = participants.map((userId) => {
      const shareAmount = roundToTwoDecimals(
        Number.parseFloat(customShares[userId] || "0") // Ensure customShares[userId] is safely parsed
      );
      const sharePercentage =
        parsedTotalAmount > 0
          ? roundToTwoDecimals((shareAmount / parsedTotalAmount) * 100)
          : 0;
      return {
        user_id: userId,
        share_amount: shareAmount,
        share_percentage: sharePercentage,
      };
    });
  } else if (splitType === "percentage" && customShares) {
    const totalPercentage = Object.values(customShares).reduce(
      (sum, percentage) =>
        sum + roundToTwoDecimals(Number.parseFloat(percentage || "0")), // Ensure customShares[userId] is safely parsed
      0
    );
    if (Math.abs(roundToTwoDecimals(totalPercentage) - 100) > 0.01) {
      throw new Error("Custom percentages must add up to 100%.");
    }
    calculatedShares = participants.map((userId) => {
      const sharePercentage = roundToTwoDecimals(
        Number.parseFloat(customShares[userId] || "0") // Ensure customShares[userId] is safely parsed
      );
      const shareAmount = roundToTwoDecimals(
        (parsedTotalAmount * sharePercentage) / 100
      );
      return {
        user_id: userId,
        share_amount: shareAmount,
        share_percentage: sharePercentage,
      };
    });
  } else {
    // Fallback to equal split if splitType is invalid or customShares are missing
    console.warn(
      "Invalid splitType or missing customShares for non-equal split. Defaulting to equal split."
    );
    return calculateShares(totalAmount, participants, "equal");
  }

  return calculatedShares;
}

// Create expense
router.post("/", authenticateToken, checkSubscription, async (req, res) => {
  const {
    groupId,
    description,
    amount,
    category,
    payments,
    participants,
    splitType = "equal",
    customShares = null,
  } = req.body;
  const currentUserId = req.user.id;

  // Basic validation (already exists, but important)
  if (
    !groupId ||
    !description ||
    !amount ||
    Number.parseFloat(amount) <= 0 ||
    !payments ||
    !Array.isArray(payments) ||
    payments.length === 0 ||
    !participants ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    return res.status(400).json({
      message:
        "Missing required expense fields (group, description, amount, payments, participants).",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Authorization: User must be a member of the group
    const isMember = await client.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, currentUserId]
    );
    if (isMember.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Not authorized to add expenses to this group." });
    }

    let totalPaidAmount = 0;
    for (const payment of payments) {
      const parsedAmount = roundToTwoDecimals(
        Number.parseFloat(payment.amountPaid || "0") // Safely parse amountPaid
      );
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "Invalid payment amount provided." });
      }

      const isPayerMember = await client.query(
        "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
        [groupId, payment.userId]
      );
      if (isPayerMember.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Payer with ID ${payment.userId} must be a member of the group.`,
        });
      }
      totalPaidAmount += parsedAmount;
    }

    const expenseAmount = roundToTwoDecimals(Number.parseFloat(amount));
    if (Math.abs(roundToTwoDecimals(totalPaidAmount) - expenseAmount) > 0.01) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Total amount paid by payers ($${roundToTwoDecimals(
          totalPaidAmount
        )}) must equal the expense amount ($${expenseAmount}).`,
      });
    }

    // Validate all participants are members of the group
    for (const participantId of participants) {
      const isParticipantMember = await client.query(
        "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
        [groupId, participantId]
      );
      if (isParticipantMember.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "All participants must be members of the group." });
      }
    }

    // Calculate shares using the robust function
    const calculatedParticipants = calculateShares(
      expenseAmount, // Use the parsed and rounded expense amount
      participants,
      splitType,
      customShares
    );

    // Insert expense
    const newExpenseResult = await client.query(
      "INSERT INTO expenses (group_id, description, amount, category) VALUES ($1, $2, $3, $4) RETURNING id, description, amount, category, expense_date",
      [groupId, description, expenseAmount, category || "general"]
    );
    const newExpense = newExpenseResult.rows[0];

    // Insert participants (using rounded calculated shares)
    for (const participant of calculatedParticipants) {
      await client.query(
        "INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percentage) VALUES ($1, $2, $3, $4)",
        [
          newExpense.id,
          participant.user_id,
          roundToTwoDecimals(participant.share_amount),
          roundToTwoDecimals(participant.share_percentage),
        ]
      );
    }

    // Insert payments (using rounded amounts)
    for (const payment of payments) {
      await client.query(
        "INSERT INTO expense_payments (expense_id, user_id, amount_paid) VALUES ($1, $2, $3)",
        [
          newExpense.id,
          payment.userId,
          roundToTwoDecimals(Number.parseFloat(payment.amountPaid || "0")), // Safely parse amountPaid
        ]
      );
    }

    await client.query("COMMIT");

    // Fetch and return full expense details
    const payerDetails = await client.query(
      `SELECT DISTINCT u.id as user_id, u.name, epay.amount_paid
           FROM expense_payments epay
           JOIN users u ON epay.user_id = u.id
           WHERE epay.expense_id = $1`,
      [newExpense.id]
    );
    // Fetch and return participant details for the response
    const participantDetails = await client.query(
      `SELECT ep.user_id, u.name, ep.share_amount, ep.share_percentage
       FROM expense_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.expense_id = $1`,
      [newExpense.id]
    );

    res.status(201).json({
      message: "Expense added successfully.",
      expense: {
        id: newExpense.id,
        description: newExpense.description,
        amount: roundToTwoDecimals(newExpense.amount),
        category: newExpense.category,
        expense_date: newExpense.expense_date,
        payments: payerDetails.rows.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          amount_paid: roundToTwoDecimals(p.amount_paid),
        })),
        participants: participantDetails.rows.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          share_amount: roundToTwoDecimals(p.share_amount),
          share_percentage: roundToTwoDecimals(p.share_percentage),
        })),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add expense error:", error);
    res.status(500).json({
      message: error.message || "Server error during adding expense.",
    });
  } finally {
    client.release();
  }
});

// Get expenses for a group - SIMPLIFIED VERSION TO AVOID COMPLEX JOINS
router.get("/:groupId/expenses", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is member of group
    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (isMember.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Not authorized to view expenses for this group." });
    }
    // Build base query for expenses (filters logic removed for brevity, assume it's there)
    // ... your existing filter logic (category, startDate, endDate, search) ...

    let expensesQuery = `SELECT id, description, amount, category, expense_date FROM expenses WHERE group_id = $1`;
    const queryParams = [groupId];
    let paramIndex = 2; // Start from 2 for additional params

    // Re-add filters here (from your existing code)
    const { category, startDate, endDate, search } = req.query;
    if (category && category !== "all") {
      expensesQuery += ` AND category = $${paramIndex++}`;
      queryParams.push(category);
    }
    if (startDate) {
      expensesQuery += ` AND expense_date >= $${paramIndex++}`;
      queryParams.push(startDate);
    }
    if (endDate) {
      expensesQuery += ` AND expense_date <= $${paramIndex++}`;
      queryParams.push(endDate);
    }
    if (search && search.trim()) {
      expensesQuery += ` AND description ILIKE $${paramIndex++}`;
      queryParams.push(`%${search.trim()}%`);
    }
    expensesQuery += ` ORDER BY expense_date DESC`;

    const expensesResult = await query(expensesQuery, queryParams);
    // For each expense, get payments and participants separately

    const expenses = await Promise.all(
      expensesResult.rows.map(async (expense) => {
        try {
          // Get payments for this expense
          const paymentsResult = await query(
            `SELECT ep.user_id, u.name, ep.amount_paid
             FROM expense_payments ep
             JOIN users u ON ep.user_id = u.id
             WHERE ep.expense_id = $1`,
            [expense.id]
          );
          // Get participants for this expense

          const participantsResult = await query(
            `SELECT ep.user_id, u.name, ep.share_amount, ep.share_percentage
             FROM expense_participants ep
             JOIN users u ON ep.user_id = u.id
             WHERE ep.expense_id = $1`,
            [expense.id]
          );

          return {
            id: expense.id,
            description: expense.description,
            amount: roundToTwoDecimals(expense.amount),
            category: expense.category,
            expense_date: expense.expense_date,
            payments: paymentsResult.rows.map((p) => ({
              user_id: p.user_id,
              name: p.name,
              amount_paid: roundToTwoDecimals(p.amount_paid),
            })),
            participants: participantsResult.rows.map((p) => ({
              user_id: p.user_id,
              name: p.name,
              share_amount: roundToTwoDecimals(p.share_amount),
              share_percentage: roundToTwoDecimals(p.share_percentage),
            })),
          };
        } catch (error) {
          console.error(`Error processing expense ${expense.id}:`, error);
          return {
            // Return a fallback structure to avoid breaking the map
            id: expense.id,
            description: expense.description,
            amount: roundToTwoDecimals(expense.amount),
            category: expense.category,
            expense_date: expense.expense_date,
            payments: [],
            participants: [],
          };
        }
      })
    );

    let stats;
    try {
      // Get stats
      const statsResult = await query(
        `SELECT
           COUNT(id) AS total_count,
           COALESCE(SUM(amount), 0) AS total_amount,
           COALESCE(AVG(amount), 0) AS average_amount,
           COUNT(DISTINCT category) AS categories_count
           FROM expenses
           WHERE group_id = $1`,
        [groupId]
      );
      stats = statsResult.rows[0];
    } catch (statsError) {
      console.error("Error fetching expense stats:", statsError);
      stats = {
        total_count: 0,
        total_amount: 0,
        average_amount: 0,
        categories_count: 0,
      }; // Provide fallback
    }

    let categories;
    try {
      // Get categories
      const categoriesResult = await query(
        `SELECT
           category,
           COUNT(id) AS expenses_count,
           COALESCE(SUM(amount), 0) AS total_amount,
           COALESCE(AVG(amount), 0) AS average_amount
           FROM expenses
           WHERE group_id = $1
           GROUP BY category
           ORDER BY category ASC`,
        [groupId]
      );
      categories = categoriesResult.rows.map((cat) => ({
        category: cat.category,
        expenses_count: Number.parseInt(cat.expenses_count, 10),
        total_amount: roundToTwoDecimals(cat.total_amount),
        average_amount: roundToTwoDecimals(cat.average_amount),
      }));
    } catch (categoriesError) {
      console.error("Error fetching expense categories:", categoriesError);
      categories = []; // Provide fallback
    }

    res.status(200).json({
      expenses,
      stats: {
        totalCount: Number.parseInt(stats.total_count, 10),
        totalAmount: roundToTwoDecimals(stats.total_amount),
        averageAmount: roundToTwoDecimals(stats.average_amount),
        categoriesCount: Number.parseInt(stats.categories_count, 10),
      },
      categories,
    });
  } catch (error) {
    console.error("Get group expenses error (outer catch block):", error);
    res.status(500).json({
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Server error while fetching expenses.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get single expense details
router.get("/:expenseId", authenticateToken, async (req, res) => {
  const { expenseId } = req.params;
  const userId = req.user.id;

  try {
    // Get basic expense info
    const expenseResult = await query(
      `SELECT id, description, amount, category, group_id, expense_date
           FROM expenses
           WHERE id = $1`,
      [expenseId]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }

    const expense = expenseResult.rows[0];
    // Check if user is member of the group

    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [expense.group_id, userId]
    );
    if (isMember.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this expense." });
    }
    // Get payments

    const paymentsResult = await query(
      `SELECT ep.user_id, u.name, ep.amount_paid
           FROM expense_payments ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.expense_id = $1`,
      [expenseId]
    );
    // Get participants

    const participantsResult = await query(
      `SELECT ep.user_id, u.name, ep.share_amount, ep.share_percentage
           FROM expense_participants ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.expense_id = $1`,
      [expenseId]
    );

    res.status(200).json({
      id: expense.id,
      description: expense.description,
      amount: roundToTwoDecimals(expense.amount),
      category: expense.category,
      group_id: expense.group_id,
      expense_date: expense.expense_date,
      payments: paymentsResult.rows.map((p) => ({
        user_id: p.user_id,
        name: p.name,
        amount_paid: roundToTwoDecimals(p.amount_paid),
      })),
      participants: participantsResult.rows.map((p) => ({
        user_id: p.user_id,
        name: p.name,
        share_amount: roundToTwoDecimals(p.share_amount),
        share_percentage: roundToTwoDecimals(p.share_percentage),
      })),
    });
  } catch (error) {
    console.error("Get expense details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching expense details." });
  }
});

// Calculate and return balances for a group
router.get("/:groupId/balances", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // First, verify the user is a member of the group
    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (isMember.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Not authorized to view balances for this group." });
    }
    // Fetch all members of the group to initialize balances

    let membersResult;
    try {
      membersResult = await query(
        `SELECT u.id AS user_id, u.name, u.email
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = $1`,
        [groupId]
      );
    } catch (dbError) {
      console.error("Error fetching group members for balances:", dbError);
      return res.status(500).json({
        message:
          process.env.NODE_ENV === "development"
            ? dbError.message
            : "Server error: Could not fetch members for balances.",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }

    let balances = membersResult.rows.map((member) => ({
      user_id: member.user_id,
      name: member.name,
      email: member.email,
      total_paid: 0,
      total_owed: 0,
      balance: 0,
    }));

    const balanceMap = new Map(balances.map((b) => [b.user_id, b]));
    // Get all payments made in this group

    let paymentsResult;
    try {
      paymentsResult = await query(
        `SELECT ep.user_id, ep.amount_paid
           FROM expense_payments ep
           JOIN expenses e ON ep.expense_id = e.id
           WHERE e.group_id = $1`,
        [groupId]
      );
    } catch (dbError) {
      console.error("Error fetching payments for balances:", dbError);
      return res.status(500).json({
        message:
          process.env.NODE_ENV === "development"
            ? dbError.message
            : "Server error: Could not fetch payments for balances.",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }
    // Aggregate total paid amounts

    paymentsResult.rows.forEach((payment) => {
      if (balanceMap.has(payment.user_id)) {
        balanceMap.get(payment.user_id).total_paid = roundToTwoDecimals(
          balanceMap.get(payment.user_id).total_paid +
            Number.parseFloat(payment.amount_paid)
        );
      }
    });
    // Get all shares owed by participants in this group

    let sharesResult;
    try {
      sharesResult = await query(
        `SELECT ep.user_id, ep.share_amount
           FROM expense_participants ep
           JOIN expenses e ON ep.expense_id = e.id
           WHERE e.group_id = $1`,
        [groupId]
      );
    } catch (dbError) {
      console.error("Error fetching shares for balances:", dbError);
      return res.status(500).json({
        message:
          process.env.NODE_ENV === "development"
            ? dbError.message
            : "Server error: Could not fetch shares for balances.",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
      });
    }
    // Aggregate total owed amounts

    sharesResult.rows.forEach((share) => {
      if (balanceMap.has(share.user_id)) {
        balanceMap.get(share.user_id).total_owed = roundToTwoDecimals(
          balanceMap.get(share.user_id).total_owed +
            Number.parseFloat(share.share_amount)
        );
      }
    });
    // Calculate final balance for each member

    balances = Array.from(balanceMap.values()).map((b) => ({
      ...b,
      balance: roundToTwoDecimals(b.total_paid - b.total_owed),
    }));

    res.status(200).json({ balances });
  } catch (error) {
    console.error("Get group balances error (outer catch block):", error);
    res.status(500).json({
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Server error while fetching balances.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Update expense - Now only CREATOR or ORIGINAL PAYER can update
router.put(
  "/:expenseId",
  authenticateToken,
  checkSubscription,
  async (req, res) => {
    const { expenseId } = req.params;
    const {
      description,
      amount,
      category,
      payments,
      participants,
      splitType = "equal",
      customShares = null,
    } = req.body;
    const currentUserId = req.user.id;

    if (
      !description ||
      !amount ||
      Number.parseFloat(amount) <= 0 ||
      !payments ||
      !Array.isArray(payments) ||
      payments.length === 0 ||
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return res.status(400).json({
        message:
          "Missing required expense fields (description, amount, payments, participants).",
      });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Wrap the initial expense fetch in a try-catch for more specific errors
      let expenseResult;
      try {
        expenseResult = await client.query(
          "SELECT group_id FROM expenses WHERE id = $1",
          [expenseId]
        );
      } catch (dbError) {
        console.error(
          "Error fetching expense for update (expenseResult):",
          dbError
        );
        await client.query("ROLLBACK");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : "Server error: Could not verify expense existence.",
          error:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : undefined,
        });
      }

      if (expenseResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Expense not found." });
      }

      const expense = expenseResult.rows[0];
      const groupId = expense.group_id;

      // Wrap authorization checks in try-catch
      let isCreator, isOriginalPayer;
      try {
        isCreator = await isCreatorOfGroup(currentUserId, groupId);
        isOriginalPayer = await client.query(
          "SELECT 1 FROM expense_payments WHERE expense_id = $1 AND user_id = $2",
          [expenseId, currentUserId]
        );
      } catch (authError) {
        console.error(
          "Error during expense update authorization checks:",
          authError
        );
        await client.query("ROLLBACK");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? authError.message
              : "Server error during authorization.",
          error:
            process.env.NODE_ENV === "development"
              ? authError.message
              : undefined,
        });
      }

      if (!isCreator && isOriginalPayer.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message:
            "Only the group creator or an original payer can update this expense.",
        });
      }
      // Validate payments total - this is client-side validation logic that throws a normal Error

      let totalPaidAmount = 0;
      for (const payment of payments) {
        totalPaidAmount += roundToTwoDecimals(
          Number.parseFloat(payment.amountPaid || "0") // Safely parse amountPaid
        );
      }

      const expenseAmount = roundToTwoDecimals(Number.parseFloat(amount));
      if (
        Math.abs(roundToTwoDecimals(totalPaidAmount) - expenseAmount) > 0.01
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Total amount paid ($${roundToTwoDecimals(
            totalPaidAmount
          )}) must equal the expense amount ($${expenseAmount}).`,
        });
      }

      let calculatedParticipants;
      try {
        calculatedParticipants = calculateShares(
          expenseAmount,
          participants,
          splitType,
          customShares
        );
      } catch (calcError) {
        console.error("Error calculating shares:", calcError);
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Error in share calculation: ${calcError.message}`,
          error:
            process.env.NODE_ENV === "development"
              ? calcError.message
              : undefined,
        });
      }

      let updateExpenseResult;
      try {
        // Update expense
        updateExpenseResult = await client.query(
          "UPDATE expenses SET description = $1, amount = $2, category = $3 WHERE id = $4 RETURNING id, description, amount, category, expense_date",
          [description, expenseAmount, category, expenseId]
        );
      } catch (dbError) {
        console.error("Error updating expense in DB:", dbError);
        await client.query("ROLLBACK");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : "Server error: Could not update expense details.",
          error:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : undefined,
        });
      }
      const updatedExpense = updateExpenseResult.rows[0];

      try {
        // Delete and recreate participants
        await client.query(
          "DELETE FROM expense_participants WHERE expense_id = $1",
          [expenseId]
        );
        for (const participant of calculatedParticipants) {
          await client.query(
            "INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percentage) VALUES ($1, $2, $3, $4)",
            [
              updatedExpense.id,
              participant.user_id,
              roundToTwoDecimals(participant.share_amount),
              roundToTwoDecimals(participant.share_percentage),
            ]
          );
        }
      } catch (dbError) {
        console.error("Error updating expense participants in DB:", dbError);
        await client.query("ROLLBACK");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : "Server error: Could not update expense participants.",
          error:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : undefined,
        });
      }

      try {
        // Delete and recreate payments
        await client.query(
          "DELETE FROM expense_payments WHERE expense_id = $1",
          [expenseId]
        );
        for (const payment of payments) {
          await client.query(
            "INSERT INTO expense_payments (expense_id, user_id, amount_paid) VALUES ($1, $2, $3)",
            [
              expenseId,
              payment.userId,
              roundToTwoDecimals(Number.parseFloat(payment.amountPaid || "0")), // Safely parse amountPaid
            ]
          );
        }
      } catch (dbError) {
        console.error("Error updating expense payments in DB:", dbError);
        await client.query("ROLLBACK");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : "Server error: Could not update expense payments.",
          error:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : undefined,
        });
      }

      await client.query("COMMIT");

      let payerDetails, participantDetails;
      try {
        // Get updated payment details
        payerDetails = await client.query(
          `SELECT u.id as user_id, u.name, ep.amount_paid
           FROM expense_payments ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.expense_id = $1`,
          [updatedExpense.id]
        );

        // Get updated participant details
        participantDetails = await client.query(
          `SELECT ep.user_id, u.name, ep.share_amount, ep.share_percentage
             FROM expense_participants ep
             JOIN users u ON ep.user_id = u.id
             WHERE ep.expense_id = $1`,
          [updatedExpense.id]
        );
      } catch (dbError) {
        console.error(
          "Error fetching updated expense details for response:",
          dbError
        );
        // Do not rollback here, as the transaction is already committed. Just send a partial response or warn.
        return res.status(200).json({
          message:
            "Expense updated successfully, but failed to fetch full updated details.",
          expense: {
            id: updatedExpense.id,
            description: updatedExpense.description,
            amount: roundToTwoDecimals(updatedExpense.amount),
            category: updatedExpense.category,
            expense_date: updatedExpense.expense_date,
            payments: [], // Indicate partial data
            participants: [], // Indicate partial data
          },
        });
      }

      res.status(200).json({
        message: "Expense updated successfully.",
        expense: {
          id: updatedExpense.id,
          description: updatedExpense.description,
          amount: roundToTwoDecimals(updatedExpense.amount),
          category: updatedExpense.category,
          expense_date: updatedExpense.expense_date,
          payments: payerDetails.rows.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            amount_paid: roundToTwoDecimals(p.amount_paid),
          })),
          participants: participantDetails.rows.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            share_amount: roundToTwoDecimals(p.share_amount),
            share_percentage: roundToTwoDecimals(p.share_percentage),
          })),
        },
      });
    } catch (error) {
      // This outer catch handles general errors or those missed by inner catches
      await client.query("ROLLBACK");
      console.error("Update expense error (outer catch block):", error);
      res.status(500).json({
        message: error.message || "Server error during updating expense.",
      });
    } finally {
      client.release();
    }
  }
);

// Delete expense - Now only CREATOR or ORIGINAL PAYER can delete
router.delete("/:expenseId", authenticateToken, async (req, res) => {
  const { expenseId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expenseResult = await client.query(
      "SELECT group_id FROM expenses WHERE id = $1",
      [expenseId]
    );
    const expense = expenseResult.rows[0];
    if (!expense) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Expense not found." });
    }

    const groupId = expense.group_id; // Get group ID from expense
    // Authorization: Creator of the group OR original payer

    const isCreator = await isCreatorOfGroup(userId, groupId);
    const isOriginalPayer = await client.query(
      "SELECT 1 FROM expense_payments WHERE expense_id = $1 AND user_id = $2",
      [expenseId, userId]
    );

    if (!isCreator && isOriginalPayer.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message:
          "Only the group creator or an original payer can delete this expense.",
      });
    }

    const deleteResult = await client.query(
      "DELETE FROM expenses WHERE id = $1 RETURNING id",
      [expenseId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Expense not found." });
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Expense deleted successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Server error while deleting expense." });
  } finally {
    client.release();
  }
});

// Redistribute expense - Now only CREATOR or ORIGINAL PAYER can redistribute
router.put(
  "/:expenseId/redistribute",
  authenticateToken,
  checkSubscription,
  async (req, res) => {
    const { expenseId } = req.params;
    const { participants, splitType = "equal", customShares = null } = req.body;
    const currentUserId = req.user.id;

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return res.status(400).json({ message: "Participants are required." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const expenseResult = await client.query(
        "SELECT group_id, amount FROM expenses WHERE id = $1",
        [expenseId]
      );
      const expense = expenseResult.rows[0];
      if (!expense) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Expense not found." });
      }

      const groupId = expense.group_id; // Get group ID from expense
      // Authorization: Creator of the group OR original payer

      const isCreator = await isCreatorOfGroup(currentUserId, groupId);
      const isOriginalPayer = await client.query(
        "SELECT 1 FROM expense_payments WHERE expense_id = $1 AND user_id = $2",
        [expenseId, currentUserId]
      );

      if (!isCreator && isOriginalPayer.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message:
            "Only the group creator or an original payer can redistribute this expense.",
        });
      }

      const calculatedParticipants = calculateShares(
        roundToTwoDecimals(Number.parseFloat(expense.amount)),
        participants,
        splitType,
        customShares
      );
      // Delete and recreate participants

      await client.query(
        "DELETE FROM expense_participants WHERE expense_id = $1",
        [expenseId]
      );
      for (const participant of calculatedParticipants) {
        await client.query(
          "INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percentage) VALUES ($1, $2, $3, $4)",
          [
            expenseId,
            participant.user_id,
            roundToTwoDecimals(participant.share_amount),
            roundToTwoDecimals(participant.share_percentage),
          ]
        );
      }

      await client.query("COMMIT");

      res.status(200).json({
        message: "Expense redistributed successfully.",
        participants: calculatedParticipants,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Redistribute expense error:", error);
      res.status(500).json({
        message: error.message || "Server error during redistributing expense.",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
