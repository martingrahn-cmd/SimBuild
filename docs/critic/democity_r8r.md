# Democity R8r — independent render-attribution audit

**Accept the diagnostic with qualifications. Support a bounded LOD1-only shading experiment; no product change is accepted. Democity and whole-game remain 6.0/10 — FAIL.**

The evidence identifies LOD1 trees at interchange as the strongest tested Props render-component lead. It does not identify shading alone: hiding meshes also removes draw submission, vertex/raster work and eligible shadow rendering. A cheaper LOD1 material is a reasonable next hypothesis with strict visual and synchronized timing acceptance, not an already demonstrated solution.

## Recomputed comparisons

I read every JSON in `shots/democity/r8r-props-components`, recalculated each expected control mean, FPS percentage, control drift, submitted draw/triangle delta and three-cycle median, and compared them with the saved summaries. All arithmetic matches; all browser and sampled-block errors are empty. All frame and observation counts match (120 each repeated block;90 each short block). The tools do not persist block elapsed times or individual timing samples.

| View / condition / component | Median FPS change | Maximum control drift | Stable cycles |
|---|---:|---:|---:|
| `interchange22-lod1-sync-off-reflection-off` / lod1 |-0.027512%|0.079996%|3/3|
| `interchange22-lod1-sync-on-reflection-off` / lod1 |+8.519806%|5.404458%|2/3|
| `interchange22-lod1-sync-on-reflection-on` / lod1 |+9.255991%|2.398548%|3/3|
| `interchange22-other-sync-on-reflection-off` / pools |+0.269041%|6.309148%|2/3|
| `interchange22-other-sync-on-reflection-off` / lenses |+3.750307%|3.799481%|3/3|
| `interchange22-other-sync-on-reflection-off` / halos |-0.849310%|2.270461%|3/3|
| `park22-sync-on-reflection-off` / lod1 |+6.194091%|4.136966%|3/3|
| `park22-sync-on-reflection-off` / impostors |+1.996725%|2.867802%|3/3|
| `park22-sync-on-reflection-off` / furniture |+0.054220%|3.804298%|3/3|

Interchange LOD1 with required capture sync and normal reflection is the cleanest lead: all three responses are positive (+9.255991%,+6.932415%,+10.267026%) with adjacent-control drift0.044801%,2.398548%,0.069942%. Selection-time inventory is37 meshes,2630 instances and441840 source triangles; median submitted reduction is28 draws/405061.65 triangles.

With reflection off, all three responses are positive but the first control drift is5.404458%, so the file remains `pass:false`. The all-cycle median is8.519806%; using only the two stable cycles gives10.431698%. Neither should be silently substituted for the other. Their broad agreement supports work outside the planar reflection, not a precise equality of cost.

Park LOD1 is weaker: two gains and one−1.408742% response despite stable controls. Impostors likewise have one negative cycle; furniture spans−1.874475% to+2.933693% around a0.054220% median. Pools remove roughly381636 submitted triangles for only0.269041% median gain, with one unstable cycle. Lenses show a smaller inconsistent response; halos provide no positive median lead. None presently outranks interchange LOD1.

The short initial run is unsuitable for selection: pool/lens/halo drift8.085634%,11.846690%,10.347834%; its LOD1 single cycle is+4.960018% with4.417253% drift, but is weaker than the repeated experiment. The park file and sync-off file both also pass their all-cycle stability test. The builder’s final claim that only the interchange reflection-on file passes is overbroad; the combined other-component file fails because pools has one unstable cycle, while lenses and halos individually pass the drift filter.

## Classification, restoration and source boundaries

The matchers agree with current accepted geometry/material constructors:168-triangle Standard instancing for LOD1,4 for impostors,288-triangle Shader instancing for pools,12-triangle Basic instancing for lenses, and Shader Points for halos. Furniture means non-instanced Standard meshes and can include foliage or miscellaneous opaque meshes; it is not a semantic furniture-only identifier.

Inventory is collected before the180-frame warmup and the selected set is fixed. Mesh `visible` descriptors are temporarily replaced with a false getter/no-op setter, so normal owner updates cannot undo the mask. Unmasked controls restore original descriptors. This preserves source ownership and keeps callbacks running, but newly visible unselected meshes and changing LOD populations are not separately tracked. The source-triangle inventory is not the eventual submitted workload: park selects455 LOD1 instances/76440 source triangles while the actual median submission delta is only27193.33 triangles.

The triangle helper has a real metadata defect: `undefined / 3` becomes NaN before `??` can choose the position fallback. Halo values therefore serialize as null. Points should not be reported as triangle meshes; their mask and FPS arithmetic remain valid.

Normal success restores descriptors, sets reflection to true and closes the page. There is no evaluate-level `try/finally`, previous reflection state capture or post-restoration assertion. Thus restoration is credible for the observed successful default-on pages, but the claim is not exception-safe or general to initially disabled reflection. No production or persisted world state is changed.

Props explicitly self-culls its entire group during `water:reflection`. Similar reflection-on/off LOD1 sensitivity is consistent with a non-reflection workload. The mask still removes whole objects and any shadow contribution; no per-object castShadow record or pass timer isolates shading. LOD0 and LOD1 currently share `treeMat` in `chunks.js`, so the next candidate needs a separate LOD1 material path rather than modifying the shared material and claiming LOD1-only scope.

## Capture synchronization

The accepted R8q record independently sums to16605759 sampled µs;14222556µs (85.648334%) is native `readPixels`. `engine.js` performs this readback intentionally in headless captures to limit queued GPU work. Wait attributed there may represent completion of earlier rendering; it is not directly an expensive removable gameplay algorithm.

The sync-off test omits `headless=1` altogether. It changes preserveDrawingBuffer, pixel-ratio/readiness policy and world flags as well as readback. Its selected inventory changes from2630 to2540 instances. Controls and masks sit near60FPS with a−0.027512% median change, consistent with a browser cadence ceiling. This cannot prove a readback-only causal difference or quantify native rendering headroom. Keep the required synchronization for acceptance measurements; removing it would change the gate.

## Next bounded candidate

Props may test cheaper LOD1 shading while retaining every tree instance, vertex/index buffer, leaf texture, alpha threshold/silhouette, wind, tint, LOD threshold, culling rule, shadow behavior and save/restore contract. Keep LOD0 and impostors unchanged through an explicit separate material binding. Require a reproducible synchronized A/B gain on matched source/configuration and subsequent independent day/night visual review. Reject it if crown depth/material quality regresses, if the claimed gain depends on masking content, or if timing fails to reproduce.

This diagnostic closes no visual, gameplay, sustained50FPS or memory gate. Existing raw708.3MB and sustained-timing limitations remain; no memory measurement is made here. Global city fabric remains visual rank1, followed by foliage, night depth, site integration, landmark grounds, environment/landscape, human activity and performance.

## Evidence and limits

Read evidence:

- `shots/democity/r8r-props-components/interchange22-lod1-sync-off-reflection-off.json`
- `shots/democity/r8r-props-components/interchange22-lod1-sync-on-reflection-off.json`
- `shots/democity/r8r-props-components/interchange22-lod1-sync-on-reflection-on.json`
- `shots/democity/r8r-props-components/interchange22-other-sync-on-reflection-off.json`
- `shots/democity/r8r-props-components/interchange22-reflection-on.json`
- `shots/democity/r8r-props-components/park22-sync-on-reflection-off.json`
- `shots/democity/r8q-hidden-masts/interchange22-attribution-candidate.json`
- `docs/builds/democity_r8r_render_attribution.md`
- `tools/paired-props-component-profile.mjs`
- `tools/interleaved-props-component-profile.mjs`
- Relevant source: `src/core/engine.js`, `src/main.js`, `src/modules/props/index.js`, `src/modules/props/chunks.js`, `src/modules/props/trees.js`, `src/modules/terrain/index.js`, `src/modules/terrain/water.js`.

- Diagnostic only. No product candidate is accepted by this report. No screenshots were inspected or captured in R8r, as requested; no visual improvement or regression judgment, new reference calibration, whole-game critic, blind judging, gameplay or save verification is claimed.
- Visibility masks remove the selected object rendering workload, including submission, vertex processing, alpha rasterization, shading and eligible shadow draws. They do not isolate fragment shading and do not directly measure GPU time. Props update callbacks keep running. Gains are not additive across components.
- Each component runs on a separate page with only three short A-B-A comparisons; neighboring pairs share controls, so these are correlated observations. No confidence interval or long sustained trace is present. Per-block elapsed times/raw frame samples are not retained; stored FPS can be used to recompute pairing arithmetic but not independently reconstruct original timing.
- The first short pool/lens/halo series is rejected for drift. Reflection-off LOD1 and other-component files remain pass:false where any component/cycle breaches5%. Stable control drift is a timing filter, not proof that a positive/negative response is causal.
- captureSync=false omits the headless URL flag. This also changes preserveDrawingBuffer, pixel-ratio/readiness policy and world flags, not just readPixels. Inventory differs2630→2540. The near60FPS result is consistent with a browser cadence ceiling but does not isolate a readback-only causal effect or prove native performance.
- Objects are selected before the180-frame warmup in the repeated tool, using local visible flags rather than effective ancestor visibility or the eventual settled render inventory. The set is then fixed. Counts are selection-time inventory; later LOD changes or newly visible objects can escape the mask. Source triangles do not equal submitted triangles, especially park.
- The triangle helper divides an optional index count before nullish coalescing; absent indices produce NaN and defeat the position-count fallback. Halo sourceTriangles/baseTriangles therefore serialize as null. Points are not triangle meshes in any case. This does not invalidate the object-type halo mask or its timing, but its source-triangle count is unusable.
- Classification is structural, not semantic IDs: 168-triangle Standard instancing agrees with current LOD1,4 with impostors,288 Shader instancing with pools,12 Basic instancing with lenses; Shader Points selects halos. The broad non-instanced Standard furniture class can also include foliage or miscellaneous opaque meshes. Future geometry/material changes require rematching.
- Normal completion restores saved visibility descriptors and reflection to true, then closes each page. The evaluate body lacks try/finally and neither captures nor verifies the actual prior reflection state. Thus restoration is supported on the observed successful default-on path, not robustly proven for exceptions or an initially disabled setting. No source/persisted state is written.
- Props hides its entire group during water reflection; reflection-off results are consistent with a contribution outside that pass. No raw per-pass GPU timer or recorded per-object castShadow inventory is retained, so main-pass shading remains a hypothesis. The tool cannot separate main shading from shadow/render submission work.
- Accepted R8q native readPixels sample14222556/16605759µs is85.648334%, including possible completion wait for previous GPU work. Required synchronized captures must retain the sync gate; removal cannot be sold as a product optimization.
- LOD0 and LOD1 currently share treeMat in chunks.js. A LOD1-only candidate must use an explicitly separate material/owner path while preserving existing texture, alpha silhouette/test, tint, wind, geometry, population, LOD thresholds, culling, shadows and restore behavior. A shared-material edit would exceed the claimed scope.
- No memory data or sustained50FPS certification is supplied by this diagnostic. Previous raw708.3MB and unresolved sustained timing limitations are carried forward without declaring retained-memory failure from raw heap alone. Democity/whole-game6.0FAIL and global visual ranks remain unchanged.
