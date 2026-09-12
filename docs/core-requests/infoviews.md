# Infoviews integration requests — wave 2b preparation

Prepared from the full BUILDER/infoviews specification and current dependency source on 2026-09-06. No production changes are part of this preparation. Implementation waits for the generated wave-2b build request.

## 1. Existing buildings tint hook needs a compatible RGBA contract

The spec's claim that buildings has no hook is stale. `src/modules/buildings/index.js:430-449` already polls `world.infoview.active` and `buildingTint(id)` and uploads a tint texture; `material.js:75-76` consumes it. However:

- The contract returns plain `{r,g,b,a}`; `_tmpColor.set(col)` accepts a THREE.Color, number or string, not a plain RGBA record. A plain record silently retains the previous temporary colour. Use validated finite RGB components directly for the record branch, retaining legacy Color/string handling where needed.
- Texture alpha is currently forced to 255, ignoring the required 0.55–0.75 film alpha. Store clamped `col.a` in the fourth channel (255 fallback only for legacy colour forms).
- The shader multiplies the tint weight by a fixed 0.88 and feeds the colour into sun-lit diffuse albedo. This is not the requested unlit fixed top-light tint. Native support must use the advertised alpha and a world-up normal term `mix(0.72,1.0,max(0,dot(N,up)))`, then composite once. Preserve facade detail and normal inactive rendering. A parsing-only fix is useful but does not certify night parity or roof/wall contrast.
- Refresh currently occurs on active-id change or each twentieth frame, without reading `world.infoview.version`. Native support should refresh when the version changes so recomputed values are not stale.

Proposed additive capability: buildings exposes an `infoviewTintCapabilities()` query describing `{rgba:true, alpha:true, fixedTopLight:true, versioned:true}` only when implemented. Infoviews can then call its own `setBuildingShell(false)` and avoid duplicate tint geometry. Until complete native support exists, permit the infoviews-owned `world.infoview.buildingShellActive` flag: when true, buildings bypasses only its own tint compositing (and restores its ordinary emissive response) while retaining `active` and `buildingTint` as documented data for API consumers. Infoviews renders one instanced fallback shell and keeps its callback returning valid RGBA for >=90% of buildings. This bypass prevents an active native tint plus a fallback shell from painting the same facade twice.

This is a request to the root integrator/buildings owner. The infoviews builder must not edit buildings. An additive `isColor` return compatibility shim alone would fix RGB parsing but would leave alpha, lighting and duplicate-layer issues unresolved.

## 2. Declared draw budget: raise infoviews 5 to 8

`src/core/constants.js:23` declares infoviews 5 draws; the binding infoviews spec §5 requires declared budget 8, split ground <=5 / fallback building shell 1 / network <=2, and triangles <=260,000. Please raise the core table to 8 and reconcile the ARCHITECTURE text. Native building support may remove the fallback shell draw, but the conservative declared budget and this request remain useful for degraded configurations. Actual active/deactivated deltas and `overlayDraws()` will be measured in the build.

## 3. Desaturation contract

Infoviews publishes `world.infoview.desaturation` without changing renderer state, fog or another module. Current effects/buildings source has no desaturation consumer. Root/effects owner may implement world-only desaturation excluding sky and DOM. No grey fullscreen veil, fog adjustment or light change will be used as a workaround. Saturation ratio and non-overlay day/night change are diagnostics under the spec, not infoview-owned failures.

## 4. Live services can legitimately differ from fallback coverage bands

The upcoming real services contract uses per-road-component utility ratios, not the deterministic 520 m discs used while services is absent. A connected city may consequently have nearly uniform power/water coverage. Infoviews will follow its fixed derivation table, use real `world.services.coverage` when items exist, and retain the eight-source fallback only when items are empty. It will not silently mix fake fallback service discs into live data to force a desired coverage histogram. If the real contract makes a prescribed showcase coverage band unreachable, report the measured population and service terms for an explicit integration/spec decision.

## 5. Other verified API details

- `ui:action` is synchronous; publish active/data/legend/desaturation/version before the handler returns. The HUD immediately reads the legend on the same stack. Own DOM must be suppressed when UI exists.
- `ctx.clock.set(hour)` emits `time:tick`, not `time:hour`; hourly invalidation needs a guarded clock-hour check so debug clock changes do not leave stale grids. Coalescing uses game seconds, not wall time.
- `simulation.activity`, `grids`, `building`, `step`, and roads/zoning/buildings staging APIs exist. Garbage's footprint must be read from the real building record, joined by ID to its simulation record; simulation's public records do not guarantee footprint.
- `traffic.flowGrid()` returns `{size,cellSize,data,...}`, or null. Traffic is not an infoviews dependency; use the specified deterministic ordered-pair betweenness fallback in its standalone showcase.
- Services is still a stub during preparation; its forthcoming `catalog/place/validate/coverage/coverageGrid` signatures are fixed in the services spec and must be rechecked once its builder lands.


## Integrator decision (wave 2 final, 2026-09-06)

Applied the requested total draw declaration8 (ground<=5,fallback shell1,network<=2) in constants and ARCHITECTURE, without waiving measured budgets. Applied buildingShellActive bypass only; native plain-RGBA alpha/fixed-top-light/versioned film remains deferred. Use one infoview-owned instanced shell and the valid RGBA callback rather than a double-composited legacy tint. World-only desaturation remains an effects seam and is diagnostic. Keep live service-component ratios and the exact fallback rules; do not alter real data to force the coverage histogram band. Hourly clock checks must account for clock.set emitting time:tick, and UI publication must be synchronous. Recheck all actual service APIs when wave2b lands.

## Round1 implementation and measured seams (2026-09-06)

The formal002 builder is implemented and frozen. All twelve views and synchronous actual play toolbar activation work; one HUD legend, zero own duplicate panels. Legacy native tint bypass remains true through active shell-off diagnostics and is cleared on full deactivation. Settled own costs are2/3/2draws forlandvalue/power/traffic, within the applied8draw budget.

The unhonoured desaturation uniform is.72. Full-resolution pollution saturation ratio is1.80725 (numerator.516665, nonoverlay.285884), belowdiagnostic2.0; power ratio2.63974. Nonoverlay night luminance drop58.945%pollution and38.589%landvalue exceeds35%. These arediagnostics; owned nightRGBparity stillfails up to20.1605/255 and12.4845/255. No requested exposure/fog change.

Exact prescribed eight real service sites were attempted and rejected byvalidations (null), not APIthrows. Empty-items fallback then follows specification. A separate validclinic at(-48,-480),heading-PI/2 provesplacement APIworks. OwnData.coverage currentlypassesfacilitykinds torealcategorycoverage; thismustbe corrected inownedr2 viaexplicitmapping, withoutchangingservices. Realutilityratios mustremaintruthful, notfakefallbackdiscswhenitemsexist. Validreservedstagingfootprints require anintegrationdecision separatefromthisconsumerbug.

Ownedterrain numericvertex lift passesbutinteriorcliffsremainclipped;36m nativeheightdiscontinuities conflictwithsmooth8moverlay plus1.5m liftceiling. Needs ownedmeshrefinement/topology work, notpermissiontoeditterrain. Owncrop projection needsnearplane/camera-facing handling. In densityoffplate pinkreflections persist despiteownobjectsbeinghidden; rootmayinspectplanarreflectioncache/layer handling afterownedfixes. Fullreports/probes: docs/builds/infoviews_r1.json and shots/infoviews/r1 (externalvolume symlink).


## Round 2 measured integration seams and correction (2026-09-06)

**Correction of the round-1 paragraph above:** current services coverage accepts actual facility kinds. The proposed aggregate-category remapping was based on a stale interpretation and must not be applied. Round 2 preserves valid kind queries, exact derivations and the empty-items-only fallback. The eight mandated showcase placements still return null through validation; a separate valid clinic proves placement works. One post-placement simulation tick is insufficient evidence of downstream health updates.

Owned adaptive refinement now clears every triangle-centre sample on the captured native heightfield: 235,982 triangles, minimum +0.055 m, maximum vertex lift +0.705 m. However, default native terrain LOD presents different display surfaces. The paired runtime diagnostic `shots/infoviews/r2/lod_ordinary.png` / `lod_finest.png` holds the camera, time and infoview mesh fixed: native chunk LOD counts [14,41,133] become [188,0,0], and the mountain cut-through holes disappear. Finest LOD costs 2,585,824 frame triangles versus 1,189,344 in the ordinary diagnostic, so forcing it globally is not an acceptable fix.

Proposed core/terrain capability: let terrain composite the infoview data/ramp film on its actual visible terrain mesh (with alpha, fixed top light, world UV and versioned refresh), advertising support before infoviews hides its duplicate ground mesh. Alternatively expose the exact display surface/LOD contract so the overlay can share its topology. Preserve the existing physical `getHeight` API and ordinary inactive terrain. Native roads should preserve kerb/marking relief under the same overlay contract; disabling depth testing or raising the film past the lift ceiling is not a fix. This is an integrator request only; the builder did not edit terrain or roads.

Native building film support remains useful: the own shell now yields valid pinned roof/wall crops, but noon contrast is only 0.942–20.657/255 for the ten land-value buildings and 1.390–13.205 for density, all below 25. Pollution night RGB differences are 14.1265/19.0800/14.6780 and land value 8.7940/11.0920/11.0970. Please retain the earlier single-composite RGBA/alpha/fixed-top-light/version request and avoid reactivating the legacy tint beneath the shell.

Fixed-domain distributions still fail after the mandated three-day simulation pre-roll: 246 buildings have only 141 residents; pollution p95-p5=0.186521, garbage=0 (97.5313% flat), density=0.029940 (94.7487% flat). All twelve grids match the independent fixed-formula reference within 2.4e-7. Root/simulation ownership should decide legitimate occupancy/stock balancing or explicit staging allowances; infoviews must not invent values or normalize each view to make a histogram pass.

World-only desaturation remains 0.72 and unhonoured. Noon saturation ratios pollution 1.904462 and power 2.694785 are diagnostics; their owned numerator values 0.522157/0.531446 pass. Non-overlay night luma drops 58.1068%/39.0656% pass the diagnostic target. Shore inset reduces the measured waterline alpha jump from 0.398008 to 0.027570, but does not eliminate the hard cut. Exact one-metre +/-8 m transect coverage was not rerun in this builder and remains unverified. Off mask plates still show stale coloured water reflections after two frames with all owned geometry hidden; retain the planar-reflection invalidation/layer request.

Detailed builder evidence and limitations: `docs/builds/infoviews_r2.md/json`, `shots/infoviews/r2/pixel-analysis.json`, `geometry-check.json`, `terrain-lod-diagnostic.json`, `builder-probe/data-api.json`, and `matrix/summary.json`. Production source was frozen before independent round-2 criticism.


## Round 3 measured follow-up (2026-09-06)

Owned fixes now reduce first explicit full recompute to 5.6 ms (ten subsequent 2.4–3.9 ms) while all twelve grids retain maximum reference error 2.384185791e-7. The continuous height-above-water taper reduces exact-boundary alpha to <=1.114e-24; ten one-metre +/-8 m transects are monotonic. These two former failures no longer need a core workaround. Exact shore-normal eight-metre width remains unmeasured.

Data shader output is converted once, the specified top-light term is applied in output space, and front-facing building films/public RGBA callbacks use alpha 0.75. Data-only haze uses current atmospheric density/height falloff with a fixed achromatic output reference; global environment state is untouched. Final night drift remains above eight levels: pollution 10.4990/10.7575/9.9915 and land value 6.8005/8.8380/8.4565. Ten land-value roof/wall steps remain 0.7047–22.3767, all below 25. This is remaining visual failure, not a claim that ownership makes further improvement impossible. Keep the native geometry-aware single-film capability request for setbacks, crowns and equipment. Its RGBA alpha must be 0.75 and its refresh must follow infoview.version; retain shell bypass until complete native support is advertised.

Native ground geometry and data are preserved. Default terrain display LOD still visibly intersects the overlay, and road kerbs/markings remain obscured. Please retain the round-2 proposed visible-surface/native-film capability and road-relief integration; do not force all terrain to finest LOD. Current settled owned costs are landvalue +2 draws/238934 triangles, power +3/238998 and traffic +2/6864. The root has reserved the terrain seam for integration after wave 2b.

The same three fixed-domain distributions fail with 141 residents/246 buildings after required pre-roll. Valid real facility-kind queries are preserved, with no aggregate remapping. Whole-game occupancy/staging remains an explicit simulation/integration decision, never an infoview histogram rescale. Some off plates retain tinted water reflections despite hidden owned meshes; reflection invalidation request remains. Full limitations and fresh evidence: docs/builds/infoviews_r3.md/json and shots/infoviews/r3.


## Round 4 final builder follow-up (2026-09-06)

Owned public-plan envelopes replace the broad single-box shape with pitched roofs, individual shop units, podiums, setbacks and selected crowns, still one InstancedMesh at alpha 0.75 and fixed top light. Owned road clearance restores continuous asphalt corridors without touching ground topology. This reduces the scope of the native-film request but does not eliminate it: equipment, parapet interiors and some rare shapes remain uncovered, all pinned roof/wall steps still fail (1.8216–19.5793 landvalue), and some metrics worsen. Please expose a versioned native RGBA film capability covering actual rendered surfaces and advertised support, then disable the proxy only when that capability is complete. Do not stack the legacy tint under it.

Default display-LOD hillside perforations remain. Preserve the tested native-heightfield overlay and resolve the visible terrain surface seam in integration; no forced maximum LOD. Road clearance improves the view, but medians, bridges and kerb/marking detail still need exact native rendered-surface integration. Some two-frame off plates retain coloured water reflections; retain cache/layer invalidation request.

Landvalue night parity now passes at 5.1560/7.2115/7.1280; pollution still fails at 10.9555/11.3210/10.5285, slightly worse than r3. Data formulas and all three failed distributions are unchanged; simulation occupancy/staging is an integration decision, never an infoview renormalization. Measured owned maxima 3 draws/254250 triangles pass. Full recompute 5.3 ms cold, 2.8–4.1 warm. Final builder score 6.5 FAIL, not an independent verdict. Full report: docs/builds/infoviews_r4.md/json.


## Integrator decision (wave 2b final, 2026-09-08)

Applied terrain.displaySurface version1 read-only capability and infoview-owned matching display-LOD geometry, removing hillside cut-through without forcing maximum terrain LOD. Native buffers remain owner-owned; overlay clones follow visibility, counts, seams and current height texture. Old descriptors expire on terrain re-init. Active rebuilds reapply view visibility. Paused infoview changes invalidate water reflection cache; secondary-camera duplicate ground is suppressed, including legacy fallback draw-range restoration. Deferred native building RGBA film, exact kerb/bridge overlay relief and effects world-only desaturation; preserve existing proxy and legacy-tint bypass. Do not renormalize correct data to make density/garbage/pollution histograms pass.

## Integrator decision (wave 3 final, 2026-09-08)

Retained published display-surface and single-shell overlay contracts from wave2b; no new renderer or tint changes. Its independent6.4 and full issues remain. Depth/desaturation and composed overlay quality require a later authorized owner/whole-game review. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
