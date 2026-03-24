# NewBot Architecture

Детальное описание архитектуры и дизайна NewBot системы.

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        NewBot System                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Telegram Users                                                │
│  │                                                                 │
│  └──> Telegram Bot (bot.ts)                                       │
│        ├─ Grammy (Telegram API framework)                         │
│        ├─ Message handlers (text, voice)                          │
│        ├─ Session management (Zustand in-memory)                  │
│        ├─ Claude integration (Bun.spawn + CLI)                    │
│        └─ Optional: API integration (for history)                 │
│            │                                                       │
│            ├─> OpenAI Whisper (voice transcription)               │
│            └─> Claude Code CLI (AI responses)                     │
│                                                                    │
│  ┌─ Web Users (http://localhost:5173)                             │
│  │                                                                 │
│  └──> React Web App                                               │
│        ├─ Vite (development server, HMR)                          │
│        ├─ TailwindCSS (styling)                                   │
│        ├─ Zustand (state management)                              │
│        ├─ Axios (API client)                                      │
│        └─ Pages:                                                  │
│            ├─ LoginPage (Telegram OAuth)                          │
│            └─ HomePage (Gallery, Profile, Payments)               │
│                                                                    │
│  ┌─ REST API (http://localhost:3000)                              │
│  │                                                                 │
│  └──> Express.js Server                                           │
│        ├─ Authentication (JWT Bearer tokens)                      │
│        ├─ Routes:                                                 │
│        │   ├─ /api/auth/* (login, refresh)                        │
│        │   ├─ /api/generations/* (create, list, status)           │
│        │   ├─ /api/payments/* (Stripe integration)                │
│        │   └─ /api/users/* (profile, stats)                       │
│        ├─ Middleware:                                             │
│        │   ├─ auth (JWT validation)                               │
│        │   ├─ cors (cross-origin)                                 │
│        │   └─ error handler                                       │
│        └─ Connection Pool (PostgreSQL)                            │
│                                                                    │
│  ┌─ Databases                                                     │
│  │                                                                 │
│  └──> PostgreSQL (persistent data)                                │
│        ├─ users (profiles, balances)                              │
│        ├─ generations (prompts, results, status)                  │
│        ├─ payments (Stripe transactions)                          │
│        ├─ token_transactions (audit log)                          │
│        └─ api_keys (future: API key auth)                         │
│                                                                    │
│       Redis (caching, sessions - future)                          │
│                                                                    │
│  ┌─ External Services                                             │
│  │                                                                 │
│  ├──> Telegram Bot API                                            │
│  ├──> OpenAI Whisper API (voice → text)                           │
│  ├──> Claude API (via CLI)                                        │
│  └──> Stripe API (payments)                                       │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Telegram Bot (bot.ts)

**Responsibilities:**
- Handle incoming Telegram messages (text, voice, commands)
- Manage user sessions (separate main + quick sessions)
- Invoke Claude for AI responses
- Transcribe voice to text
- Rate limiting and typing indicators
- Log interactions

**Session Management:**
```
User ID
  ├─ mainSessionId (main conversation context)
  ├─ quickSessionId (parallel questions during background tasks)
  ├─ quickSessionUsed (prevent double processing)
  ├─ messageCount (tracking)
  └─ activeBackground (current background task info)
```

**Message Flow:**
```
Telegram Message
  ├─ Rate limit check
  ├─ Type detection (text/voice)
  │  └─ Voice? → OpenAI Whisper → text
  ├─ Command check (/help, /reset, /status)
  │  └─ Execute command
  │  └─ Return early
  ├─ Session lookup
  │  └─ Create if new user
  ├─ Quick timeout (45s)
  │  ├─ Success? → Reply
  │  └─ Timeout? → Background task
  │     ├─ Create quick session
  │     ├─ Continue processing
  │     └─ User can ask questions in parallel
  ├─ Optional: Save to DB via API
  └─ Telegram Reply
```

### 2. REST API (Express.js)

**Responsibilities:**
- User authentication & profile management
- Generation history persistence
- Token balance tracking
- Payment processing (Stripe)
- Web app backend

**Authentication:**
```
JWT Token Structure:
{
  userId: number,
  iat: timestamp,
  exp: timestamp
}

Flow:
1. POST /api/auth/telegram → login via Telegram ID
2. Return JWT token
3. Client stores in localStorage
4. All requests include: Authorization: Bearer <token>
5. Middleware validates token → attach userId
```

**Database Schema:**

```sql
users
├─ id (PK)
├─ telegram_id (UNIQUE)
├─ username
├─ email
├─ token_balance
└─ timestamps

generations
├─ id (PK)
├─ user_id (FK → users)
├─ prompt (text)
├─ result (text, nullable)
├─ tokens_used
├─ status (pending/completed/failed)
└─ timestamps

payments
├─ id (PK)
├─ user_id (FK → users)
├─ stripe_payment_intent_id
├─ amount (cents)
├─ tokens_granted
├─ status
└─ timestamps

token_transactions (audit log)
├─ id (PK)
├─ user_id (FK → users)
├─ amount (positive/negative)
├─ reason (generation/payment/refund)
├─ related_id (FK to related record)
└─ created_at

api_keys (future)
├─ id (PK)
├─ user_id (FK → users)
├─ key_hash
├─ name
├─ active
└─ timestamps
```

### 3. React Web App

**Responsibilities:**
- User interface for generation management
- Profile and settings
- Payment/token purchase
- Gallery with search and filtering
- Responsive design for mobile

**State Management (Zustand):**
```
Store {
  // Auth
  token: string | null
  user: User | null

  // Generations
  generations: Generation[]
  selectedGeneration: Generation | null

  // UI
  isLoading: boolean
  error: string | null
}

// Persistent to localStorage:
// - token
// - user
```

**Component Tree:**
```
App
├─ LoginPage (if no token)
│  └─ Login form with Telegram redirect
└─ HomePage (if token)
   ├─ Header (user info, logout)
   ├─ Tabs
   │  ├─ Gallery Tab
   │  │  └─ Gallery component
   │  │     ├─ GenerationCard × N
   │  │     └─ Detail Modal
   │  ├─ New Tab
   │  │  └─ New generation form (placeholder)
   │  └─ Profile Tab
   │     ├─ User info
   │     ├─ Token balance
   │     ├─ Statistics
   │     └─ Buy tokens button
   └─ Footer
```

## Data Flow Scenarios

### Scenario 1: Text Message in Telegram

```
User sends text "Write a poem"
  ↓
Grammy receives message
  ↓
bot.ts message handler
  ├─ Check rate limit ✓
  ├─ Get/create session
  ├─ Send "typing..." indicator
  ├─ Phase 1: Quick try (45s timeout)
  │  ├─ bun.spawn → ask-claude.sh
  │  ├─ ask-claude.sh → claude -p
  │  ├─ Claude processes (may timeout)
  │  └─ Return result or timeout
  ├─ If success: reply immediately
  │  └─ Optional: POST /api/generations (save to DB)
  └─ If timeout: background task
     ├─ Create quick session
     ├─ Spawn background process
     ├─ Continue with Phase 2 (up to 10 min)
     ├─ User gets "task running" message
     └─ User can ask questions (uses quick session)

Timeline:
0s    → Message received
0s    → Typing indicator
~5s   → Claude starts
45s   → Timeout check
45s+  → If result ready: Reply
45s+  → If not: "Running in background"
300s  → Max 10 min for background
```

### Scenario 2: Voice Message in Telegram

```
User sends voice message (OGG audio)
  ↓
Grammy receives message
  ↓
bot.ts voice handler
  ├─ Get file_id
  ├─ Download from Telegram (HTTPS)
  ├─ Pass to transcribeWithWhisper()
  │  ├─ FormData with audio file + model
  │  ├─ POST to OpenAI API
  │  ├─ Receive text transcript
  │  └─ Delete temp file
  ├─ Use transcript as prompt
  └─ Proceed as text message (same flow)

Cost:
- Storage: temp file (deleted after use)
- API: ~$0.25 per voice message
```

### Scenario 3: Generation History in Web App

```
User logs in
  ↓
LoginPage → Telegram OAuth flow
  ↓
Telegram bot generates JWT
  ↓
Redirect to web app with token
  ↓
HomePage loads
  ├─ GET /api/users/me (profile)
  ├─ GET /api/generations (limit=50)
  │  └─ PostgreSQL query: SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
  └─ Display gallery
     ├─ 50 cards on load
     ├─ Click card → show modal with full details
     └─ "Load more" → pagination (next 50)
```

### Scenario 4: Payment Flow (Stripe)

```
User clicks "Buy Tokens"
  ↓
Web app
  ├─ Show payment form
  ├─ POST /api/payments/create-intent
  │  ├─ stripe.paymentIntents.create()
  │  └─ Store in DB (status: pending)
  ├─ Load Stripe form with clientSecret
  └─ User enters card details
     ↓
  ├─ User submits
  ├─ Stripe validates & processes
  └─ Payment intent succeeds
     ↓
Web app
  ├─ POST /api/payments/confirm
  │  ├─ Verify payment with Stripe
  │  ├─ UPDATE payments SET status = 'succeeded'
  │  ├─ ADD tokens to user balance
  │  └─ CREATE token_transaction (audit log)
  └─ Show success message & new balance

DB Changes:
- payments table: new row (status: pending → succeeded)
- users table: token_balance += tokens_granted
- token_transactions: new row (amount: +tokens)
```

## Data Consistency

### Idempotency
- Payment confirmation is idempotent (check if already processed)
- Token transactions are logged atomically with balance updates
- Duplicate message handling via session IDs

### Transaction Safety
```typescript
// Payment confirmation
transaction:
  1. Verify Stripe payment
  2. Check if already processed
  3. Update payments status
  4. Update users balance
  5. Log transaction
  6. Return success
// All or nothing - no partial updates
```

## Performance Considerations

### Bottlenecks
- **Claude response time**: 5-45s typically, up to 10min for complex tasks
- **Voice transcription**: ~1-3s per message
- **Database queries**: Indexed for fast lookups

### Optimization
- Session caching (memory, not persistent)
- Rate limiting (5 req/min per user)
- Pagination (50 generations per page)
- PostgreSQL indexes on foreign keys & timestamps
- Future: Redis for session persistence & caching

### Scalability
- Horizontal scaling: Run multiple bot instances (different tokens)
- Load balancer for API servers
- Read replicas for database
- CDN for static files
- Redis for distributed sessions

## Security

### Authentication
- JWT bearer tokens (HS256)
- Telegram ID as primary identifier
- Token expiry (default 7 days)

### Authorization
- Users can only access their own data
- Row-level security in queries
- API keys for future bot integrations

### Data Protection
- HTTPS/TLS in production
- Password hashing (bcrypt, future)
- Prepared statements (SQL injection prevention)
- CORS properly configured
- Rate limiting on endpoints

### Secrets Management
- .env for local development
- Environment variables in production
- Never commit secrets

## Testing Strategy

### Unit Tests (future)
- Model functions
- API route handlers
- React components

### Integration Tests (future)
- Bot ↔ Claude flow
- API ↔ Database flow
- Web ↔ API flow

### Manual Testing
- Telegram bot: send text/voice, test commands
- API: curl requests with JWT
- Web: browser testing, mobile responsive

## Monitoring & Logging

### Bot Logging
```typescript
console.log(`[${new Date().toISOString()}] ${ctx.from.username}: ${text}`)
```

### API Logging
```typescript
console.log(`Error: ${err.message}`)
```

### Database
- Query logs from PostgreSQL
- Connection pool metrics

### Future
- ELK stack (Elasticsearch, Logstash, Kibana)
- Prometheus metrics
- Sentry error tracking
- New Relic APM

## Deployment Architecture

### Development
- docker-compose with all services
- Hot reload enabled
- In-memory session storage

### Production
- Dockerized services
- Managed PostgreSQL
- Redis for sessions
- Nginx reverse proxy
- SSL/TLS certificates
- Health checks & auto-restart
- Backups on schedule

## Technology Choices

| Component | Technology | Why |
|-----------|-----------|-----|
| Bot | Bun + Grammy | Fast, native Telegram API, modern JS |
| API | Express.js | Industry standard, lightweight |
| Database | PostgreSQL | Reliable, rich features, good performance |
| Web | React + Vite | Fast dev experience, component reusability |
| State | Zustand | Simple, minimal boilerplate |
| Styling | TailwindCSS | Utility-first, responsive, customizable |
| Runtime | Bun | Fast, modern, native TypeScript |
| Payments | Stripe | Reliable, well-documented, secure |

## Future Improvements

1. **WebSocket** for real-time generation updates
2. **Redis** for distributed session caching
3. **Admin Dashboard** for user management & stats
4. **Advanced Filtering** in generation gallery
5. **Export/Share** functionality
6. **Dark Mode** UI
7. **Multi-language** support
8. **Analytics** dashboard
9. **API Keys** for third-party integrations
10. **Webhooks** for external services

---

Last updated: 2026-03-24
