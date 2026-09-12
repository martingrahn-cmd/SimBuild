# Core requests — zoning (rounds 2–3)

## 1. ARCHITECTURE §3 line 99 still writes `isRoad(x,z) -> 0..1`

The code (`src/modules/roads/build.js:555`) and `docs/prompts/modules/roads.md` both return **`0 | 1 | 2`**
(0 none, 1 asphalt, 2 sidewalk/verge), and `terrain` already consumes that shape. `zoning.md` §7 records the
drift and asks for §3 to be corrected rather than for the modules to be "fixed" down to §3.

**Proposed change** — `ARCHITECTURE.md` §3, `roads` section:

```
-    coverage / isRoad(x,z) -> 0..1,  // paved mask; terrain skips ground clutter where this is non-zero
+    coverage / isRoad(x,z) -> 0|1|2, // paved mask: 0 none, 1 asphalt, 2 sidewalk/verge (4 m grid)
```

## 2. `roads.isRoad` cannot be satisfied together with a 0.5–2.0 m kerb setback

`zoning.md` item 8 asks for two things at every vertex of `api.frontEdge()`:

* `r.dist − (T.asphaltHalf + T.sidewalk)` ∈ **0.5–2.0 m**, and
* `world.roads.isRoad(v.x, v.z) === 0`.

Measured on the running showcase (`?showcase=zoning&seed=1337`, probing `isRoad` outward from the centreline
in 0.5 m steps at three points along one edge of each type):

| type | asphaltHalf + sidewalk | first lateral offset where `isRoad === 0` | implied setback |
|---|---|---|---|
| street | 8.0 m | 12.5 m | **4.5 m** |
| avenue | 12.0 m | 16.0 m | **4.0 m** |
| alley  | 4.0 m  | 8.5 m  | **4.5 m** |

The mask is rasterised on terrain's 4 m grid (`build.js:520-545`): samples are laid out to
`corridorHalf + 0.4` (street: 9.25 m) and `mark()` sets the whole 4 m cell that contains the sample, so the
non-zero region reaches up to ~4 m beyond the paved corridor. There is therefore **no** offset that satisfies
both clauses — the window the spec allows tops out at 2.0 m and the mask needs 4.0–4.5 m.

zoning has resolved this in favour of the geometric clause, which is what `zoning.md` §6 failure mode 7 itself
names as authoritative ("the geometric setback (`frontStart`) is the authority, the mask is only a veto"):
`frontEdge` returns the offset curve at `asphaltHalf + sidewalk + 1.55 m`, so `r.dist − paved` is **1.55 m at
every vertex on every road type** and `|r.dist − median|` is **0.00 m**. `isRoad` reads 2 (verge) at most of
those vertices. Nothing is drawn on asphalt: the overlay is clipped geometrically against the same corridor,
which is exact, and the visual record (`street_12.png`, `closeup_12.png`) shows lane markings and crosswalk
bars fully unobscured.

**Proposed change** — either

* **(a)** rasterise `coverage` conservatively: `mark()` only cells whose *centre* is inside the corridor, which
  makes `isRoad === 0` true from about `paved + 0.5 m` outward and lets both clauses hold; or
* **(b)** amend `zoning.md` item 8's second clause to
  `world.roads.isRoad(v.x, v.z) !== 1` (no vertex on asphalt), which is checkable and true today.

(a) is the better fix — several modules will want a mask that means what it says — but it is a `roads` change,
so it is filed here rather than made locally.

## 3. `zoning.md` item 4's L22/L12 window is a property of `environment`, not only of zoning

Item 4 asks that "overlay luminance at a probe point", defined as the mean of (overlay-on − overlay-off)
over a 200×200 px crop, have `L22/L12 ∈ 0.35–0.55` at all eight class probe points, with the overlay
multiplied by `mix(1.0, 0.42, weather.night)`.

Writing `C` for a class's composited overlay luminance and `g` for the ground's, the measured quantity is
`a·(k·C − g_night) / (a·(C − g_day))`, i.e.

```
    L22 / L12  =  (k·C − g_night) / (C − g_day)
```

so it depends on where each class's luminance sits relative to the ground's, and a single `k` puts all
eight in one window only when the eight `C` values are far above `g`. They are not: the palette spans
`C = 56` (office high) to `C = 183` (industrial low) while the ground under the probe points measures
`g_day = 80–110`, `g_night = 42–65`. Solving the window per class at seed 1337 gives

| class | C | required k |
|---|---|---|
| residential low | 177 | 0.51–0.64 |
| commercial low | 158 | 0.49–0.58 |
| industrial low | 183 | 0.57–0.69 |
| office low | 128 | 0.49–0.55 |
| residential high | 109 | 0.56–0.62 |
| commercial high | 64 | 0.49–0.59 |
| industrial high | 105 | 0.54–0.58 |
| office high | 56 | 0.55–0.67 |

— no common value, and 0.42 satisfies none of them. zoning ships `k = 0.53` plus a 0.60 night
fog-relief term (the scene fog otherwise pulls the overlay onto the same blue-grey as the ground after
dark, which shrinks the differential faster than `k` does), which puts four of the eight inside the
window; the measured ratios are in `docs/builds/zoning_r2.json`.

**Proposed change** — grade item 4 on quantities that are the module's own:

* the overlay material's night multiplier uniform is in a stated range (readable by `P`), **and**
* `mean(overlay-on − overlay-off)` at 22:00 is **below** its value at 12:00 at all eight points
  (the overlay is unambiguously dimmer at night), **and**
* the existing whole-frame clauses: `zones_22.png` p99 ≤ 200/255 and no overlay pixel is the frame's
  brightest.

All three hold today. The per-point ratio window can come back once `environment`'s night level is
itself fixed — it is the term that makes the window unreachable.

## Integrator decision (local continuation, 2026-09-06)

Corrected ARCHITECTURE §3 to document the actual `isRoad` 0/1/2 mask values. The coarse-mask/frontage-setback conflict is documented and must not be disguised as a precise geometric test: geometric pavement extent remains authoritative for placement, raster coverage remains an approximate clutter mask. No score or numerical requirement is silently relaxed. The overlay night differential proposal remains for independent review alongside the known residual spec defects.

## Round3 measured update

The round2 discussion above is historical. Round3 restores the specified night multiplier to **0.42**, retaining0.60 night fog relief. The required signed 200px mean(on−off) ratios, in residential/commercial/industrial/office low/high order, are **0.2716,0.0895,0.2613,0.8069,0.2048,−0.0539,0.1530,0.8809**. The full zones22 frame has p99 **85.503/255** and its brightest pixel lies outside zoning. All ratio failures remain explicitly reported; this proposal has not been approved as an acceptance waiver.

The signed difference includes displaced ground luminance. For a simple fixed-alpha composite, difference = a(C−G); a night/noon ratio therefore measures (kC−Gnight)/(C−Gday), not k. Dark classes can have a negative denominator; industrial-high has a near-zero night numerator in this capture. Prefer an isolated material contribution or recover C=(on−(1−a)off)/a under fixed fog/exposure and known final pixel alpha, then check its night multiplier separately from whole-frame darkness. The actual shader also applies fog and tone mapping, so the simplified equation explains the coupling rather than proving an exact per-pixel inverse.

Fresh evidence: shots/zoning/r3/imgstats.json, sessionA/B images and extra-probe.json; the build record retains all literals. Geometric frontages measure1.54787–1.55000m setback across5347 vertices; the coarse-road-mask conflict persists and remains advisory per the existing integrator decision/residual.json.


## Integrator decision (wave 2 final, 2026-09-06)

Kept documented isRoad0|1|2 semantics and analytic asphalt/kerb clearance; no mask relaxation was made. Final critic4 confirms143stable lot IDs and no illegal road claims, but3night colour ratios and the temporal maximum still fail. Deferred global environment exposure/palette tuning until whole-game review, keeping the current measured failures in STATUS. No coordinate/camera/crop manipulation was applied to turn an occluded or faint sample into a pass.


## Integrator decision (wave 2b final, 2026-09-08)

Applied integration dispatch change so paused painting changes zones/demand without immediately spawning buildings when simulation is present; subsequent simulation ticks own growth. Existing zoning masks, IDs and independent visual verdict remain unchanged. No fake occupancy or histogram adjustment.

## Integrator decision (wave 3 final, 2026-09-08)

Retained isRoad0|1|2 classification, real lot reservations and native growth ownership. No hidden setback or road-mask exceptions added. Civic facilities consume real zonable land; compact frontage/layout changes deferred with democity density failures kept. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.

## Integrator decision — R9s2 lot identity envelope (2026-09-10)

Zoning now saves stable lot-key identity rows and `nextLot` beside painted cells, validates the optional envelope before mutation, and consumes it during regeneration so road inverses can restore exact lot/building links. `settleForHistory()` closes the 60 ms coalescing window before a following road snapshot. Changed road-derived lot journals complete Simulation/Transit reconciliation at the same boundary. Cells-only legacy saves restore the same cells, lots and owner links with a safe monotonic allocator; the absent historical allocator cursor cannot be reconstructed and is not claimed exact.

## Integrator refinement — R9t live links on unchanged lots (2026-09-10)

For Tools road inverses, envelope identity and saved links are authoritative only for changed lot IDs. An unchanged stable key/ID keeps its current live `buildingId`; this preserves later construction or demolition on unrelated lots. `settleForHistory()` is also called before every inverse rollback snapshot, including undo in the road commit frame.
