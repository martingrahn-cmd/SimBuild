# Democity R8w — raw frontage-slot key diagnosis

## Decision

**Accept as diagnosis only, pending independent review. No product or score change.** R8w routes a diagnostic-only recorder over the accepted R8v `ZoneGrid`, calls public `zoning.diagnose()` on disposable seed1337/7 pages, and retains the actual raster-key array and stop reason for every sampled frontage slot. Product source remains SHA256 `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`.

## Exact inventory

| Measure | seed1337 | seed7 |
|---|---:|---:|
| Ordered road edges / sampled sides |569 /1,098|611 /1,180|
| Total slot samples |7,344|7,852|
| No painted first cell |3,718|4,073|
| Painted slots |3,626|3,779|
| Full preferred depth |2,048|2,116|
| Shallower than preferred |1,578|1,663|
| Full-depth same-class runs |730|717|
| Calculated / actual lots |612 /612|648 /648|

Every disposable-page before/after invariant projection matches: lot/building counts plus every lot ID, building link, edge, side, identity key, frame, heading, class, corner and frontage parameter. Both pages have zero browser and simulation errors.

## Why slots become shallow

The diagnostic route adds a stop reason at the exact `_slots()` break:

| Stop reason among shallow painted slots | seed1337 | seed7 |
|---|---:|---:|
| Prior ordered frontage already claimed the next key |856|930|
| Next depth key is unpainted |501|541|
| Next depth key changes zone class/density |221|192|

Prior-claim competition is the largest first-failure category only within shallow painted slots. Of those slots419/474 already stop at depth1, while another3,718/4,073 samples have no painted first cell. In addition,64/63 class-change stops also point at a prior-claimed cell because class mismatch is checked first. The categories describe branch precedence rather than independent physical causes. This does not show that another edge order creates more legal lots: an alternate order can merely transfer frontage and alter stable identities, buildings, economy and load behavior.

## Fixed-width packing

| Accounting | seed1337 | seed7 |
|---|---:|---:|
| Full-depth slots |2,048|2,116|
| Nominal fixed-width slots in emitted lots |1,408|1,505|
| Quotient remainder, including too-short runs |640|611|
| Remainder absorbed by junction extension |96|105|
| Adjacent shallow slots absorbed by corner extension |73|76|
| Final lot width in8m slots |1,577|1,686|
| Full-depth slots still unabsorbed |544|506|
| Of those, slots in runs too short for one lot |419|394|

Both independent identities hold exactly in the stored result:

- `nominalLotWidthSlots + remainderSlots == fullDepthSlots`;
- `nominalLotWidthSlots + absorbedRemainderSlots + absorbedShallowSlots == sum(lot.w / 8)`.

Only125/112 unabsorbed full-depth slots are remainders of already productive runs. The other419/394 are distributed over336/300 too-short runs. Joining them would require crossing a real unpainted, shallow, class or prior-claim break; they are not a free lot count.

## Raster-key repetition

The2,048/2,116 full-depth slot columns contain6,535/6,773 preferred-depth key references and6,336/6,601 unique keys. There are199/172 excess references across the complete ordered inventory. This is not equal to live lot overlap:

- only4/2 repetitions occur inside one slot;
- only3/3 key overlaps occur between adjacent slots on the same edge side;
- zero adjacent column pairs are exact duplicates;
-196/167 keys repeat at least once, with135/105 of those ultimately unclaimed;
-191/165 repeated keys occur across different road edges, mostly because unused candidate frontage can be sampled again later.

R8v's final lot memberships remain4,882/5,176 unique claimed keys with zero internal duplicates and zero cross-lot overlaps. Raw-slot repetition therefore must not be subtracted from capacity or treated as a new ownership defect.

## Implication

The data rejects a simple “deduplicate neighbouring raster columns to gain lots” path. A measurable next hypothesis is deterministic road-front claim order:856/930 shallow painted slots first stop on prior claims and the complete current order yields612/648 lots. A safe next diagnosis may compare alternate deterministic orders on disposable routed pages, but no product order change is justified until it proves net legal yield, including lost claims, and exposes the resulting lot identities, building stock, economy, restore behavior, geometry and performance cost.

R8w makes no visual claim and needs no screenshot. It does not pass city scale, performance, memory, historical import or playability. It does not modify lot dimensions, claims, buildings, roads, saves or product source.

Evidence: `shots/democity/r8w-raw-slot-keys/profile.json` and `tools/raw-slot-key-profile.mjs`.
