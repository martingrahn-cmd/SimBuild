# Democity R8p — allocation-free Traffic signal key

**Candidate for independent acceptance at unchanged 6.0/10 — FAIL.** This round removes a measured per-frame CPU hotspot without changing signal timing, traffic behavior, rendered content, geometry, state, RNG or save data.

## Measured diagnosis

The first fresh-page owner mask was not reliable enough for FPS attribution because every owner opened in a separate browser and startup/thermal order changed timing. `tools/paired-owner-profile.mjs` now brackets a temporary mask with same-page A-B-A controls. At the fixed interchange 22:00 view, six of seven owner pairs keep control drift below5%. Props is the largest stable response at +21.592% when hidden, followed by buildings +17.430% and roads +17.051%. Terrain is rejected from that comparison because its bracketing controls drift9.294%.

The Props inventory shows 2,540 LOD1 trees at interchange and no visible furniture. Its global 1,325-instance light-pool mesh accounts for about381,693 average submitted triangles, but a stable same-page pool mask improves FPS by only1.993%; reducing pool tessellation is therefore not selected as the CPU fix.

Direct callback profiling over1,200 fixed-camera frames finds Props at1.647417ms mean,1.9ms p50 and2.3ms p95. `lensKeyOf()` called Traffic `signalState()` once per Props signal on every frame. Each call ran `LaneGraph.updateSignals()` over the whole signal graph and allocated a result object plus a copied `greenArms` array. The supposedly cheap key path was therefore repeated graph work rather than allocation-free change detection.

## Bounded change

- Traffic adds read-only `signalKey()`. It updates the authoritative signal graph once and hashes the existing phase, aspect and green-arm values into one scalar without allocating result objects or arrays.
- Props uses `signalKey()` for per-frame change detection when available. Its old `signalState()` loop remains as a compatibility fallback.
- Detailed `signalState()`, signal timing, Traffic simulation, Props lens updates, scene groups, LOD, light pools, geometry, public save formats and module ownership remain unchanged.

## Verification

- Production build passes with163 transformed modules; source and documentation diff checks pass.
- A dedicated16-sample hour-transition probe passes. The new key is stable on repeat reads, changes exactly when the public all-signal digest changes, and repeats exactly across a second sweep. The existing `signalState()` continues to return defensive array copies. All3,858 Props signal-lens instances are found and their color buffers update deterministically.
- Public Democity API, double deserialize and eight valid/one invalid tour calls pass. Exact authored 1337→7→1337→7 restage digests pass within the existing probe scope.
- In the direct1,200-frame candidate profile, Props falls from1.647417ms to0.030167ms mean and from2.3ms to0.1ms p95.
- The six-run interleaved fixed-camera A/B uses a route that renames only `signalKey`, forcing the unchanged Props fallback in legacy runs. Median Props time falls1.565000→0.044167ms (−97.178%); p95 falls2.6→0.1ms. Median whole-frame FPS rises25.603→27.567 (+7.670%), but run-order drift makes this supporting evidence rather than a 50fps certification.
- The six-run moving-camera A/B keeps the same geometry and lowers median Props time1.495000→0.059583ms (−96.014%); p95 falls2.3→0.2ms. Whole-frame FPS median moves23.222→22.290 under downward host drift, so no total-FPS improvement is claimed from that series.
- All16 final-matrix originals and two targeted repeat controls were inspected. Every sidecar reports ready state and zero errors. Geometry remains469 maximum draws /2,814,092 maximum triangles. The serial matrix records34.0fps minimum with2/16 below50; fresh four-second repeats of those two outliers record55.0fps and54.5fps. The50fps gate remains failed because the reproducible sustained result is unresolved. Maximum raw endpoint heap is672.4MB and remains diagnostic only.
- Three additional directed night originals were inspected. Against prior R8n frames, night_downtown22 changes only0.000104 mean RGB and0.001013% of pixels above2; park22 changes0.018622/0.113812%. Interchange22 includes unmatched traffic/render phase differences and is not treated as pixel-locked evidence. No visual improvement is claimed.

## Decision boundary

Accept only the CPU work if independent review reproduces the callback reduction and confirms the signal/lens contract. Hold Democity and whole-game at6.0 FAIL. This change does not solve sparse city fabric, foliage form, night composition, mountain art, activity, raw memory or the sustained50fps requirement.

Raw heap series from separate browser processes are not comparable allocation measurements. Although the removed public-object copies are evident in source, this round does not claim a measured allocation-rate reduction. A later heap investigation must use a same-process allocation or forced-GC method.

The transition probe establishes candidate repeatability, signal-transition correspondence and stable lens-buffer output. It is not a per-lens color comparison against the legacy fallback implementation.

## Evidence

- `shots/democity/r8p-signal-key-candidate/source/source-hashes.json`
- `shots/democity/r8p-current-owner-profile/park22.json`
- `shots/democity/r8p-current-owner-profile/interchange22-paired.json`
- `shots/democity/r8p-current-owner-profile/interchange22-pools-paired.json`
- `shots/democity/r8p-current-owner-profile/interchange22-module-static.json`
- `shots/democity/r8p-current-owner-profile/props-visible/`
- `shots/democity/r8p-signal-key-candidate/interchange22-module-static.json`
- `shots/democity/r8p-signal-key-candidate/interchange22-ab.json`
- `shots/democity/r8p-signal-key-candidate/interchange22-moving-ab.json`
- `shots/democity/r8p-signal-key-candidate/signal-key-contract.json`
- `shots/democity/r8p-signal-key-candidate/apicheck.json`
- `shots/democity/r8p-signal-key-candidate/restage-cycle.json`
- `shots/democity/r8p-signal-key-candidate/matched-r8n-diff.json`
- `shots/democity/r8p-signal-key-final/`
- `shots/democity/r8p-signal-key-controls/`
