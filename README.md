# Claude Telegram Bot

Telegram-бот, работающий на базе [Claude Code CLI](https://claude.com/claude-code). Принимает сообщения в Telegram и отвечает через Claude AI.

## Стек

- **Bun** — runtime
- **Grammy** — Telegram Bot API framework
- **Claude Code CLI** — AI-бэкенд (`claude -p`)

## Как это работает

```
Telegram → Grammy (long-polling) → Bun.spawn → claude -p → ответ → Telegram
```

Бот получает сообщения через Grammy, вызывает Claude CLI в режиме `-p` (print & exit) для каждого сообщения и отправляет ответ обратно в чат. Пока Claude думает, в чате отображается индикатор "печатает...".

## Настройка

### 1. Зависимости

```bash
bun install
```

### 2. Токен бота

Создайте файл `~/.claude/channels/telegram/.env`:

```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
```

Или передайте через переменную окружения:

```bash
TELEGRAM_BOT_TOKEN=ваш_токен bun bot.ts
```

### 3. Допуск пользователей

Файл `~/.claude/channels/telegram/access.json`:

```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["123456789"],
  "groups": {},
  "pending": {}
}
```

`allowFrom` — массив Telegram user ID, которым разрешено общаться с ботом. Если массив пустой — доступ для всех.

### 4. OpenAI API Key (для голосовых сообщений)

Если хотите использовать голосовые сообщения, нужен OpenAI API ключ:

```bash
export OPENAI_API_KEY=sk-...
```

Или добавьте в `~/.claude/channels/telegram/.env`:

```
OPENAI_API_KEY=sk-...
```

Без этого ключа голосовые сообщения не будут работать.

### 5. Claude Code CLI

Должен быть установлен и авторизован:

```bash
claude --version
claude auth status
```

### 6. Конфигурация модели

В файле `ask-claude.sh` настраивается модель и system prompt:

```bash
claude -p --model haiku ...
```

Доступные модели: `haiku`, `sonnet`, `opus`.

## Запуск

### Напрямую

```bash
bun bot.ts
```

### Через tmux

```bash
./start-bot.sh
```

### Как systemd-служба

Скопируйте unit-файл:

```bash
cp claude-telegram.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now claude-telegram.service
```

Управление:

```bash
systemctl --user status claude-telegram    # статус
systemctl --user restart claude-telegram   # перезапуск
systemctl --user stop claude-telegram      # остановка
journalctl --user -u claude-telegram -f    # логи
```

## Файлы

| Файл | Описание |
|------|----------|
| `bot.ts` | Основной код бота (Grammy + Bun.spawn) |
| `ask-claude.sh` | Обёртка для вызова Claude CLI |
| `start-bot.sh` | Запуск в tmux-сессии |
| `telegram-mcp.json` | Пустой MCP-конфиг (отключает плагины для быстрого старта) |
| `claude-telegram.service` | Systemd unit для автозапуска |

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

## Phase 2: API + БД ✅

- ✅ REST API для генераций (Express.js)
- ✅ История генераций в БД (PostgreSQL)
- ✅ Платёжная система (Stripe integration)
- ✅ JWT аутентификация
- ✅ Docker Compose для разработки
- 🔄 Веб-галерея результатов (в разработке)
- 🔄 Админ-панель (в разработке)

### API Быстрый старт

```bash
# 1. Настройка
cp .env.example .env
bun install

# 2. Запуск Docker контейнеров
docker-compose up -d

# 3. Запуск API сервера
bun run api
```

API доступен на `http://localhost:3000`

**Документация:** см. [api/README.md](./api/README.md)

### Интеграция бота с API

Бот автоматически сохраняет историю генераций и пользовательские данные:

```typescript
import { saveGenerationStart, saveGenerationResult } from "./api/bot-integration";

// Сохранить начало генерации
const task = await saveGenerationStart(telegramId, prompt);

// Сохранить результат
await saveGenerationResult(task.generationId, result, tokensUsed);
```

### Система токенов

- Каждый пользователь имеет баланс токенов
- Генерация вычитает токены (по умолчанию 100)
- Платёж через Stripe добавляет токены
- Все транзакции логируются в БД
