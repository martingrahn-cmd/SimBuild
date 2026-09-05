# zoning — critic round 1

**Score 6.5 / 10 — FAIL** (pass needs ≥ 8.5)

| | |
|---|---|
| Console errors | **0** across 16 captures (gauntlet 8 + 8 extra), 0 in `window.__sim.errors`, 0 in the Playwright probe |
| Module status | **`ready`** in every one of the 16 shot logs |
| Draw calls (module) | **6** (measured by toggling the `zoning-overlay` group and diffing `renderer.info`: 44 → 38 → 44) vs declared budget **10** ✔ |
| Draw calls (scene peak) | 73 (`zones_22`), 44–50 typical — scene-wide, not the module's budget |
| Triangles (module) | **21,872** vs declared budget **120,000** ✔ |
| Overlay rebuild | 1,214 cells / 140 lots → 6 draws in ~10 ms |
| `Math.random` in `src/modules/zoning/` | **0 hits** ✔ (uses `ctx.rng` + `hash2`) |
| Scope (`git status --porcelain`) | zoning tree is committed and clean; the only zoning-related untracked path is `shots/zoning/r1/` (this review). The in-flight edits to `src/modules/props`, `traffic`, `tools` belong to other builders. ✔ |
| API contract | **OK** (details below) |

The engineering underneath this module is good — deterministic, validated, cheap, correct against `roads.frontage`.
The *picture* is not. At aerial and wide zoom it reads as a decent zoning plan (~7.5). At street and closeup zoom it
collapses into a flat, near-opaque, unlit colour tarp that hides the ground, floats above it, and spills onto the
asphalt (~5.5). CS2's overlay (`cs2_1.jpg`) is a translucent *tint* with a crisp light cell grid through which the
world still reads; this is coloured paper laid on the map.

Hard-fail triggers hit: **flat untextured surfaces** (street/closeup fill), **floating geometry** (overlay sheet lifted
0.16–0.26 m, edge overhanging the kerb, ribbons on the asphalt). No z-fighting, no black frames from the module, no
console errors.

---

## Per-shot notes

| file | what I saw |
|---|---|
| `shots/zoning/r1/aerial_12.png` | Best overall read: 24 blocks, four types × two densities, empty zonable band around the fringe, terrain-conforming, fog-correct. But the 8 m cell grid has all but vanished into a flat wash, every block has ragged bites and 1-cell green nubs at its corners, and low vs high density is nearly the same colour. |
| `shots/zoning/r1/aerial_22.png` | Same frame at night. Terrain/water/roads correctly drop to 0.64× noon luminance; the zone patches only drop to 0.91× — the overlay is unlit and now the brightest thing in the frame. |
| `shots/zoning/r1/street_12.png` | A commercial-high block reads as one giant flat blue plastic sheet; grass and dirt are essentially invisible under it. Lot ribbons are 1–2 m wide pale bands, the hatch reads as broad diagonal smears, and the sheet edge visibly hovers over the kerb. |
| `shots/zoning/r1/street_22.png` | Night, same camera. World is correctly dark (stars, black asphalt); the blue sheet is unchanged and glows. Reads like a UI bug rather than a design choice. |
| `shots/zoning/r1/street_6p5.png` | Golden hour. The whole landscape is warm amber, the overlay is the same cold blue as at noon — completely out of key with the frame. |
| `shots/zoning/r1/skyline_12.png` | At 1 km the patchwork is legible and colours separate cleanly; closest the module gets to `cs2_7.jpg`. Pastel rather than CS2-saturated, and the pale empty-band mesh reads as a milky stain around the city. |
| `shots/zoning/r1/skyline_17p5.png` | Same, with the overlay's flat unlit colour fighting the warm low sun. Fog does apply to the overlay — good. |
| `shots/zoning/r1/skyline_22.png` | Night skyline: dark landscape, full-brightness pastel quilt sitting on it. |
| `shots/zoning/r1/closeup_12.png` | 8 m grid and 45° hatch both visible here — the shader works. But: fill is opaque, the hatch bands read as creases, and at the junction the cyan fill and its ribbon lie **on top of the avenue's asphalt and over the crosswalk bars**. |
| `shots/zoning/r1/closeup_22.png` | Clearest evidence of the float: at the block's south-east corner the blue fill and its white border overhang the kerb and sit on the road; adjacent lots' borders and frontage bars double up into 2–3 parallel lines with slivers between. |
| `shots/zoning/r1/zones_12.png` | Module's own hero preset. Grid + hatch read, lots subdivide the blue block nicely — and then the green block to its left has two enormous lots and no interior lines at all. Ragged region edges at every rounded junction. |
| `shots/zoning/r1/zones_22.png` | The hero preset at night: essentially identical to noon inside the zoned area. |
| `shots/zoning/r1/zonesclose_12.png` | Flat green sheets with big amoeba holes where relief rejected cells (bare eroded gully showing through the middle of a block). Left and right green blocks show no lot subdivision whatsoever. |
| `shots/zoning/r1/zonesclose_22.png` | Same at night: glowing felt on a dark map, cut edges showing the sheet's lifted rim. |
| `shots/zoning/r1/zoneswide_12.png` | Top-down plan view, the module's strongest shot. Reveals the systematic corner staircase: every block is chewed at all four junctions, and the two alley-split industrial strips came out as 1–2 cell ribbons. |
| `shots/zoning/r1/zones_12_720p.png` | 1280×720 holds up: layout, grid and lot lines all still legible, no aliasing breakdown. |

Two captures (`aerial_12`, `closeup_12` on first attempts) came back as the boot overlay / failed with
`Execution context was destroyed` because concurrent builders saving into `src/modules/{props,traffic,tools}`
triggered Vite full reloads mid-capture. Both were re-shot successfully; **not** a zoning defect.

---

## API contract check

Probe: `shots/zoning/r1/apicheck.mjs` (Playwright, `?showcase=zoning&headless=1&time=12`), plus a read of
`src/modules/zoning/{index,grid,overlay,palette,showcase}.js` and `src/modules/roads/network.js:238` (`frontage`).

| claim | result |
|---|---|
| `world.zones` shape | ✔ `cellSize: 8`, `cells`/`lots` are Maps, `types`/`densities` match §3, `paint`/`erase`/`lotsFor`/`freeLots` installed in place (section object never replaced) |
| `paint` creates cells **and lots along real road frontage** | ✔ 1,214 cells / 140 lots in the showcase. Every lot resolves to a live edge (`badEdge 0`); lateral offset from the true `roads.sample` centreline is 13.6–29.6 m, always ≥ the road's half-width (`badLat 0`); lots exist on both sides (69 right / 71 left); all 1,214 lot-cell references exist and match the lot's type+density (`cellMissing 0`, `cellMismatch 0`) |
| lots have `heading/x/z/w/d` | ✔ 0 missing fields over 140 lots. Headings verified against the §2 convention (0 = north = −Z, clockwise): **0/140 wrong**. (My first probe had the expectation inverted by π and reported 140 bad — the module is right, the probe was wrong.) |
| `erase` removes | ✔ `erase(x,z,12)` returned 3, cells 1217 → 1214, `cellAt` null afterwards |
| `zones:changed` emitted | ✔ fired on paint, on erase and on `deserialize`, with `{cells:[…], lots:{added,removed}}`; `zones.version` bumped on every mutation (1 → 2 → 3) |
| overlay renders without z-fighting | ✔ no stitching or flicker in any of 16 frames. 6 meshes, all `transparent`, `depthWrite:false`, `polygonOffset` −4/−12 (cells) and −6/−18 (lots), fog uniforms wired. **Caveat:** it is lifted a constant 0.16 m (cells) / 0.26 m (lot ribbons) above the terrain, which is not z-fighting but *is* a visible float, and it draws over road asphalt at junctions — see issues 2. |
| validity rules | ✔ of 1,214 zoned cells: 0 over water, 0 above 24° slope, 0 on asphalt. `paint` far from any road returns 0; `paint` with a bogus type returns 0 |
| determinism | ✔ `api.refresh()` twice reproduces the 140-lot geometry signature byte-identically; `serialize()` → `deserialize()` round-trips to the identical cell key set; **all 140 lot ids and their `buildingId` survive a rebuild** |
| no forbidden randomness | ✔ 0 `Math.random` in the module; jitter comes from `hash2(e.id, 7, seed)` |

**apiContractOk: true.**

---

## Ranked issues

### 1. blocker — the zone fill is an opaque colour sheet, not a CS2 tint
At street and closeup zoom the ground is gone: `uFill = 0.63` alpha of an unlit constant colour, further darkened by the
grid term, leaves the terrain reading at well under a quarter of its own value. In `cs2_1.jpg` the purple overlay sits on
top of a fully readable city. Here the block is flat blue plastic — the single biggest reason this reads as indie rather
than AAA, and it triggers the "flat untextured surfaces" hard fail.
*Fix:* drop base fill to ~0.30–0.38 alpha and composite as a **tint of the lit ground** (multiply/screen against the frame
or against a cheap ground-luma proxy) rather than blending toward a constant; let the grid and the region outline, not the
fill, carry the read.
Evidence: `shots/zoning/r1/street_12.png`, `shots/zoning/r1/closeup_12.png`, `shots/zoning/r1/zonesclose_12.png`

### 2. blocker — the overlay floats above the ground and spills onto roads and crosswalks
Measured in-engine: every overlay vertex sits exactly 0.16 m (cells) or 0.26 m (lot ribbons) above `terrain.getHeight`.
At 26–60 m camera height that parallax is plainly visible — the sheet's edge overhangs the kerb with a lit rim, and at
junctions the fill and the lot ribbons lie on top of the asphalt, covering crosswalk bars.
*Fix:* cut the lift to ≤ 0.03 m and let `polygonOffset` do the work; clip the cell quads and the +3 m corner extension
(issue 6) against `roads.isRoad`/the corridor polygon so no overlay fragment can land on paved surface; sample terrain at
the sub-quad corners you actually emit rather than lifting a flat constant.
Evidence: `shots/zoning/r1/closeup_12.png` (junction), `shots/zoning/r1/closeup_22.png` (kerb lip), `shots/zoning/r1/street_12.png`

### 3. major — the overlay ignores time of day
Sampling the same pixels at 12:00 and 22:00 in the `zones` preset: bare terrain falls to **0.64×** its noon luminance,
the zone patch only to **0.91×** (and that 9 % is just the ground showing through). At night and at golden hour the
overlay is the brightest, coldest thing in the frame and reads as a UI bug.
*Fix:* modulate the overlay's output by the environment's published light (`world.weather.sunIntensity` / `skyLight`), or
composite it as a tint over the already-lit ground so it inherits exposure for free.
Evidence: `shots/zoning/r1/zones_12.png` vs `shots/zoning/r1/zones_22.png`, `shots/zoning/r1/street_6p5.png`, `shots/zoning/r1/skyline_22.png`

### 4. major — the 8 m cell grid, the defining feature of the CS2 overlay, disappears at aerial zoom and has the wrong polarity
Grid lines are 0.038 UV ≈ 0.3 m wide and *darker* than the fill (`col *= mix(1.0, 0.52, grid)`). At the aerial preset an
8 m cell is ~14 px, so the line is under half a pixel and smears into a flat wash. CS2's zone grid is light and holds at
every zoom.
*Fix:* make the line width screen-space (widen with distance, clamp to ≥ 1.2 px), invert it to a light line, and trade
fill alpha down as grid contrast comes up.
Evidence: `shots/zoning/r1/aerial_12.png`, `shots/zoning/r1/zoneswide_12.png`

### 5. major — a quarter of the generated lots are unbuildable slivers, and 12 frontages get no lots at all
Over the showcase's 140 lots: widths are 8/11/16/19/24/27/35/43 m, median 19 m; **35 of 140 (25 %) are under 14 m** and
**24 are a single 8 m cell wide** (14 × 8×24 m, 10 × 8×16 m). Meanwhile **12 of 64 road edges — eleven 80 m streets and
one 80 m avenue — get zero lots**, so whole frontages will never grow a building. This is what makes blocks look
half-subdivided in `zonesclose_12`.
*Fix:* enforce a 2-cell (16 m) minimum frontage by merging a leftover slot into its neighbour instead of emitting it, and
give every frontage with ≥ 2 free slots one lot before another road's lots claim the block interior.
Evidence: `shots/zoning/r1/apicheck.mjs` output (`lotSizes`, `edgesWithoutLots`), `shots/zoning/r1/zonesclose_12.png`

### 6. major — the "corner fit" +3 m extension fires on 55 % of lots, pushing outlines onto the pavement
`_splitRun` adds `extA = 3` when `cursor === 0` and `extB = 3` when `b === n`, i.e. to the first and last lot of *every*
frontage side. With typically two lots per side that is nearly every lot: 77 of 140 (55 %) come out at a cell multiple
+3 m (19, 27, 11, 35, 43). The extension is geometric only — the cells do not follow — so the lot rectangle, its border
strip and its frontage bar hang over the sidewalk and the junction asphalt.
*Fix:* extend only where the frontage genuinely terminates at a junction node, and clamp the extension to the
intersection's corner radius so it stays off the carriageway.
Evidence: `shots/zoning/r1/apicheck.mjs` (`lotSizes.hist`), `shots/zoning/r1/closeup_22.png`

### 7. major — region boundaries are ragged; rejected cells leave amoeba holes and corner nubs
Cells rejected for relief / slope / road coverage are simply omitted, so blocks have bites out of their middles (bare
eroded ground showing through), staircased edges against every rounded junction, and isolated 1-cell green tabs at block
corners. It reads as data corruption rather than as terrain response.
*Fix:* morphologically close single-cell holes before meshing, and render in-band-but-blocked cells in a distinct
"cannot build here" style (CS2 shows them, it does not silently drop them).
Evidence: `shots/zoning/r1/zoneswide_12.png`, `shots/zoning/r1/zonesclose_22.png`, `shots/zoning/r1/aerial_12.png`

### 8. major — palette washes out and density does not read
Blending at 0.63 over lit grass turns residential-high `0x0d8f3c` into pale mint and office-high `0x6a1cb8` into lilac;
at aerial zoom residential low vs high and office low vs high are nearly the same swatch, and the 45° hatch that is
supposed to separate them is sub-pixel. CS2's overlay is markedly more saturated (`cs2_1.jpg`, `cs2_7.jpg`).
*Fix:* raise the chroma of the high-density variants and separate each pair in *value* as well as hue; carry density with
a marker that survives minification (a per-cell corner notch, a doubled region border) rather than a 3 m hatch.
Evidence: `shots/zoning/r1/aerial_12.png`, `shots/zoning/r1/skyline_12.png`

### 9. minor — the high-density hatch reads as broad repeating smears at close range
The 3 m-period 45° band, seen at 26–60 m camera height, becomes wide diagonal creases across the sheet rather than a fine
hatch, and its repetition is obvious.
*Fix:* drive the hatch period from screen-space derivatives with a clamp, or replace it with a per-cell motif.
Evidence: `shots/zoning/r1/street_12.png`, `shots/zoning/r1/closeup_12.png`

### 10. minor — the empty zonable band reads as a dirty stain
`fill: 0.10` of near-white over grass desaturates the ground to khaki at street level and forms disconnected pale squares
around the city fringe at aerial zoom.
*Fix:* draw the band as grid lines only (no area fill), slightly additive, so it reads as a survey grid rather than a wash.
Evidence: `shots/zoning/r1/street_12.png`, `shots/zoning/r1/zoneswide_12.png`

### 11. minor — per-frame allocations in `update`
`ZoneOverlay.syncFog` runs every frame and builds two arrays each time
(`[...this.meshes.values()].map(...).concat([...])`). §9 forbids per-frame allocations in `update`.
*Fix:* build the material list once in the constructor.
Evidence: `src/modules/zoning/overlay.js:381-390`

### 12. minor — per-cell tint jitter depends on paint order, not position
`_cellGeometry` pulls `aRnd` from `ctx.rng.fork('overlay')` in Map-iteration order, so a cell's brightness depends on when
it was painted relative to its neighbours. The same final zoning reached by a different sequence of strokes renders
differently — harmless visually, but it breaks the "same world state → same picture" property the rest of the module
holds to so carefully.
*Fix:* `hash2(ix, iz, world.seed)`.
Evidence: `src/modules/zoning/overlay.js:282`, `src/modules/zoning/overlay.js:299`

### 13. minor — dead code
`ZoneGrid._brush` builds and fills an `edges` Set that is never read.
Evidence: `src/modules/zoning/grid.js:188`

---

## Strengths to preserve

- **The data model is genuinely solid.** 140 lots regenerate byte-identically across repeated `refresh()` calls,
  `serialize()`/`deserialize()` round-trips to the identical cell set, and all 140 lot ids *and their `buildingId`*
  survive a rebuild. That is exactly what the buildings module will need.
- **Lots are anchored to real road frontage**, not to a guess: 0/140 lots off their edge, lateral offsets 13.6–29.6 m
  measured against the true `roads.sample` centreline, and 140/140 headings correct to the ARCHITECTURE §2 convention.
- **Validity rules actually work**: 0 zoned cells over water, 0 above 24°, 0 on asphalt; painting far from a road or with
  a bogus type is refused and returns 0.
- **Very cheap**: 6 draw calls and 21,872 triangles against a self-declared 10 / 120,000 budget; the whole overlay
  rebuilds in ~10 ms for 1,214 cells.
- **Zero console errors, `ready` status, and a valid frame in all 16 captures**, at 1080p and at 720p.
- **Good engineering hygiene**: the batched `bulk()` path with a single lot regeneration and one event, the 60 ms settle
  that coalesces bursts, the tool-driven fade, fog wired into the custom shaders, and three sensible showcase camera
  presets.
- **The wide/aerial read is close**: at `zoneswide` and `aerial` the plan is legible, four types plus the empty band
  separate cleanly, and the mesh conforms to terrain and to distance fog. Keep that composition; fix what happens as the
  camera comes down.
