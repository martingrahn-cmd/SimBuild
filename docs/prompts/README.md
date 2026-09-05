# The prompt library

Every prompt an agent receives in this project lives here, versioned and reviewable, and is held to
`PROMPT-STANDARD.md` — the same bar as the original project brief, scored the same way (pass ≥ 8.5).

| File | Used by | Contains |
|---|---|---|
| `PROMPT-STANDARD.md` | everything here | the ten properties a prompt must have, and how prompts are scored |
| `BUILDER.md` | every module builder | what is invariant across builders: rules, verification, done-criteria, failure modes |
| `CRITIC.md` | every module critic | calibration, the shot matrix, evidence discipline, scoring anchors, the verdict format |
| `INTEGRATOR.md` | the integrator, between waves | core-request adjudication, the seam checklist, what must stay shippable |
| `WHOLE-GAME-CRITIC.md` | the final gate | the demo city judged as a game, not as thirteen modules |
| `BLIND-JUDGE.md` | the blind judges | A/B verdicts with no knowledge of which image is ours |
| `modules/<name>.md` | one builder + one critic each | purpose, world data owned, visual target, **acceptance checklist**, budget, known failure modes, dependencies, showcase |

## The split

Role files carry everything invariant; module specs carry only what differs. Changing how *all* builders work is one
edit to `BUILDER.md`, never sixteen. The orchestrator's generated prompt is deliberately thin — it names the role
file, the module spec, the round, and the previous critic's ranked issues, and nothing else. If you find yourself
writing instructions into the orchestrator, they belong in a file here instead.

## The acceptance checklist is the contract

A module spec's numbered acceptance list is what the builder builds to and what the critic grades against. Anything
not on that list (and not in `ARCHITECTURE.md`) is a suggestion. This is what keeps a builder and a critic from
arguing past each other across four rounds.

## Blind judging

`tools/blindpairs.mjs` stages pairs for `BLIND-JUDGE.md`: both images re-encoded to identical format, resolution,
quality **and byte size**, named only `A.jpg`/`B.jpg` in `pair_NN/` directories, with a balanced, seeded assignment of
which side is ours. The answer key is written outside the directory the judge is given. A judge that can infer the
source from anything but the pixels is not a blind judge.
