# roads — critic round 1

**Score: 6.0 / 10 — FAIL** (competent but obviously synthetic; several hard-fail defects in the standard shots)

Bar: Cities: Skylines II at the same zoom and time (`scratchpad/ref/cs2_1..8.jpg`). Everything below is from shots I took myself
(`shots/roads/r1/`), the module code (`src/modules/roads/*.js`) and two Playwright probes (`shots/roads/r1/apicheck.mjs`,
`apicheck2.mjs`). Only `environment`, `terrain` and `roads` run in this showcase (no `effects` post chain), so the frame look is
environment + roads.

## Pass gate

| Gate | Result |
|---|---|
| Score ≥ 8.5 | **No** (6.0) |
| Zero console errors | Yes — 0 errors in all 29 captures and both probes |
| Module status `ready` in every shot | Yes |
| Max draw calls ≤ declared budget (80) | Roads' own contribution ≤ 49 (measured by hiding the roads group) — within budget. Scene total (terrain+environment+roads) peaks at **86** in `skyline_6p5`/`skyline_12` at 1080p, which is what `summary.json` reports. |
| API contract | **OK** (see below) |
| Hard fails | **Yes**: terrain protrudes through the carriageway (road sunk up to 0.44 m), floating bridge-deck ends, grass instances through asphalt in every street-level frame, washed-out noon frames (no pixel below L≈97) |

## Numbers

- Gauntlet: 16 shots (aerial/street/skyline/closeup × 6.5/12/17.5/22). 4 failed on first pass (30 s `page.screenshot` timeout or
  Vite full reload from the effects builder's live edits → boot overlay captured) and were retaken individually; all 16 valid now.
  Plus 9 showcase presets at 12, `intersection/highway/bridge` at 22, and `aerial_12_720p`. Total 29 PNGs.
- `summary.json`: maxDrawCalls 86 (scene), maxTriangles 444,832 (scene; roads ≈ 45.9 k tris in 25 meshes), totalErrors 0, fps 0–13.1 (SwiftShader, relative only).
- Roads-own draw calls by camera (probe, includes shadow passes): aerial 36, street 49, skyline 45, closeup 30, intersection 30, highway 32, bridge 26.
- Rebuild: 66 edges / 48 nodes, 5 464 terrain flatten brushes, 1.58 s rebuild (SwiftShader CPU).
- Luminance stats (mean / std / p1 / p99 / sat): street_12 141/22/104/194/0.20, closeup_12 133/19/98/180/0.19, aerial_12 134/11/107/159/0.23,
  highway_12 145/21/110/194/0.19 — noon frames are washed out (no dark pixels, low contrast, low saturation). Night: aerial_22 27/6/14/46, closeup_22 29/18/8/89 — dark but readable, no black frames.
- `git status`: builder commits touch only `src/modules/roads/`, `public/assets/` (+manifest), `docs/core-requests/roads.md`, `docs/builds/`, `shots/` (the wave-1 commit also carries other builders' modules). No `Math.random` in the module; no lights, no renderer-state changes, `performance.now` only for profiling. Assets `asphalt_02`, `concrete_floor_worn_001`, `gravel_floor_02` are Poly Haven CC0 and listed in the manifest.

## API contract check (`apicheck.mjs`, `apicheck2.mjs`)

| Item | Result |
|---|---|
| `addNode/addEdge` build geometry | OK — 25 → 28 meshes, +1 836 tris after two edges; rebuild coalesced within a few frames |
| `version` bumps | OK — 66 → 68 on add, → 69 on remove |
| `roads:changed` emitted with payload | OK — `{added:[id]}` / `{removed:[id]}` |
| `sample(edge,t)` | OK — t=0/1 land on the nodes (<0.5 m), mid-point on the line, unit tangent, `normal` present, y within 1.5 m of terrain, null for bad ids |
| Bezier edges | OK — with ctrl (-700,-560) the mid-point is 49.5 m off the chord, arc 227 m vs 198 m chord, arc-length parametrisation uniform |
| `laneCenter` | OK — lane 0 sits on the right-hand side in a→b (cross(forward, up) = +normal); lanes 0/1 vs 2/3 on opposite carriageways on the avenue; offsets inside `asphaltHalf` |
| `frontage` | OK — both `left` and `right` entries, `from<to≤1`, heading finite, points 8 m off the axis |
| `nearestEdge` | OK — hit at dist 10.0/t 0.5, null beyond `maxDist`, hits the curved edge |
| `removeEdge` cleanup | OK — edge gone from `edges` and both nodes' sets, `sample`/`nearestEdge` return null, geometry shrinks; `removeNode` cascades |
| `lampPositions`, `intersections`, `coverage/isRoad` | OK — 4 lamps on the first edge, 32 intersections (all ≥3 arms), coverage mask 512², `isRoad(40,40)=1` |
| Notes | Two of my own checks were wrong (degenerate ctrl point; inverted right-hand sign) — corrected by hand, module is right. Real finding: `rebuild()` is not idempotent (45 922 → 45 524 tris for the same network after re-flattening); orphan nodes remain after `removeEdge` (allowed by contract). |

## Per-shot notes

| File | What I saw |
|---|---|
| aerial_6p5.png | Clean grid, roundabout, bridge; warm light OK. Dark speckle streaks on the water either side of the bridge (pier/deck reflections breaking up). Dark scar beside the loop's north arm. |
| aerial_12.png | Washed out (p1=107, std 11). Network reads well, crosswalks visible; same water speckle at the bridge. |
| aerial_12_720p.png | Same as 1080p, no layout issue. |
| aerial_17p5.png | Best aerial: long light, markings readable; water speckle at bridge again. |
| aerial_22.png | Dark but readable network; no lamps (props not present) — acceptable for roads alone. |
| street_6p5.png | Grass tufts through every lane; terrain wedge on the near avenue arm; sidewalk slab reads as a flat plate; golden light helps. |
| street_12.png | Flat, washed out, no shadows/AO; sidewalks near white; corner fillet polygon overlaps the zebra crossing (crop). |
| street_17p5.png | Kerb face shadow finally visible at the corner (good); asphalt texture tiling visible as a repeating crack grid in the intersection polygon. |
| street_22.png | Readable, lampless; grass tufts glow green on the asphalt. |
| skyline_6p5.png | Roads are thin ribbons; fine at this distance; highway bridge at bottom-left OK. |
| skyline_12.png | Washed out (sat 0.16); network legible; nothing broken at this zoom. |
| skyline_17p5.png | Fine; the road network is the least of this frame's problems. |
| skyline_22.png | Retaken after a boot-overlay capture; dark, readable. |
| closeup_6p5.png | Terrain rectangle sitting ON the avenue carriageway next to the intersection; grass through asphalt; otherwise the nicest light. |
| closeup_12.png | Same terrain-through-road wedge (crop `crop_seam_12`), grass everywhere, arrows crude, sidewalks flat white. |
| closeup_17p5.png | Same defects; asphalt tiling visible; kerb shadow good. |
| closeup_22.png | Retaken; readable; same geometry defects visible in silhouette. |
| intersection_12.png | Module's own hero preset shows the terrain wedge and grass through the road — the two blockers in the builder's own framing. |
| intersection_22.png | Readable at night, markings visible, no light pools (props). |
| highway_12.png | White speckle/sparkle across the asphalt at mid distance (specular aliasing); highway reads as a flat grey band; median barrier a line. |
| highway_22.png | Dark, readable; sparkle gone at night. |
| bridge_12.png | Best shot: deck, parapets, piers with caps read as a bridge. Far end floats above the beach with no abutment; near-end pier cap pokes out beside the deck; dark cut on the embankment. |
| bridge_22.png | Fine silhouette; water reflection speckle. |
| loop_12.png | "Roundabout" is a square one-way loop with four T-junctions, crosswalks, stop lines and turn arrows on the ring; rectangular dark cut in the knoll beside the north arm. |
| coastwest_12.png | Highway → coast bridge transition is a black-walled cliff with a dark void under the deck end; grass on the carriageway. |
| merge_12.png | Ramp taper and acceleration lane work; heavy white speckle on the highway asphalt; kerb jog where the ramp's edge meets the carriageway; no gore markings. |
| corner_12.png | Grass tufts dominate; kerb is a thin line; sidewalk a flat slab; no contact shadow. |
| kerb_12.png | Same; the kerb profile exists but at this exposure it is a 1-px line. |
| armtop_12.png | Markings system is genuinely good: double solid centre, dashed dividers, edge lines, stop line, zebra, arrows; faint wheel-track darkening; texture tiling visible; arrows have odd hooked shapes. |

## Ranked issues

1. **blocker — Terrain protrudes through the carriageway.** Road profile sits below the heightfield mid-block: probe found 28/1 254 samples sunk >5 cm on non-bridge edges, worst −0.44 m at (±40, −79) and −0.40 m on the north bridge approach (z≈−320); a grass rectangle sits on the avenue in `closeup_12/17.5/6.5`, `intersection_12`, `street_*`. The flatten brushes (strength 3, skip-if-within-4 cm) do not converge on slopes and `ROAD_LIFT` is only 0.03 m. Fix: after `flattenTerrain()`, verify every strip row (`T.getHeight(row) ≤ row.y − DROP`) and re-brush until it holds, or write heights directly into `terrain.heights` under the strip (the `flattenStrip` you already requested); raise `ROAD_LIFT` to ~0.08 m; clamp the profile above the terrain inside the strip. Evidence: `shots/roads/r1/closeup_12.png`, `scratchpad crop_seam_12`.
2. **blocker — Terrain grass instances render through asphalt and sidewalks** in every street/closeup/preset frame. Roads publishes `world.roads.coverage`/`isRoad` but terrain does not consume it yet. Until it does, the roads showcase must call `ctx.modules.terrain.setGrassTufts(false)` (the API exists in `terrain/index.js`) or better: emit `roads:changed` and have terrain re-place tufts skipping `isRoad(x,z)!==0`. Evidence: `shots/roads/r1/street_6p5.png`, `corner_12.png`.
3. **blocker — Bridge deck ends float in the air; embankments end as sheer black cliffs.** Far end of the street bridge hovers over the beach with a visible air gap; the highway at `coastwest_12` ends in a dark void under the deck. Fix: emit an abutment block from the deck end down to `min(terrain)` with wing walls, continue the gravel skirt under the deck end, blend the profile so the deck starts where the skirt reaches ~1.5 m height. Evidence: `shots/roads/r1/bridge_12.png` (far end), `coastwest_12.png`.
4. **major — Noon frames are washed out and flat.** p1 luminance ≥ 97 and std ≤ 24 in every 12:00 frame; sidewalks near white because `concrete` colour is 1.75× albedo; asphalt reads mid-grey; no AO/contact shadow under kerbs. Fix: concrete colour ≤ 1.0 with a darker kerb-face vertex colour, asphalt base ~0.30, add baked AO in vertex colour along kerb faces and under parapets; ask environment for a real exposure curve (shared ownership). Evidence: `street_12.png`, `kerb_12.png`.
5. **major — White speckle/sparkle across asphalt at mid distance and grazing angles** (`highway_12`, `merge_12`, also visible in the builder's dev shots). Specular aliasing from the normal map + roughness reductions (`wearLight`, `nz` term) without mip-aware roughness. Fix: clamp roughness ≥ 0.6, fade `normalScale` and the polished-lane term with distance, enable anisotropy on the PBR maps, consider Toksvig/geometric roughness from `fwidth(normal)`.
6. **major — Rectangular dark cut in the knoll beside the one-way loop's north arm** (`loop_12.png` ~(-215,-190), also a dark spot in the aerials). The node/edge flatten brushes slice a sheer wall through a terrain feature; §12 asks for cut/fill with graded slopes or retaining walls. Fix: limit the brush target to a max cut depth per metre of distance (graded 1:1.5 slope), or emit a retaining-wall mesh where the cut exceeds ~1.5 m.
7. **major — The one-way loop is not a roundabout.** Four T-junction intersections with zebra crossings, stop lines and turn arrows painted on the ring; the ring is octagonal. Fix: detect a one-way cycle, sample its curves finer, suppress crosswalks/stop lines/arrows on ring arms, add yield lines on the entries and a central island kerb. Evidence: `loop_12.png`.
8. **major — Corner sidewalk fillet overlaps the crosswalk decal / sidewalk slabs read as floating plates.** The corner strip covers part of the zebra bars, and where the terrain falls away the sidewalk shows as a flat grey plate with a thin skirt. Fix: start the crosswalk at `wa + 0.05` inside the fillet tangent point, and extend the skirt to the terrain foot along corner paths too. Evidence: `crop_street12_seam`, `street_12.png`.
9. **minor — Pier caps protrude beyond the deck edge; pier/deck reflections break into dark speckle on the water** (`bridge_12` near end, aerials). Fix: cap width ≤ deck outer width; make the deck underside/pier colour less black (they dominate the reflection).
10. **minor — Asphalt texture tiling** (4.2 m repeat) is visible as a crack grid in intersection polygons and top-down views (`armtop_12`, `street_17p5`). Fix: second detail scale + rotation per tile via the noise, or blend two asphalt samples at different UV scales.
11. **minor — Turn arrows are thin, hooked ("L") shapes.** CS2 arrows are bold with proper heads. Fix: widen shaft to 0.3 m, head 1.2 m wide, draw the bent arrows from a small polyline with round joins.
12. **minor — Highway lacks shoulders/edge kerb detail and gore markings at the merge**; the Jersey barrier reads as a line at any distance. Fix: chevron gore area at the ramp nose, a hard-shoulder edge line inset, and a lighter barrier top colour.
13. **minor — `rebuild()` is not idempotent** (tri count changes when the same network is rebuilt after its own terrain flattening) and `removeEdge` leaves orphan nodes. Not a contract violation, but determinism (§11) wants byte-identical results for identical actions.
14. **minor — Scene draw calls exceed 80 at skyline** (85–86 at 1080p) although roads' own share is ≤ 49; roads is 25 meshes (8 tiles × 4 materials) plus concrete shadow casters × cascades. Keep an eye on it: merging paint into the asphalt material as a decal layer would drop 8 draw calls.

Tooling note (not a module issue): under SwiftShader the 30 s `page.screenshot` timeout and Vite full reloads triggered by other builders' edits cost 6 captures; each was retaken. The builder's core request #3 (longer screenshot timeout / retry) is justified.

## Strengths to preserve

- `world.roads` is complete and correct: arc-length sampling, quadratic bezier edges, lanes on the right, frontage on both sides, nearest-edge, cascade removal, version + event discipline; zero console errors anywhere.
- Intersection analysis (fillet/mitre/flat corners, joints, dead-end caps, T/4-way/Y) with a real kerb + sidewalk + skirt profile; per-type widths incl. alley/avenue/highway/ramp.
- Shader lane-marking system: dashed centre/dividers, solid near stop lines, double solid on avenues, yellow inner lines on highways, wheel-track darkening and paint wear driven by world-space noise; zebra crossings, stop lines and per-lane arrows as decals.
- Dual carriageway with median Jersey barrier, ramp merge with acceleration-lane taper; bridges with deck, parapets, piers with caps that actually stand in the water.
- Terrain-conforming smoothed profiles, coverage mask and `lampPositions`/`intersections` for props/traffic, per-tile merged meshes, CC0 assets, deterministic (no `Math.random`).
