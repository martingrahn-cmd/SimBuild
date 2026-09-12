# Democity R8z — independent rejection audit

**ACCEPT the rejection record; REJECT the one-whorl candidate. Democity remains 6.0/10, FAIL (8.5 gate).** The accepted tree source is retained. This is a bounded review of supplied evidence, not a new whole-game score or a claim that all branch treatments should be rejected.

The extra branches are perceptible on exposed trunks, most clearly in the riverfront foreground. The full park and riverfront views remain very close to the accepted render, and the branches do not resolve the dominant separated leaf clumps, flat crown reading or distant impostor silhouettes. The night park retains dark, weakly articulated crowns. I do not find a major new harmful visual regression in these views; rejection is justified by insufficient visible return for the added geometry, rather than an invented visual or FPS failure.

## Source and ownership

Independently hashing current `src/modules/props/trees.js` gives `64cca242316e01142c9d092a6960e1f889c7298fa51681f22e40c95ab6561b17`. Replacing its single exact marker `const whorls = near ? [0.29, 0.47, 0.64] : [];` with the candidate `[0.42]` alternative yields `7a5e6155c8872fb0408d9911f0bb88a8e02a415b6a7112737156e34ee2bbdce6`. Both match the saved summary. Current production retains the empty LOD1 whorl. No product edits were made during this audit.

The existing skeleton emits three primary branches for the new whorl; each uses three longitudinal segments and four sides, with no LOD1 secondaries. Its four node rings produce 20 vertices/24 triangles per branch. The accepted stem contributes 20 vertices/24 triangles, and 72 leaf cards contribute 288 vertices/144 triangles. Therefore canonical LOD1 is **308 vertices/168 triangles → 368/240: +60/+72**, a 42.857% triangle increase. This is source-derived topology, not a retained browser geometry dump. The builder's informal “three-ring stem” means three longitudinal divisions; the implementation actually has four node rings.

The marker changes only the non-near branch-whorl list. Additional RNG calls occur within the separate `skel1` fork; the unchanged `can1` fork keeps canopy generation independent. LOD0, 72 cards, material, atlas, impostor code and record/placement paths are outside this edit. That supports scope and deterministic construction, but these captures do not independently prove full serialized-world equality or all-species behavior.

The diagnostic fetches Vite-transformed module source with `route.fetch()` and modifies that response, preserving resolved imports. It does not install the candidate in production. Raw source hashes are verified; served transformed response bytes were not archived. The earlier unresolved-import run was overwritten and is not independently auditable here.

## Recomputed evidence

Every individual sidecar exactly equals its summary row. All six report ready, all 16 modules ready, no module errors, no runtime/page errors, and a real Props API plus LOD histogram. `own` is null in all six, so this is not a live owner-stat ledger. Matched cameras, draws, programs, texture/geometry object counts and local LOD histograms are unchanged. Both startup warnings remain: deferred road furniture and no valid reserved university site.

| View | Draws accepted/candidate | Triangles accepted → candidate | Delta | FPS accepted/candidate | Raw endpoint heap MB accepted/candidate |
|---|---:|---:|---:|---:|---:|
| Park 12 | 335/335 | 1,344,979 → 1,356,499 | +11,520 | 46.8/45.7 | 473.0/560.6 |
| Park 22 | 314/314 | 1,715,331 → 1,726,851 | +11,520 | 46.9/49.5 | 487.7/516.9 |
| Riverfront 12 | 204/204 | 1,154,224 → 1,182,736 | +28,512 | 53.6/50.6 | 732.7/643.9 |

Park remains LOD0/LOD1/impostor **0/160/2,175** in both views: 160×72 exactly explains +11,520. Riverfront remains **18/135/546**, while its total delta equals 396×72 rather than 135×72. Render/reflection composition can explain additional submissions, but no per-pass ledger establishes exactly which passes account for the extra 261 equivalents. Do not describe that aggregate as the cost of only 135 visible LOD1 trees.

I independently decoded all six original RGB images with Pillow/NumPy and recomputed full-frame mean absolute difference divided by 255:

| Pair | Normalized MAE | Equivalent 16-bit quantum MAE |
|---|---:|---:|
| Park 12 | 0.000190548596 | 12.48760224 |
| Park 22 | 0.000243905960 | 15.98437709 |
| Riverfront 12 | 0.000060058476 | 3.93593220 |

These match `comparison-metrics.json` within its rounding. Small MAE quantifies changed pixels, not quality or foliage-only attribution: the fresh pages contain traffic/runtime differences. Timing is one observation per variant/view, accepted block followed by candidate block; neither the FPS changes nor volatile raw heap prove a causal improvement/regression or a gate pass. No forced-GC memory measurement exists here.

## Inspection register

All six original PNGs were individually inspected, with their six sidecars; crop pairs supplemented rather than replaced the originals:

- `shots/democity/r8z-lod1-branches/accepted_park_12.png`
- `shots/democity/r8z-lod1-branches/accepted_park_22.png`
- `shots/democity/r8z-lod1-branches/accepted_riverfront_12.png`
- `shots/democity/r8z-lod1-branches/candidate_park_12.png`
- `shots/democity/r8z-lod1-branches/candidate_park_22.png`
- `shots/democity/r8z-lod1-branches/candidate_riverfront_12.png`

All three derived crop pairs were also inspected:

- `shots/democity/r8z-lod1-branches/park_12_crop_pair.png`
- `shots/democity/r8z-lod1-branches/park_22_crop_pair.png`
- `shots/democity/r8z-lod1-branches/riverfront_12_crop_pair.png`

Also read the full builder rejection report, visual-route tool, current tree skeleton/canopy source, summary and comparison metrics.

## Remaining priorities and limits

1. **Props:** keep this sparse-whorl candidate rejected. Diagnose crown/card and impostor coherence at the observed park mix before selecting another local experiment. Coupling branch placement to foliage could be tested, but is not established as the solution by this round.
2. **Props / rendering:** preserve the geometry and shading budgets. The measured geometry increase is real; a global performance penalty has not been established. R8z does not supersede broader accepted-source performance evidence.
3. **Props / Democity composition:** sparse park structure and night crown readability remain open. Existing whole-game issues and their ranking are not closed or rescored by this local detail.

This evidence covers three views, one seed and one quality setting, without a full matrix, species sweep, transitions, weather, API/restore contracts, fresh reference calibration or blind judging. No further build/full-contract run is required just to decline a disposable routed candidate while keeping the exact accepted source; those checks would be required before accepting a future product change. No gameplay, economy, save or simulation improvement is claimed.
