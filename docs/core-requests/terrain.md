# terrain → core / other-module requests

## 1. environment: sky dome must follow the *rendering* camera (planar reflections, cube cameras)
`src/modules/environment/sky.js` places a 10 m BackSide dome at the main camera each frame
(`S.sky.update(cam.position)`). When any other camera renders the scene (terrain's planar water reflection
camera, future PMREM/cube cameras, effects passes) the dome is off-centre and the sky is missing (black).
Suggested fix (environment-owned, tiny): position the dome in `mesh.onBeforeRender(renderer, scene, camera)`
from `camera.matrixWorld` instead of the main camera, or make the dome vertex shader ignore translation
(`gl_Position = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0)` with `.xyww`).
Until then, the water composites the reflection RT over the equirect sky LUT (`uEnvSky`) using the RT alpha,
so reflections stay correct but lose the dome's clouds and sun disc. Status after round 2 (build): still open.

## 2. environment: noon tonal calibration (observation, not a blocker)
With the current noon rig (sun ≈ 3–4 + sky 0.5, `toneMappingExposure` 1.15, AgX) a physically plausible
grass albedo (0.08–0.12 linear) lands at sRGB ~150 and *nothing* on the ground can get below sRGB ~80
(AgX's toe: 0.02 linear → ~70). Round-1 aerial frames were "washed out" partly for this reason. Terrain now
compensates with a deliberately dark palette (forest floor 0.011/0.028/0.006, meadow 0.038/0.09/0.018, straw
0.235/0.20/0.08) which reads right, but every other ground-contact module (roads, buildings, props) will have
to do the same. Suggest: noon exposure ≈ 0.85–0.95 and/or a lower sun:sky ratio target so that albedo 0.1
renders near sRGB 105–115; then all builders can use measured PBR albedos unchanged. Also keep the haze
(`fogDensity`) ≤ 3 % at 500 m for a camera 400 m up — `partly` at 0.00011 is close to the limit.

## 3. tools/screenshot.mjs: page.screenshot timeout
At 1080p under SwiftShader the street/closeup terrain frames (two instanced clutter layers + 3 shadow cascades
from the visible LOD) take 95–115 s wall per shot on this 4-core box when another builder is rendering.
`page.screenshot` uses the same `--timeout` (default 90 s) as the ready-wait; two of my dev shots died there.
Suggest `--shotTimeout` (default 180 s) separate from the ready timeout, and hiding `#boot` with
`display:none` (no opacity transition) when `headless=1` (the round-1 critic saw the overlay in one capture).

## 4. camera: `screenToGround` allocates a Raycaster per call
Cosmetic. `world.terrain.raycast` is allocation-free apart from the result; a cached Raycaster in
`CityCamera.screenToGround` would remove the per-call garbage when tools drag brushes.

## 5. main.js init order for the full game
`registry.initAll(MODULE_NAMES)` initialises `terrain` before `environment` unless the module declares
`dependencies: ['environment']` (terrain does). Consider initialising by `WAVES` order so `environment` is
always first.

## 6. roads: `world.roads.coverage` / `isRoad` (integration note, no change needed)
Terrain's ground clutter (blades/tufts) now skips every cell where `world.roads.isRoad(x, z)` is non-zero and
re-fills when `world.roads.coverage.version` changes (polled per frame, cheap) or on `roads:changed`. Please keep
`coverage.version` bumped whenever the mask is rebuilt; if roads ever publish the mask before `isRoad` exists the
terrain side simply falls through (no clutter suppression) rather than throwing.

## 7. gauntlet: pass `--timeout` through to screenshot.mjs
`tools/gauntlet.mjs` does not forward `--timeout`, so under builder contention the 1080p street/closeup terrain
shots (~90-100 s wall each on SwiftShader) can die at the 90 s default; builders then re-shoot by hand and
rebuild `summary.json`. A `--timeout` pass-through (default 180) would remove that manual step.

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

## Integrator decision (local continuation, 2026-09-06)

Fixed a real Metal/WebGL2 shader link failure: terrain's detail samplers plus environment/shadows exceeded the minimum 16 fragment texture units. Albedo and normal maps now use two texture arrays with repeat wrapping, mipmaps, original orientation, correct sRGB/linear color spaces, and disposal hooks. `shots/smoke.png` was visually inspected with `errors=[]` on Apple M4 / ANGLE Metal. This is a compatibility repair, not a new terrain critic round.

## Integrator decision (local wave 2, exact terrain writes)

Added `world.terrain.setHeights(ix0, iz0, ix1, iz1, values, {restore:true})` with inclusive bounds, full input validation before mutation, derived normal/AO texture refresh, exact chunk/global bounds, water invalidation and a tagged region event. `shots/integration/w2_terrain_restore_unit.json` verifies exact writes, rejection without partial mutation, full restoration and min/max refresh. The full tools undo chain is verified separately.

## Integrator resolution — exact save/load terrain, 2026-09-06
A populated-city roundtrip changed terrain by 3.5358896 m because terrain heights were not serialized and roads graded again during restore. Terrain now serializes the full float32 height grid as validated little-endian base64 and restores through `setHeights(...,{restore:true})`. Roads preserve node/edge IDs, sampled design heights and the restored ground during deserialization. Independent `shots/integration/w2_roundtrip_probe.mjs` after-fix evidence reports exact height equality (max difference 0), matching roads/nodes/buildings/props/cells/vehicles and stable world-section identity, with no console errors.


## Integrator decision (wave 2 final, 2026-09-06)

Applied the translation-free sky vertex transform so the 10m dome is centred for each rendering camera, including water reflections; the isolated secondary-camera probe previously rendered0 covered pixels at displaced dome positions and now covers all16384 with matching radiance. Retained existing exact setHeights/save restoration, texture-array sampler repair and capture timeout/HMR fixes. Deferred the cosmetic cached Raycaster: tools' latest drag average passes and the isolated maximum outlier does not establish this allocation as its cause. Rejected reordering initialization by WAVES: registry already sorts declared dependencies and terrain declares environment. Deferred broad noon/fog recalibration to whole-game evidence; modules continue reading the shared environment rig. Road coverage/version masking remains intact.


## Integrator decision (wave 2b final, 2026-09-08)

Applied shared service-footprint clutter exclusion and versioned native display-surface publication for the infoview consumer. Physical getHeight, world references, terrain ownership and ordinary inactive LOD remain unchanged. Reflection invalidation follows infoview change, and obsolete display descriptors expire after disposal/re-init. Existing exact setHeights restoration remains. Deferred broad fog/exposure recalibration and optional Raycaster caching; this integration does not change the environment rig.

## Integrator decision (wave 3 final, 2026-09-08)

Retained exact terrain restoration, road/lot/service exclusions and rendering-camera sky fix. No terrain seed/height internals were modified by democity integration. Deferred coordinated public regeneration and broad noon/shore/ground polish; full-world contract required before a reset. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
