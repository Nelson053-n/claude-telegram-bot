import { Router } from "express";
import { getUserById, updateUserEmail, getUserStats } from "../models";
import { AuthRequest } from "../middleware";

const router = Router();

// GET /api/users/me
// Get current user profile
router.get("/me", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = await getUserStats(userId);

    res.json({
      id: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      email: user.email,
      tokenBalance: user.token_balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      stats,
    });
  } catch (err: any) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// PUT /api/users/me
// Update user profile
router.put("/me", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { email } = req.body;

    if (email) {
      const user = await updateUserEmail(userId, email);
      return res.json({
        id: user.id,
        email: user.email,
        updatedAt: user.updated_at,
      });
    }

    res.status(400).json({ error: "Nothing to update" });
  } catch (err: any) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

// GET /api/users/stats
// Get user statistics
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const stats = await getUserStats(userId);

    res.json(stats);
  } catch (err: any) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
