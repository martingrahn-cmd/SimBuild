# Core change requests

Builders never edit `src/core/`, `src/main.js`, `index.html` or `tools/`. If your module needs a core change,
write `docs/core-requests/<module>.md` with: what you need, why, the exact proposed diff or API, and how you are
working around it meanwhile. The integrator applies requests between waves and records the outcome in STATUS.json.
