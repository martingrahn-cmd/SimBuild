# Core requests: tools, round 2

## Resolved: HUD, terrain restoration, props signature, sampler initialization

The integrator removed the `.api` indirection from HUD selection/options. `ctx.modules.tools` is the API itself. Real clicks in `shots/integration/w2_core_probe.json` produce exactly one `tool:changed` per card and option click. Tools deduplicates equivalent normalized options without clearing the active draft.

Terrain now publishes `world.terrain.setHeights(ix0, iz0, ix1, iz1, values, {restore:true}) -> bool` with inclusive coordinates. Roads supports `ctx.modules.roads.rebuild({preserveTerrain:true})` and keeps preservation active across unrelated rebuilds until a real road or non-restoration terrain edit. Tools uses these contracts exclusively for restoration, with full pre/post height snapshots for road actions because cut/fill can affect the whole network. The direct-height-write fallback has been removed.

The earlier undo probe found a 0.525 m drift at (-75,150). The final `shots/tools/r2/verify.json` restores eight mixed successful edits exactly, including 16 heights and all road/node/zone/building counters after delayed frames. Service remains unavailable, so the eighth successful edit is a third road; this is explicitly not a claimed service placement pass.

Props now supports `ctx.modules.props.place(kind, x, z, {heading}) -> id` and `remove(id)`. Tools calls that real signature, uses removal for demolition, and records successful placements only. This differs from the old five-argument spec and needs documentation alignment.

Early Metal failures were in a neighboring props tree shader (`uBark` plus environment sky/cloud samplers). The integrator fixed the material-binding race by running environment synchronization in `engine.onBeforeRender`, after module updates. The final instrumented `shots/tools/r2/metal-probe.json` records zero GL faults; final captures have zero errors. This was an environment initialization issue, not a tools-material workaround.

## Open: services placement and metadata

Services remains a stub. `world.services.place()` returns null. Tools preserves the ghost and displays exactly `service placement unavailable`, returns `{ok:false, ids:[], cost:0, reason}`, and charges nothing. The service-inclusive eight-action acceptance sequence cannot complete until wave 2b.

Publish `footprintOf(kind)`, `coverageOf(kind)`, and `costOf(kind)` on the flat services API. Tools already prefers these guarded functions over its local fallback table. Preserve `world.services.place(kind,x,z,heading) -> id|null` and `remove(id)` so its existing inverse command can work.

## Open: curved-edge splitting

`world.roads.splitEdge(edgeId,x,z) -> nodeId` is still absent. Tools splits straight edges via remove/add calls, which changes edge IDs. A curve requires exact Bézier subdivision; tools cannot promise a connected T-junction on a curved edge with the present contract.

## Integrated capture measurement boundary

`--showcase all --camera aerial --time 12` and `--camera night_street --time 22` are captured in `shots/tools/r2/all_*.png`, both clean. Core's all showcase currently starts an empty map and does not stage the tools district or a ghost, so these captures have no `tools.ribbon` crop. The bloom-toggle pixel difference is not reported as passed or failed; the residual review already marks the unspecified bloom-toggle protocol unmeasurable. Tools-only pinned night crops establish luminance and contrast independently.

## Round 3: authoritative pavement clearance (integrated)

The independent r2 redo failure is now reproduced and fixed. `shots/tools/r3/early-probe.json` reproduced 668 vertices drifting by up to 0.499928 m after redo. The cause was the sculpt journal capturing its post-image before the delayed road cut/fill. Sculpt transactions now snapshot the full heightfield when a network exists, synchronously rebuild roads, then record the post-image. `shots/tools/r3/transaction-probe.json` compares all 263169 heights, not a handful of distant samples: eight mixed edits, eight undos and eight redos all restore the four required counters and every height exactly.

The road ghost's prescribed +0.10–0.20 m above *raw terrain* conflicts with the rendered road geometry: roads lowers the underlying terrain by 0.25 m, then draws asphalt 0.08 m and kerbs higher above the road profile. The baseline raycast at (73,10) measured pavement 0.408884 m above terrain, beyond the entire permitted ghost band. Polygon offset alone did not prevent the triangular intrusions.

The integrator added `ctx.modules.roads.surfaceHeightAt(x,z) -> number|null`: highest generated paved surface from the last rebuild, including bridges, excluding barriers/piers/decals and terrain. `shots/integration/w2_pavement_probe.json` compares 176 points against independent mesh raycasts. Tools uses `max(terrain.getHeight(x,z), surfaceHeightAt(x,z)) + 0.15` with <=1 m lateral ribbon samples. It retains depth testing, transparency, depthWrite:false, polygonOffset -6/-6 and toneMapped:false. `ghostLiftMin/Max` now measure the actual stored Float32 vertices against raw terrain; the additive `ghostSurfaceLiftMin/Max` measure clearance over the supporting surface. Current ranges are approximately 0.150–0.561 m raw-terrain clearance and 0.150 m supporting-surface clearance. This is a documented acceptance conflict, not a claim that the original raw-terrain limit passes.

Proposed acceptance wording: “Each ghost vertex is 0.10–0.20 m above max(raw terrain, existing paved surface); expose both raw-terrain clearance and supporting-surface clearance.”

## Round 3: prop bounds metadata fallback

Tools now gives prop demolition and selection bounds separate kind/species/scale dimensions and local offsets for lamp arms and signal heads. Small hydrants are 0.86 m high rather than the old universal 6 m box; trees use their species canopy width and scaled height. The volume base follows the actual prop y, and the gizmo no longer forces a minimum 2 m height.

An additive `ctx.modules.props.boundsOf(id) -> {x,z,heading,w,d,height,baseY}|null` would remove the remaining duplicated kit metadata. The heading should use the tools rectangle's XZ convention (the negative of Three's rotateY). The current tools fallback is in `src/modules/tools/footprints.js`, and it already prefers this optional API. Fence runs and future kit variations need authoritative per-instance bounds; no claim is made that a single fallback box represents every possible fence run.

The demolition showcase now creates a rear alley and one small infill lot through the normal tools API. This yields four buildings in the original [-176,-116]–[-104,-52] rectangle, while retaining all eight zone type/density combinations. Props are selected by their actual anchor inside the marquee; offsets affect the drawn box only. `props:changed` and `services:changed` invalidate the preview so later neighbour rebuilds cannot leave an obsolete victim count on screen.

## Round 3: clean wash measurements

Pinned wash crops now search inside the projected wash boundary and conservatively reject projected building/prop envelopes, overlay pills and ribbon triangles. Where no clean 32×32 region exists, `tools.wash` is omitted. An absent crop is unmeasured; it is not evidence of a green/red wash material and is not scored as a pass. The published ribbon and ground crops retain their existing deterministic projection and resolution scaling.


### Round 3 final evidence and remaining limits

Final build record: docs/builds/tools_r3.json (self-score8.3;38 final images viewed;0 app errors). Exact full-height eight-action undo/redo now has0m error over263169 samples. Four houses and all14 selected props are removed; five neighbor props regenerate elsewhere, so net prop count drops9. Two stable renderer visibility pairs measure8 calls/8940 triangles. All screenshots are58.7–60.7fps on Apple M4 Metal.

The final continuous-pointer60-frame average is1.968333ms,max2.8ms, above the1.2ms target; static six-pose capture module cost is0–0.1ms. This target is explicitly missed, not hidden by idle samples. Raw-terrain clearance remains0.149999142–0.560679765m; supporting-surface clearance is0.149999137–0.150000869m. The original raw-terrain numeric band is not credited pending the previously requested reference-surface decision.

The wash landmark returns clean roadtool crops (median hue205.055/204.516/205.631 at6.5/12/22), and declines obstructed street,skyline and720p locations. Missing measurements are not passes. Integrated all-showcase frames contain no ribbon, so bloom-diff remains unmeasured under the residual decision. ENOSPC is an infrastructure interruption, separate from0 application errors; all owned browsers closed in finally.


## Round 4 integration evidence (2026-09-06)

The live-drag performance issue is addressed within tools: 60 specified avenue drag frames average 0.921667 ms, maximum 1.5 ms. No road surface query contract change is needed for that fix.

The prior supporting-surface request remains: define ghost clearance as 0.10–0.20 m above `max(world.terrain.getHeight(x,z), roads.surfaceHeightAt(x,z))` when the road sampler returns a finite height, and retain raw terrain clearance in separately named stats. Current raw maximum is 0.560679765 m, supporting clearance 0.150000869 m. The builder does not silently reinterpret or claim the existing raw-terrain test passed.

Fresh all-mode captures currently show an empty map and working HUD, with no tools ribbon crop; the bloom on/off criterion cannot be measured from those captures. Street ribbon crop remains occluded by foreground foliage and a chip, and is explicitly recorded as a local tools measurement miss in the r4 build record.


## Integrator decision (wave 2 final, 2026-09-06)

Retained real flat HUD API dispatch, exact terrain undo/redo, props placement/removal and authoritative pavement clearance. The literal raw-terrain0.10–0.20m band conflicts with pavement geometry; keep both raw and supporting-surface stats and the critic's failed acceptance, rather than silently changing the scoring rule. Final critic4 averages0.99ms for the formerly failing drag, but retains a2.3ms maximum. Deferred new curved-edge split and props.boundsOf APIs to their geometry owners; current guarded fallbacks remain. Services metadata, validation, spending and undo adapters will consume the binding catalog/footprint/validate APIs in wave2b, instead of making services implement the old footprintOf/coverageOf/costOf names. No all-mode ribbon exists before democity; bloom criterion remains unmeasured under residual review.


## Integrator decision (wave 2b final, 2026-09-08)

Applied owner service metadata/validation, +Y heading conventions, exact charges/refunds and original IDs across history. Undo/redo commits stack moves only on success, checks compound affordability, compensates failed groups and blocks mutation during pending recovery or city restoration. Native input guards protect modal/editable focus and preserve 1–3 speed controls; idle canvas selection now uses public picking. Loading a valid different city discards old-world history even on partial mutation. Deferred curved-edge split and lane-profile changes to roads; terrain undo retains exact height restoration.

## Integrator decision (wave 3 final, 2026-09-08)

Applied public transit consumer and native pointer/modal/capture guards; removed fixed fictitious line construction fee. Retained validated service costs/history/terrain/identity work from wave2b. Deferred curved-edge splitting and optional prop bounds API; use existing guarded roads splits and per-kind bounds fallback. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.

## Integrator decision — R9s2 road history atomicity (2026-09-10)

Before a road pre-image, Tools calls Zoning's owner settlement boundary so two commits inside the deferred rebuild window cannot mix a current road graph with stale lots. Road construction history uses exact Roads/terrain snapshots, the Zoning identity envelope and affected-lot Buildings restore. Every owner return is checked. A forced failed Zoning leaf compensates Roads, terrain, Zoning, Buildings and dependents, returns false, retains the stack position and preserves the charge. Two immediate public alley commits undo to an independently reproduced one-commit world, then to baseline, and redo exactly. Road demolition remains on its prior inverse and is the next bounded migration.

## Integrator refinement — R9t unchanged-lot and immediate undo (2026-09-10)

Every road history move now settles the current Zoning journal before capturing its compensation image. On an inverse, unchanged stable lot key/ID rows keep their current `buildingId`, so post-commit construction and demolition outside the affected lot set are not rewound. The retained test performs a real free-lot→building transition and a real level3→2 transition, preserving both links/records and Simulation tick across undo/redo. Immediate and already-settled one-shot Zoning refusals both compensate and retain the history entry. This does not claim recovery from a second persistent owner refusal during compensation.
## R9u verified candidate — single-road bulldozer ownership

Single-road demolition must settle pending Zoning work, snapshot Roads/Terrain/Zoning/Buildings through owner APIs, rebuild synchronously, and credit the refund only after success. Undo/redo restore exact owner snapshots, preserve later building links on unchanged stable lots and compensate a failed leaf without moving history or money. A failed initial rebuild restores dependent dirty owners before returning no action. Marquee and persistent-failure behavior remain separate gates.
