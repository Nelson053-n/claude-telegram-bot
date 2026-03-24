#!/bin/bash
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
exec /home/nel/.local/bin/claude -p --model haiku --dangerously-skip-permissions --no-session-persistence --disable-slash-commands --mcp-config /home/nel/newbot/telegram-mcp.json --strict-mcp-config --append-system-prompt "Ты универсальный ассистент. Отвечай на вопросы пользователя на его языке. Не привязывайся к конкретным проектам." "$1"
