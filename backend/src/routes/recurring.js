const express = require("express");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");
const checkSubscription = require("../middleware/checkSubscription");

const router = express.Router();

// Helper to calculate next execution date
const calculateNextExecution = (startDate, frequency) => {
  const date = new Date(startDate);
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split("T")[0];
};

// Get recurring expenses for a group
router.get("/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is a member of the group
    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );

    if (isMember.rows.length === 0) {
      return res.status(403).json({
        message: "Not authorized to view recurring expenses for this group",
      });
    }

    // Get recurring expenses with proper error handling
    const result = await query(
      `SELECT 
        re.*, 
        COALESCE(u.name, 'Unknown') AS payer_name
       FROM recurring_expenses re
       LEFT JOIN users u ON re.payer_id = u.id
       WHERE re.group_id = $1
       ORDER BY re.next_execution ASC`,
      [groupId]
    );

    // Process the results with better error handling for JSON parsing
    const recurringExpenses = result.rows.map((row) => {
      let participantIds = [];
      let customShares = null;

      // Safely parse participant_ids
      try {
        if (row.participant_ids) {
          if (typeof row.participant_ids === "string") {
            participantIds = JSON.parse(row.participant_ids);
          } else if (Array.isArray(row.participant_ids)) {
            participantIds = row.participant_ids;
          }
        }
      } catch (e) {
        console.warn(
          "Invalid JSON for participant_ids:",
          row.id,
          row.participant_ids,
          e.message
        );
        participantIds = [];
      }

      // Safely parse custom_shares
      try {
        if (row.custom_shares) {
          if (typeof row.custom_shares === "string") {
            customShares = JSON.parse(row.custom_shares);
          } else if (typeof row.custom_shares === "object") {
            customShares = row.custom_shares;
          }
        }
      } catch (e) {
        console.warn(
          "Invalid JSON for custom_shares:",
          row.id,
          row.custom_shares,
          e.message
        );
        customShares = null;
      }

      return {
        id: row.id,
        name: row.name,
        amount: parseFloat(row.amount) || 0,
        category: row.category || "general",
        frequency: row.frequency || "monthly",
        start_date: row.start_date,
        end_date: row.end_date,
        next_execution: row.next_execution,
        is_active: Boolean(row.is_active),
        payer_id: row.payer_id,
        payer_name: row.payer_name,
        participant_ids: participantIds,
        split_type: row.split_type || "equal",
        custom_shares: customShares,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    res.json({ recurringExpenses });
  } catch (error) {
    console.error("Get recurring expenses error:", error.message, error.stack);
    res.status(500).json({
      message: "Failed to fetch recurring expenses",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Create a new recurring expense
router.post("/", authenticateToken, async (req, res) => {
  const {
    groupId,
    name,
    amount,
    category,
    frequency,
    start_date,
    end_date,
    payer_id,
    participant_ids,
    split_type,
    custom_shares,
  } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is a member of the group
    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );

    if (isMember.rows.length === 0) {
      return res.status(403).json({
        message: "Not authorized to create recurring expenses for this group",
      });
    }

    // Calculate next execution date
    const nextExecution = calculateNextExecution(start_date, frequency);

    // Insert the recurring expense
    const result = await query(
      `INSERT INTO recurring_expenses 
       (group_id, name, amount, category, frequency, start_date, end_date, next_execution, 
        payer_id, participant_ids, split_type, custom_shares, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING *`,
      [
        groupId,
        name,
        amount,
        category,
        frequency,
        start_date,
        end_date,
        nextExecution,
        payer_id,
        JSON.stringify(participant_ids),
        split_type,
        custom_shares ? JSON.stringify(custom_shares) : null,
      ]
    );

    res.status(201).json({
      message: "Recurring expense created successfully",
      recurringExpense: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create recurring expense error:",
      error.message,
      error.stack
    );
    res.status(500).json({
      message: "Failed to create recurring expense",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Update a recurring expense
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updates = req.body;

  try {
    // Check if the recurring expense exists and user has access
    const existingExpense = await query(
      `SELECT re.*, gm.user_id 
       FROM recurring_expenses re
       JOIN group_members gm ON re.group_id = gm.group_id
       WHERE re.id = $1 AND gm.user_id = $2`,
      [id, userId]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({
        message: "Recurring expense not found or access denied",
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && key !== "id") {
        updateFields.push(`${key} = $${paramIndex}`);
        if (key === "participant_ids" || key === "custom_shares") {
          updateValues.push(updates[key] ? JSON.stringify(updates[key]) : null);
        } else {
          updateValues.push(updates[key]);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE recurring_expenses 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    res.json({
      message: "Recurring expense updated successfully",
      recurringExpense: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Update recurring expense error:",
      error.message,
      error.stack
    );
    res.status(500).json({
      message: "Failed to update recurring expense",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Delete a recurring expense
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if the recurring expense exists and user has access
    const existingExpense = await query(
      `SELECT re.*, gm.user_id 
       FROM recurring_expenses re
       JOIN group_members gm ON re.group_id = gm.group_id
       WHERE re.id = $1 AND gm.user_id = $2`,
      [id, userId]
    );

    if (existingExpense.rows.length === 0) {
      return res.status(404).json({
        message: "Recurring expense not found or access denied",
      });
    }

    // Delete the recurring expense
    await query("DELETE FROM recurring_expenses WHERE id = $1", [id]);

    res.json({ message: "Recurring expense deleted successfully" });
  } catch (error) {
    console.error(
      "Delete recurring expense error:",
      error.message,
      error.stack
    );
    res.status(500).json({
      message: "Failed to delete recurring expense",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
