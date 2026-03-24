/**
 * Bot Integration Module
 * Handles communication between Telegram bot and API server
 */

import { createGeneration, updateGeneration, getUserByTelegramId, addTokens } from "./models";

export interface GenerationTask {
  userId: number;
  telegramId: number;
  prompt: string;
  generationId: number;
}

/**
 * Save user interaction to database
 * Called when user sends a message (text or voice)
 */
export async function saveGenerationStart(telegramId: number, prompt: string): Promise<GenerationTask | null> {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return null;
    }

    const generation = await createGeneration(user.id, prompt);

    return {
      userId: user.id,
      telegramId,
      prompt,
      generationId: generation.id,
    };
  } catch (err) {
    console.error("Failed to save generation start:", err);
    return null;
  }
}

/**
 * Update generation with result
 * Called when Claude finishes processing
 */
export async function saveGenerationResult(
  generationId: number,
  result: string,
  tokensUsed: number,
  status: "completed" | "failed" = "completed"
): Promise<void> {
  try {
    const generation = await updateGeneration(generationId, result, tokensUsed, status);

    // Deduct tokens from user balance if completed
    if (status === "completed" && tokensUsed > 0) {
      // Note: tokens should already be deducted, this is for logging
      console.log(`Generation ${generationId} completed, tokens used: ${tokensUsed}`);
    }
  } catch (err) {
    console.error("Failed to save generation result:", err);
  }
}

/**
 * Ensure user exists in database
 * Called on first bot interaction
 */
export async function ensureUserExists(telegramId: number, username?: string): Promise<number | null> {
  try {
    let user = await getUserByTelegramId(telegramId);

    if (!user) {
      const { createUser } = await import("./models");
      user = await createUser(telegramId, username);
    }

    return user.id;
  } catch (err) {
    console.error("Failed to ensure user exists:", err);
    return null;
  }
}
