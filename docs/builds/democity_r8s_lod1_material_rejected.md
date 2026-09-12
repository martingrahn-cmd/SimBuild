# Democity R8s — separate LOD1 material candidate, rejected and reverted

## Decision

Reject the separate Lambert LOD1 tree material. It does not reproduce a stable material-only performance gain, and its small median response does not justify changing accepted foliage shading. All three product files are restored byte-for-byte to the independently accepted R8q source. Democity and whole-game remain **6.0/10 — FAIL**.

## Bounded candidate

R8r identified whole LOD1 tree meshes as the strongest tested Props render lead but did not isolate material shading from draw submission, vertex, raster or shadow work. R8s therefore tested one narrower hypothesis:

- keep every LOD1 mesh, instance, geometry/index buffer, source triangle, leaf texture, vertex colour, alpha threshold, double-sided silhouette, wind/tint shader path, LOD/culling threshold and custom depth/shadow material;
- bind only LOD1 colour rendering to a separate `MeshLambertMaterial` while keeping LOD0 and impostors on their accepted materials;
- copy the same time-dependent colour into both full and LOD1 materials;
- compare the candidate and legacy Standard material on the same warmed page by changing only the LOD1 material pointer.

The first Lambert smoke exposed a real compile conflict: Lambert's environment-map chunk and the shared height-fog chunk both declared `ENV_WORLDPOS`. A candidate-only include guard made that experiment compile without changing the global environment shader. A brief Toon fallback compiled but was visibly much brighter and flatter than the accepted foliage and was abandoned before timing. Neither failed intermediate entered production.

## Verification

- Production build: **163 modules**, pass on candidate and again after restore.
- Candidate Lambert smoke: `shots/democity/r8s-lod1-material/smoke-lambert.png`, `ok=true` with `errors=0`; inspected at original resolution against accepted `shots/democity/r8q-hidden-masts-final/interchange_12.png`.
- Toon diagnostic: `smoke-toon.png`, `errors=0`, visually brighter/flatter and abandoned.
- Initial Lambert compile failure: `smoke.png`, two recorded shader/useProgram errors; retained as failed evidence.
- Restored night smoke: `restored-smoke.png`, `errors=0`, 53.7fps /400 draws /2,194,778 triangles at its sampled endpoint; inspected at original resolution. This single endpoint is not a sustained performance claim.
- Exact source snapshots and SHA-256 digests: `shots/democity/r8s-lod1-material/source`. Restored `trees.js`, `chunks.js` and `index.js` match their pre-candidate hashes exactly.

## Synchronized material-only A/B

`tools/lod1-material-ab-profile.mjs` uses one warmed1920×1080 High/Metal/headless page with normal reflection and fixed seed1337, time22, speed0 and interchange camera. It finds all168-triangle Lambert LOD1 meshes plus the matching accepted Standard tree material, then runs interleaved legacy/candidate/legacy blocks. Only material references change; every recorded block has2,540 visible LOD1 instances. Traffic remains independently active under the established architecture, so adjacent legacy drift is part of the validity gate.

The initial3×180-frame record fails stability:

- median candidate response **−0.261270%**;
- only **1/3** control cycles at or below5% drift;
- candidate responses −0.261270%, −1.055658%, +7.845658%.

The longer5×240-frame replication also fails the all-cycle gate:

- median candidate response **+1.618821%**;
- **4/5** stable controls; maximum drift5.168269%;
- candidate responses −0.804520%, +7.777738%, +5.267543%, +1.618821%, −0.351987%;
- stable-only median **+0.633417%**, retained as diagnostic context rather than substituted for the failed predefined all-cycle rule;
- after the brief settling interval, draw calls and triangles are identical in the later blocks; median deltas are zero.

The positive median is small, contains two negative responses and does not pass the predefined stability rule. It cannot support product acceptance or a general FPS claim. The earlier whole-mesh +9.255991% R8r result should be interpreted as combined mesh work rather than evidence for a cheaper colour material.

## Preserved failures and limits

No complete16-view matrix, API/restage suite, forced-GC heap run or independent visual score was required after the candidate failed its targeted performance gate and was reverted. The retained A/B tool requires the temporary candidate material types and will intentionally fail inventory matching on restored production source. The screenshots are diagnostic product-state captures rather than blind pairs. Existing sustained50fps, broad visual, gameplay and raw-memory failures remain open, and no critic score changes.

## Evidence

- `shots/democity/r8s-lod1-material/interchange22-ab.json`
- `shots/democity/r8s-lod1-material/interchange22-ab-repeat.json`
- `shots/democity/r8s-lod1-material/smoke.png`
- `shots/democity/r8s-lod1-material/smoke-toon.png`
- `shots/democity/r8s-lod1-material/smoke-lambert.png`
- `shots/democity/r8s-lod1-material/restored-smoke.png`
- `shots/democity/r8s-lod1-material/source/hashes.json`
- `tools/lod1-material-ab-profile.mjs`
