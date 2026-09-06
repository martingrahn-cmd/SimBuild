# core-requests: tools

Nothing in `src/core/` blocks the tools module today; these are the gaps it works around.

## 1. `src/modules/ui/hud.js` — drop the `.api?.` indirection at lines 458 / 518 / 531 **(binding)**

`ctx.modules.<name>` **is** the module's api object (`registry.js:15` `this.apis[def.name] = def.api`,
`registry.js:36` `modules: this.apis`) — there is no `.api` property on it. The three HUD call sites
that drive this module are written through one:

```js
src/modules/ui/hud.js:458   this.ctx.modules?.tools?.api?.select(name, opts)        // _toolsSelect(), declared :456
src/modules/ui/hud.js:518   this.ctx.modules?.tools?.api?.setOption(id, value)      // mode / toggle buttons
src/modules/ui/hud.js:531   this.ctx.modules?.tools?.api?.setOption(id, value)      // stepper
```

`?.api?.` optional-chains to `undefined` inside a `try`, so all three are silent no-ops: **the HUD
cannot reach `tools` at all**, and the HUD half of this module's acceptance item 16 (one tool-card
click ⇒ exactly one `tool:changed`, no ping-pong with `_toolsSelect`) is unobservable until it is
fixed. The exact change is to delete `.api` from those three expressions:

```js
- this.ctx.modules?.tools?.api?.select(name, opts)
+ this.ctx.modules?.tools?.select(name, opts)
```

`tools` publishes `select(name, options)` and `setOption(id, value)` with exactly the signatures the
HUD already passes, and honours the HUD's option ids verbatim, so nothing else has to change. This
module deliberately does **not** publish an `api` property on its own api object to paper over the
bug (the spec forbids the workaround) and may not edit `src/modules/ui/`.

## 2. `world.terrain.setHeights(ix0, iz0, ix1, iz1, Float32Array) -> bool`

Undoing a sculpt stroke means restoring a saved rectangle of `world.terrain.heights` to 1e-3 m and
then asking terrain to refresh its derived data (normals, chunk bounds, textures, water).
`modify()`'s radial `1 - r²(3-2r)` falloff cannot do that, and there is no write API, so `tools` does
what `roads/build.js:645-661` already does: write into `heights` directly and then call
`terrain.modify({x, z, radius, strength: 0, mode: 'raise'})` purely for the refresh side effect
(`src/modules/tools/index.js` `restoreHeightRect`). An explicit
`setHeights(ix0, iz0, ix1, iz1, data)` — or `refresh(region)` — would make this a contract instead of
a trick, and `tools` drops the direct write the day it lands. Already asked for by `roads`
(`docs/core-requests/roads.md:16`) and listed as owed in `ARCHITECTURE.md:102`.

## 3. `world.roads.splitEdge(edgeId, x, z) -> nodeId`

Snapping a new road into the middle of an existing one needs that edge split at the point.
`tools` implements it with the public API (read the endpoints, `removeEdge`, re-`addNode` the two ends,
`addEdge` twice) — which works because `addNode` de-duplicates within 1 m, but it loses the edge id and
cannot split a bezier edge exactly, so T-junctions onto curved roads fall back to a plain crossing.

## 4. `props.place` — signature mismatch with ARCHITECTURE / this module's spec (resolved, noted)

`props` **does** publish `place` and `remove`, but as `place(kind, x, z, opts = {})` with the heading
inside `opts` (`src/modules/props/index.js:580/610`), not the `place(kind, x, z, heading, opts)` the
tools spec §7 describes. `tools` calls it in a form that satisfies both
(`place(kind, x, z, {heading}, {heading})`) and gates on `typeof ctx.modules.props?.place === 'function'`
so the prop tool degrades to preview-only if it ever disappears. Either settle the signature in
ARCHITECTURE §6 or leave it as-is — this is a documentation gap, not a blocker.

## 5. `services` module (still a stub)

`services`' entire api is `{serialize, deserialize}` and `world.services.place()` is a no-op returning
`null`, so `commit()` on the service tool returns `{ok:false, reason:'service placement unavailable'}`.
Footprint, coverage radius and cost per kind currently live in `src/modules/tools/costs.js`; `tools`
already prefers `ctx.modules.services.footprintOf(kind) / coverageOf(kind) / costOf(kind)` (flat,
guarded) whenever those functions exist, so publishing them removes the duplication with no change
here.
