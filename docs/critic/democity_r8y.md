# Democity R8y — independent local-frontage diagnosis

**ACCEPT the qualified diagnosis. Advance none of the measured candidates under this strict screen. Democity and whole-game remain 6.0/10 — FAIL; rank1 stays open.** This is a decision about the measured proxies and existing painted-cell estimate. It is not proof that these links are physically impossible or that every localized design has been exhausted.

## Recomputed result

I read all316 candidate records and independently checked cardinal grid adjacency, endpoint length, impacted-ID uniqueness, side-yield sums and every `actualGap`, `zeroAcceptedImpact` and `safeReadOnly` Boolean. Aggregate counts and all named examples agree.

| Screening result | Seed1337 | Seed7 |
| --- | ---: | ---: |
| Recorded authored grid nodes | 268 | 280 |
| Recorded road edges | 604 | 646 |
| Lots / buildings | 612 /612 | 648 /648 |
| Painted / claimed keys | 9964 /4882 | 10113 /5176 |
| No direct-edge candidate pairs | 150 | 166 |
| Gap heuristic accepts | 19 | 23 |
| Gap cases with zero accepted-contact proxy | 1 | 6 |
| Also dry and below slope filter | 1 | 2 |
| These cases with positive estimated yield | 0 | 0 |

The common screened-safe link is `1,-7→2,-7`, estimated at zero lots for both seeds. Seed7 also has `2,-7→3,-7` at zero estimated yield; seed1337 has accepted endpoint membership in that neighborhood. Six seed7 gaps have zero contact proxy, but only two also satisfy the terrain screen. Do not confuse these counts.

All positive-yield heuristic gaps are accounted for:

- `-8,-11→-7,-11`: one estimated lot in both seeds, but one/two impacted lot IDs; accepted corridor keys0/4 and endpoint keys5/8.
- `-2,-7→-1,-7`: one estimated lot in both seeds, with three/one impacted lot IDs and endpoint keys4/3; seed7 also has two steep samples.
- Seed7 `8,-7→9,-7`: two estimated lots and no accepted-key contact, but five samples exceed the slope filter.
- Seed7 `1,3→1,4`: one estimated lot, five accepted endpoint keys and three impacted lot IDs.

Thus there are two/four positive-yield heuristic gaps, and none passes the complete screen. That supports selecting no product candidate from this inventory.

## Required interpretation limits

**`actualGap` is a road-mask heuristic.** It accepts at most two road hits inside the central12–88% of the segment. It does not trace graph connectivity through a midpoint or prove a continuous open corridor. It can tolerate narrow crossings or mask bleed. The131/143 excluded pairs are not independently established to be midpoint duplicates merely because this mask test rejects them.

**The .38 threshold is Democity's zone-painting filter**, visible in its existing painting loop. It is not a universal road-placement slope prohibition. The prospective line is sampled at approximately4m intervals; exact road engineering/cut-fill and parcel terrain validity are not performed. A flagged steep line therefore fails this screen, not a demonstrated road-owner placement contract.

**The24m endpoint neighborhood and expanded corridor are risk proxies.** They measure accepted membership near a possible road/junction, not actual lost or changed parcels. Contact justifies caution under a strict zero-contact objective; it does not prove that building the road must destroy those lots.

**Yield is an estimate from currently painted, unclaimed cells.** The tool samples prospective sides starting12m from each end in8m steps, using calibrated alley frontage5.55m, approximate paved half-width4.05m and existing class widths/depths. It does not run the road owner's actual new frontage spans, slot padding, junction changes, terrain refresh, corner extensions or zone painting. Newly zonable/newly painted land is excluded. Its `predictedUniqueKeys` includes preferred keys in full-depth runs even when their quotient is zero, so that value is not the area of predicted emitted lots.

Raw hypothetical slot arrays and terrain/road samples are not saved. I recomputed classification from retained measurements and checked side-estimate sums; I did not independently rerun those live primitives. The complete authored node table and road/cell maps are likewise absent, so their world inventory counts remain reported counts consistent with the accepted city, rather than an independent full-map census in this artifact.

## Source scope and smoke

The one matching source marker is replaced only to expose shallow copies of already-authored grid nodes on a diagnostic global. I independently reconstructed both hashes: product plan source `c439a6e88f87f40aac5182698d4406540e21f04ce659975b2b0e8cb4e4d26bd6`, routed source `bd3de52084af53bbe95bd02fc0fade0042799fac1aff52258d7ca5c52255a6db`. The normal planner return and world logic remain unchanged. Exposing a diagnostic global is a runtime write; it is not a world-road mutation. The subsequent analysis builds local sets/arrays and calls read/query helpers. `debugEdge` samples into scratch state and fresh span objects without regenerating lots. No road-add/remove, painting or save write is introduced.

Current zoning grid source still hashes to accepted R8v `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`; Props matches `be80cb25874c65a14b90f50702ae2e544850ee430e7f6af7c7400e6062b2156b`.

I individually inspected `runtime-smoke.png` and read its complete sidecar. The accepted aerial city renders with buildings, foliage, roads and water present; sparse fabric and existing visual limitations remain. All16 modules are ready and errors are zero. The recorded frame reports430 draws,2061474 triangles,54.6FPS and481.9MB raw heap. One smoke does not establish sustained performance, forced-GC memory or visual equivalence of a road candidate. It confirms a successful later startup; the earlier transient import's precise cause and isolated-import result remain builder-reported without complete incident logs here. No product repair is claimed.

## Decision boundary

No actual road was constructed or tested. Rejection means **do not advance under this strict measured screen**, with no score increase. It does not forbid mid-block edge splits, non-cardinal links, altered painting, a more exact localized design or coordinated block work. Any future proposal needs actual road-owner/frontage yield and state/visual evidence instead of turning these conservative screening proxies into universal impossibility claims.

Only these two critic reports were written. No product source, STATUS or HANDOFF edits, browser reruns or new gameplay/save/performance tests were performed. Exact inspected paths, per-seed examples, source hashes and evidence limits are in the JSON companion.
