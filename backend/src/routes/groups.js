const express = require("express");
const { query, pool } = require("../db");
const authenticateToken = require("../middleware/auth");
const checkSubscription = require("../middleware/checkSubscription");

const router = express.Router();

// NEW Helper: Check if a user is the creator of a group
async function isCreatorOfGroup(userId, groupId) {
  try {
    const result = await query(
      "SELECT creator_user_id FROM groups WHERE id = $1",
      [groupId]
    );
    return result.rows.length > 0 && result.rows[0].creator_user_id === userId;
  } catch (error) {
    console.error("Error checking creator status:", error);
    return false;
  }
}

// Create Group Route
router.post("/", authenticateToken, checkSubscription, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: "Group name is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const newGroupResult = await client.query(
      "INSERT INTO groups (name, description, creator_user_id) VALUES ($1, $2, $3) RETURNING id, name, description, creator_user_id, created_at",
      [name, description || null, userId]
    );
    const newGroup = newGroupResult.rows[0];

    // Creator is always added as a 'member'. Special privileges come from `creator_user_id` in `groups` table.
    await client.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')", // Set role to 'member'
      [newGroup.id, userId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Group created successfully.",
      group: {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        creator_name: req.user.name,
        role: "member", // The creator's role in this group is now 'member' conceptually, but still holds creator power.
        creator_user_id: newGroup.creator_user_id, // Pass creator ID for frontend checks
        memberCount: 1,
        expensesCount: 0,
        totalAmount: 0,
        created_at: newGroup.created_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create group error:", error);
    res.status(500).json({ message: "Server error during group creation." });
  } finally {
    client.release();
  }
});

// Get User's Groups (Dashboard Groups List)
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    console.error("Get groups error: User ID is missing from request");
    return res.status(401).json({ message: "User authentication failed." });
  }

  try {
    console.log(`Fetching groups for user ID: ${userId}`);

    // Get basic group information
    const groupsResult = await query(
      `SELECT
          g.id,
          g.name,
          g.description,
          g.creator_user_id,
          g.created_at,
          gm.role, -- Still fetch role, but it will mostly be 'member'
          u.name AS creator_name
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        JOIN users u ON g.creator_user_id = u.id
        WHERE gm.user_id = $1
        ORDER BY g.created_at DESC`,
      [userId]
    );

    console.log(`Found ${groupsResult.rows.length} groups for user`);

    // For each group, get additional statistics separately
    const groups = await Promise.all(
      groupsResult.rows.map(async (group) => {
        try {
          // Get member count
          const memberCountResult = await query(
            "SELECT COUNT(*) as count FROM group_members WHERE group_id = $1",
            [group.id]
          );
          const memberCount =
            Number.parseInt(memberCountResult.rows[0].count, 10) || 0;

          // Get expenses count and total amount
          const expensesResult = await query(
            "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = $1",
            [group.id]
          );
          const expensesCount =
            Number.parseInt(expensesResult.rows[0].count, 10) || 0;
          const totalAmount =
            Number.parseFloat(expensesResult.rows[0].total) || 0;

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            creator_name: group.creator_name,
            role: group.role,
            creator_user_id: group.creator_user_id, // Include creator ID in response
            memberCount: memberCount,
            expensesCount: expensesCount,
            totalAmount: totalAmount,
            created_at: group.created_at,
          };
        } catch (error) {
          console.error(`Error fetching stats for group ${group.id}:`, error);
          // Return group with default values if stats fetch fails
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            creator_name: group.creator_name,
            role: group.role,
            creator_user_id: group.creator_user_id, // Maintain creator ID on error
            memberCount: 0,
            expensesCount: 0,
            totalAmount: 0,
            created_at: group.created_at,
          };
        }
      })
    );

    console.log(`Successfully processed ${groups.length} groups`);
    res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId: userId,
    });
    res.status(500).json({ message: "Server error while fetching groups." });
  }
});

// Get Single Group Details
router.get("/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  try {
    // Get single group
    const groupResult = await query(
      `SELECT
          g.id,
          g.name,
          g.description,
          g.creator_user_id,
          g.created_at,
          gm.role,
          u.name AS creator_name
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        JOIN users u ON g.creator_user_id = u.id
        WHERE g.id = $1 AND gm.user_id = $2`,
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Group not found or you are not a member." });
    }

    const group = groupResult.rows[0];

    // Get additional statistics
    const memberCountResult = await query(
      "SELECT COUNT(*) as count FROM group_members WHERE group_id = $1",
      [groupId]
    );
    const memberCount =
      Number.parseInt(memberCountResult.rows[0].count, 10) || 0;

    const expensesResult = await query(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = $1",
      [groupId]
    );
    const expensesCount =
      Number.parseInt(expensesResult.rows[0].count, 10) || 0;
    const totalAmount = Number.parseFloat(expensesResult.rows[0].total) || 0;

    res.status(200).json({
      id: group.id,
      name: group.name,
      description: group.description,
      creator_name: group.creator_name,
      role: group.role,
      creator_user_id: group.creator_user_id, // Include creator ID in response
      memberCount: memberCount,
      expensesCount: expensesCount,
      totalAmount: totalAmount,
      created_at: group.created_at,
    });
  } catch (error) {
    console.error("Get single group details error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching group details." });
  }
});

// Get Group Members
router.get("/:groupId/members", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  try {
    const isMember = await query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (isMember.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Not authorized to view members of this group." });
    }

    // Get basic member info
    const membersResult = await query(
      `SELECT
          u.id,
          u.name,
          u.email,
          gm.role,
          gm.joined_at
          FROM users u
          JOIN group_members gm ON gm.user_id = u.id
          WHERE gm.group_id = $1
          ORDER BY u.name ASC`,
      [groupId]
    );

    // For each member, fetch their financials (unchanged logic)
    const members = await Promise.all(
      membersResult.rows.map(async (member) => {
        const paidResult = await query(
          `SELECT COALESCE(SUM(ep.amount_paid), 0) AS total_paid
           FROM expense_payments ep
           JOIN expenses e ON ep.expense_id = e.id
           WHERE ep.user_id = $1 AND e.group_id = $2`,
          [member.id, groupId]
        );

        const owedResult = await query(
          `SELECT COALESCE(SUM(share_amount), 0) AS total_owed
           FROM expense_participants
           WHERE user_id = $1 AND expense_id IN (
             SELECT id FROM expenses WHERE group_id = $2
           )`,
          [member.id, groupId]
        );

        const expensesCountResult = await query(
          `SELECT COUNT(DISTINCT ep.expense_id) AS expenses_count
           FROM expense_participants ep
           JOIN expenses e ON e.id = ep.expense_id
           WHERE ep.user_id = $1 AND e.group_id = $2`,
          [member.id, groupId]
        );

        const total_paid = Number.parseFloat(paidResult.rows[0].total_paid);
        const total_owed = Number.parseFloat(owedResult.rows[0].total_owed);
        const expenses_count = Number.parseInt(
          expensesCountResult.rows[0].expenses_count,
          10
        );

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role, // Include the member's role
          joined_at: member.joined_at,
          total_paid,
          total_owed,
          balance: total_paid - total_owed,
          expenses_count,
        };
      })
    );

    res.status(200).json({ members });
  } catch (error) {
    console.error("Get group members error:", error);
    res.status(500).json({
      message: "Server error while fetching group members.",
      error: error.message,
    });
  }
});

// Removed: Update Member Role in Group route as per new requirements.
// router.put("/:groupId/members/:memberId/role", authenticateToken, async (req, res) => {
//   // This route is removed as per the user's request.
//   // If you need to re-add role management in the future, uncomment and update.
// });

// Add Member to Group - Now ONLY CREATOR can do this
router.post("/:groupId/members", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  if (!email) {
    return res.status(400).json({ message: "Member email is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // NEW AUTHORIZATION: Only the CREATOR can add members
    const isCreator = await isCreatorOfGroup(currentUserId, groupId);
    if (!isCreator) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Only the group creator can add members." });
    }

    // Find the user by email
    const userToAddResult = await client.query(
      "SELECT id, name FROM users WHERE email = $1",
      [email]
    );
    const userToAdd = userToAddResult.rows[0];

    if (!userToAdd) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "User with this email not found." });
    }

    // Check if user is already a member
    const alreadyMember = await client.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userToAdd.id]
    );
    if (alreadyMember.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "User is already a member of this group." });
    }

    // Add member to group (default role 'member')
    await client.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
      [groupId, userToAdd.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `${userToAdd.name} added to group successfully.`,
      member: {
        id: userToAdd.id,
        name: userToAdd.name,
        email: email,
        role: "member",
        joined_at: new Date().toISOString(),
        total_paid: 0,
        expenses_count: 0,
        total_owed: 0,
        balance: 0,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add member error:", error);
    res.status(500).json({ message: "Server error while adding member." });
  } finally {
    client.release();
  }
});

// Delete Group - Now ONLY CREATOR can do this
router.delete("/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // NEW AUTHORIZATION: Only the CREATOR can delete a group
    const isCreator = await isCreatorOfGroup(userId, groupId);
    if (!isCreator) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Only the group creator can delete a group." });
    }

    // Delete the group (ON DELETE CASCADE will handle associated records)
    const deleteResult = await client.query(
      "DELETE FROM groups WHERE id = $1 RETURNING id",
      [groupId]
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Group not found." });
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Group deleted successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete group error:", error);
    res.status(500).json({ message: "Server error while deleting group." });
  } finally {
    client.release();
  }
});

// Update Group - Now ONLY CREATOR can do this
router.put("/:groupId", authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User authentication failed." });
  }

  if (!name) {
    return res.status(400).json({ message: "Group name is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // NEW AUTHORIZATION: Only the CREATOR can update group details
    const isCreator = await isCreatorOfGroup(userId, groupId);
    if (!isCreator) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "Only the group creator can update group details." });
    }

    const updateResult = await client.query(
      "UPDATE groups SET name = $1, description = $2 WHERE id = $3 RETURNING id, name, description",
      [name, description || null, groupId]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Group not found." });
    }

    await client.query("COMMIT");
    res.status(200).json({
      message: "Group updated successfully.",
      group: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update group error:", error);
    res.status(500).json({ message: "Server error while updating group." });
  } finally {
    client.release();
  }
});

// Remove Member from Group - Now ONLY CREATOR can do this
router.delete(
  "/:groupId/members/:memberId",
  authenticateToken,
  async (req, res) => {
    const { groupId, memberId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "User authentication failed." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // NEW AUTHORIZATION: Only the CREATOR can remove members
      const isCreator = await isCreatorOfGroup(currentUserId, groupId);
      if (!isCreator) {
        await client.query("ROLLBACK");
        return res
          .status(403)
          .json({ message: "Only the group creator can remove members." });
      }

      // Prevent the creator from removing themselves from the group
      if (currentUserId === memberId) {
        // Check if the current user is also the creator of the group
        const creatorCheck = await client.query(
          "SELECT 1 FROM groups WHERE id = $1 AND creator_user_id = $2",
          [groupId, currentUserId]
        );
        if (creatorCheck.rows.length > 0) {
          // If the current user is the creator and attempting to remove themselves
          await client.query("ROLLBACK");
          return res.status(400).json({
            message:
              "The group creator cannot remove themselves from the group.",
          });
        }
      }

      const deleteResult = await client.query(
        "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING user_id",
        [groupId, memberId]
      );

      if (deleteResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Member not found in group." });
      }

      await client.query("COMMIT");
      res.status(200).json({ message: "Member removed successfully." });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Remove member error:", error);
      res.status(500).json({ message: "Server error while removing member." });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
