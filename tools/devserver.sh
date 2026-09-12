#!/usr/bin/env bash
# Keep the dev server up. The container can be restarted at any time and every agent screenshots through
# http://127.0.0.1:5173 — a dead server fails every round in flight, so this is idempotent and safe to re-run.
cd "$(dirname "$0")/.." || exit 1
PORT="${SIM_PORT:-5173}"
URL="http://127.0.0.1:$PORT"
is_simbuild() { curl -fsS --max-time 5 "$URL/" 2>/dev/null | grep -q '<title>New Dollarton</title>'; }
if is_simbuild; then
  echo "dev server already up"; exit 0
fi
[ -d node_modules ] || npm install
if curl -sS -o /dev/null --max-time 5 "$URL/" 2>/dev/null; then
  echo "Port $PORT is occupied by another app. Set SIM_PORT to an available port and SIM_URL for screenshots." >&2
  exit 1
fi
LOG="${TMPDIR:-/tmp}/simbuild-vite-$PORT.log"
nohup npx vite --host 127.0.0.1 --port "$PORT" --strictPort > "$LOG" 2>&1 &
for _ in $(seq 1 30); do
  sleep 1
  if is_simbuild; then echo "dev server up at $URL (log: $LOG)"; exit 0; fi
done
echo "dev server failed to start; see $LOG" >&2; tail -20 "$LOG" >&2; exit 1
