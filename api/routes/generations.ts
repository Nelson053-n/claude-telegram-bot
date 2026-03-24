import { Router } from "express";
import {
  createGeneration,
  getGeneration,
  getUserGenerations,
  updateGeneration,
  deductTokens,
  addTokens,
} from "../models";
import { AuthRequest } from "../middleware";

const router = Router();

// POST /api/generations
// Create a new generation
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { prompt, tokensRequired = 100 } = req.body;
    const userId = req.userId!;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // Check token balance
    if (!await deductTokens(userId, tokensRequired, "generation")) {
      return res.status(402).json({ error: "Insufficient token balance" });
    }

    // Create generation
    const generation = await createGeneration(userId, prompt);

    // TODO: In real implementation, trigger Claude generation here
    // For now, return pending generation

    res.status(201).json({
      id: generation.id,
      status: generation.status,
      prompt: generation.prompt,
      createdAt: generation.created_at,
    });
  } catch (err: any) {
    console.error("Generation error:", err);
    res.status(500).json({ error: "Failed to create generation" });
  }
});

// GET /api/generations/:id
// Get generation by ID
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const generation = await getGeneration(parseInt(id));
    if (!generation || generation.user_id !== userId) {
      return res.status(404).json({ error: "Generation not found" });
    }

    res.json({
      id: generation.id,
      prompt: generation.prompt,
      result: generation.result,
      status: generation.status,
      tokensUsed: generation.tokens_used,
      createdAt: generation.created_at,
      completedAt: generation.completed_at,
    });
  } catch (err: any) {
    console.error("Get generation error:", err);
    res.status(500).json({ error: "Failed to fetch generation" });
  }
});

// GET /api/generations
// List user's generations
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const generations = await getUserGenerations(userId, limit, offset);

    res.json({
      generations: generations.map(g => ({
        id: g.id,
        prompt: g.prompt,
        result: g.result,
        status: g.status,
        tokensUsed: g.tokens_used,
        createdAt: g.created_at,
        completedAt: g.completed_at,
      })),
      count: generations.length,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("List generations error:", err);
    res.status(500).json({ error: "Failed to fetch generations" });
  }
});

export default router;
