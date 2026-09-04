# SimBuild — Architecture

A Cities: Skylines II–class city builder in **Three.js (r185) + Vite 8**, plain ES modules, no framework.
Target look: photographic PBR, physically plausible sun/sky/shadows, atmospheric depth, a living city at night.
Never programmer art.

This file is the contract. Builders own exactly one folder under `src/modules/`. Only the **integrator** edits
`src/core/`, `src/main.js`, `index.html`, `tools/`, `docs/STATUS.json` schema. Core-change requests go in
`docs/core-requests/<module>.md` and are applied between waves.

---

## 1. Folder layout

```
index.html                 entry
src/main.js                bootstrap: parse URL, create core, register + init modules, run loop
src/core/                  INTEGRATOR ONLY
  constants.js             units, layers, render orders, colour spaces, budgets
  rng.js                   seeded RNG (sfc32) + helpers; the ONLY randomness source allowed
  events.js                EventBus (on/off/once/emit, wildcard, error-isolated listeners)
  world.js                 shared world data model (see §3)
  clock.js                 game clock (time of day, day, speed, pause) — emits time events
  camera.js                city camera controller (orbit/pan/zoom, presets, smooth fly-to)
  assets.js                CC0 asset loader (PBR sets, HDRIs, GLTF), caching, procedural fallbacks
  engine.js                WebGLRenderer, scene, lights root, resize, frame loop, frame stats
  registry.js              module registry: dependency ordering, init/update/dispose, FAULT ISOLATION
  showcase.js              showcase router (?showcase=<module>), camera/time preset application
  debug.js                 window.__sim exposure for the screenshot tool (ready flag, stats, errors)
src/modules/<name>/        one folder per subsystem, default-exports a Module (see §4)
  index.js                 the Module object
  showcase.js              showcase staging for that module only
  ...                      anything else the builder wants (shaders/, materials/, gen/, …)
tools/
  screenshot.mjs           headless Chromium screenshot + JSON log (fps, draw calls, console errors)
  gauntlet.mjs             batch screenshots over presets × times, per module, for critics
  fetch-assets.mjs         downloads CC0 textures listed in public/assets/manifest.json
public/assets/             CC0 textures/HDRIs (Poly Haven, ambientCG) + manifest.json with source URLs
docs/
  STATUS.json              per-module scores, open issues, round counts (resumable state)
  reference/               CS2 look reference & scoring rubric for critics
  critic/                  critic reports per module per round
  core-requests/           builders' requests for core changes (integrator applies)
shots/                     screenshot output (PNG ignored by git, JSON logs kept)
```

Modules (13): `terrain`, `environment`, `roads`, `zoning`, `buildings`, `props`, `traffic`, `effects`,
`simulation`, `tools`, `ui`, `audio`, `democity`.

Dependency waves:
1. `terrain`, `environment`, `roads`, `simulation`, `ui`, `audio`, `effects`
2. `zoning`, `buildings`, `props`, `traffic`, `tools`
3. `democity`

---

## 2. Units, axes, conventions

- **1 unit = 1 metre.** +Y up. +X east, **−Z north** (so +Z is south; heading 0 rad = north = −Z, increasing clockwise seen from above).
- World is a square, `WORLD_SIZE = 2048 m`, centred on the origin, x,z ∈ [−1024, 1024].
- Terrain heights in metres above sea level; `SEA_LEVEL = 0`.
- Time: `clock.hour` is a float 0–24 (solar time). Day length in real seconds is `clock.dayLengthSeconds` (default 600, i.e. 1 game hour = 25 s at speed 1).
- Colour: `renderer.outputColorSpace = SRGBColorSpace`, tone mapping `AgXToneMapping` (exposure 1.0 by default; environment may set per time of day), physically correct lights (three default). Albedo textures must be tagged `colorSpace = SRGBColorSpace`; data textures (normal/rough/AO/height) linear.
- Sun intensity in lux-scaled units usable with three's physical lights: full daylight sun `DirectionalLight` intensity ≈ 3–5 with AgX at exposure 1; night moon ≈ 0.05. Environment module owns these values; other modules never add global lights.
- Layers (`constants.LAYERS`): 0 default, 1 terrain, 2 roads, 3 buildings, 4 props, 5 vehicles, 6 water, 7 sky (no shadows), 8 helpers/gizmos, 9 no-shadow-cast.
- Render order (`constants.RENDER_ORDER`): sky −1000, terrain 0, water 10, roads 20 (decal style, polygonOffset), markings 21, buildings 30, props 40, vehicles 50, transparent 100, ui-3d 200.
- Shadows: a single cascaded shadow map (CSM, 3 cascades, 2048²) owned by `environment`. Modules must set `castShadow`/`receiveShadow` on their meshes; instanced meshes included. Nothing else creates shadow-casting lights.
- All geometry that could be many-of-a-kind (buildings, props, vehicles, trees, lamps) **must use `InstancedMesh` or merged geometry**. Individual `Mesh` per object is only OK for < 50 objects total in the module.

## 3. World data model (`src/core/world.js`)

`world` is a plain object graph, shared by reference. Modules **read anything, write only their own section**, and announce writes via events (§5). Everything is deterministic given `world.seed`.

```js
world = {
  seed: 1337,                        // integer; all RNG derives from it (rng.fork('terrain'))
  size: 2048,                        // metres, square, centred on origin
  terrain: {                         // owner: terrain
    resolution: 513,                 // vertices per side (power of 2 + 1)
    cellSize: 4,                     // metres (2048/512)
    heights: Float32Array,           // resolution² row-major, [z][x], metres
    seaLevel: 0,
    getHeight(x, z) -> m,            // bilinear; safe outside bounds (clamped)
    getNormal(x, z, out?) -> Vector3,
    getSlope(x, z) -> rad,
    isWater(x, z) -> bool,
    raycast(ray) -> {point, normal} | null,
    modify(brush) ,                  // {x,z,radius,strength,mode:'raise'|'lower'|'flatten'|'smooth'}
  },
  roads: {                           // owner: roads
    nodes: Map<id, {id, x, y, z, edges:Set<id>}>,        // y = terrain-snapped height
    edges: Map<id, {id, a, b, type, lanes, width, oneWay, ctrl?:{x,z}, length, elevation}>,
    types: { 'street':{width:16,lanes:2,speed:50}, 'avenue':{width:24,lanes:4,speed:60},
             'highway':{width:32,lanes:6,speed:100}, 'alley':{width:8,lanes:1,speed:30},
             'gravel':{width:8,lanes:2,speed:30} },
    version: 0,                      // bump on any change
    addNode(x,z) -> id, addEdge(a,b,type,opts) -> id, removeEdge(id), removeNode(id),
    nearestEdge(x,z,maxDist) -> {edge, t, point, dist} | null,
    sample(edgeId, t) -> {x,y,z, tangent:{x,z}, normal:{x,z}},   // t ∈ [0,1] along edge
    laneCenter(edgeId, laneIndex, t) -> {x,y,z,tangent},          // lane 0 = rightmost in a→b direction
    frontage(edgeId) -> [{side:'left'|'right', from:t, to:t, x, z, heading}] // for zoning
  },
  zones: {                           // owner: zoning
    cellSize: 8,                     // metres; grid aligned to world
    cells: Map<key, {x, z, type, density, edgeId, side, depth}>, // key = `${ix},${iz}`
    types: ['residential','commercial','industrial','office'],
    densities: ['low','high'],
    lots: Map<id, {id, edgeId, side, cells:[key], x, z, w, d, heading, type, density, buildingId?}>,
    version: 0,
    paint(x,z,radius,type,density), erase(x,z,radius),
    lotsFor(edgeId) -> [lot], freeLots() -> [lot],
  },
  buildings: {                       // owner: buildings
    items: Map<id, {id, lotId, type, density, level:1-5, footprint:{w,d}, floors, height, x, y, z, heading, styleId, occupants, jobs, lit:boolean}>,
    version: 0,
    spawn(lot) -> id, demolish(id), levelUp(id),
    at(x,z) -> building | null,
  },
  props: {                           // owner: props
    items: Map<id, {id, kind, x, y, z, heading, scale, edgeId?, lotId?}>,
    kinds: ['streetlamp','trafficlight','tree_oak','tree_pine','bench','bin','hydrant','sign','bus_stop','fence','bush','planter'],
    version: 0,
  },
  traffic: {                         // owner: traffic
    vehicles: Map<id, {id, kind, edgeId, lane, t, speed, x, y, z, heading, lightsOn}>,
    pedestrians: Map<id, {...}>,
    stats: {count, avgSpeed, congestion:0-1},
  },
  time: {                            // owner: core/clock (read-only for modules; use clock API)
    hour: 12.0, day: 1, speed: 1, paused: false,
  },
  weather: {                         // owner: environment
    cloudiness: 0.3, rain: 0.0, wind: {x:1, z:0, speed: 2}, fogDensity: 0.0006, temperature: 18,
    sunDir: Vector3, sunIntensity, skyLight: Color,   // published each frame for other modules
  },
  economy: {                         // owner: simulation
    money: 150000, population: 0, jobs: 0, happiness: 0.5, demand:{residential,commercial,industrial,office}, taxRate: 0.1,
    history: [{day, money, population}],
  },
  selection: { kind:null, id:null }, // owner: tools
  flags: { showcase: null, headless: false },
}
```

Rules:
- Never replace a section object (`world.roads = …` is forbidden); mutate in place so references stay valid.
- Every mutating call bumps `section.version` and emits the section's event (§5).
- Terrain is the single source of height: anything placed on the ground queries `world.terrain.getHeight`.
- `world.roads.sample`/`laneCenter` are the single source of road geometry for traffic and props.

## 4. Module contract (`src/modules/<name>/index.js`)

```js
export default {
  name: 'terrain',                  // == folder name
  dependencies: ['environment'],    // init order only; missing deps => module still inits, with warning
  budget: { drawCalls: 20, triangles: 400_000 },   // self-declared; critic checks against it

  async init(ctx) {},               // build scene objects, subscribe to events; may await asset loads
  update(dt, ctx) {},               // per frame, dt in seconds (clamped ≤ 0.1)
  dispose(ctx) {},                  // remove from scene, free GPU resources, unsubscribe

  api: {},                          // public API, reachable as ctx.modules.<name>
  showcase: {                       // required. Stages a representative scene of THIS module only.
    description: 'Rolling hills, river, coast; 4 km²',
    cameras: { aerial:{...}, street:{...} },      // optional overrides of core presets
    async setup(ctx) {},            // called INSTEAD of a real city; may call other modules' apis if listed in deps
  },
}
```

`ctx` (passed to every hook):
```js
ctx = {
  world, events, clock, camera,     // core objects (§3, §5, clock.js, camera.js)
  scene,                            // THREE.Scene — add your objects under ctx.group (see below)
  group,                            // THREE.Group named after your module, already in scene; add here
  renderer,                         // THREE.WebGLRenderer
  assets,                           // assets.js loader (PBR sets, HDRI, GLTF, procedural)
  rng,                              // seeded RNG forked for your module: rng.float(), .int(a,b), .pick(arr), .fork(label)
  modules,                          // { [name]: api } of initialised modules (only deps guaranteed)
  log,                              // scoped logger: log.info/warn/error (errors also count in stats)
  quality,                          // 'low'|'medium'|'high'|'ultra' (from ?quality=, default high)
  headless,                         // true when driven by tools/screenshot.mjs (disable audio, etc.)
}
```

Fault isolation (implemented in `registry.js`):
- `init` errors: module marked `failed`, error logged + emitted (`module:error`), other modules continue. Its `group` stays empty.
- `update` errors: caught; after 3 consecutive failing frames the module's update is disabled (`degraded`), not the game.
- Event listeners are wrapped; a throwing listener never breaks the emitter or other listeners.
- A module must never touch another module's `group`, never add lights to the scene (only `environment` may), never call `renderer.render`, never change `renderer` state (tone mapping, shadow map type, clear colour) — only `environment` and `effects` may, via `ctx.engine` hooks.
- `effects` owns the post chain: it may replace the render call through `engine.setComposer(composer)`.

## 5. Events (`src/core/events.js`)

Names are `section:verb`. Payloads are plain objects. Emit after the world mutation is complete.

| Event | Emitter | Payload |
|---|---|---|
| `terrain:changed` | terrain | `{x, z, radius}` (region) or `{all:true}` |
| `roads:changed` | roads | `{added:[edgeId], removed:[edgeId], nodes:[id]}` |
| `zones:changed` | zoning | `{cells:[key], lots:{added:[id], removed:[id]}}` |
| `buildings:changed` | buildings | `{added:[id], removed:[id], updated:[id]}` |
| `props:changed` | props | `{added:[id], removed:[id]}` |
| `time:tick` | clock | `{hour, day, dt}` every frame |
| `time:hour` | clock | `{hour:int, day}` on each whole hour |
| `time:day` | clock | `{day}` at midnight |
| `weather:changed` | environment | `{cloudiness, rain, fogDensity}` |
| `sim:tick` | simulation | `{tick, economy}` (4 Hz game time) |
| `sim:demand` | simulation | `{residential, commercial, industrial, office}` |
| `tool:changed` | tools | `{tool, options}` |
| `tool:preview` | tools | `{kind, points}` |
| `selection:changed` | tools | `{kind, id}` |
| `ui:action` | ui | `{action, args}` (e.g. `{action:'setSpeed', args:[2]}`) |
| `camera:changed` | camera | `{position, target, distance}` (throttled ~10 Hz) |
| `module:error` | registry | `{module, phase, error}` |
| `module:ready` | registry | `{module}` |
| `app:ready` | main | `{}` after all inits + assets |
| `audio:play` | any | `{sound, x?, z?, volume?}` (audio listens) |

## 6. Core APIs

`clock`: `hour`, `day`, `speed`, `paused`, `set(hour)`, `setSpeed(n)`, `pause()`, `resume()`, `sunElevation(hour)`.
`camera`: `camera` (PerspectiveCamera, fov 45, near 1, far 6000), `target`, `distance`, `presets` (`aerial`, `street`, `skyline`, `closeup`, `overview`, `night_street`), `apply(presetName | {position, target})`, `flyTo({position,target}, seconds)`, `enableControls(bool)`, `screenToGround(ndcX, ndcY) -> {x,z}|null` (uses terrain raycast).
`assets`: `pbr(name, {repeat})` → `{map, normalMap, roughnessMap, aoMap, displacementMap?}` from `public/assets/<name>/` per manifest; `hdri(name)`; `gltf(url)`; `procedural.noiseTexture(opts)`, `procedural.gradient(opts)`, all cached; every loader resolves even on failure (with a procedural fallback + `log.warn`).
`engine`: `renderer`, `scene`, `setComposer(composerLike)` (`effects` only), `stats` (`{fps, frameMs, drawCalls, triangles, programs, textures}`), `onBeforeRender(fn)`, `onAfterRender(fn)`.
`rng.fork(label)` yields an independent stream derived from `world.seed` + label. Use of `Math.random` is forbidden in modules (lint-checked by the gauntlet).

## 7. Showcase mode & URL parameters

`index.html?showcase=<module>&time=<hour>&camera=<preset>&seed=<int>&quality=<q>&headless=1&speed=0`

- `showcase=<module>`: only core + `environment` + the named module (+ its declared dependencies) are initialised; `module.showcase.setup(ctx)` is called instead of the demo city. `showcase=democity` (or none) = full game.
- `time=<float>`: set clock hour, pause the clock (`speed=0` implicit unless `speed=` given).
- `camera=<preset>`: `aerial|street|skyline|closeup|overview|night_street` or a module-declared preset.
- `seed`, `quality`, `headless` as above.

Ready protocol (`src/core/debug.js`): `window.__sim = { ready:false, stats(), errors:[], modules:{name:status}, setTime(h), setCamera(p), world, events }`. `ready` becomes `true` after `app:ready` **and** 5 rendered frames **and** all pending asset loads settle (or a 20 s timeout, which is logged as an error).

## 8. Verification loop (`tools/`)

`node tools/screenshot.mjs --showcase terrain --time 14 --camera aerial [--seed 1] [--w 1920 --h 1080] [--out shots/terrain_aerial_14.png] [--measure 3]`
- Launches headless Chromium (Playwright, SwiftShader/ANGLE GL), opens the dev server (`http://127.0.0.1:5173`), waits for `window.__sim.ready`, measures fps over `--measure` seconds, writes PNG and `<out>.json`:
  `{ url, showcase, time, camera, seed, fps, frameMs, drawCalls, triangles, textures, programs, errors:[...], warnings:[...], modules:{...}, gpu:'swiftshader', elapsedMs }`.
- fps under SwiftShader is software-rendered and NOT the 50 fps target; the budget is checked via `drawCalls` and `triangles`, and via fps **relative** to the baseline (`shots/baseline_empty.json`). A real-GPU run is the final authority; document it in STATUS as `fpsGpu: null` until measured.

`node tools/gauntlet.mjs --module roads` runs the standard matrix: cameras `aerial, street, skyline, closeup` × times `06.5, 12, 17.5, 22` (16 shots) plus the module's own presets, then prints a summary table; critics read the PNGs with the image reader.

**No agent may claim anything it hasn't screenshotted and looked at.**

## 9. Performance budget

| Metric | Budget (full demo city, 1080p, quality=high) |
|---|---|
| fps (real GPU, GTX 1660-class) | ≥ 50 |
| draw calls | ≤ 1500 total (terrain 20, environment 15, roads 80, buildings 500, props 400, traffic 150, effects 30, water 5, tools/ui 20, headroom) |
| triangles on screen | ≤ 3 M |
| GPU texture memory | ≤ 768 MB (PBR sets 1k, at most 2k for hero materials) |
| JS heap | ≤ 512 MB |
| per-frame JS (update) | ≤ 6 ms total; any single module ≤ 2 ms |
| init time | ≤ 15 s on a warm cache |

Techniques expected: instancing, merged static geometry, frustum culling on instanced chunks (chunk the city into 128 m tiles), LOD for buildings/trees (2 levels + impostor billboards for far trees), texture atlases, shared materials, no per-frame allocations in `update`.

## 10. Asset policy

- **CC0 only**: Poly Haven (polyhaven.com, CC0), ambientCG (CC0), or procedural. Nothing else, no exceptions, no "attribution-required" licenses.
- Every downloaded asset is listed in `public/assets/manifest.json`: `{ "name": "asphalt_02", "source": "polyhaven", "url": "...", "license": "CC0", "files": {...} }`. `tools/fetch-assets.mjs` downloads it at 1k JPG (2k only for hero materials). Builders add entries; they do not vendor files by hand outside that folder.
- Procedural generation (noise, SDF windows, generated facades, decal atlases) is encouraged and often looks better than tiled photos at city scale; combine both (photo detail textures + procedural macro variation).
- No copyrighted game assets. CS2 screenshots are used **only** as a visual reference by critics, never stored in the repo.

## 11. Determinism

- All randomness through `ctx.rng` (sfc32 seeded from `world.seed` + module label). Same seed + same actions = identical city, byte-for-byte identical screenshot (modulo float driver noise).
- Simulation ticks at fixed 4 Hz game-time steps accumulated from `dt`; never depends on wall-clock.
- No `Date.now()`/`performance.now()` in module logic except for profiling.

## 12. Quality bar (what "AAA" means here, per module)

- **terrain**: multi-octave heightfield with erosion look, slope-based splat (grass/dirt/rock/sand/snow), macro variation, detail normals, tessellated near the camera or high-res chunks, planar reflective water with shore foam & depth tint, distance fog integrated.
- **environment**: physically based sky (Hosek-Wilkie or Preetham-plus), sun disc + moon, stars at night, PMREM environment from the sky each few minutes of game time, CSM shadows with soft PCF, exposure curve per time of day, volumetric-looking clouds (at least layered noise), height fog, rain and wet-surface parameters published to others.
- **roads**: smooth curves (nodes+bezier), proper intersections with curb geometry, asphalt PBR with wear, lane markings as decals, crosswalks, kerbs and sidewalks, road wear darkening in the lane centre, conform to terrain (and cut/fill), bridges above water, streetlight positions exposed.
- **zoning**: CS2-style coloured cell overlay with animated edges, lots generated from road frontage, fits corner lots, respects slope/water.
- **buildings**: procedural facades (window grids, floors, balconies, roofs with HVAC/water towers), per-zone styles, growth levels, emissive windows with per-window random on/off at night warm/cool tint, interior parallax look for hero close-ups, instanced with LOD.
- **props**: trees (3+ species, LOD, wind sway), street lamps (light halos at night via sprites; real point lights only near camera), traffic lights, benches, bins, signs; placement rules along roads and lots.
- **traffic**: vehicles on lanes with car-following, lane changing at intersections, traffic light compliance, headlights/taillights at night, pedestrians on sidewalks; instanced vehicle meshes (5+ vehicle classes).
- **effects**: bloom (physically restrained), SSAO or GTAO, tone mapping/colour grading, vignette, optional TAA/FXAA, depth-of-field for closeups, night light bloom on emissives, rain streaks/wet reflection.
- **simulation**: population, jobs, demand (RCI), money, taxes, happiness, growth → building spawn/level requests; deterministic 4 Hz ticks.
- **tools**: road drawing (straight/curve/free), zoning brush, bulldoze, terrain sculpt; ghost previews, snapping, cost display, undo/redo.
- **ui**: bottom toolbar (CS2-style), RCI demand bars, money/pop/time HUD, clock speed controls, info panels on selection, notifications, showcase switcher (dev), draw-call/fps corner.
- **audio**: ambient bed by time of day & zoom (birds, wind, traffic hum, night crickets), UI clicks, procedural (WebAudio synthesis) or CC0 clips; all gated behind a user gesture and disabled in headless.
- **democity**: a 2 km² city: downtown high-rise, mid-rise mixed, suburbs, industrial park, highway with interchange, river with 2 bridges, park, coast; camera tour; everything else's showcase becomes irrelevant — this is what ships.

## 13. Scoring (critics)

0–10 vs Cities: Skylines II at the same time of day and zoom. 10 = indistinguishable, 8.5 = AAA with nits, 7 = good indie, 5 = programmer art, 3 = broken. Pass = **≥ 8.5 with zero console errors** and within budget. Scores and ranked issues live in `docs/STATUS.json` and `docs/critic/<module>_r<n>.md`. Never inflate.

## 14. Critic verdict files & STATUS aggregation

Each critic round writes two files: `docs/critic/<module>_r<n>.md` (human report) and `docs/critic/<module>_r<n>.json`:
```json
{ "module": "roads", "round": 2, "score": 7.5, "pass": false, "consoleErrors": 0, "maxDrawCalls": 44, "apiContractOk": true,
  "issues": [{ "rank": 1, "severity": "major", "title": "...", "detail": "...", "evidence": "shots/roads/r2/closeup_12.png" }],
  "strengths": ["..."], "summary": "...", "shots": ["..."] }
```
`node tools/status.mjs` folds the newest verdict per module into `docs/STATUS.json` (score, pass, round, openIssues, history, summary.weakest).
Every iteration of the build loop starts by reading STATUS.json and resumes from the weakest module at its next round.
