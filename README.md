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

### 4. Claude Code CLI

Должен быть установлен и авторизован:

```bash
claude --version
claude auth status
```

### 5. Конфигурация модели

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
- Typing-индикатор каждые 4 секунды
- Автоматическая разбивка длинных ответов (>4096 символов)
- Timeout 120 секунд на ответ
- `--strict-mcp-config` с пустым конфигом — Claude стартует за ~5 секунд
- `--no-session-persistence` — без сохранения сессий на диск

## Логи

```bash
tail -f /tmp/telegram-bot.log
```
