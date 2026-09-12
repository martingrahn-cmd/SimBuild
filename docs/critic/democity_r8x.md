# Democity R8x — independent frontage-order rejection audit

**ACCEPT the rejection record. Reject all four alternative product orders; none should advance on this evidence. Democity and whole-game remain 6.0/10 — FAIL.** The small real gains are outweighed by substantial replacement of existing parcel keys and changed fresh-city state without a demonstrated visual, gameplay or compatibility benefit. This does not establish that every ordering strategy is futile.

## Exact source scope

I independently regenerated all five routed sources from the profiling tool. Its comparator marker occurs exactly once. The `current` route is byte-identical to accepted product source, SHA256 `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`. Every variant hash matches the retained profile. Each alternative changes only that sorting expression and preserves avenue→street→other road-class priority. Product source remains unchanged.

The `shortest-first` label is approximate: its score still combines ascending length with seeded jitter, so it is not strictly shortest length first. `reverse-current` reverses the within-class score and tie-break order, not road-class priority. These are deterministic owner-order experiments, not changes to lot dimensions or independent decorative stock.

## Independently recomputed outcomes

I parsed the entire profile, traversed all ten complete lot tables and building/simulation serializations, and recomputed unique IDs/keys, class counts, cell ownership, bidirectional building links, gained/lost/retained sets, same-ID counts and comparison booleans. All recorded values agree. All lots have a unique stable key; every lot links to its actual serialized building of the same class. Every run has buildings equal to lots, zero duplicate references, zero shared membership keys and zero browser/simulation errors.

Each pair below is seed1337 / seed7.

| Order | Lots | Net lot gain | Claimed-key gain | Lost / gained keys | Retained keys | Retained same lot ID |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Current | 612 /648 | 0 /0 | 0 /0 | 0→0 /0→0 | 612 /648 | 612 /648 |
| ID ascending | 620 /656 | +8 /+8 | +47 /+45 | 129→137 /130→138 | 483 /518 | 2 /2 |
| Shortest+jitter | 621 /649 | +9 /+1 | +176 /+123 | 178→187 /182→183 | 434 /466 | 0 /0 |
| Jitter only | 617 /649 | +5 /+1 | +78 /+77 | 78→83 /83→84 | 534 /565 | 3 /2 |
| Reverse current | 621 /650 | +9 /+2 | +177 /+123 | 215→224 /225→227 | 397 /423 | 4 /0 |

Gained minus lost equals net lot gain in every row. Painted-cell counts remain9964/10113, but larger claimed-key gains are not equivalent to more complete parcels. All per-class distributions were independently reconstructed and are retained in the JSON companion.

ID ascending is the most consistent count result, gaining eight in both seeds. It should not be described as seed-inconsistent. It nevertheless removes129/130 accepted stable keys, and only two retained keys keep the same numeric lot ID. Jitter-only causes the least key loss but still replaces78/83 keys for gains of five/one. The two remaining options incur still larger changes with little seed7 gain. None offers evidence sufficient to justify a product-wide order replacement.

## Retained keys and actual state

“Retained” means only the same edge/side/original-front-cell key. I separately compared full frames and cell arrays. For ID ascending,476/509 retained keys keep the full frame and476/508 keep membership. The corresponding frame counts are398/431 for shortest+jitter,514/546 for jitter-only and354/381 for reverse-current. Thus key retention alone would overstate parcel preservation. Same building-ID counts also differ from same lot-ID counts; the JSON records both independently.

Every alternative's complete stored building serialization, simulation serialization and economy differs from current. These are not merely metadata labels: recorded jobs, cash, population, happiness, demand, net income and sometimes loan principal change. For example ID order on seed7 changes jobs23109→25144, population8018→8017, money25738.8354→26060.3774 and net9653.1372→9545.4116. These changes are not automatically improvements or regressions in playability.

Source explains why broader state changes follow. Building creation allocates IDs and seeds plan generation from building ID plus class; the changed parcel ordering changes those inputs and some parcel frames. Democity then runs actual bounded simulation steps and borrows through the real loan API as needed. Identical source outside the comparator therefore does not imply equivalent initialized cities. The stored building save describes persisted inputs, not every runtime plan or a rendered picture, so no claim of visibly worse architecture is made.

## Rejection judgment and limits

Rejecting these four product variants is warranted. A small positive incremental gain could be valuable if it were localized and preserved the city. Here the measured intervention replaces scores to hundreds of stable keys and almost all fresh-world numeric IDs for one to nine extra lots, while supplying no migration, visual, gameplay or performance case for accepting that scope. The fact that none reaches1200/1400 is context, not an invented rule that every incremental change must close the entire gate.

These are fresh startup comparisons. They do not execute an old-city import or prove save corruption. Existing-world regeneration can match retained stable keys, and importing historical saves under an altered startup order requires separate investigation. Do not convert potential migration risk into a fabricated tested failure.

Four within-class comparators on two seeds do not exhaust all coarse, adaptive or localized order strategies. Treat the builder's “exhausts” wording as a decision to stop these tested options, not a mathematical claim. The next owner-safe rank1 proposal should predict local legal frontage/run yield while minimizing key replacement, or explicitly justify a larger redesign with identity/migration, visual, economy and performance evidence.

I read the builder report, full tool/profile, current zoning sampler/order/identity code, fixed palette contract, road-frontage owner code, building spawning and relevant Democity/economy initialization/persistence paths. Exact paths, all five source hashes, full gained/lost/retained key sets, class distributions and measured state deltas are in the JSON report. Current-route comparison booleans are self-comparisons; baseline provenance is supported separately by exact bytes and independently counted records.

No screenshots were requested or inspected because no alternative advances. No browser rerun, build, performance/memory, save/import or gameplay test was performed by this critic. Omitting full acceptance captures/contracts is appropriate for rejected routed experiments; it does not pass those gates. Only these two critic files were written. Product source, STATUS and HANDOFF were not changed.
