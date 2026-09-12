# Democity R8r — accepted-source Props render attribution

**Diagnostic only; no product-code change and no score change. Democity/whole-game remain 6.0/10 — FAIL.** R8r separates the required headless capture synchronization from exact Props component sensitivity before choosing another optimization.

## Verifier finding

The accepted R8q sampled trace spends14,222,556 of16,605,759 sampled microseconds (85.648334%) in native `readPixels`. `src/core/engine.js` deliberately synchronizes the GPU in headless mode so capture measurements do not hide queued work. R8r retains that synchronization. Removing it would change the established evidence gate rather than improve the game.

The new diagnostic uses one warmed page per exact accepted-source component and repeats A0–B0–A1–B1–A2–B2–A3. Each temporary B visibility mask is compared with the mean of its adjacent controls. Reflection and capture policy stay fixed for every page. Object visibility is restored after normal completion; the improved repeated tool now also restores in `finally`. Each isolated page closes after its record.

## Stable findings

- At interchange22 with capture synchronization and normal reflection cadence, the exact LOD1 tree pass contains37 chunk meshes /2,630 instances /441,840 source triangles. Masking it yields **+9.255991% median FPS** across three cycles, with0.044801–2.398548% adjacent-control drift. Median submitted change is−28 draws /−405,061.65 triangles.
- With reflection disabled for the whole page, the same LOD1 class yields **+8.519806% median FPS**. Two cycles keep drift below5%; the first reaches5.404458%. Every masked cycle remains positive at8.313184–12.550212%. The similar response with and without water reflection localizes the sensitivity to the main pass, consistent with Props' existing reflection self-cull.
- When the `headless=1` URL policy is omitted, the same page remains at the browser's60fps ceiling and the median difference is−0.027512%, with ≤0.079996% drift. This is not a pure readPixels toggle: it also changes headless readiness/preserve-drawing-buffer policy and its selection-time inventory is2,540 rather than2,630. It does not refute the synchronized result; it only shows that this broader no-headless-policy path is capped before the workload separates.
- At park22 with reflection disabled and required sync, LOD1 masking gives a6.194091% median response. All controls are stable, but one of three cycles is−1.408742%, so the park result is weaker than interchange. Impostors give1.996725% median with one negative cycle; visible furniture gives0.054220% median.
- At interchange22, pools remove381,636 median submitted triangles but produce only+0.269041% median, consistent with the earlier weak pool result; one control cycle drifts6.309148%. Lenses produce+3.750307% median but include one−0.065362% cycle. Halos produce−0.849310% median. These are not selected as product targets.

## Rejected evidence

The first short A-B-A component run is retained but rejected as a decision gate: pool, lens and halo controls drift8.085634–11.846690%. Counts alone remain insufficient. The repeated tool records `pass:false` for the reflection-off LOD1 and other-component files when even one cycle exceeds the strict5% drift threshold. The reflection-on LOD1, park and no-headless-policy files pass their all-cycle control checks. Individual cycles remain evidence with the limits stated above.

## Decision

The strongest measured owner-local lead is the accepted-source LOD1 tree main pass at the interchange, not pools, halos, furniture or distant impostors. A next candidate may test a cheaper LOD1-only shading path while retaining the same tree instances, geometry, texture, alpha silhouette, wind, tint, LOD thresholds, density, culling, shadows and restore behavior. It must be rejected if visual comparison shows a material or depth regression, or if synchronized A/B does not reproduce a gain.

No content is removed and no quality or performance gate is closed by this diagnostic.

## Evidence

- `shots/democity/r8q-hidden-masts/interchange22-attribution-candidate.json`
- `shots/democity/r8r-props-components/interchange22-reflection-on.json` — rejected short run
- `shots/democity/r8r-props-components/interchange22-lod1-sync-on-reflection-on.json`
- `shots/democity/r8r-props-components/interchange22-lod1-sync-on-reflection-off.json`
- `shots/democity/r8r-props-components/interchange22-lod1-sync-off-reflection-off.json`
- `shots/democity/r8r-props-components/interchange22-other-sync-on-reflection-off.json`
- `shots/democity/r8r-props-components/park22-sync-on-reflection-off.json`
- `tools/paired-props-component-profile.mjs`
- `tools/interleaved-props-component-profile.mjs`

## Limits

- Visibility masks measure sensitivity and intentionally remove content during diagnostic B blocks. They are not product solutions, additive owner timings or permission to lower density.
- Required headless readback may include GPU completion wait from earlier rendering. The synchronized result is suitable for the established capture gate, not a direct native GPU timer.
- The no-headless-policy path is limited by the60fps browser cadence and cannot quantify faster rendering; it also changes readiness/preserve-drawing-buffer policy, so it is not a pure synchronization switch.
- Component matching uses accepted source types plus exact base triangle counts. Inventories are recorded at selection time before the180-frame warmup, and LOD populations vary slightly with capture policy and settling (2,540–2,630 instances at interchange).
- The first tool's halo triangle helper serializes `NaN` as `null` because of operator precedence; halo timing and visibility remain usable, and the helper is corrected for future runs.
- Short block timing remains subject to host drift. Interchange reflection-on LOD1, park and the no-headless-policy file pass the strict all-cycle5% rule; reflection-off LOD1 and the other-component file retain their per-cycle qualification.
- No material candidate, gameplay verification, screenshot matrix, reference comparison, whole-game critic or blind judging is part of R8r.
