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
