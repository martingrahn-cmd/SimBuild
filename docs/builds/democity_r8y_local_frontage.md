# Democity R8y — localized missing-link frontage diagnosis

## Decision

**Accept as diagnosis only, pending independent review. Do not advance a product road candidate.** The accepted R8v product source remains unchanged and Democity remains 6.0/10 FAIL.

R8x rejected four city-wide edge orders because they add only one to nine lots while replacing 78–225 accepted stable parcel keys. R8y therefore asks a narrower question: does the authored grid contain a connected, cardinal missing link that can add legal frontage without touching an accepted lot?

## Method

`tools/local-frontage-opportunity.mjs` routes a disposable copy of `src/modules/democity/plan.js` which exposes the already-authored grid-node table. It does not add, remove or rebuild a road. Fresh seed1337 and seed7 pages then:

- distinguish a genuinely missing cardinal link from a link already built as two segments through a midpoint;
- flag water, terrain slope above Democity's current zone-painting filter and interior samples already covered by the road mask;
- measure painted and accepted claimed keys along the prospective alley corridor and within 24 m of its connected endpoints;
- estimate new frontage only from currently painted, unclaimed, same-class cell columns using the accepted 8 m lot widths and preferred depths.

The estimate is deliberately pre-candidate. Adding a road can change exact frontage spans, terrain cut/fill and junction trims, so predicted lots are a ranking signal rather than a promised result.

## Results

| Measure | seed1337 | seed7 |
|---|---:|---:|
| Authored grid nodes |268|280|
| Current road edges |604|646|
| Accepted lots/buildings |612/612|648/648|
| Painted / claimed cells |9,964 /4,882|10,113 /5,176|
| Endpoint pairs without a direct edge |150|166|
| Gap candidates after the road-mask heuristic |19|23|
| Zero-impact, dry, non-steep gaps |1|2|
| Zero-impact gaps with predicted new lots |0|0|

The only common zero-impact gap is grid link `1,-7→2,-7`; both seeds predict zero lots. Seed7 also has `2,-7→3,-7` at zero impact and zero yield, but seed1337 already has accepted endpoint parcels there.

Every positive-yield gap candidate has a measured risk under this conservative screen:

- `-8,-11→-7,-11` predicts one lot in each seed, but one/two accepted lots have cells inside the 24 m endpoint-risk area; seed7 also has four accepted corridor keys;
- `-2,-7→-1,-7` predicts one lot in each seed, but three/one accepted lots have cells inside that risk area and seed7 has two samples above the zone-paint slope filter;
- seed7-only `8,-7→9,-7` predicts two lots with no accepted-key conflict, but five terrain samples exceed the placement slope threshold;
- other seed-specific positive estimates likewise touch accepted endpoint lots or fail terrain/corridor checks.

## Tooling incident

The first draft counted many missing direct edges that were already connected through an authored midpoint. Its result was not accepted. The final tool labels a gap candidate only when the interior road-mask sampler sees at most two hits, intended to allow endpoint bleed, and defines zero accepted impact as no corridor keys, no endpoint keys and no impacted lot IDs. This is a heuristic, not topological proof; it can tolerate a narrow crossing.

During rerun, the long-lived Vite process once served a transient Props import whose default export did not satisfy the registry. The checked product file remained byte-identical to accepted SHA256 `be80cb25874c65a14b90f50702ae2e544850ee430e7f6af7c7400e6062b2156b`; a direct isolated import returned `{name:'props'}` and a fresh official smoke subsequently passed at 430 draws, 2,061,474 triangles, 54.6fps and zero errors. The inspected smoke image is `shots/democity/r8y-local-frontage/runtime-smoke.png`. No product repair is claimed.

## Implication and limits

The current cardinal missing-link screen has no positive-yield candidate across both accepted seeds that also has zero painted-cell risk and stays within the current zone-paint slope filter. Endpoint proximity is risk evidence, not proof that an actual road would remove those parcels. Because no road is built and the estimated gain is at most two lots, none advances to a product candidate.

This does not rule out mid-block roads requiring edge splits, non-cardinal paths, coordinated block redesign, altered zone painting or every localized frontage strategy. It establishes that the least invasive existing-node/cardinal-link path does not offer a positive zero-impact candidate. No road geometry, save/import, visual comparison, performance candidate or gameplay behavior was tested.

Evidence: `shots/democity/r8y-local-frontage/opportunities.json`, `shots/democity/r8y-local-frontage/runtime-smoke.png` and `tools/local-frontage-opportunity.mjs`.
