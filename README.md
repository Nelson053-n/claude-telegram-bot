# NewBot: Claude AI + Telegram Bot

Telegram-бот для генерации контента через Claude AI с поддержкой голосовых сообщений.

## 🏗️ Архитектура

```
┌──────────────────────────────────────────────────┐
│           NewBot: Telegram Bot                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Telegram User                                   │
│      ↓                                            │
│  Text/Voice Message                              │
│      ↓                                            │
│  Grammy Framework (Polling)                      │
│      ├─ Text handling                            │
│      └─ Voice handling (OpenAI Whisper)          │
│           ↓                                       │
│  Claude AI Integration (Claude Code CLI)         │
│      ├─ Main session (primary dialogue)          │
│      ├─ Quick session (parallel background)      │
│      └─ Background tasks (up to 10 minutes)      │
│           ↓                                       │
│  Telegram Response                               │
│           ↓                                       │
│  User sees result                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

## 📦 Компоненты

### **Telegram Bot** (`bot.ts`)
- **Стек:** Bun, Grammy, Claude Code CLI
- **Возможности:**
  - Текстовые и голосовые сообщения
  - Session management (основная + quick сессия)
  - Background tasks (до 10 минут)
  - Rate limiting (5 req/min)
  - Typing indicator каждые 4 секунды
  - Автоматическая разбивка длинных ответов
- **Команды:** `/help`, `/reset`, `/status`

## Технологический стек

- **Bot Runtime:** Bun
- **Bot Framework:** Grammy
- **Bot AI:** Claude Code CLI
- **Voice Recognition:** OpenAI Whisper

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

### 3. Конфигурация

```env
TELEGRAM_BOT_TOKEN=ваш_токен          # от BotFather
OPENAI_API_KEY=sk-...                  # для распознавания голоса
ANTHROPIC_API_KEY=sk-ant-...           # для Claude
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

### VPS / Облачные сервисы

- Требует: Bun, Claude Code CLI, переменные окружения
- Простой запуск: `nohup bun bot.ts > bot.log 2>&1 &`
- Или через supervisor/systemd для управления процессом

## 📁 Файлы проекта

```
newbot/
├── bot.ts                          # Telegram bot (Grammy + Claude)
├── ask-claude.sh                   # Wrapper для Claude CLI
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

### ✅ Telegram Bot (Fully Complete)
- ✅ Text message handling
- ✅ Voice message transcription (OpenAI Whisper)
- ✅ Session management (main + quick)
- ✅ Background tasks (up to 10 min)
- ✅ Rate limiting & typing indicator
- ✅ Commands: /help, /reset, /status
- ✅ Allowlist by Telegram user ID
- ✅ Proper error handling & logging

### 🚧 Future Improvements
- [ ] Custom rate limits per user
- [ ] Admin commands for user management
- [ ] Statistics collection (messages, response times)
- [ ] Webhook mode (instead of polling)
- [ ] Message editing capability
- [ ] Inline keyboards for interactive responses

## Документация

- **Bot:** Функции в `bot.ts`
- **Deployment:** См. [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Contributing:** См. [CONTRIBUTING.md](./CONTRIBUTING.md)

## Быстрые команды

```bash
# Установка зависимостей
bun install

# Запуск бота
bun bot.ts

# Просмотр логов
tail -f /tmp/telegram-bot.log
```
