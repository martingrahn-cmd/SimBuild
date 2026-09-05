# ui — core / tools requests

Nothing blocking; the module runs on the current core. Notes from rounds 1–2:

1. **`engine.stats.fps` is misleading under slow rendering.** It divides frames by the *clamped* dt (≤ 0.1 s),
   so a page rendering one frame every 5 s reports "10 fps". Suggest accumulating wall-clock time
   (`performance.now()` deltas) for the fps stat only. The ui dev corner measures its own wall-clock fps and shows
   "—" until it has counted frames.
2. **`tools/screenshot.mjs`: `page.screenshot` timeout (30 s) is tight on SwiftShader.** Views with a lot of
   shadowed, textured fill take 12–30 s per frame on the loaded box; a longer default (or reusing `--timeout`)
   would avoid spurious FAILs. A **Vite full reload** triggered by another builder saving a file during a run kills
   the shot with "Execution context was destroyed" — a single retry on that specific error would make gauntlet runs robust.
3. **`BUDGET.perModuleDrawCalls.ui = 5`** — in-game the UI is DOM (0 draw calls); the ui showcase backdrop scene
   uses 6 draws (+ shadow passes: 12 by day, 14 at night with the lamp glow, environment included). The module
   declares `budget.drawCalls: 20` for the showcase; the in-game number is 0.
4. **Save system hooks used by the UI (no change needed, documenting the contract):** `window.__sim.saves.slots()`
   → `[{slot, savedAt, day}]`, `.remove(slot)`, `.upload(file)`, `.autosave` (bool); `ui:action save|load|download`
   are consumed by `src/core/save.js`; the UI listens to `save:saved` / `save:loaded` to refresh the slot list.
   A `save:failed {slot, error}` event would let the UI show an error toast instead of a silent console warning.
5. **New game flow:** the main menu navigates to `?mode=play&seed=<n>&map=<preset>&city=<name>&money=<n>` after
   emitting `ui:action newGame [{name, seed, map, money}]`. `parseParams` ignores `map`, `city` and `money` today;
   the ui reads `city` itself. If core/terrain want map presets and a starting budget, those two params are
   the hand-off (`world.terrain.presets` keys populate the menu when present).
6. **`world.infoview.legend` shape the UI understands (for the infoviews builder):**
   `{ title, description, colors: ['#..', '#..', …], min: 'label', max: 'label', stats: { 'Row label': 'value', … } }`
   — all optional; the UI falls back to its own per-view defaults. Transit line panel reads
   `world.transit.lines: Map<id, {id, name, color, stops:[stopId|{name}], vehicles, ridership, length, fare, balance}>`
   and `world.transit.stops: Map<id, {name}>`, re-rendering on `transit:changed`; it emits
   `ui:action transit ['newLine'|'select'|'setVehicles'|'setColor'|'focus'|'edit'|'delete', …]`.

## Integrator decision (wave 1 → 2)

Applied to core (commit "Integrator: apply wave-1 core requests"):
- `tools/screenshot.mjs`: capture timeout raised to `max(--timeout, 180 s)`; before capture the tool re-checks
  `window.__sim.ready` **and** that the boot overlay is hidden, and re-waits once if a Vite full reload happened
  mid-capture (fixes boot-overlay PNGs reported with `ok:true`).
- `tools/gauntlet.mjs`: forwards `--timeout` (default 240 s) to every shot.
- `src/main.js`: in showcase mode only the wanted module + its transitive dependencies (+ environment) are imported,
  so another builder's broken module can no longer put errors in your screenshot JSON.
- `src/core/clock.js`: `sunAzimuth` fixed — 06:00 east, 12:00 south, 18:00 west. Modules should still prefer
  `world.weather.sunDir`.
- `src/core/engine.js`: `PCFShadowMap` (r185 deprecation), and in headless a 1×1 `readPixels` after each frame so the
  GPU queue cannot run several multi-second frames ahead of the capture.
- `src/core/assets.js`: `HDRLoader` replaces the deprecated `RGBELoader`.
- ARCHITECTURE §6 now documents that `composer.setSize` receives **physical** pixels, and §3 the extra
  `world.weather` fields (`moonDir`, `lightDir`, `lightIntensity`, `sunColor`, `exposure`, `night`, `wetness`,
  `preset`, `moonPhase`) and the extra `world.roads` fields.

Not applied:
- `?pitch=` to let the camera look up: `CityCamera.minPitch` stays 0.08 for gameplay; critics can use a probe script
  or a module-declared preset. Cheap to add later if a critic needs it routinely.
- `server.hmr = false` for `?headless=1`: the screenshot tool's re-check above solves the same problem without
  changing dev-server behaviour for humans.
- `world.terrain.writeHeights` / `flattenStrip`: this is a **terrain-module** API, not core. Terrain should expose it
  (documented as a request in ARCHITECTURE §3 note); roads may keep writing `heights` + a zero-strength `modify()`
  until then, since that contract now holds by documentation.
