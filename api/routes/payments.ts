import { Router } from "express";
import Stripe from "stripe";
import { config_api } from "../config";
import { createPayment, updatePaymentStatus, getPaymentByStripeId, addTokens } from "../models";
import { AuthRequest } from "../middleware";

const router = Router();
const stripe = new Stripe(config_api.stripe.secretKey, { apiVersion: "2023-10-16" });

// POST /api/payments/create-intent
// Create Stripe payment intent
router.post("/create-intent", async (req: AuthRequest, res) => {
  try {
    const { amount, tokensAmount = 1000 } = req.body;
    const userId = req.userId!;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "amount must be at least $1.00" });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        userId: String(userId),
        tokensAmount: String(tokensAmount),
      },
    });

    // Create payment record in DB
    const payment = await createPayment(userId, amount, tokensAmount, paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      tokensAmount,
    });
  } catch (err: any) {
    console.error("Payment intent error:", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// POST /api/payments/confirm
// Confirm payment and grant tokens
router.post("/confirm", async (req: AuthRequest, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.userId!;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "paymentIntentId is required" });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment not succeeded" });
    }

    // Get payment from DB
    const payment = await getPaymentByStripeId(paymentIntentId);
    if (!payment || payment.user_id !== userId) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    if (payment.status === "succeeded") {
      return res.json({ message: "Tokens already granted" });
    }

    // Update payment status and grant tokens
    await updatePaymentStatus(payment.id, "succeeded");
    await addTokens(userId, payment.tokens_granted, "payment", payment.id);

    res.json({
      message: "Tokens granted successfully",
      tokensGranted: payment.tokens_granted,
    });
  } catch (err: any) {
    console.error("Payment confirm error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// GET /api/payments/history
// Get payment history
router.get("/history", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { getUserPayments } = await import("../models");

    const payments = await getUserPayments(userId, 50);

    res.json({
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        tokensGranted: p.tokens_granted,
        status: p.status,
        createdAt: p.created_at,
        completedAt: p.completed_at,
      })),
    });
  } catch (err: any) {
    console.error("Payment history error:", err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

export default router;
