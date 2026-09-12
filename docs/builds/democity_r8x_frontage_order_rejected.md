# Democity R8x — deterministic frontage-order sweep, no product candidate

## Decision

**Reject every tested edge-order change. Accept the sweep as diagnosis only, pending independent review.** Product source remains accepted R8v SHA256 `030ee74038052ff28f7b3c68378d5954ed01f373a8318879a583e6da04c83ecb`; no source order changed and scores remain6.0/10 FAIL.

R8w showed that earlier frontage claims are the first recorded stop for856/930 shallow painted slots. R8x tests whether this produces a useful net real-lot gain rather than counting gross newly available columns. Every page is disposable and routes one deterministic comparator while preserving the established avenue→street→other road-class priority.

## Results

| Within-class order | seed1337 lots / delta | seed7 lots / delta | claimed-key delta | lost stable lot keys | gained stable lot keys |
|---|---:|---:|---:|---:|---:|
| Current length+seed |612 /0|648 /0|0 /0|0 /0|0 /0|
| Edge ID ascending |620 /+8|656 /+8|+47 /+45|129 /130|137 /138|
| Shorter-length + seeded jitter |621 /+9|649 /+1|+176 /+123|178 /182|187 /183|
| Seed jitter only |617 /+5|649 /+1|+78 /+77|78 /83|83 /84|
| Reverse current |621 /+9|650 /+2|+177 /+123|215 /225|224 /227|

All ten pages have zero browser/simulation errors. Every page keeps buildings equal to lots and, through R8v normalization, has zero within-lot duplicates and zero shared membership keys.

The largest count response is only+9 in seed1337 and+8 in seed7, against current612/648. It does not approach1,200 buildings or1,400 lots. Claimed-key gains can be much larger than lot gains because competing roads exchange parcel shapes and remainder slots.

## Churn and state consequences

The complete lot/owner tables show that every alternative trades away real existing frontages:

- ID order retains483/518 stable keys but only2/2 retain the same numeric lot ID;
- shortest-first retains434/466 and0/0 retain the same ID;
- jitter-only retains534/565 and3/2 retain the same ID;
- reverse-current retains397/423 and4/0 retain the same ID.

All alternative building serializations, simulation serializations and recorded economies differ from current. Population, jobs, cash, happiness, net and sometimes staged loan principal move because changed generation order assigns different lot/building IDs and deterministic plans. For example ID order raises seed7 jobs23,109→25,144 while population8018→8017 and cash25,738.84→26,060.38; this is not an equivalent city with eight harmless additions.

The sweep records every lot's stable key, numeric ID, building link, full frame/class and normalized cells, plus complete building and simulation saves and economy fields. `gained` and `lost` are set differences of road+side+original-front-cell identity, so the net count delta equals gained minus lost for every row.

## Rejection rationale

All tested comparators fail the bounded product gate:

1. net yield is small; ID order is consistently +8/+8, while the other three results vary across seeds;
2.78–225 accepted frontages disappear to gain83–227 others;
3. almost all retained lots receive different IDs, changing deterministic building forms and economy;
4. no historical-save migration, restore, visual, gameplay or performance evidence justifies that churn; no historical-save failure is claimed;
5. none materially closes rank1.

No screenshot is needed because no alternative is proposed for visual acceptance. Counts alone cannot justify a city rewrite. The current importance/length/seed order is retained exactly.

## Limits and next direction

The sweep covers four deterministic within-class alternatives, not every possible ordering or a coordinated road/frontage redesign. It does not prove that ordering can never help. Fresh startup pages measure new-world outcomes; they do not test loading existing saves under an altered order. Routed source affects only the comparator, but different initialization state intentionally propagates into buildings and economy.

R8x closes these four coarse edge-order candidates as a bounded rank1 path; it does not exhaust every coarse, adaptive or localized order algorithm. Further city-scale work needs a localized frontage/run design that can add legal lots without globally trading existing stable keys, or another ranked verified issue with a safer owner path. Do not integrate any tested order, claim gross cell gain as capacity, or raise the score.

Evidence: `shots/democity/r8x-frontage-order/profile.json` and `tools/frontage-order-sweep.mjs`.
