#!/bin/bash
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
exec /home/nel/.local/bin/claude -p --model haiku --dangerously-skip-permissions --no-session-persistence --disable-slash-commands --mcp-config /home/nel/newbot/telegram-mcp.json --strict-mcp-config --tools "" --append-system-prompt "Ты универсальный ассистент. Отвечай на вопросы пользователя на его языке. Не привязывайся к конкретным проектам. Ты НЕ можешь выполнять команды, редактировать файлы или выполнять код. Только отвечай текстом." "$1"
