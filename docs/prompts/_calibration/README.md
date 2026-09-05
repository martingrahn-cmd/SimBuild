# Calibration fixtures

`weak-props.md` is a deliberately weak module spec: correct section structure, zero numbers, no verification method,
no blast radius — a textbook `5` by `PROMPT-STANDARD.md`, and in practice it scores **4**.

**Every batch that scores prompts must include it, unlabelled, among the documents being scored.** If it comes back
above 5, that reviewer is not measuring anything and its scores must be discarded — including the scores it gave the
real documents. Measured result 2026-09-05: weak control 4.0/4.0, real specs 9.3/9.3/9.3/9.0 — a 5.2-point
discrimination gap, so that batch's scores were trustworthy.
