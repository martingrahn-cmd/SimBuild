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
