import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config_api } from "../config";
import { getUserByTelegramId, createUser } from "../models";
import { AuthRequest } from "../middleware";

const router = Router();

// POST /api/auth/telegram
// Authenticate user via Telegram
router.post("/telegram", async (req: Request, res: Response) => {
  try {
    const { telegramId, username } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    // Get or create user
    let user = await getUserByTelegramId(telegramId);
    if (!user) {
      user = await createUser(telegramId, username);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, config_api.jwt.secret, {
      expiresIn: config_api.jwt.expiresIn,
    });

    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        email: user.email,
        tokenBalance: user.token_balance,
      },
    });
  } catch (err: any) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// POST /api/auth/refresh
// Refresh JWT token
router.post("/refresh", (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    // Verify and decode current token
    const decoded = jwt.verify(token, config_api.jwt.secret, {
      ignoreExpiration: true,
    }) as { userId: number };

    // Issue new token
    const newToken = jwt.sign({ userId: decoded.userId }, config_api.jwt.secret, {
      expiresIn: config_api.jwt.expiresIn,
    });

    res.json({ token: newToken });
  } catch (err: any) {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
