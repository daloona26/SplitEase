const cron = require("node-cron");
const { query, pool } = require("../src/db");

// Helper to round to 2 decimal places
const roundToTwoDecimals = (num) => Math.round(num * 100) / 100;

// Helper to calculate shares
function calculateShares(
  totalAmount,
  participants,
  splitType = "equal",
  customShares = null
) {
  if (!participants || participants.length === 0) return [];

  const parsedTotalAmount = roundToTwoDecimals(parseFloat(totalAmount));
  const numParticipants = participants.length;
  let calculatedShares = [];

  if (splitType === "equal") {
    let baseShareAmount = roundToTwoDecimals(
      parsedTotalAmount / numParticipants
    );
    let baseSharePercentage = roundToTwoDecimals(100 / numParticipants);

    for (let i = 0; i < numParticipants; i++) {
      calculatedShares.push({
        user_id: participants[i],
        share_amount: baseShareAmount,
        share_percentage: baseSharePercentage,
      });
    }

    // Distribute remainder for share_amount
    let currentSumAmounts = calculatedShares.reduce(
      (sum, s) => sum + s.share_amount,
      0
    );
    let diffAmount = roundToTwoDecimals(parsedTotalAmount - currentSumAmounts);

    if (diffAmount !== 0) {
      for (let i = 0; i < calculatedShares.length && diffAmount !== 0; i++) {
        if (Math.abs(diffAmount) >= 0.01) {
          calculatedShares[i].share_amount = roundToTwoDecimals(
            calculatedShares[i].share_amount + (diffAmount > 0 ? 0.01 : -0.01)
          );
          diffAmount = roundToTwoDecimals(
            diffAmount + (diffAmount > 0 ? -0.01 : 0.01)
          );
        }
      }
    }
  } else if (splitType === "custom" && customShares) {
    calculatedShares = participants.map((userId) => {
      const shareAmount = roundToTwoDecimals(
        parseFloat(customShares[userId] || 0)
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
    calculatedShares = participants.map((userId) => {
      const sharePercentage = roundToTwoDecimals(
        parseFloat(customShares[userId] || 0)
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
  }

  return calculatedShares;
}

// Helper to calculate next execution date
const calculateNextExecution = (currentDate, frequency) => {
  const date = new Date(currentDate);

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

// Process recurring expenses
const processRecurringExpenses = async () => {
  console.log("🔄 Processing recurring expenses...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const today = new Date().toISOString().split("T")[0];

    // Get all active recurring expenses that are due
    const recurringExpensesResult = await client.query(
      `SELECT * FROM recurring_expenses 
       WHERE is_active = true 
       AND next_execution <= $1 
       AND (end_date IS NULL OR end_date >= $1)`,
      [today]
    );

    console.log(
      `📋 Found ${recurringExpensesResult.rows.length} recurring expenses to process`
    );

    for (const recurringExpense of recurringExpensesResult.rows) {
      try {
        const {
          id,
          group_id,
          name,
          amount,
          category,
          frequency,
          payer_id,
          participant_ids,
          split_type,
          custom_shares,
          next_execution,
        } = recurringExpense;

        const participants = JSON.parse(participant_ids);
        const parsedCustomShares = custom_shares
          ? JSON.parse(custom_shares)
          : null;

        console.log(
          `💰 Processing: ${name} ($${amount}) for group ${group_id}`
        );

        // Calculate shares
        const calculatedParticipants = calculateShares(
          amount,
          participants,
          split_type,
          parsedCustomShares
        );

        // Create the expense
        const newExpenseResult = await client.query(
          `INSERT INTO expenses (group_id, description, amount, category, expense_date) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [group_id, name, roundToTwoDecimals(amount), category, today]
        );

        const expenseId = newExpenseResult.rows[0].id;

        // Insert payment (full amount paid by designated payer)
        await client.query(
          `INSERT INTO expense_payments (expense_id, user_id, amount_paid) 
           VALUES ($1, $2, $3)`,
          [expenseId, payer_id, roundToTwoDecimals(amount)]
        );

        // Insert participants
        for (const participant of calculatedParticipants) {
          await client.query(
            `INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percentage) 
             VALUES ($1, $2, $3, $4)`,
            [
              expenseId,
              participant.user_id,
              roundToTwoDecimals(participant.share_amount),
              roundToTwoDecimals(participant.share_percentage),
            ]
          );
        }

        // Update next execution date
        const newNextExecution = calculateNextExecution(
          next_execution,
          frequency
        );
        await client.query(
          `UPDATE recurring_expenses 
           SET next_execution = $1, last_executed = $2 
           WHERE id = $3`,
          [newNextExecution, today, id]
        );

        console.log(
          `✅ Created expense for "${name}" - Next execution: ${newNextExecution}`
        );
      } catch (error) {
        console.error(
          `❌ Error processing recurring expense ${recurringExpense.name}:`,
          error
        );
        // Continue with other recurring expenses
      }
    }

    await client.query("COMMIT");
    console.log("✅ Recurring expenses processing completed");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error in recurring expenses job:", error);
  } finally {
    client.release();
  }
};

// Schedule to run every day at 9:00 AM
const startRecurringExpensesJob = () => {
  console.log("🚀 Starting recurring expenses cron job...");

  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", processRecurringExpenses, {
    scheduled: true,
    timezone: "America/New_York",
  });

  // Also run every hour during development for testing
  if (process.env.NODE_ENV === "development") {
    cron.schedule("0 * * * *", processRecurringExpenses, {
      scheduled: true,
      timezone: "America/New_York",
    });
  }

  console.log("⏰ Recurring expenses cron job scheduled");
};

module.exports = {
  startRecurringExpensesJob,
  processRecurringExpenses,
};
