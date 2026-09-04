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
