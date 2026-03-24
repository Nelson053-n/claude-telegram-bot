#!/bin/bash
tmux kill-session -t claude-tg 2>/dev/null
exec tmux new-session -d -s claude-tg "cd /home/nel/newbot && exec /home/nel/.bun/bin/bun bot.ts > /tmp/telegram-bot.log 2>&1"
