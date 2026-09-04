# Builder guide (read fully before touching code)

1. Read `ARCHITECTURE.md` (the contract) and `docs/reference/CS2-LOOK.md` (the bar).
2. You own exactly `src/modules/<yours>/`. Nothing else. Assets go through `public/assets/manifest.json` + `node tools/fetch-assets.mjs` (CC0 only: Poly Haven, ambientCG, procedural).
3. The dev server is already running at http://127.0.0.1:5173 — never start/stop it. Vite hot-reloads your files.
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
