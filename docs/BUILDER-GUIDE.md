# Builder guide (read fully before touching code)

1. Read `ARCHITECTURE.md` (the contract) and `docs/reference/CS2-LOOK.md` (the bar).
2. You own exactly `src/modules/<yours>/`. Nothing else. Assets go through `public/assets/manifest.json` + `node tools/fetch-assets.mjs` (CC0 only: Poly Haven, ambientCG, procedural).
3. The dev server is already running at http://127.0.0.1:5173 — never start/stop it. Vite hot-reloads your files.
   If it is genuinely down (the container restarts occasionally), `./tools/devserver.sh` brings it back idempotently;
   it is the one exception to "never start the server", and it is safe to run when the server is already up.
4. Verify with screenshots, every time, before claiming anything:
   `node tools/screenshot.mjs --showcase <yours> --time 12 --camera aerial --out shots/<yours>/dev_aerial_12.png`
   then READ the PNG with the image reader and READ the JSON next to it (errors must be `[]`).
   Full matrix: `node tools/gauntlet.mjs --module <yours> --round <n>`.
5. Standard camera presets: aerial, street, skyline, closeup, overview, night_street. Your showcase may add its own via `showcase.cameras`.
   Your showcase must look good from ALL of aerial/street/skyline/closeup at 06.5/12/17.5/22 — stage the scene around the origin (presets look at ~[0..40, 0, 0..60]).
6. Randomness only via `ctx.rng`. No `Math.random`. No `Date.now` in logic.
7. Performance: instancing/merging; no per-frame allocations; stay inside your declared `budget.drawCalls`.
8. Errors: zero console errors in every screenshot JSON. Warnings should be addressed too.
9. Report at the end: what you built, the screenshot paths you looked at, real numbers (draws/tris/fps), what is still weak, and any core requests (`docs/core-requests/<yours>.md`).
10. Never inflate. If it looks like programmer art, say so and fix it.

Useful three.js modules available (r185): `three/examples/jsm/csm/CSM.js`, `objects/Sky.js`, `objects/Water.js`, `objects/Reflector.js`,
`postprocessing/{EffectComposer,RenderPass,UnrealBloomPass,GTAOPass,SSAOPass,SMAAPass,FXAAPass,OutputPass,BokehPass,LUTPass}.js`,
`utils/BufferGeometryUtils.js` (mergeGeometries), `loaders/GLTFLoader.js`, `math/SimplexNoise.js`, `math/ImprovedNoise.js`.

## Running the verification loop on a real GPU (Apple Silicon / discrete)

This CI box has no GPU: WebGL runs on SwiftShader (software), so `fps` in the JSON logs is a *relative* number only
and the ≥ 50 fps @ 1080p budget cannot be verified here — `fpsGpu` stays null in STATUS.json until someone measures it
on real hardware. On a machine with a GPU:

```bash
# macOS (Apple Silicon)
SIM_GL=metal npm run shot -- --showcase democity --camera skyline --time 17.5 --measure 5
SIM_GL=metal SIM_HEADED=1 node tools/gauntlet.mjs --module democity --round gpu   # if headless falls back to software
# Linux/Windows with a discrete GPU
SIM_GL=gl    node tools/screenshot.mjs --showcase democity --camera aerial --time 12 --measure 5
```

`gpuRenderer` in the JSON says which backend actually served the frame — check it says Metal/ANGLE-GPU and not
SwiftShader before trusting an fps number. Headless Chromium sometimes falls back to software even with the flag;
`SIM_HEADED=1` opens a real window, which always gets the GPU.
