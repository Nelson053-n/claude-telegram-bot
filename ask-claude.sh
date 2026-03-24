#!/bin/bash
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT

PROMPT="$1"
SESSION_ID="$2"
MODE="$3"

if [ "$MODE" = "resume" ]; then
  exec /home/nel/.local/bin/claude -p --model haiku --dangerously-skip-permissions --disable-slash-commands --mcp-config /home/nel/newbot/telegram-mcp.json --strict-mcp-config --resume "$SESSION_ID" --append-system-prompt "Ты полноценный ИИ-ассистент. Ты можешь: писать и выполнять код, работать с файлами, отвечать на вопросы, помогать с задачами. Отвечай на языке пользователя. Рабочая директория: /home/nel/workspace. Будь лаконичен — Telegram ограничивает сообщения до 4096 символов." "$PROMPT"
else
  exec /home/nel/.local/bin/claude -p --model haiku --dangerously-skip-permissions --disable-slash-commands --mcp-config /home/nel/newbot/telegram-mcp.json --strict-mcp-config --session-id "$SESSION_ID" --append-system-prompt "Ты полноценный ИИ-ассистент. Ты можешь: писать и выполнять код, работать с файлами, отвечать на вопросы, помогать с задачами. Отвечай на языке пользователя. Рабочая директория: /home/nel/workspace. Будь лаконичен — Telegram ограничивает сообщения до 4096 символов." "$PROMPT"
fi
