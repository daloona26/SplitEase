// backend/routes/activity.js - FIXED VERSION for your database schema

const express = require("express");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Get recent activity for the authenticated user
router.get("/recent", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  const limit = Math.min(Number.parseInt(req.query.limit) || 10, 50); // Cap at 50

  if (!userId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  try {
    console.log(`Fetching recent activity for user ${userId}, limit: ${limit}`);

    // Start with an empty array
    let activities = [];

    // FIXED: Get recent expenses from groups the user is a member of
    // Using expense_payments table instead of non-existent payer_user_id
    try {
      const expensesQuery = `
        SELECT DISTINCT
          e.id,
          'expense' as type,
          CONCAT('New expense "', e.description, '" added for $', e.amount::text) as description,
          e.amount,
          g.name as group_name,
          e.expense_date as created_at,
          COALESCE(payer_names.names, 'Unknown') as actor_name
        FROM expenses e
        JOIN groups g ON e.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN (
          SELECT 
            ep.expense_id,
            STRING_AGG(u.name, ', ') as names
          FROM expense_payments ep
          JOIN users u ON ep.user_id = u.id
          GROUP BY ep.expense_id
        ) payer_names ON e.id = payer_names.expense_id
        WHERE gm.user_id = $1 
        AND e.expense_date >= NOW() - INTERVAL '7 days'
        ORDER BY e.expense_date DESC
        LIMIT $2
      `;

      const expensesResult = await query(expensesQuery, [userId, limit]);

      if (expensesResult.rows) {
        const expenseActivities = expensesResult.rows.map((row) => ({
          id: `expense_${row.id}`,
          type: row.type,
          description: row.description,
          amount: row.amount ? Number.parseFloat(row.amount) : null,
          group_name: row.group_name,
          created_at: row.created_at,
          actor_name: row.actor_name,
        }));
        activities = [...activities, ...expenseActivities];
      }

      console.log(
        `Found ${expensesResult.rows?.length || 0} recent expense activities`
      );
    } catch (expenseError) {
      console.error("Error fetching expense activities:", expenseError);
      // Continue with other activities
    }

    // Get recent group creations
    try {
      if (activities.length < limit) {
        const groupsQuery = `
          SELECT 
            g.id,
            'group' as type,
            CONCAT('Group "', g.name, '" was created') as description,
            NULL as amount,
            g.name as group_name,
            g.created_at,
            u.name as actor_name
          FROM groups g
          JOIN group_members gm ON g.id = gm.group_id
          JOIN users u ON g.creator_user_id = u.id
          WHERE gm.user_id = $1 
          AND g.created_at >= NOW() - INTERVAL '7 days'
          ORDER BY g.created_at DESC
          LIMIT $2
        `;

        const groupsResult = await query(groupsQuery, [
          userId,
          limit - activities.length,
        ]);

        if (groupsResult.rows) {
          const groupActivities = groupsResult.rows.map((row) => ({
            id: `group_${row.id}`,
            type: row.type,
            description: row.description,
            amount: null,
            group_name: row.group_name,
            created_at: row.created_at,
            actor_name: row.actor_name,
          }));
          activities = [...activities, ...groupActivities];
        }

        console.log(
          `Found ${groupsResult.rows?.length || 0} recent group activities`
        );
      }
    } catch (groupError) {
      console.error("Error fetching group activities:", groupError);
      // Continue with existing activities
    }

    // Get recent member additions (simplified to avoid complex joins)
    try {
      if (activities.length < limit) {
        const memberQuery = `
          SELECT 
            CONCAT(gm.group_id, '_', gm.user_id) as id,
            'member' as type,
            CONCAT(u.name, ' joined "', g.name, '"') as description,
            NULL as amount,
            g.name as group_name,
            gm.joined_at as created_at,
            u.name as actor_name
          FROM group_members gm
          JOIN groups g ON gm.group_id = g.id
          JOIN users u ON gm.user_id = u.id
          WHERE gm.group_id IN (
            SELECT group_id FROM group_members WHERE user_id = $1
          )
          AND gm.user_id != $1  -- Don't show user joining their own groups
          AND gm.joined_at >= NOW() - INTERVAL '7 days'
          ORDER BY gm.joined_at DESC
          LIMIT $2
        `;

        const memberResult = await query(memberQuery, [
          userId,
          limit - activities.length,
        ]);

        if (memberResult.rows) {
          const memberActivities = memberResult.rows.map((row) => ({
            id: `member_${row.id}`,
            type: row.type,
            description: row.description,
            amount: null,
            group_name: row.group_name,
            created_at: row.created_at,
            actor_name: row.actor_name,
          }));
          activities = [...activities, ...memberActivities];
        }

        console.log(
          `Found ${memberResult.rows?.length || 0} recent member activities`
        );
      }
    } catch (memberError) {
      console.error("Error fetching member activities:", memberError);
      // Continue with existing activities
    }

    // Sort all activities by date and limit
    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    activities = activities.slice(0, limit);

    console.log(`Returning ${activities.length} total activities`);

    res.status(200).json(activities);
  } catch (error) {
    console.error("Get recent activity error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId: userId,
    });

    // Return empty array instead of error to prevent dashboard crash
    res.status(200).json([]);
  }
});

module.exports = router;
