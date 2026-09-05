# Module spec — `ui`

Round 3+. Read `docs/prompts/BUILDER.md` (invariant rules) and `ARCHITECTURE.md` first; nothing in either is repeated
here. Everything below is specific to `ui`. Blast radius: exactly BUILDER.md's "What you may write" list with
`<your-module>` = `ui`, plus one addition — `shots/ui/**`. Nothing else, and nothing from that list is restated here.

`$REF` = `/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref`.

---

## 1. Purpose

Without `ui` the player can see the city but cannot read it or command it: no toolbar to pick a tool, no clock or
speed control, no money/population/demand readout, no selection panel, no menus, no save/load — SimBuild is a
renderer, not a game.

## 2. World data owned

`ui` owns **no** `world.<section>`. It is a pure reader plus one event. It must never write any world section.

Emits (ARCHITECTURE §5, copied):

| Event | Emitter | Payload |
|---|---|---|
| `ui:action` | ui | `{action, args}` (e.g. `{action:'setSpeed', args:[2]}`) |

`ui:action` is the module's real API surface: **every** interactive control emits exactly one, with the action name
and the args below. `tools`, `save.js`, `audio` and `infoviews` listen for these; inventing new names silently
breaks them. Required action vocabulary (extend, never rename):

```
category(id)            tab(catId, tabId)        selectAsset(catId, cardId)   toolOption(key, value)
setSpeed(n)             pause()                  resume()                     setTime(hour)
infoview(name|null)     overlays(on)             statistics()                 photomode(on)
focus(kind, id)         demolish(kind, id)       policies(kind, id)           closeInfo()
dismissNotification(id) journal()                minimap(on)                  minimapFly(x, z)
save(slot)              load(slot)               download()                   upload()
newGame({seed,name,preset,budget})               settings(key, value)         quit()
transitLine(id)         transitEdit(id)          transitDelete(id)            transitBuses(id, n)
setTaxRate(r)           takeLoan(amount, days)   repayLoan(id)                help()
```

Reads only (never mutates): `world.economy` (`money, population, jobs, happiness, demand{residential,commercial,
industrial,office}, taxRate, history[{day,money,population}]`, plus `milestone{level,name,next,nextPop,progress,
unlocked[]}`, `loans[]`, `grids` when `simulation` is loaded), `world.time{hour,day,speed,paused}`,
`world.weather{cloudiness,rain,wind{x,z,speed},fogDensity,temperature,sunDir,sunIntensity,skyLight}`,
`world.selection{kind,id}`, `world.services{items,kinds,supply,demand}`, `world.infoview{active,data,legend}`,
`world.transit{lines,stops}`, `world.buildings.items`, `world.roads{nodes,edges,types}`, `world.terrain.heights`,
`world.flags{showcase,headless}`.

`api` (reachable as `ctx.modules.ui`) must keep at least the round-2 surface and stay callable when the HUD is
disabled (`?nohud=1`, `src/modules/ui/index.js:19`) — every entry returns `undefined`/no-ops rather than throwing.
Acceptance item 12 checks this; `transit` depends on it:

```js
api: {
  notify(n), showInfo(sel), hideInfo(), setCategory(id), setSource(src), setCityName(name),
  openMenu(kind), closeMenu(), setPhotoMode(on), setInfoview(name), showLines(id), toast(t),
  serialize() -> {cityName, infoview, minimap}, deserialize(d), get hud,
}
```

## 3. Visual/behavioural target

**If `$REF` is unavailable, the measurements in this section are authoritative on their own.** `$REF` is a
session-scoped scratchpad and ARCHITECTURE §10 forbids storing CS2 JPEGs in the repo, so this section — not the
images — is the durable record: every number below names its source image and the crop rect it came from, and a
builder or critic who cannot open the JPEGs builds and grades against the numbers as written. Nothing here is
softened, re-derived or treated as unverifiable because the image is missing.

The target is the CS2 HUD itself, measured — not "a dark game UI". Numbers below were sampled from the reference
JPEGs at 1920×1080; match them within the stated tolerance.

**Bottom dock — `$REF/cs2_3.jpg` (also `cs2_1.jpg`, `cs2_7.jpg`).** Two stacked bands across the full width.
Upper *toolbar band*: y 971→1031, **60 px** (5.6 % of height). Lower *status strip*: y 1031→1080, **49 px**
(4.5 %). Together 109 px = 10.1 % of frame height — the HUD never eats more than that.
The toolbar band is **strongly translucent**, measured in `cs2_3` at x 1300–1500 (the widest run of empty band):
the pale desert ground immediately above the dock, y 940–956, reads mean luminance **L = 173**; the empty band
directly below it, y 985–1001, reads **L = 118** — the band is **0.68 ×** the ground, i.e. **alpha ≈ 0.36** over a
near-black fill, and the terrain texture is plainly visible through it. The status strip is denser: its dark
inter-pill gaps (`cs2_3` x 850–880, y 1042–1058, and the other gaps along that row) read **L = 47–68** over the same
ground, **alpha ≈ 0.73 ± 0.07**. SimBuild r2 uses 0.93–0.96 on the
toolbar — three times too opaque; it reads as a black slab pasted on the render. Fix the alpha, add
`backdrop-filter: blur(14px) saturate(1.1)`, and keep text legible by putting it inside the darker pills, as CS2 does.

**Toolbar band contents, left→right (cs2_3):** a small round info-view badge with a green count; a pill with a gold
trophy + milestone name in gold caps ("MEGALOPOLIS"); the demand widget; a wide empty gap; then **bare colourful
category icons with no button chrome at rest** — ≈38 px glyphs on ≈48 px centres, in groups separated by ≈26 px
gaps (zone group ▸ services group ▸ landscaping/props/bulldoze group); then a right cluster of five outlined round
buttons (economy, map, statistics, city info, photo) at the far right. The selected category gets a filled accent
rounded square behind it (cs2_1: the road icon). Icons are saturated, multi-colour, and readable at 38 px: a green
recycling arrow, a blue water drop, a yellow bolt, an orange fire helmet, a gold police shield, a green bus.

**Demand widget — cs2_3, x≈275–460, ≈185×40 px.** A dark rounded pill: left third holds a small **isometric city
thumbnail** in a circular recess; the right holds **six horizontal bars**, ≈4 px tall on ≈3 px gaps, each drawn on a
full-width darker rail so the unfilled remainder is visible; bars fill from the left with rounded caps. Colours top
to bottom: light green, mid green, dark green, cyan, gold, purple. **No R/C/I/O letters anywhere.** SimBuild r2's
2×2 lettered grid is not this widget; rebuild it in the CS2 form. Four rails are the requirement; six rails are
permitted only as the fixed visual split defined in acceptance item 3 — `world.economy.demand` has exactly four keys
and no six-key source exists, so a six-rail widget invents nothing.

**Status strip (cs2_3):** groups of dark rounded pills, ≈30 px tall, separated by gaps, in this order:
`[▶ | 07:54  Apr 2031 | ▶▶▶]` · `[☀ 15°C]` · `[Spring]` · `[New Dollarton]` · `[👤 95,628 🌲]` ·
`[💵 ¢38,383,158 ▼]` · `[😐😐😐😐😊]`. Note the last group: CS2 shows **five circular faces, four dim grey and the
one at the citizens' current happiness level bright green** — a discrete 5-step meter, not one morphing face. The
`ui_r1` critic's issue 9 ("CS2 shows a single face") is wrong; cs2_3 x 1700–1910, y 1040–1070 shows the five-face
row. Restore the five-face meter, 22 px faces, active face `#3FBF5A`.

**Sub-panel — cs2_1, x 610–1320, y 805–1010.** A translucent dark panel anchored above the dock. Top row: **icon
tabs**, ≈62×34, active tab filled solid accent, the whole row underlined by a 3 px accent rule spanning the panel
width; a white × at the far right. Below: a wrapping grid of **asset cards ≈78×70 px on ≈6 px gaps, ~9 per row**,
each carrying a **3/4 perspective render of the asset** (a grey road ribbon with lane paint, kerb, and a contact
shadow; a wooden bridge deck; a parking "P" tile) with small round cost/upkeep coin badges at the card's lower
right; the selected card is filled solid accent. Cards are never flat rectangles of colour.

**Accent colour.** Measured on the selected asset card in cs2_1 (x 782–850, y 868–928): **rgb(83,177,212) =
`#53B1D4` = hsl(196°, 60 %, 58 %)** — a light azure. SimBuild's `--accent: #2f8ff5` is hsl(211°, 91 %, 57 %):
15° too blue and half again too saturated, which is why the HUD reads "web app" rather than "CS2".

**Info panel — `$REF/cs2_5.jpg`.** ≈445 px wide, translucent dark navy (~85 %), pinned top-left under a vertical
rail of 4 round icon tabs (active tab a filled accent circle). Header: 28 px icon disc, entity name in **accent
caps**, white ×. Then a status row (coloured face + word). Then sections: a white CAPS section head with its
headline value right-aligned, followed by muted `#9AA6B2` labels left / white values right-aligned; cross-references
are accent-coloured links prefixed by a 12 px magnifier glyph. Bottom: a row of small icon action buttons.
Every number is right-aligned on a common right edge — this is the single strongest typographic signature of the
CS2 HUD and it must hold in every panel.

**Info-view legend — `$REF/cs2_7.jpg` and `cs2_3.jpg`.** Top-left: a round accent "i" button above a 4-column grid
of ≈34 px info-view icons in a translucent box. To its right, the legend panel: header = icon + accent CAPS title +
white ×; a "MAP LEGEND" section head; then rows, each = a 14 px colour swatch **or** a ≈330×8 gradient bar with 10 px
end labels ("Low"/"High", "Bad"/"Good"), the row label at the left, a muted right-aligned tag
("Building color" / "Terrain color" / "Network color") and a 14 px checkbox at the right edge.

**Night — `$REF/cs2_8.jpg` for the scene, cs2_3 for the HUD.** The HUD does not change colour at night; it stays
legible because its pills are dark and its text is white. Verify by measuring, not by eye.

**Behavioural target.** In `?showcase=all` the clock pill counts, the money and population chips change with
`sim:tick`, the demand bars animate on `sim:demand`, the minimap redraws on `roads:changed`, a selection opens the
info panel, `Esc` walks the stack (sub-panel → panel → pause menu), `Space` toggles pause, `P` toggles photo mode.
Nothing in the HUD is a hard-coded literal in that mode.

## 4. Acceptance criteria

The critic grades **only** this list. Each item names how it is observed. `r<n>` = the round being graded; shots
live in `shots/ui/r<n>/`. Selectors named are the round-2 ones; if the builder renames any, `docs/builds/ui_r3.json`
must carry a `selectors` map from the names below to the new ones, or the item is scored as failed.
Ordered by score impact — 1–8 are where the module passes or fails.

**How the list becomes a number.** CRITIC.md scores `ui` "as an interface against the CS2 HUD", so the photorealism
anchors in ARCHITECTURE §13 and `docs/reference/CS2-LOOK.md` ("6 = repetitive tiling, flat lighting, no AO",
"5 = flat colours, boxes, no textures") do not apply to a DOM HUD. These do:

| Score | Meaning for `ui` |
|---|---|
| 10 | A CS2 player would not notice the swap — dock, demand widget, icon row, cards, info panel and status strip all read as the shipped game |
| 9 | Items 1–19 all pass; nits only in card art or icon draughtsmanship |
| **8.5 — pass** | Items 1–8 all pass, **≥ 8 of items 9–19** pass, no hard fail. Concretely: `shots/ui/r<n>/ui_12.png` set beside `$REF/cs2_3.jpg` reads as the same class of dock, and its sub-panel beside `$REF/cs2_1.jpg` as the same class of card grid |
| 8 | Items 1–8 pass but cards or icons still read schematic — thin thumbnails, generic glyphs (`ui_12.png` card crop) |
| 7 | Any **one** of items 1–8 fails |
| 5 | The r1 HUD: lettered R/C/I/O grid, flat rectangle cards, grey desaturated locked icons (`shots/ui/r1/aerial_12.png`) |

Items 20–22 are tie-breakers between two adjacent anchors; they never lift a build past an anchor whose own items
still fail. **Hard fail** = any assertion in item 1 trips, or any hard fail on CRITIC.md's list; a hard fail caps
the score at 7 regardless of everything else.

1. **No overlap, no overflow, at 1920×1080 and 1280×720.** A page-evaluate probe over
   `#ui *:not(.sb-hidden)` with a non-zero rect asserts: (a) every rect lies inside `[0,0,W,H]`;
   (b) rect-intersection area is **0 px²** for each pair `('.sb-toolbar-left','.sb-tools')`,
   `('.sb-tools','.sb-toolbar-right')`, `('.sb-subpanel','.sb-info')`, `('.sb-subpanel','.sb-side')`,
   `('.sb-subpanel','.sb-lines')`, `('.sb-rci','.sb-status')`, `('.sb-topleft','.sb-info')`,
   `('.sb-minimap','.sb-status')`; (c) every direct child rect of `.sb-rci`, `.sb-milestone`, `.sb-chip`,
   `.sb-card`, `.sb-note` is contained in its parent's rect within 1 px; (d) no element has
   `scrollWidth > clientWidth + 1` except containers that declare `overflow-x:auto`. Verified at both sizes with the
   largest panel set the layout permits: at 1920×1080 that is sub-panel + info panel + minimap + legend +
   notifications + statistics, all open at once; at 1280×720 it is whatever item 15's precedence rule leaves open
   (sub-panel + info panel + minimap + notifications), and the probe asserts the panels item 15 closes are in fact
   `.sb-hidden` rather than merely off-screen. This was the r1 contract failure; it is a **hard fail** if any
   assertion trips.
2. **Dock geometry and translucency match the measurement.** At 1080p: toolbar band height 58–64 px, status strip
   44–52 px, combined ≤ 115 px (≤ 10.6 % of frame height); at 720p combined ≤ 96 px (≤ 13.3 %). Toolbar band
   background alpha 0.32–0.46 with a backdrop blur ≥ 10 px; status strip alpha 0.68–0.82. Screenshot test on a
   **located** sample, so builder and critic measure the same pixels: the builder marks one empty region of the
   toolbar band — ≥ 200×16 px, free of pills, icons and text at every preset — with `data-sb-probe="band-sample"`,
   and the probe reads its `getBoundingClientRect()`. If that attribute is absent, the critic samples the fixed rect
   **x 900–1100, y 985–1001** at 1080p (**x 600–800, y 657–673** at 720p) and anything that lands there is the
   builder's problem. In that sample: mean luminance at `aerial_12` minus mean luminance at `aerial_22` is **≥ 20**,
   and at `aerial_12` the sample is **≤ 0.80 ×** the mean luminance of an identically sized rect immediately above
   the band (same x, y shifted up 45 px) — cs2_3 measures 0.68 × (§3). Evidence: `aerial_12.png`, `aerial_22.png`.
3. **Demand widget in CS2 form.** Exactly **4 or 6** horizontal bars (no other count), each 3–5 px tall on 2–4 px
   gaps, each drawn on a visible unfilled rail spanning the widget's full bar width, rounded caps, an isometric
   city thumbnail ≥ 22 px at the left, **zero letter labels**, and the whole widget inside a pill ≤ 200×46 px whose
   children are fully contained (item 1c).
   **The rail-to-data mapping is fixed here, not chosen by the builder.** `world.economy.demand` has exactly four
   keys — `residential, commercial, industrial, office` (`src/core/world.js:91`; `simulation.api.demand()` returns
   that same object) — therefore:
   - **4 rails** map 1:1 to those four keys, in that order.
   - **6 rails** (the cs2_3 form) are a *visual* split of the same four keys, not new data: rails 1–3
     (light/mid/dark green) = `residential` × **0.40 / 0.35 / 0.25**; rail 4 (cyan) = `commercial` × 1.0; rail 5
     (gold) = `industrial` × 1.0; rail 6 (purple) = `office` × 1.0. Every key is used exactly once.
   - A rail driven by anything else — a density query, a second simulation call, a decay curve, a constant — **fails
     the item**. If `simulation` ever exposes a six-key demand object, drive the rails from it and say so below.
   The builder declares the mapping in `docs/builds/ui_r3.json` as
   `demandSplit: [{rail:1, key:"residential", factor:0.40}, …]`; the probe checks each rail's
   `getBoundingClientRect().width` ratio against `factor × world.economy.demand[key]` within **3 %**.
   Evidence: crop of `ui_12.png`.
4. **Toolbar icons read as CS2 icons.** ≥ 14 category icons, 34–42 px glyphs on 44–52 px centres, ≥ 2 group gaps of
   ≥ 20 px, **no visible button background/border at rest** on unselected unlocked icons (screenshots never hover —
   anything that only appears on `:hover` does not exist for the critic). Colour probe over each icon's rendered
   bounding box, with pixels of **saturation < 0.20 or alpha < 0.5 discarded** and the remainder binned into 15°
   **circular** hue bins (hue wraps; a linear mean of 350° and 10° is not what this asks for): an icon passes if its
   **two largest bins are ≥ 25° apart**, and the row passes if **≥ 8 icons** are pairwise ≥ 25° apart on their
   largest bin. The selected category shows a filled accent rounded square plus the 3 px top rule. Locked icons keep
   **full colour** at opacity 0.70–0.80 with a 12–16 px lock badge at the bottom-right and a `title` tooltip
   `Unlocks at <milestone>`; they are never desaturated to grey. Evidence: crop of `ui_12.png`.
5. **Accent colour corrected.** The computed `--accent` (and the fill of `.sb-tool.is-active`, `.sb-tab.is-active`,
   `.sb-card.is-active`) has hue 190–202°, saturation 50–72 %, lightness 52–64 % (target `#53B1D4`, measured from
   cs2_1). Probe reads `getComputedStyle(document.querySelector('.sb-root')).getPropertyValue('--accent')`.
6. **Asset cards are perspective thumbnails.** Every card in every category renders a 3/4 or isometric depiction of
   the actual asset. **One tonal threshold governs and it is the probe's:** each `.sb-card` has a child
   `<svg>`/`<canvas>` whose rendered content carries **≥ 4 distinct fill values**, of which ≥ 3 are tonal steps of a
   single hue (lit face, shaded face, dark edge); **flat single-colour rectangles fail**. The **contact shadow** is
   checked, not asserted: the card contains a fill or gradient darker than the card background directly beneath the
   asset, occupying **3–15 % of the card area**. Card box 72–100 px wide, 62–86 px tall, gaps 4–10 px, ≥ 6 cards per
   row at 1080p (≤ 5 below 1440 px — item 15), wrapping to a second row without clipping. Cost badge visible at rest
   on every card. Selected card = solid accent fill.
   **Graded by eye against `$REF/cs2_1.jpg`, stated as a judgement and supported by the crop** (no probe claims to
   see it): whether a road card reads as carriageway + kerb + lane paint, a zone card as massing blocks, a service
   card as a distinguishable silhouette (cooling tower, wind turbine, water tower, school yard, fire tower), and a
   bridge card as a deck on piers. Evidence: crops of `ui_12.png` and `services_12.png`.
7. **Sub-panel tab row.** ≥ 2 icon tabs per multi-tab category, 52–72 px wide × 30–40 px tall, each with an icon
   **and** at rest a visible background distinct from the panel (≥ 6 luminance steps), the active tab filled accent,
   and a 2–4 px accent rule spanning the panel width directly beneath the row. Close × present at the panel's
   top-right. Evidence: crop of `ui_12.png`.
8. **Status strip content and alignment.** Present, in this left-to-right order, as separate pills:
   play/pause + `HH:MM` + `Mon YYYY` + speed control; weather (icon + `NN°C`); season; city name;
   population (+ trend); money `¢N,NNN,NNN` (+ trend arrow, red when negative); and a **five-face happiness meter**
   with exactly one face lit in the happiness colour and four dimmed. Chip icons 20–24 px against 12–14 px text.
   Every numeric value right-aligned within its pill. `HH:MM` follows `world.time.hour` (probe: set
   `__sim.setTime(6.5)` ⇒ the clock pill reads `06:30` within 1 minute). Evidence: crop of `ui_12.png`.
9. **Info panel matches cs2_5's structure.** Width 400–470 px at 1080p (320–400 px below 1440 px — item 15); header
   = icon disc + entity name in accent caps + close ×; ≥ 3 sections with CAPS heads; ≥ 8 label/value rows with
   values right-aligned on one common right edge (probe: the right edges of all `.sb-v` in a section agree within 1
   px); ≥ 2 progress bars; a level indicator; an action row of ≥ 3 buttons **each with a visible 1 px border or
   filled background at rest**. Values come from `world.buildings.items` / `world.roads` for the selected id, not
   from literals, when those modules are loaded. Evidence: `ui_12.png`, `all_aerial_12.png`.
10. **Info-view legend matches cs2_7's structure.** With an info view active: a legend panel with icon + accent CAPS
    title + ×, a "MAP LEGEND" head, and ≥ 2 legend rows, each carrying either a ≥ 12 px colour swatch or a
    ≥ 240×6 px gradient bar with both end labels, plus a right-aligned muted tag and a checkbox. The info-view
    picker shows ≥ 12 views. `ui:action {action:'infoview', args:[name]}` fires on click and `args:[null]` on
    deselect. Evidence: `infoview_12.png`.
11. **The §15 screens are shot, not just coded.** `showcase.cameras` declares, and the module stages from the
    `camera=` URL parameter, **all ten presets in §8** — the list there and the list here are the same list — each
    with the named shot file (`tools/gauntlet.mjs` and `tools/screenshot.mjs` name shots `<camera>_<time>.png`):
    `ui` → `ui_12.png` (all panels, the money shot); `menu` → `menu_12.png` (main menu: Continue / New game with city
    name + seed + Random + map preset + budget / Load / Settings); `pause` → `pause_12.png` (Esc menu with the clock
    paused — probe asserts `world.time.paused === true`); `settings` → `settings_12.png` (quality / audio / autosave /
    minimap / dev / key list); `save` → `save_12.png` (slot list with day + timestamp, Download and Upload controls);
    `infoview` → `infoview_12.png` (item 10); `lines` → `lines_12.png` (transit line panel: ridership, bus stepper,
    colour swatch, stop list, focus/edit/delete); `services` → `services_12.png` (services category open, ≥ 8 cards,
    ≥ 2 of them locked with badge + tooltip); `photo` → `photo_22.png` (HUD hidden except a fading hint);
    `closeup_hud` → `closeup_hud_6p5.png` (the `ui` HUD over a bright, busy foreground — the one frame that proves
    translucency does not lose to legibility). Each preset must produce a **visibly different** frame from
    `ui_12.png` (≥ 3 % of pixels differ) and none may show a clipped or scrolled panel. Evidence: ten PNGs, one per
    preset, plus `ui_22.png` — §8 shoots the `ui` preset at both 12 and 22.
12. **Behavioural probe.** In a Playwright page-evaluate run: every `.sb-tool`, `.sb-card`, `.sb-tab`, `.sb-ctl`,
    `.sb-round`, `.sb-chip-btn`, `.sb-action`, `.sb-mbtn` click emits exactly one `ui:action` with a name from the
    §2 vocabulary (zero unknown names, zero silent controls); the 1×/2×/4× buttons set `clock.speed` to 1/2/4 and
    play/pause toggles `clock.paused`; `Esc` closes sub-panel → panel → opens the pause menu; `Space` toggles pause;
    `P` toggles photo mode; a `sim:milestone` emit produces a toast and refreshes the milestone chip;
    `save`→`load` round-trips a slot through `window.__sim.saves`.
    Separately, on the profiling path `?showcase=ui&nohud=1&headless=1` (`src/modules/ui/index.js:19` returns before
    the HUD exists; `transit` depends on this path degrading cleanly): **every** `api` entry in §2 is called once and
    returns without throwing, `serialize()` still returns an object carrying `cityName`, `infoview` and `minimap`,
    and the probe asserts **zero console errors** and `ui` status `ready` afterwards.
    Evidence: `uicheck.mjs` output.
13. **Live binding, no literals, in `?showcase=all`.** Probe mutates `world.economy.money` by +50 000 and
    `world.economy.demand.commercial` to 0.9, then **forces** one simulation tick — `--time` implies `speed=0`
    (`src/main.js:82`; `tools/screenshot.mjs` sends `speed=0`), so `clock.advance` is a no-op and nothing ticks on
    its own. Use either `window.__sim.registry.get('simulation').api.step(1)` (synchronous and deterministic) or
    `window.__sim.setSpeed(1)`, await one `sim:tick` on `window.__sim.events`, then `window.__sim.setSpeed(0)`.
    The money chip and the C bar both change within 1 s of that tick. `__sim.setTime(22)` turns the weather chip
    to the moon glyph. No chip shows a value that is absent from `world`. Evidence: `all_aerial_12.png` + probe log.
14. **Night and bright-background legibility.** Measured on a **≥ 20×8 px crop centred on a pill's primary value**
    in `aerial_22.png` and `aerial_12.png`: the glyph pixels and the pill fill differ by a WCAG contrast ratio
    **≥ 4.5:1** (**≥ 3:1** for muted `#9AA6B2` labels), and the pill fill itself has mean luminance **18–90 at both
    12:00 and 22:00** — neither crushed to black nor washed out by the scene behind it. Sample at least the clock
    value, the money value, one muted info-panel label and one card cost badge, at both times.
    **CRITIC.md's blown/crushed limits (p99 ≥ 250, p1 ≤ 5) are a scene rule and apply to backdrop pixels only, never
    to HUD glyphs**: §3 requires white text on dark pills, so white at 255 over a near-black fill is the target here,
    not a defect, and a build must not be marked down for it. The dev corner, when enabled, holds the same ratios
    over lit windows. Evidence: crops + measured ratios.
15. **1280×720 is a first-class size, with a stated horizontal budget.** `aerial_12_720p.png`: all of items 1, 2, 8
    hold; the toolbar keeps ≥ 12 category icons visible (icons may shrink to 34 px and gaps to 3 px, but no icon may
    be dropped from the unlocked set); the milestone chip may collapse to badge-only; no text is clipped mid-word
    (ellipsis with a `title` is acceptable, mid-glyph clipping is not).
    **Below 1440 px viewport width this is what yields** — r1 failed here by letting everything stay open at full
    width (issue 2), and r2 invented its own rule in a build report, so the rule lives here now:
    the info panel narrows to **320–400 px**; the sub-panel caps at **5 cards per row**; and `.sb-side` (statistics)
    and the info-view legend are **mutually exclusive with `.sb-info`** — opening one closes the other. Precedence
    when more than one is requested: **info panel > legend > statistics**. `.sb-lines` and `.sb-info` share the left
    slot and are mutually exclusive at **every** width (r2 resolved this in a build report; it is a rule now):
    the one opened last wins and the other is set `.sb-hidden`.
    The builder declares the breakpoint and this precedence order in `docs/builds/ui_r3.json` as
    `breakpoint: {px: 1440, order: ["info","legend","statistics"]}`; at ≥ 1440 px all of them may be open at once
    (item 1 still applies).
16. **Minimap.** Canvas ≤ 256×256 CSS px, showing terrain colour/hillshade from `world.terrain.heights`, roads from
    `world.roads.edges`, and a camera footprint quad that moves when the camera moves (probe: `__sim.setCamera
    ('skyline')` changes ≥ 2 % of canvas pixels). Redraw ≤ 5 Hz. Collapsible, and collapsed state survives
    `serialize()`/`deserialize()`. Evidence: crop of `ui_12.png`, probe diff.
17. **Notifications and journal.** ≥ 3 stacked notifications top-right, each with a typed 4 px accent bar, an icon
    disc, a title, a body, and a right-aligned timestamp derived from game time; auto-dismiss driven by `dt`
    (probe: a `ttl:4` note is gone after 4 s of accumulated `dt` and still present at 3 s — wall clock is never
    read); dismissed notes appear in the journal panel. HTML in titles/bodies is escaped.
    Evidence: `ui_12.png`, `journal_12.png`.
18. **The one allowed wall-clock read.** Exactly one `performance.now()` may exist in `src/modules/ui/` — the dev
    fps counter in `hud.js` — and nothing the screenshots see may be driven by it; every other timing is `dt`-driven
    (items 17 and 21). Zero console errors, `ui` status `ready` in every shot, and the `Math.random` grep are
    BUILDER.md/CRITIC.md pass conditions, not restated here; they apply anyway and are checked from every `.json`
    beside every PNG.
19. **Budget.** `budget: { drawCalls: 20, triangles: 300_000 }` declared and honoured: `maxDrawCalls ≤ 20` and
    `maxTriangles ≤ 300_000` across the whole gauntlet; in `?showcase=all` the `ui` group contributes **0** draw
    calls and 0 triangles — probe, from a page-evaluate where `ctx` is *not* reachable:
    `window.__sim.registry.get('ui').group.children.length === 0` outside the ui showcase
    (`src/core/registry.js:14` puts `group` on the record; `src/core/debug.js` exposes `registry`, not `ctx`).
    `moduleMs.ui` from `__sim.stats()` averages **≤ 1.0 ms** and never exceeds 2.0 ms over a 3 s measure.
20. **Backdrop is not programmer art.** It sits under every shot and is not the graded subject; how heavily it
    weighs against the HUD is CRITIC.md's business, not this spec's — nothing here caps or discounts it, and the two
    clauses below are CRITIC.md hard fails that this item does not soften.
    At `street_12`, `closeup_12`, `street_22`: trees have a trunk and a non-spherical
    silhouette, ≥ 2 crown-colour variants, and darken with the night factor (mean tree-pixel luminance at 22:00
    ≤ 55 % of the 12:00 value); facades show floor lines and window reveals rather than a flat grid on a box;
    ≥ 40 street lamps with warm emissive heads and ground pools visible at 22:00 and off at 12:00; no object floats
    or sinks; no z-fighting between road, kerb and ground.
21. **Photo mode really hides the HUD.** In `photo_22.png`, no `#ui` descendant other than the hint has a visible
    rect; the hint fades over ≤ 3 s of `dt` (not a CSS-only animation, so it is deterministic under `speed=0`).
22. **`serialize()`/`deserialize()` round-trip.** `api.serialize()` returns `{cityName, infoview, minimap}`;
    feeding it back after changing all three restores all three. Idempotent when called twice.

## 5. Budget

| Metric | Limit |
|---|---|
| Draw calls (ui showcase, incl. environment) | ≤ 20 (declared `budget.drawCalls: 20`) |
| Draw calls contributed in `?showcase=all` | **0** — the HUD is DOM |
| Triangles (ui showcase) | ≤ 300 000 (declared `budget.triangles: 300_000`) |
| Triangles contributed in `?showcase=all` | 0 |
| `moduleMs.ui` per frame | ≤ 1.0 ms mean, ≤ 2.0 ms peak (ARCHITECTURE §9 caps any module at 2 ms) |
| `init` | ≤ 250 ms (r1 measured 6–7 ms; card/minimap work may raise it, not past this) |
| GPU texture memory (ui showcase) | ≤ 24 MB; minimap canvas ≤ 256², card thumbnails are SVG/canvas, not GPU textures |
| DOM | ≤ 1800 elements under `#ui`; no `innerHTML` rewrite of a container in `update()` — only changed text nodes |
| Per-frame allocation in `update()` | none (reuse objects; the `_lastX` change-guard pattern stays) |
| Shipped fonts | ≤ 60 KB total woff2, CC0, bundled — **no network font requests** |
| JS heap attributable to ui | ≤ 24 MB |

## 6. Known failure modes

Observed in `docs/critic/ui_r1.md` (all twelve were claimed fixed in `docs/builds/ui_r2.json`; they are listed here
as regression traps, and any that reappears is scored as a fresh failure):

- **RCI box overflowing into the status strip in every frame** — content taller than its 46 px container, the "O"
  row rendered ~25 px below the toolbar. Symptom: coloured bars floating over the clock pill. (r1 issue 1.)
- **Layout collapse at 1280×720** — toolbar-left overlapping the centred tools group by 63 px (RCI bars drawn under
  the Roads button); the 780 px sub-panel covering the 372 px info panel and hiding its bars and Demolish button.
  Symptom: two widgets drawn on top of each other in the bottom-left. (r1 issue 2.)
- **Asset cards as flat coloured rectangles** — "Alley" a grey box, "Gravel Road" a tan box. (r1 issue 3.)
- **Locked service icons desaturated to grey mud** (`opacity:.45; filter:saturate(.3)`) — eight illegible blobs in
  the middle of the toolbar. (r1 issue 4.)
- **Programmer-art backdrop under all 21 frames** — icosahedron blob trees glowing day-green at 22:00, box facades
  with a coarse window-grid shader, no lamps at night, flat noon lighting. (r1 issue 5.)
- **§15 screens missing or unreachable** — built but never staged, so no shot proves them. (r1 issue 6; and the
  reason acceptance item 11 binds them to camera presets.)
- **Tabs, dev corner, happiness faces, secondary-button affordance, thin right cluster, undersized chip icons.**
  (r1 issues 7–12.) Note the correction in §3: CS2's happiness widget is **five** faces, not one.
- **`dev:true` unconditionally, with "0 fps"** under SwiftShader — looks broken and CS2 has no such corner. Gate on
  `?dev=1` or the backtick key, show "—" until frames are counted.

Traps specific to this module and this environment:

- **Screenshots never hover.** Any affordance that appears only on `:hover`/`:focus` is invisible to the critic and
  scores as absent. Every button must read as a button at rest.
- **A static HUD makes 16 identical frames.** If the DOM never changes across the gauntlet, the critic writes "HUD
  identical (static DOM)" in every row, as in r1. Bind the clock, weather glyph, notification timestamps, demand
  bars and money trend to game time so noon, golden hour and night frames genuinely differ.
- **Panels staged behind `?uipanel=` only.** The critic runs `gauntlet.mjs` and the module's declared
  `showcase.cameras`, never a bespoke query string. Key the staged HUD state off the `camera=` parameter
  (`params.camera` is applied *after* `showcase.setup`, so reading `location.search` in `setup` is safe).
- **Tooltips and flyouts clipped at the viewport edge** — a `title`-based tooltip on the rightmost toolbar button, a
  dropdown opening below the dock. Clamp to the viewport; item 1a catches it.
- **Text ellipsised mid-glyph** at 10.5 px card labels (self-flagged in `ui_r2.json`). Ellipsis plus a `title` is
  fine; a half-drawn letter is not.
- **Boot-splash frames.** Two r1 gauntlet shots came back as the SIMBUILD loading screen because another builder
  saved a file mid-capture and Vite full-reloaded; `summary.json` still said `ok`. A ui frame under ~400 KB is
  suspect — re-shoot it and say so in the report rather than reading the splash as the module.
- **Emissive HUD-adjacent glow.** Lamp halos in the backdrop clipping to near-white at night (self-flagged in
  `ui_r2.json`) reads as a bloom bug and drags the whole frame.
- **Photo-mode hint on a CSS transition** rather than `dt` — non-deterministic under `speed=0`, so the shot catches
  it mid-fade at a random opacity.
- **Writing to `world`.** `ui` owns no section. Setting `world.economy.taxRate` directly instead of emitting
  `ui:action {action:'setTaxRate'}` silently desyncs `simulation`.

## 7. Dependencies and their real APIs

`dependencies: []` — and it must stay `[]`. `ui` is a wave-1 module; declaring `roads`/`buildings`/`props` as
dependencies would pull wave-2 modules into wave-1 init order and into `selectModules()` for `?showcase=ui`
(`src/core/showcase.js`). The showcase backdrop therefore stays **self-owned** inside `src/modules/ui/showcase.js`.

Core, with the true signatures:

- `ctx.clock` (`src/core/clock.js`): `hour`, `day`, `speed`, `paused` (getters), `set(hour)`, `setSpeed(n)`,
  `pause()`, `resume()`, `advance(dt)`, `sunElevation(hour = this.hour) -> rad`,
  `sunAzimuth(hour = this.hour) -> rad`, `isNight(hour) -> bool`, `dayLengthSeconds = 600`.
- `ctx.camera` (`src/core/camera.js`): `camera`, `target`, `distance`, `yaw`, `pitch`,
  `presets` = `{aerial, overview, skyline, street, closeup, night_street}`, `apply(presetName|{position,target}
  |{yaw,pitch,distance,target})`, `flyTo(preset, seconds = 2)`, `registerPreset(name, preset)`,
  `enableControls(bool)`, `screenToGround(ndcX, ndcY)`. Minimap click-to-fly goes through `flyTo`.
- `ctx.events`: `on(name, fn, owner) -> unsubscribe`, `off`, `once`, `emit(name, payload)`. Unsubscribe everything
  in `dispose`.
- `ctx.assets`: `pbr(name,{repeat})`, `hdri(name)`, `gltf(url)`, `procedural.noiseTexture(opts)`,
  `procedural.gradient(opts)` — every loader resolves even on failure.
- `ctx.rng`: `float()`, `int(a,b)`, `range`, `pick(arr)`, `weighted`, `gauss`, `shuffle`, `fork(label)`
  (determinism rules: BUILDER.md).
- `engine.stats` via `window.__sim.stats()`: `{fps, frameMs, drawCalls, triangles, programs, textures, geometries,
  frames, moduleMs, heapMB, hour, modules, camera}` — the dev corner's only data source.
- `window.__sim.saves` (`src/main.js:91`, the object from `src/core/save.js`): `save(slot)`, `load(slot)`,
  `slots() -> [{slot, savedAt, day}]`, `remove(slot)`, `download(name)`, `upload(file)`, `autosave`.
  It is **not** declared in `debug.js`; guard every access (`window.__sim?.saves?.slots?.() ?? []`).
  Save/load may also be driven purely by emitting `ui:action {action:'save'|'load'|'download'}` — `save.js`
  listens for exactly those.

Optional modules — all are read through `ctx.modules.<name>?.api?.<fn>?.()` and every one must degrade to a
self-contained fallback, because **`tools`, `props`, `services`, `infoviews` and `transit` are still stubs**
(`api: {}` / `api:{serialize,deserialize}`) and `?showcase=ui` initialises none of them:

| Module | Functions ui may call | Degrade to |
|---|---|---|
| `simulation` | `milestone()`, `milestones`, `isUnlocked(what)`, `economy()`, `demand()`, `history()`, `building(id)`, `loans()`, `takeLoan(a,d)`, `repayLoan(id)`, `setTaxRate(r)`, `grids()` | ui's own `MILESTONES` ladder in `hud.js`, `world.economy` directly, and the staged sample source from `showcase.js` |
| `tools` | `select(tool, opts)`, `setOption(key, value)` | emit `ui:action` only; keep the button highlighted locally |
| `services` | `world.services.kinds` (data, not api) | ui's `SERVICE_KINDS` table |
| `infoviews` | `world.infoview.{active,legend}` | ui's `INFOVIEWS` table with its own gradients |
| `transit` | `world.transit.lines` | the staged sample `Map` |
| `audio` | `setMasterVolume(v)`, `mute(on)` | settings sliders still emit `ui:action {action:'settings'}` |
| `buildings` / `roads` | `world.buildings.items`, `world.roads.{types,edges,nodes}` for info-panel content and the minimap | the staged sample building/road records |

`ui` must never: add a light, install a composer, call `renderer.render`, set `toneMapping`/`scene.fog`, touch
another module's `group`, or write any `world` section. Core changes go in `docs/core-requests/ui.md`.

## 8. Showcase

`showcase.setup(ctx)` stages a **backdrop plus a HUD state chosen by the `camera=` URL parameter**. Keep the
`?uipanel=` override for the builder's own use; the presets are what the critic shoots.

**Scene (unchanged in kind, better in quality):** a lit block grid — PBR ground with distance fade; merged
asphalt streets with lane markings, kerbs and concrete sidewalks; instanced facades with per-window night lights;
a park block inside the `street`/`closeup` corridor; instanced trees with trunks and ≥ 2 crown tints; ≥ 40 instanced
street lamps with emissive heads and an additive night glow driven by a `uNight` uniform derived from
`clock.sunElevation()`. Deterministic from `ctx.rng.fork('showcase')`. All of it inside `ctx.group`, ≤ 20 draw calls.

**HUD state per preset (all camera-identical to `ui` except `photo` and `closeup_hud`, so a diff isolates the HUD).**
This table and acceptance item 11 are the same list of ten — all ten are required, and item 11 names the shot file
each one must produce:

| Preset | Camera | HUD staged | Shot at |
|---|---|---|---|
| `ui` | yaw 0.78, pitch 0.34, dist 300, target [-10,14,-30] | roads sub-panel with `street` selected, info panel on "Linden Terrace", statistics side panel, land-value legend, milestone toast, 3 notifications, minimap | 12 and 22 |
| `menu` | same | main menu over a dimmed scene: Continue / New game (city name, seed + Random, map preset, budget) / Load / Settings | 12 |
| `pause` | same | Esc pause menu, `world.time.paused === true` | 12 |
| `settings` | same | settings panel: quality, master volume + mute, autosave, minimap, dev corner, key list | 12 |
| `save` | same | save/load slot list with day + timestamp, Download / Upload / delete | 12 |
| `infoview` | same | info-view picker open + legend panel for one view | 12 |
| `lines` | same | transit line panel: 2 lines, ridership, bus stepper, colour swatches, stop list, actions | 12 |
| `services` | same | services category open with ≥ 8 cards incl. 2 locked (lock badge + tooltip) | 12 |
| `photo` | yaw 1.2, pitch 0.16, dist 90, target [20,4,20] | HUD hidden, fading hint only | 22 |
| `closeup_hud` | yaw 0.6, pitch 0.35, dist 110, target [20,6,20] | same as `ui`, to prove the HUD holds over a bright, busy foreground | 6.5 |

**Reading at the four standard cameras × 06.5 / 12 / 17.5 / 22** (`gauntlet.mjs --module ui`; critics shoot noon and
night by default plus golden hour):

- **aerial (12)** — the money shot. Dock translucent enough that the block grid reads through it; every pill legible;
  no overlap. **aerial (22)** — same layout, HUD unchanged in colour, lit windows and lamp pools behind it, the
  toolbar band measurably darker than at noon (item 2).
- **street (06.5 / 12)** — the HUD sits over a bright, high-contrast foreground: this is where translucency fights
  legibility. Pills must stay ≥ 4.5:1 on their text. **street (22)** — dev corner and status text must not lose
  contrast over lit windows (an r1 finding).
- **skyline (17.5)** — golden hour: warm haze behind a neutral HUD; the HUD must not pick up a colour cast, and the
  white text must not read as cream.
- **closeup (12 / 22)** — the sub-panel and info panel overlap the most scene detail here; item 1's overlap
  assertions must still hold, and the card thumbnails must be readable at 1:1.

Also required, every round: `--showcase all --camera aerial --time 12` (proves the HUD binds to the real world and
adds 0 draw calls) and `--camera aerial --time 12 --w 1280 --h 720` (item 15).
