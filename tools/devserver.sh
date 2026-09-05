#!/usr/bin/env bash
# Keep the dev server up. The container can be restarted at any time and every agent screenshots through
# http://127.0.0.1:5173 — a dead server fails every round in flight, so this is idempotent and safe to re-run.
cd "$(dirname "$0")/.." || exit 1
if curl -sS -o /dev/null --max-time 5 http://127.0.0.1:5173/ 2>/dev/null; then
  echo "dev server already up"; exit 0
fi
[ -d node_modules ] || npm install
LOG="${TMPDIR:-/tmp}/simbuild-vite.log"
nohup npx vite --host 127.0.0.1 --port 5173 --strictPort > "$LOG" 2>&1 &
for _ in $(seq 1 30); do
  sleep 1
  if curl -sS -o /dev/null --max-time 5 http://127.0.0.1:5173/ 2>/dev/null; then echo "dev server up (log: $LOG)"; exit 0; fi
done
echo "dev server failed to start; see $LOG" >&2; tail -20 "$LOG" >&2; exit 1
