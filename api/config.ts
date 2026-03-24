// Configuration for API server
import { config } from "dotenv";
config();

export const config_api = {
  port: parseInt(process.env.API_PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "newbot",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  },

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  },

  // Claude
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
};

export const isDev = config_api.nodeEnv === "development";
