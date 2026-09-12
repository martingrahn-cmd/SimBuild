# Democity R9l — Props component render attribution

## Local decision

**Accept only a bounded LOD1 cost attribution and reject a pool-geometry optimization direction. Make no product or score change; Democity and whole-game remain 6.0/10, FAIL.**

R9k identifies the complete Props render group as the strongest next measured owner on the fixed interchange/night diagnostic. R9l masks real component submissions within that owner before selecting any geometry, material or distance candidate.

## Verifier and repair

`tools/r9l-props-component-profile.mjs` opens one fresh actual-Chrome/Metal page per component at seed 1337, interchange camera, 22:00, High quality and speed 0. It uses synchronized headless-on and uncapped diagnostic policies, warms the page, and alternates `A0-B0-A1-B1-A2-B2-A3`. Each B locks only matched component objects invisible; owner updates continue. A cycle is stable only when adjacent controls drift by at most 5%.

The first inventory run requested LOD1, impostors, pools, lenses, halos and furniture. It correctly found zero visible impostor and furniture objects at this scene and failed the aggregate gate. That file is retained only as an inventory diagnosis. The second run restricted the set to four present classes. Both runs use the intended R9k-matched reflection-off policy. The second produced usable rows but correctly failed overall because the lens row had zero stable cycles. During review, the process exit path was found incomplete: `pass:false` was persisted but the process returned zero. The tool now sets a nonzero exit code whenever the aggregate gate fails.

The five-cycle rerun demonstrates that exit repair with persisted `pass:false` and exit code 1, but it accidentally uses the tool's default reflection-on policy. It is a separate-policy diagnostic, not a matched replication of the reflection-off rows.

The headless/uncapped policy is diagnosis-only. It changes the complete headless path and is not the official capped screenshot gate. Component visibility masks alter color, depth, shadows and dependent effects; they are attribution and cannot be shipped as an optimization.

## Results

| Component | Real inventory | Submitted delta while masked | Stable timing evidence | Interpretation |
|---|---:|---:|---:|---|
| LOD1 trees | 37 meshes / 2,630 instances / 441,840 source triangles | about -28 draws / -405,048 triangles | 3/3 stable cycles; responses +12.19%, +12.93%, +13.03% | A real local render cost on this scene. |
| lamp ground-light pools | 1 instanced mesh / 1,325 instances / 381,600 source triangles | reflection-off: -1 draw / about -381,600 triangles; reflection-on: about -0.24 draws / -379,102 triangles | reflection-off's two stable responses -4.89% and +5.33% (conventional median +0.22%); separate reflection-on run has four stable responses with median -0.26% | Large submitted triangle count without a repeatable positive timing response under either recorded policy. Do not optimize it first. |
| lenses | 1 instanced mesh / 3,858 instances / 46,296 source triangles | about -1 draw / -46,296 triangles | 0/3 stable cycles | No timing conclusion. |
| halos | 1 Points object | -1 draw; renderer triangle statistic approximately unchanged | two stable responses +0.97% and -10.19% | Opposing/noisy responses; no timing conclusion. The inventory's vertex-count/3 field is not real triangle geometry for Points. |

The reflection-off second-run LOD1 row is the accepted component attribution: all three adjacent controls pass the declared drift screen and the mask has consistent draw/triangle effects. The reflection-on five-cycle row does not replace it: only one of five LOD1 cycles passes, so that row remains failed. Its single stable response (+12.18%) is directionally consistent but adds no accepted replication claim across either time or policy.

For pools, the reflection-off run's two accepted responses oppose each other around +0.22%. The separate reflection-on run has four accepted controls and remains centered near zero (-0.21%, -0.86%, -0.32%, +0.71%; conventional median about -0.26%); its unstable +5.43% cycle is excluded. These are two policy-specific diagnoses, not a matched replication, but neither supports selecting pool geometry from triangle count alone.

## Contract and product state

No product source, geometry, material, population, LOD selection, shadows, RNG, records, save data, simulation or gameplay behavior changes in R9l. Current LOD1 remains the accepted R8h geometry: 72 two-triangle leaf cards plus the 24-triangle stem, 168 triangles per tree. Its normal-camera range remains R9a's 205 m with 12 m transition band and CAP1 520. The R9e broad/narrow side atlas and R9f containment closure remain installed.

R5x is historical evidence for an older 48-to-40 card change; later accepted foliage work established the current 72-card geometry. It is not evidence that another card-count reduction is currently safe. R8z already rejected adding a 72-triangle sparse branch whorl, and R8s rejected the isolated Lambert material candidate. The measured LOD1 cost therefore supports a narrower follow-up diagnosis, not an immediate geometry or shader edit.

## Evidence

- `shots/democity/r9l-props-components/sync-on-uncapped.json` — reflection-off failed initial six-class inventory; absent impostor/furniture
- `shots/democity/r9l-props-components/final-v2.json` — reflection-off four present classes; accepted LOD1 row, usable pool row, failed aggregate due lenses
- `shots/democity/r9l-props-components/final-v3.json` — separate reflection-on five-cycle LOD1/pool run; failed aggregate and verified nonzero process exit
- `tools/r9l-props-component-profile.mjs` — SHA-256 `5ec28987a6d4f93e77eaf029911583cb9ebd733a881c9f119ec897dffcabf16d`

JSON SHA-256: initial `417be46110db12c6cc95dee7010e1ac2f25ccb27a9623e16d3144467febe1cef`; second `7f0ad97c8b2e336c1fece36c9479fdc0f8415f9fe1cc01f48fbc90019f9081ef`; longer rerun `21f2dad201145d253680ca81777be3914593345c0c159de25781a4953e98f7ff`.

## Limits and next step

This is one camera, time, seed and host session with short, correlated adjacent-control samples. Component order is fixed, per-frame timings are not retained, masks do not isolate CPU/GPU/shadow cost, and the uncapped headless policy is diagnostic. Reflection is off for the initial and accepted LOD1 series, but on for the five-cycle exit-code run; no cross-policy replication claim is made. No screenshot, save/API/restage, sustained50fps, forced-GC memory or subjective foliage-quality gate is passed by this no-product-change round.

The next bounded step is to attribute the accepted LOD1 cost by render contribution before altering its visual budget: separate its color and shadow submissions, and census distance/species/coverage in the measured scene. Preserve the accepted 168-triangle crown, range205, transition/CAP ledger, atlas structure and visual state until that evidence identifies a candidate with a credible quality-preserving path.
