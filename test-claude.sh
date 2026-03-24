#!/bin/bash
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
echo "Starting claude -p..."
/home/nel/.local/bin/claude -p --model haiku --dangerously-skip-permissions --no-session-persistence --disable-slash-commands --mcp-config /home/nel/newbot/telegram-mcp.json --strict-mcp-config "Скажи привет" 2>/tmp/claude-test-stderr.txt
echo "Exit: $?"
