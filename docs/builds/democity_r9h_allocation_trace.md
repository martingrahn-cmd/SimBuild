# Democity R9h — staged frontage allocation trace

## Local decision

**Accept as read-only diagnosis and advance to independent review. Make no product or score change; Democity remains 6.0/10, FAIL.**

R9g rejected one real16m street because it yielded −1/0 net lots on seeds1337/7. Its fresh baseline/candidate pages also showed many numeric lot/building ID differences. R9h identifies the exact startup allocation boundary so those differences are not mistaken for an incremental restore defect.

## Method

`tools/staged-allocation-trace.mjs` uses disposable browser-response transforms only. It retains the R9g baseline/candidate plan pair and instruments the existing `ZoneGrid.regenLots()` implementation without changing its decisions:

- each real call records previous-lot count and `nextLot` before/after;
- the exact existing road sort order and candidate insertion position are retained;
- each edge records every generated stable key, raw numeric lot ID and cell membership;
- final added/removed lists and normalized lots are retained.

Fresh actual-Chrome/Metal pages run baseline and candidate for seeds1337 and7. All four worlds finish with16 ready modules, zero engine/browser/HTTP errors and one building per lot. Existing relative edge order is exact after removing the one candidate edge. Product sources are not changed.

## Result

Startup performs exactly two lot-generation calls on both variants and seeds:

1. the post-road zoning refresh sees no painted cells and emits zero lots, leaving `nextLot=1`;
2. the bulk-painted city starts with no prior lots and performs the complete fresh allocation.

Because the first call produces no lot table, stable-key reuse has nothing to preserve during the second fresh-start call. This result is specific to fresh staging; it does not test an incremental `regenLots()` over an occupied city.

| Seed | Candidate sort position | New-edge lots | Existing edge rows changed | Final `nextLot` / stock |
|---|---:|---:|---:|---:|
| 1337 | 213 | 0 | 1 | 612 / 611 lots |
| 7 | 154 | 2 | 2 | 649 / 648 lots |

### Seed 1337

The candidate edge ID1073 appears at sorted street position213 and generates no lot. Only existing edge335 changes, at baseline position219 / candidate220: it loses stable key `335:right:42,19` and retains `335:right:42,16`. The raw allocator is one ID behind from that row onward, ending at612 instead of613. This exactly explains the R9g stock loss and the 187 retained stable keys whose fresh numeric lot IDs differ. The other existing frontage rows generate identical stable-key sequences.

### Seed 7

The candidate edge ID1140 appears at position154 and creates two real lots: `1140:right:45,25` and `1140:left:46,22`. Existing edge348, processed earlier at position140, shifts one local identity cell from `348:right:51,25` to `348:right:51,26` while keeping two lots. Existing edge346, processed later at baseline228/candidate229, loses both `346:left:45,16` and `346:left:45,20`. The candidate therefore runs two IDs ahead between positions154 and229, then the two-lot loss restores the counter. Final `nextLot` and stock both remain649/648. This bounded interval explains the126 retained stable keys with different fresh lot IDs.

R9g found that all611/645 retained stable keys preserve planar lot geometry and cell membership. R9h confirms that only1/2 existing edge rows change their generated key sequences. The broad visual city difference does not come from hundreds of parcel geometries moving. Sequential fresh numeric IDs feed the Buildings owner's ID-keyed procedural RNG, so a bounded lot-ID interval can produce many different building forms. R9h traces the lot boundary; it does not independently trace every building spawn event.

## Interpretation and limits

The accepted ordering contract processes avenue/street/alley by rank, then length plus deterministic edge-ID jitter. Appending a road after accepted road IDs preserves the Roads array but does not append it to the zoning sort: the street enters at position213/154. That fact, combined with globally sequential fresh lot IDs, explains why the R9g candidate changes more building appearances than frontage rows.

This is not evidence that ordinary incremental edits or save restore lose stable ownership. `regenLots()` first maps prior lots by road-side/original-front-cell key and reuses their IDs/building bindings. R9h deliberately observes the empty-to-painted startup path where no prior table exists. A future identity design must distinguish fresh authored identity from incremental preservation and must not replace the existing stable-key restore contract without dedicated save/migration evidence.

No screenshots are required for this nonvisual allocation trace; R9g already supplies and independently reviews the relevant eight originals and four differences. Production build163 from R9g remains the current unchanged-source build evidence.

## Evidence

- `shots/democity/r9h-allocation-trace/trace.json`
- `tools/staged-allocation-trace.mjs`
- prior visual/state evidence: `shots/democity/r9g-actual-frontage/final/summary.json`

## Next bounded priority if independently accepted

Test the remaining like-for-like question from R8y/R9g: the same endpoint pair as a disposable alley, using the actual Roads/Zoning owners. Before any product consideration, require positive net frontage on both seeds, candidate-repeat determinism, retained stable parcel geometry, acceptable terrain/road profile and directed visual integrity. Treat fresh numeric IDs as authored-state differences, and separately probe incremental stable-key reuse only if the alley first shows useful yield.
