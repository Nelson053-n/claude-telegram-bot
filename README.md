# NewBot: Claude AI + Telegram Bot

Telegram-бот для генерации контента через Claude AI с поддержкой голосовых сообщений, REST API, управлением токенами и платёжной системой.

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    NewBot System                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Telegram Bot (Bun/Grammy)                                   │
│  ├─ Text & Voice Message Handler                             │
│  ├─ Session Management                                       │
│  ├─ Claude AI Integration                                    │
│  └─ Background Task Support                                  │
│       │                                                       │
│       └──> OpenAI Whisper (voice transcription)              │
│                                                               │
│  REST API (Express/Node)                                     │
│  ├─ User Management & Profiles                               │
│  ├─ Generation History & Status                              │
│  ├─ Token Balance System                                     │
│  ├─ Stripe Payment Integration                               │
│  └─ JWT Authentication                                       │
│       │                                                       │
│       └──> PostgreSQL Database                               │
│                                                               │
│  Infrastructure                                              │
│  ├─ Docker Compose (PostgreSQL, Redis)                       │
│  ├─ Cloud Ready (Heroku, AWS, etc)                           │
│  └─ Environment-based Configuration                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Компоненты

### 1. **Telegram Bot** (`bot.ts`)
- **Stек:** Bun, Grammy, Claude Code CLI
- **Возможности:**
  - Текстовые и голосовые сообщения
  - Session management (основная + quick сессия)
  - Background tasks (до 10 минут)
  - Rate limiting (5 req/min)
  - Typing indicator
- **Команды:** `/help`, `/reset`, `/status`, `/web`

### 2. **REST API** (`api/`)
- **Стек:** Express.js, PostgreSQL, JWT, TypeScript
- **Функции:**
  - Пользователи (создание, профиль, статистика)
  - История генераций (создание, просмотр, статус)
  - Токены (баланс, покупка, транзакции)
  - Платежи (Stripe интеграция)
  - Документированные маршруты
- **Аутентификация:** JWT Bearer tokens

### 3. **Инфраструктура**
- **Docker Compose** с PostgreSQL, Redis
- **.env.example** для конфигурации
- Готово к деплою на Heroku, AWS, VPS

## Технологический стек

- **Bot Runtime:** Bun
- **Bot Framework:** Grammy
- **Bot AI:** Claude Code CLI
- **Voice Recognition:** OpenAI Whisper
- **API:** Express.js, TypeScript
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Authentication:** JWT
- **Payments:** Stripe
- **DevOps:** Docker, Docker Compose

## Как это работает

### 1️⃣ Telegram Bot Flow

```
Telegram User
    ↓
Text/Voice → Grammy (polling)
    ↓
bot.ts Handler
    ├─ Voice? → transcribeWithWhisper (OpenAI)
    └─ Text? → use as-is
    ↓
askClaude (Bun.spawn)
    ├─ Phase 1: Quick try (45s)
    │  └─ Success? → Reply immediately
    └─ Phase 2: Timeout → Background task
       ├─ Create quick session (parallel questions)
       └─ Continue in background (up to 10min)
    ↓
Database (async)
    └─ Save generation if API enabled
    ↓
Telegram → Reply with result
```

### 2️⃣ Database Flow

```
Generation Created → Create record (status: pending)
    ↓
Claude Processing → Update with result
    ↓
Save to DB → userGenerations table
    ↓
Web Gallery → Display history
```

## 🚀 Быстрый старт

### 1. Подготовка

```bash
# Клонируем репо и устанавливаем зависимости
git clone <repo>
cd newbot
bun install

# Копируем конфиг
cp .env.example .env

# Создаём Telegram бота
# Напишите @BotFather в Telegram, создайте бота и получите токен

# Заполняем .env
# TELEGRAM_BOT_TOKEN=...
# OPENAI_API_KEY=sk-... (для голоса)
# ANTHROPIC_API_KEY=sk-ant-... (для Claude)
```

### 2. Запуск Telegram Бота

```bash
# Требует Claude Code CLI установленный и авторизованный
# claude --version
# claude auth status

bun bot.ts
```

### 3. Запуск API (optional, для истории генераций)

```bash
# Запускаем Docker контейнеры
docker-compose up -d

# API стартует на http://localhost:3000
# Настраиваем OPENAI_API_KEY и другие переменные в .env
```

### 4. Запуск Веб-приложения (optional)

```bash
# В папке web/
cd web
npm install
npm run dev

# App доступна на http://localhost:5173
```

### Минимальная конфигурация

Для работы только бота нужны:

```env
TELEGRAM_BOT_TOKEN=ваш_токен
OPENAI_API_KEY=sk-... # для голоса
ANTHROPIC_API_KEY=sk-ant-... # для Claude
```

### Полная конфигурация

Для всех компонентов см. `.env.example`:

```bash
# Bot
TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# API & Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=newbot
DB_USER=postgres
DB_PASSWORD=postgres

# Authentication & Payments
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Запуск в Production

### Systemd Service

```bash
# Установка unit файла
cp claude-telegram.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now claude-telegram.service

# Управление
systemctl --user status claude-telegram      # статус
systemctl --user restart claude-telegram     # перезапуск
systemctl --user stop claude-telegram        # остановка
journalctl --user -u claude-telegram -f      # логи
```

### Docker

```bash
# Запуск всего стека (Bot + API + DB + Redis)
docker-compose up -d

# Или запустить отдельно
docker-compose up -d postgres redis api
```

### Облачные сервисы

- **Heroku:** `heroku create && git push heroku main`
- **Railway:** Подключить GitHub репо
- **Render:** Создать Web Service и Background Worker
- **AWS:** ECS + RDS + CloudFront
- **DigitalOcean:** App Platform

## 📁 Файлы проекта

```
newbot/
├── bot.ts                          # Telegram bot (Grammy + Claude)
├── ask-claude.sh                   # Wrapper для Claude CLI
├── api/                            # REST API (Express)
│   ├── server.ts                   # Main server
│   ├── models.ts                   # Database models
│   ├── routes/                     # API routes
│   │   ├── auth.ts
│   │   ├── generations.ts
│   │   ├── payments.ts
│   │   └── users.ts
│   ├── db/                         # Database
│   │   ├── client.ts               # Connection pool
│   │   └── schema.sql              # Tables
│   └── bot-integration.ts          # Bot ↔ API bridge
├── docker-compose.yml              # Local development stack
├── Dockerfile.api                  # API container
├── package.json                    # Main dependencies
├── .env.example                    # Configuration template
├── README.md                        # This file
├── DEPLOYMENT.md                   # Deployment guides
├── CONTRIBUTING.md                 # Developer guide
└── sessions.json                   # Bot session cache (runtime)
```

## Особенности

- Allowlist по Telegram user ID
- **Голосовые сообщения** — автоматическое распознавание через OpenAI Whisper
- Typing-индикатор каждые 4 секунды
- Автоматическая разбивка длинных ответов (>4096 символов)
- **Session management** — основная сессия + параллельная quick-сессия для фоновых задач
- **Background tasks** — долгие запросы выполняются в фоне (до 10 минут), можно задавать вопросы параллельно
- Timeout 45 секунд на быстрый ответ, 120 секунд на параллельные вопросы
- `--strict-mcp-config` с пустым конфигом — Claude стартует за ~5 секунд
- `--no-session-persistence` — без сохранения сессий на диск
- Rate limiting: макс 5 запросов в минуту на юзера

## Команды

| Команда | Описание |
|---------|----------|
| `/help` | Справка по командам |
| `/reset` | Очистить контекст сессии (начать новый диалог) |
| `/status` | Показать статус текущей фоновой задачи |

## Голосовые сообщения

Просто отправьте голосовое сообщение (нажмите на микрофон) — бот автоматически:
1. Загрузит файл с серверов Telegram
2. Транскрибирует через OpenAI Whisper
3. Отправит текст Claude
4. Вернёт ответ

**Требования:**
- Переменная окружения `OPENAI_API_KEY` должна быть установлена
- Голосовое сообщение должно быть в формате OGG (стандартный формат Telegram)

**Пример:**
```bash
OPENAI_API_KEY=sk-... bun bot.ts
```

## Логи

```bash
tail -f /tmp/telegram-bot.log
```

## Архитектура

```
Telegram
  ├─ Текстовое сообщение → getMessage → askClaude → ответ
  └─ Голосовое сообщение → downloadFile → transcribeWithWhisper → askClaude → ответ

Sessions:
  main session: основной диалог (сохраняется в памяти)
  quick session: параллельный диалог при фоновых задачах
```

## 🎉 Completion Status

### ✅ Phase 1: Telegram Bot
- ✅ Text message handling
- ✅ Voice message transcription (OpenAI Whisper)
- ✅ Session management (main + quick)
- ✅ Background tasks (up to 10 min)
- ✅ Rate limiting & typing indicator
- ✅ Commands: /help, /reset, /status, /web

### ✅ Phase 2: API + Database
- ✅ Express.js REST API
- ✅ PostgreSQL database schema
- ✅ JWT authentication
- ✅ User management
- ✅ Generation history
- ✅ Token system
- ✅ Stripe integration (routes ready)
- ✅ Docker Compose stack
- ✅ Comprehensive documentation

### ✅ Phase 3: Web Application
- ✅ React 18 + Vite
- ✅ Zustand state management
- ✅ TailwindCSS responsive design
- ✅ Login page (Telegram OAuth)
- ✅ Home page with tabs
- ✅ Generation gallery
- ✅ User profile page
- ✅ TypeScript + Error handling

### 🚧 Future Improvements (Phase 4+)
- [ ] Real-time updates (WebSocket)
- [ ] Payment UI polish & Stripe webhook
- [ ] Admin dashboard
- [ ] Advanced filtering & search
- [ ] Export/download results
- [ ] Dark mode
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Analytics dashboard

## Документация

- **Bot:** Функции в `bot.ts` с примерами
- **API:** Подробно в [api/README.md](./api/README.md)
- **Web:** Компоненты описаны в [web/README.md](./web/README.md)

## Быстрые команды

```bash
# Bot
bun bot.ts

# API
bun run api
docker-compose up

# Web
cd web && npm install && npm run dev

# All together
docker-compose up -d && bun bot.ts &
cd web && npm run dev &
```
