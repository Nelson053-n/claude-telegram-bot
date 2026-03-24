import { query } from "./db/client";

// Types
export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  email: string | null;
  token_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: number;
  user_id: number;
  prompt: string;
  result: string | null;
  tokens_used: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
}

export interface Payment {
  id: number;
  user_id: number;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  tokens_granted: number;
  status: "pending" | "succeeded" | "failed";
  created_at: string;
  completed_at: string | null;
}

// User operations
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const result = await query("SELECT * FROM users WHERE telegram_id = $1", [telegramId]);
  return result.rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function createUser(telegramId: number, username?: string): Promise<User> {
  const result = await query(
    "INSERT INTO users (telegram_id, username) VALUES ($1, $2) RETURNING *",
    [telegramId, username || null]
  );
  return result.rows[0];
}

export async function updateUserEmail(userId: number, email: string): Promise<User> {
  const result = await query(
    "UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [email, userId]
  );
  return result.rows[0];
}

// Token operations
export async function addTokens(userId: number, amount: number, reason: string, relatedId?: number): Promise<void> {
  await query(
    "UPDATE users SET token_balance = token_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [amount, userId]
  );
  await query(
    "INSERT INTO token_transactions (user_id, amount, reason, related_id) VALUES ($1, $2, $3, $4)",
    [userId, amount, reason, relatedId || null]
  );
}

export async function deductTokens(userId: number, amount: number, reason: string): Promise<boolean> {
  const userResult = await query("SELECT token_balance FROM users WHERE id = $1", [userId]);
  if (!userResult.rows[0] || userResult.rows[0].token_balance < amount) {
    return false; // Insufficient tokens
  }

  await query(
    "UPDATE users SET token_balance = token_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [amount, userId]
  );
  await query(
    "INSERT INTO token_transactions (user_id, amount, reason) VALUES ($1, $2, $3)",
    [userId, -amount, reason]
  );

  return true;
}

// Generation operations
export async function createGeneration(userId: number, prompt: string): Promise<Generation> {
  const result = await query(
    "INSERT INTO generations (user_id, prompt, status) VALUES ($1, $2, 'pending') RETURNING *",
    [userId, prompt]
  );
  return result.rows[0];
}

export async function updateGeneration(
  generationId: number,
  result: string,
  tokensUsed: number,
  status: "completed" | "failed"
): Promise<Generation> {
  const completedAt = status === "completed" ? "CURRENT_TIMESTAMP" : null;
  const query_text = completedAt
    ? "UPDATE generations SET result = $1, tokens_used = $2, status = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *"
    : "UPDATE generations SET result = $1, tokens_used = $2, status = $3 WHERE id = $4 RETURNING *";

  const result_query = await query(query_text, [result, tokensUsed, status, generationId]);
  return result_query.rows[0];
}

export async function getGeneration(generationId: number): Promise<Generation | null> {
  const result = await query("SELECT * FROM generations WHERE id = $1", [generationId]);
  return result.rows[0] || null;
}

export async function getUserGenerations(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<Generation[]> {
  const result = await query(
    "SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [userId, limit, offset]
  );
  return result.rows;
}

// Payment operations
export async function createPayment(
  userId: number,
  amount: number,
  tokensGranted: number,
  stripePaymentIntentId?: string
): Promise<Payment> {
  const result = await query(
    "INSERT INTO payments (user_id, amount, tokens_granted, stripe_payment_intent_id, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *",
    [userId, amount, tokensGranted, stripePaymentIntentId || null]
  );
  return result.rows[0];
}

export async function updatePaymentStatus(
  paymentId: number,
  status: "succeeded" | "failed"
): Promise<Payment> {
  const result = await query(
    "UPDATE payments SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [status, paymentId]
  );
  return result.rows[0];
}

export async function getPaymentByStripeId(stripeId: string): Promise<Payment | null> {
  const result = await query(
    "SELECT * FROM payments WHERE stripe_payment_intent_id = $1",
    [stripeId]
  );
  return result.rows[0] || null;
}

export async function getUserPayments(userId: number, limit: number = 50): Promise<Payment[]> {
  const result = await query(
    "SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return result.rows;
}

// Stats
export async function getUserStats(userId: number): Promise<{
  generationsCount: number;
  totalTokensUsed: number;
  totalPaid: number;
}> {
  const genResult = await query(
    "SELECT COUNT(*) as count, COALESCE(SUM(tokens_used), 0) as total_used FROM generations WHERE user_id = $1 AND status = 'completed'",
    [userId]
  );

  const payResult = await query(
    "SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE user_id = $1 AND status = 'succeeded'",
    [userId]
  );

  return {
    generationsCount: parseInt(genResult.rows[0].count),
    totalTokensUsed: parseInt(genResult.rows[0].total_used),
    totalPaid: parseInt(payResult.rows[0].total_paid),
  };
}
