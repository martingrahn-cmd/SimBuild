# Independent Democity r8j critic — Northbank apron

**ACCEPT as a small local surface improvement. Democity6.0/10; whole-game6.0/10, FAIL against8.5. Rank5 remains open.** The existing pale apron gains clearer divisions, edging and small fixed fittings. It reads somewhat more like a prepared hardstand, without an obvious new day/night visual regression. It does not yet form a convincing connected working port, and no score increase is warranted.

I individually inspected all **26 original PNGs**: four baseline, four candidate, two waterfront diagnosis and sixteen final frames. Every sidecar, both custom summaries, final summary, two landmark profiles, contract files and custom-capture script were reviewed. The contact sheet supplemented the originals. I read current STATUS/HANDOFF, whole-game r2 rank5, the r8e crane precedent, relevant democity ownership clauses and the current renderer/serialize/deserialize paths.

## Ownership and actual function

This is legitimate rendering of the existing saved `port-7` / `Northbank apron8` landmark, not camera-triggered duplicate scenery or a substitute fleet. The democity specification explicitly permits its own apron/crane/silo landmark meshes and saved plan. `buildLandmarks` derives pieces from each record and merges them into existing owner chunks; the candidate adds no camera or showcase-only branch. `deserialize` clears and rebuilds the meshes from the saved plan. No new agents, IDs, public API, simulated storage or world-state records are added. The same owner principle supports r8e crane articulation.

That does **not** establish port functionality. The apron lies inland of road and grass, separated from water and crane pads. The negative-z edge described as a quay/mooring row is on the inland side of this layout. No ship, cargo route, crane operation, parking allocation or economic activity is added. “Working quay” or functional mooring would be unsupported. It is a structured static uppställnings-/lastyta: accepting that modest visual detail leaves the missing physical and operational connections open.

## Visual result

The matched directed day/night pairs keep the same camera positions. The baseline slab already had faint parallel marks. The candidate darkens its surface, strengthens yellow divisions and adds visible wheel stops, edging and small posts, reducing the blank-placeholder impression. The slab remains regular and empty. The ordinary bridge preset shows the improvement too; it is not dependent on the custom camera. Night material stays restrained and introduces no extra luminous pools.

No obvious new skyline, foliage, occlusion or wider material regression appears in the16 final day/night controls. Isolated crane/silo pads, abrupt grass/road edges, sparse surroundings and absent shore access still dominate the site. The residential waterfront diagnosis does not feature the apron and is context, not direct improvement evidence. Other rank5 sites and materials remain schematic; ranks1–4 remain larger whole-frame problems.

## Source and accounting

The same13 landmark plan records—including IDs, dimensions, positions and seats—are exactly equal in the supplied before/after profiles. The owner remains **8 merged draws** and rises **6,172→6,760 triangles (+588)**. The current branch stays inside the existing46×30m apron footprint with heading0, retains the common material/seating path and consumes no RNG. Fixed five-line spacing and seven small posts are deterministic for this authored record.

The file is untracked, so normal git diff is empty. The parent's first “single box” pre-state omitted five existing marking boxes. A read-only Node geometry reconstruction exposed the discrepancy (6,112 instead of6,172). The recovered exact prior branch is:

```js
box(0,0,0,l.w,l.d,.06,0xb2b4a4);
for(let i=-2;i<=2;i++)box(i*7,.07,0,.12,l.d-4,.03,0xcac5ad);
```

Reconstructing that corrected prior branch with the actual13-record profile produces **6,172** triangles; current source produces **6,760**. Apron geometry itself is72→660. This independently resolves the accounting and confirms the588 delta. The instrument used a flat height stub solely for geometry counts; it proves no terrain clearance. No source file was edited.

## Contract and capture evidence

Supplied public API checks pass, both deserializations return true, and recorded census remains612 buildings/lots,9,964 cells,31 services and one line/eight stops. I compared all32 mixed-use records and the full recorded before/first/second payloads: equal, with matching lot/building ownership and retail programme. Returned seed1337 and repeated seed7 digests match exactly. These are reviewed supplied browser runs. Their digests cover buildings/services/transit, not every world field or landmark vertex buffer. General imported plan sizes/headings, failed-save recovery and foundations are not newly certified.

`custom-capture.mjs` opens fresh pages, disables Vite HMR, applies public camera/clock APIs, waits60 rendered frames, reads stats/errors, then freezes and captures. It injects no scenery or fleet. Every actual position/target equals the requested vector. Its stats are endpoints before freeze, without the standard screenshot helper's peak-window protocol. Actual real-time traffic can differ between paired stills. The custom noon apron records even differ by−4 draws/−2,948 triangles despite added owner geometry; these endpoint differences are not claimed savings.

All26 sidecars report zero errors and16 ready modules. Every final-summary row/aggregate and both custom summaries match their sidecars. Final16-frame results:

| Measure | Verified result |
|---|---|
| Maximum draws |469, park noon; below1,500|
| Maximum triangles |2,809,484, close night; below3M|
| Minimum FPS |46.2, close noon;7/16 below50|
| Raw endpoint heap |730.3MB, interchange noon;9/16 above512MB|
| Largest module endpoint |props2.2ms, bridge noon; exceeds2ms at that sample|

Added base geometry can be resubmitted in shadow/reflection passes, so the composed scene delta need not be588. Final FPS windows cover70–91 measured frames, roughly1.5seconds; total elapsed near13seconds includes startup/settling. These M4/Metal stills do not establish sustained gameplay or a GTX1660 result. Raw heap is distinct from forced-GC retained memory. No causal timing improvement, leak or performance regression is inferred.

## Remaining ranking

1. **Sparse city fabric and repeated forms remain dominant.** Owner: democity; supporting owners: zoning, buildings, roads, services. Open; atlas change does not alter parcels or massing.

2. **Planar crowns and inconsistent foliage tiers remain.** Owner: props; supporting owners: terrain, democity. Open; retain the earlier bounded r8h improvement without implying completion.

3. **Night interiors remain flat and lighting remains disconnected from occupancy and ground.** Owner: cross-cutting; supporting owners: buildings, props, services, effects, democity. Small near-window improvement accepted; rank remains open and unchanged.

4. **Abrupt grades, banks and site boundaries remain.** Owner: cross-cutting; supporting owners: terrain, roads, democity, buildings, services. Open; no new numeric collision or bridge-clearance failure asserted.

5. **Landmark materials and working-site context remain schematic.** Owner: cross-cutting; supporting owners: democity, services, buildings, props. Open; a small static hardstand improvement is accepted, but apron/cranes remain disconnected from the shore and working-site context is weak.

6. **Horizon/reflection/terrain layer seams remain.** Owner: cross-cutting; supporting owners: terrain, environment, effects. Open; explicit weather artistry was not retested in this bounded round.

7. **Featured streets and destinations communicate limited human use.** Owner: cross-cutting; supporting owners: democity, traffic, transit, simulation, buildings. Open presentation issue; paused stills do not establish simulation or boarding failures.

8. **Local FPS and raw memory targets remain unmet.** Owner: cross-cutting; supporting owners: core, props, traffic, environment, effects, buildings. Local final minimum46.2FPS,7/16 below50, raw heap730.3MB, props endpoint2.2ms. Geometry passes; no causal timing or retained-leak claim.

## Inspection register

| Original PNG | Observation |
|---|---|
| `shots/democity/r8j-site-diagnosis/baseline/port-apron_12.png` | Pale slab with faint existing parallel marks; isolated from water/cranes by roads and grass. |
| `shots/democity/r8j-site-diagnosis/baseline/port-apron_22.png` | Pale slab with faint existing parallel marks; isolated from water/cranes by roads and grass. |
| `shots/democity/r8j-site-diagnosis/baseline/port-wide_12.png` | Pale slab with faint existing parallel marks; isolated from water/cranes by roads and grass. |
| `shots/democity/r8j-site-diagnosis/baseline/port-wide_22.png` | Pale slab with faint existing parallel marks; isolated from water/cranes by roads and grass. |
| `shots/democity/r8j-site-diagnosis/candidate/port-apron_12.png` | Darker structured slab with stronger lines, wheel stops and narrow edge fittings; modestly less blank but still an empty inland hardstand. |
| `shots/democity/r8j-site-diagnosis/candidate/port-apron_22.png` | Darker structured slab with stronger lines, wheel stops and narrow edge fittings; modestly less blank but still an empty inland hardstand. |
| `shots/democity/r8j-site-diagnosis/candidate/port-wide_12.png` | Darker structured slab with stronger lines, wheel stops and narrow edge fittings; modestly less blank but still an empty inland hardstand. |
| `shots/democity/r8j-site-diagnosis/candidate/port-wide_22.png` | Darker structured slab with stronger lines, wheel stops and narrow edge fittings; modestly less blank but still an empty inland hardstand. |
| `shots/democity/r8j-site-diagnosis/waterfront_12.png` | Residential riverfront diagnosis does not show the apron; no direct candidate attribution. |
| `shots/democity/r8j-site-diagnosis/waterfront_22.png` | Residential riverfront diagnosis does not show the apron; no direct candidate attribution. |
| `shots/democity/r8j-site-final/bridge_12.png` | Improved apron visible in standard view; cranes/crossings retain their silhouette; disconnected pads and shore remain. |
| `shots/democity/r8j-site-final/bridge_22.png` | Improved apron visible in standard view; cranes/crossings retain their silhouette; disconnected pads and shore remain. |
| `shots/democity/r8j-site-final/downtown_12.png` | Readable skyline/materials; sparse grass parcels and repeated forms dominate. |
| `shots/democity/r8j-site-final/downtown_22.png` | Readable skyline/materials; sparse grass parcels and repeated forms dominate. |
| `shots/democity/r8j-site-final/industry_12.png` | Recognisable plant structures; plain yards, schematic night pools and stretched mountain remain. |
| `shots/democity/r8j-site-final/industry_22.png` | Recognisable plant structures; plain yards, schematic night pools and stretched mountain remain. |
| `shots/democity/r8j-site-final/interchange_12.png` | Road hierarchy intact; sparse blocks, repeated crowns and steep terrain remain. |
| `shots/democity/r8j-site-final/interchange_22.png` | Road hierarchy intact; sparse blocks, repeated crowns and steep terrain remain. |
| `shots/democity/r8j-site-final/night_downtown_12.png` | Retail and r8i window cues retained; flat luminous panes and quiet street remain. |
| `shots/democity/r8j-site-final/night_downtown_22.png` | Retail and r8i window cues retained; flat luminous panes and quiet street remain. |
| `shots/democity/r8j-site-final/park_12.png` | Stadium preserved; planar foliage and empty venue surroundings remain. |
| `shots/democity/r8j-site-final/park_22.png` | Stadium preserved; planar foliage and empty venue surroundings remain. |
| `shots/democity/r8j-site-final/riverfront_12.png` | Riverfront materials intact; steep opposite-bank roads and night horizon seam remain. |
| `shots/democity/r8j-site-final/riverfront_22.png` | Riverfront materials intact; steep opposite-bank roads and night horizon seam remain. |
| `shots/democity/r8j-site-final/suburb_12.png` | Hospital/water tower preserved; repetitive gardens and pale night sites remain. |
| `shots/democity/r8j-site-final/suburb_22.png` | Hospital/water tower preserved; repetitive gardens and pale night sites remain. |

## Evidence limits

- Independent review of supplied screenshots and browser probes, not an independent browser execution. All26 originals and sidecars individually inspected; contact sheet inspected additionally. Newly added derived comparisons were not needed or counted as inspected.
- Only eight final presets at noon/night, one seed1337,1920x1080 High, Chrome152 on Apple M4 ANGLE Metal, headless=1/speed=0. No fresh full whole-game matrix, dawn/sunset/weather/720p/all-alias, motion, blind judgment or CS2 reference reinspection.
- Final measured windows contain70–91frames, roughly1.5seconds. Total elapsed around13seconds includes startup/settling; raw endpoint heap is not post-GC retained memory. CPU endpoints are not worst-frame/sustained traces or GTX1660 results.
- Custom captures use camera/clock APIs, wait60frames, read stats before freeze and then screenshot. These are endpoint stats rather than standard helper peak-window captures. Independent real-time traffic prevents identical moving pixels.
- Exact restage digests cover buildings/services/transit. Double deserialize/public counts and unchanged13-record profiles support continuity, not complete world or geometry-byte/save-failure certification.
- The known apron is46x30m with heading0; arbitrary imported sizes/headings are not certified. Existing terrain seat recomputation is retained. Static surface detail does not establish collision, driveability, cargo/ship/mooring or economic function.
- landmarks.js is untracked, so git diff is empty. Exact prior apron branch was supplied from the parent apply_patch log; both corrected pre-state and current geometry totals were independently reconstructed read-only. No production mutation was made.
- Only the requested two critic reports were written; no source, STATUS, HANDOFF, captures or test-script files were changed.

Renderer SHA-256: `f874672149fcddc6223c7937171be1652964da25be5b8d8879fa48718ee025b2`.
