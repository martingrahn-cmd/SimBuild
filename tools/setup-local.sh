#!/usr/bin/env bash
# One-command local setup for SimBuild — macOS (Apple Silicon) or Linux, with a real GPU.
#
#   git clone -b claude/skylines-threejs-builder-gri6n7 https://github.com/martingrahn-cmd/simbuild.git
#   cd simbuild && ./tools/setup-local.sh
#
# Idempotent: safe to re-run. Leaves the dev server running and prints how to shoot with the real GPU.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null || { echo "node is required (22+). brew install node" >&2; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || { echo "node $NODE_MAJOR is too old; 22+ recommended" >&2; exit 1; }

echo "==> dependencies"
[ -d node_modules ] || npm install

echo "==> Playwright browser"
# On this repo's CI box Chromium lives in /opt/pw-browsers; everywhere else Playwright uses its own copy,
# which tools/screenshot.mjs falls back to automatically when those paths do not exist.
if [ ! -d /opt/pw-browsers ]; then npx playwright install chromium; fi

echo "==> Cities: Skylines II reference screenshots (critics calibrate against these every round)"
./tools/fetch-reference.sh

echo "==> dev server"
./tools/devserver.sh

echo "==> smoke test"
node tools/screenshot.mjs --showcase buildings --time 12 --camera aerial --out shots/smoke.png --measure 2

CORES=$( (sysctl -n hw.ncpu 2>/dev/null || nproc) )
GL=$([ "$(uname)" = "Darwin" ] && echo metal || echo gl)
cat <<TXT

Ready. $CORES cores detected — the Workflow tool runs min(16, cores-2) agents concurrently, so this machine
gives $(( CORES > 18 ? 16 : CORES - 2 )) parallel builders/critics against the 2 the cloud box managed.

Put this in your shell profile so the critics find the reference images:
    export SIMBUILD_REF=\$HOME/.simbuild/ref

To measure real frame rates (the >=50 fps budget has never been verified — the cloud box has no GPU):
    SIM_GL=$GL node tools/screenshot.mjs --showcase buildings --camera aerial --time 12 --measure 5
Check "gpuRenderer" in the JSON next to the PNG: if it still says SwiftShader, add SIM_HEADED=1 to force a
real window. Only then is the "fps" figure meaningful.

Then start a Claude Code session in this directory and paste section 0 of docs/HANDOFF.md.
TXT
