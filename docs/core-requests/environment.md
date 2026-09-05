# Core requests — environment

None of these block the module; they are notes for the integrator.

1. **`clock.sunAzimuth()` has the sun rising in the west.** With `+X = east`, `az = hour/24·2π + π` gives az = 270° (west) at 06:00 and 90° (east) at 18:00.
   The environment module computes its own sun path (east at 06:00 → south at noon → west at 18:00) from `clock.sunElevation(hour)` and publishes it as
   `world.weather.sunDir`; other modules should read `world.weather.sunDir` / `lightDir` and never call `clock.sunAzimuth`. Proposed fix in `clock.js`:
   `sunAzimuth(hour) { return Math.PI / 2 + ((hour - 6) / 12) * Math.PI; }` (0 = north, clockwise; 06:00 → east, 12:00 → south, 18:00 → west).

2. **Screenshot tool captures the boot overlay when Vite full-reloads mid-capture.** Any builder saving a file triggers a full reload of every open
   dev-server page (main.js has no HMR boundary); if that lands in the ~2.5 s measure window the PNG shows the "SIMBUILD / LOADING" screen with a
   green JSON. Suggested fix in `tools/screenshot.mjs`: right before `page.screenshot`, re-check `window.__sim?.ready === true &&
   document.getElementById('boot')?.classList.contains('hidden')` and re-wait/retry once if not.

3. `assets.js` still imports `RGBELoader` (deprecated in r185 → `HDRLoader`), which logs a warning in every screenshot JSON.

4. `engine.js` sets `PCFSoftShadowMap`, deprecated in r185 (three logs a warning and falls back to PCF). environment now sets `PCFShadowMap`
   explicitly during init (allowed for this module), so the warning no longer appears, but the core default could be updated.

5. Nice-to-have: `world.weather` now also carries `moonDir`, `lightDir` (sun or moon, whichever lights the scene), `lightIntensity`, `sunColor`,
   `exposure`, `night` (0–1), `wetness`, `preset`. Consider adding them to the §3 schema so other builders know they exist.

## Round 2 notes

6. `world.weather` now also publishes `moonPhase` (0 = full, 0.5 = new; advances with `clock.day` over a 29.53-day lunation) and
   `skyLight` is the real hemisphere-averaged sky radiance (linear rgb; ~0.1/0.17/0.31 at noon, ~0.005-0.02 at night) — the round-1
   value was garbage because of a scratch-buffer aliasing bug, now fixed.
7. Cloud drift is seeded from the game hour/day and only advances while the clock runs, so screenshots at the same `?time=` are
   byte-stable across boots (wall-clock drift used to change the cloud field between shots).
8. Nice-to-have: `CityCamera.minPitch` (0.08) means no preset can look upward; a debug flag (or `?pitch=`) that allows negative
   pitch would let critics inspect the cloud layer. The showcase works around it with a probe script (`shots/environment/dev/lookup.mjs`).
9. Registry clamps `dt` to 0.1 s; at SwiftShader frame rates (2-12 s/frame) any real-time throttle (`lutTimer > 0.5 s`) needs ~5-25
   frames. Boot-time renders are forced, so screenshots are unaffected; `__sim.setTime()` probes should wait ~12 frames.

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
