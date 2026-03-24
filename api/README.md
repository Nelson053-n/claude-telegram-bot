# NewBot API

REST API for the NewBot application — generation history, user management, payments, and token management.

## Quick Start

### 1. Setup

```bash
# Copy environment configuration
cp .env.example .env

# Install dependencies
bun install

# Start Docker containers (PostgreSQL + Redis)
docker-compose up -d
```

### 2. Run API

```bash
# Development mode (hot reload)
bun run dev

# Or start API manually
bun run api
```

Server starts on `http://localhost:3000`

## API Endpoints

### Authentication

**Login with Telegram ID:**
```bash
curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 123456789, "username": "john_doe"}'
```

**Refresh JWT Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGc..."}'
```

### Generations

**Create new generation:**
```bash
curl -X POST http://localhost:3000/api/generations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a poem", "tokensRequired": 100}'
```

**List user's generations:**
```bash
curl -X GET "http://localhost:3000/api/generations?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get generation by ID:**
```bash
curl -X GET http://localhost:3000/api/generations/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Payments

**Create Stripe payment intent:**
```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "tokensAmount": 1000}'
```

**Confirm payment:**
```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId": "pi_xxx"}'
```

**List payment history:**
```bash
curl -X GET http://localhost:3000/api/payments/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Users

**Get current user profile:**
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Update user profile (email):**
```bash
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Get usage statistics:**
```bash
curl -X GET http://localhost:3000/api/users/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Architecture

```
Bot (Telegram) <→ API Server <→ PostgreSQL
     ↓
  (voice/text)
     ↓
  Claude
```

## Token System

- **Token Balance**: Users have a token balance tracked in `users.token_balance`
- **Token Transactions**: All changes logged in `token_transactions`
- **Generation Cost**: Deducted when generation is created
- **Payment**: Stripe grants tokens on successful payment

## Environment Variables

See `.env.example` for all configuration options:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=newbot
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Database Schema

### users
- `id` — Primary key
- `telegram_id` — Unique Telegram user ID
- `username` — Telegram username
- `email` — Optional email
- `token_balance` — Current token count
- `created_at`, `updated_at` — Timestamps

### generations
- `id` — Primary key
- `user_id` — Foreign key to users
- `prompt` — Original prompt/request
- `result` — Generated result (when completed)
- `tokens_used` — Tokens deducted
- `status` — pending | completed | failed
- `created_at`, `completed_at` — Timestamps

### payments
- `id` — Primary key
- `user_id` — Foreign key to users
- `stripe_payment_intent_id` — Stripe transaction ID
- `amount` — Payment amount in cents
- `tokens_granted` — Tokens granted on success
- `status` — pending | succeeded | failed
- `created_at`, `completed_at` — Timestamps

### token_transactions
- `id` — Primary key
- `user_id` — Foreign key to users
- `amount` — Positive (add) or negative (deduct)
- `reason` — generation | payment | refund | etc
- `related_id` — Foreign key to related record
- `created_at` — Timestamp

## Integration with Bot

The bot can integrate with the API using `bot-integration.ts`:

```typescript
import { saveGenerationStart, saveGenerationResult } from "./api/bot-integration";

// When user sends a message
const task = await saveGenerationStart(telegramId, prompt);

// After Claude responds
await saveGenerationResult(task.generationId, result, tokensUsed);
```

## Docker Compose

Services included:

- **postgres** — PostgreSQL 16 database
- **redis** — Redis for caching/sessions (future)
- **api** — Bun Express server

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
```

## Development

### Hot Reload

```bash
bun run dev
```

### Database Migrations

```bash
# Migrations run automatically on server start
# See api/db/schema.sql for schema
```

### Testing

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 123456789, "username": "testuser"}'

# Get user profile (with JWT token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/users/me
```

## Performance

- Connection pooling: max 20 concurrent connections
- Prepared statements for SQL injection prevention
- Indexes on common query columns
- CORS enabled for web frontend

## Future Improvements

- WebSocket support for real-time generation updates
- Rate limiting per user
- API key authentication
- Webhook support for Stripe events
- Caching with Redis
- Admin dashboard
