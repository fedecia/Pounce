#!/bin/bash
set -euo pipefail

WORKSPACE="/home/fcia/.openclaw/workspace/monopolystreet"
LOG_FILE="$WORKSPACE/logs/cron.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p "$WORKSPACE/logs"
echo "--- $TIMESTAMP ---" >> "$LOG_FILE"

if ! pgrep -af "vite --host" >/dev/null && ! pgrep -af "node.*vite" >/dev/null; then
  echo "[CRON] Vite not running. Restarting..." >> "$LOG_FILE"
  if tmux has-session -t monopolystreet 2>/dev/null; then
    tmux kill-session -t monopolystreet || true
  fi
  tmux new-session -d -s monopolystreet "cd $WORKSPACE && npm run dev -- --host 0.0.0.0 >> $WORKSPACE/logs/vite-dev.log 2>&1"
  sleep 5
  if pgrep -af "vite --host" >/dev/null || pgrep -af "node.*vite" >/dev/null; then
    echo "[CRON] Vite restarted successfully." >> "$LOG_FILE"
  else
    echo "[CRON] ❌ Failed to restart Vite." >> "$LOG_FILE"
    exit 1
  fi
fi

echo "[CRON] Running smoke test..." >> "$LOG_FILE"
if (cd "$WORKSPACE" && timeout 45s node check-render.js >> "$LOG_FILE" 2>&1); then
  echo "[CRON] ✅ Smoke test passed." >> "$LOG_FILE"
else
  echo "[CRON] ❌ Smoke test failed." >> "$LOG_FILE"
fi

find "$WORKSPACE/logs/" -name "*.log" -size +1M -exec gzip -f {} \; >> "$LOG_FILE" 2>&1
