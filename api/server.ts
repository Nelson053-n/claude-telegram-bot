import express from "express";
import cors from "cors";
import { config_api, isDev } from "./config";
import { initializeDb, closePool } from "./db/client";
import { authMiddleware, errorHandler, corsMiddleware } from "./middleware";

// Routes
import authRoutes from "./routes/auth";
import generationsRoutes from "./routes/generations";
import paymentsRoutes from "./routes/payments";
import usersRoutes from "./routes/users";

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(cors());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/generations", authMiddleware, generationsRoutes);
app.use("/api/payments", authMiddleware, paymentsRoutes);
app.use("/api/users", authMiddleware, usersRoutes);

// Error handler
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    console.log(`Starting API server in ${config_api.nodeEnv} mode...`);

    // Initialize database
    await initializeDb();
    console.log("✓ Database initialized");

    // Start server
    app.listen(config_api.port, () => {
      console.log(`✓ Server listening on port ${config_api.port}`);
      console.log(`  Environment: ${config_api.nodeEnv}`);
      console.log(`  Database: ${config_api.db.database}@${config_api.db.host}:${config_api.db.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await closePool();
  process.exit(0);
});

start();
