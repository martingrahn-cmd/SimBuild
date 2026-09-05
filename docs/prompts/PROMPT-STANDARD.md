# The prompt standard

Every prompt in this repo — the ones a human writes and the ones an orchestrator generates for a subagent — is held
to the same bar as the original project brief. A prompt is a specification, and a vague specification produces vague
work no matter how good the agent is. This file is the rubric. `docs/prompts/*.md` are scored against it, and so is
any new prompt added later.

## The ten properties

1. **Sequenced.** State what must exist before the work starts and what must exist before it is called done.
   Nothing begins before its prerequisite ("architecture first", "verification loop before the game").
2. **Falsifiable.** Every claim the agent may make must have a named way to check it.
   *No agent may claim anything it has not screenshotted and looked at.* Applies to prompts too: if the prompt asks
   for something unobservable, either give it an observation method or cut it.
3. **Numeric.** Adjectives are not requirements. `≥ 50 fps at 1080p`, `≤ 1500 draw calls`, `pass = ≥ 8.5`, `4 rounds`,
   `≤ 2 ms per module per frame`. If a number cannot be measured in this environment, say so explicitly and name what
   stands in for it (here: SwiftShader fps is relative only; draw calls and triangles are absolute).
4. **Anchored.** Any scale gets worked examples at its anchor points: `10 = indistinguishable from CS2,
   8.5 = AAA with nits, 7 = good indie, 5 = programmer art, 3 = broken`. A scale without anchors is a mood.
5. **Bounded blast radius.** Name exactly which files the agent may write, and what it must route through someone else.
   One folder per builder; core changes go through the integrator as a written request.
6. **Anti-inflation.** Require the honest number, the failed round and the missing piece, by name.
   *Never inflate. If it is a 6, say 6.* Self-assessment without this clause reliably drifts upward.
7. **Autonomous.** Ban clarifying questions, require stated assumptions instead:
   *Make routine decisions yourself, state your assumptions, keep going.* An agent that stops to ask has failed the task.
8. **Liveness-aware.** Name the shared resources the agent must not break: the dev server stays up, other agents are
   screenshotting the same app, the repo must stay loadable at every commit.
9. **Resumable.** Say where state is persisted and how the next iteration picks it up, so a killed run costs one round
   and not the project (`docs/STATUS.json`, `docs/builds/`, `docs/critic/`).
10. **Negatively specified.** The memorable prohibition does more work than ten positive adjectives.
    *Never programmer art.* List the specific failure modes already seen, so they cannot recur silently.

## Scoring a prompt (0–10)

| Score | Meaning |
|---|---|
| 10 | All ten properties, every requirement measurable, failure modes enumerated, nothing an agent could reasonably misread |
| 8.5 | **Pass.** All ten present; one or two requirements still lean on judgement where a number was available |
| 7 | Clear and actionable, but success criteria are partly subjective; an agent could hand back weak work and be technically compliant |
| 5 | A description of a wish. No numbers, no verification, no blast radius |
| 3 | Ambiguous enough that two competent agents would build different things |

Pass = **≥ 8.5**, same as the modules themselves.

## Rules for module specs specifically

A module spec (`docs/prompts/modules/<name>.md`) must contain, in this order:

1. **Purpose** — one sentence: what the game loses if this module is missing.
2. **World data owned** — the exact `world.<section>` fields and functions it must implement, and the events it emits.
   Copy the signatures from ARCHITECTURE §3; do not paraphrase them.
3. **Visual/behavioural target** — what it must look or feel like, referenced to a named CS2 reference image where one
   exists (`docs/reference/CS2-LOOK.md`, `$REF/cs2_*.jpg`), described in terms an art director can check in a screenshot.
4. **Acceptance criteria** — a numbered checklist, each item observable in a screenshot, a JSON log, or a page-evaluate
   probe. This is what the critic grades against; if it is not on this list it is not required.
5. **Budget** — draw calls, triangles, per-frame ms, texture memory.
6. **Known failure modes** — the specific things that went wrong in earlier rounds of this module or its neighbours,
   so they are not rediscovered at the cost of a round.
7. **Dependencies and their real APIs** — which modules it may call, and the exact functions, so nothing is invented.
8. **Showcase** — what the module's own staged scene must contain and which camera presets it must declare, remembering
   that critics shoot aerial/street/skyline/closeup at 12 and 22 plus golden hour.

## Rules for role prompts

Role prompts (`BUILDER.md`, `CRITIC.md`, `INTEGRATOR.md`, `WHOLE-GAME-CRITIC.md`, `BLIND-JUDGE.md`) carry everything
that is invariant across modules; module specs carry only what differs. A change to how all builders work is a change
to `BUILDER.md`, never sixteen edits. The orchestrator's generated prompt is thin: it names the role file, the module
spec, the round number, and the previous critic's ranked issues — nothing else.
