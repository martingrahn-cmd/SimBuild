# Human playtest R17 — budget crisis and recovery

Date: 2026-09-18

## Problem

A city could remain below zero with a continuing deficit indefinitely. Purchases were blocked and the budget explained the loss, but the simulation had no formal crisis, consequence or recovery state.

## Bounded change

- A negative treasury with a negative daily balance now records consecutive losing budget closes. The first close is a warning; the third enters **Budget crisis**. A sufficiently deep deficit also enters crisis immediately.
- Statistics displays Stable, Deficit warning, Budget crisis or Recovery and explains the current path.
- During crisis, the player may start one explicit emergency recovery plan. It consolidates existing debt and the overdraft, borrows visible working capital, adds 12% total restructuring interest over 90 days, raises tax to at least 12% and applies a five-point happiness cost.
- The plan never erases debt or adds hidden cash. Another restructuring is unavailable until the recovery loan is repaid.
- Three consecutive solvent closes complete Recovery. All counters, debt kind and state are deterministic and save with Simulation.
- Saves without the new optional financial object restore as Stable.

## Verification

- Production build: PASS, 164 modules.
- Simulation 90-day self-test: deterministic same-seed replay and exact mid-run save/load PASS.
- `tools/financial-recovery-probe.mjs`: warning → warning → crisis; debt covers the old overdraft plus working capital; exact restore and one-day continuation; legacy payload restore; real Statistics action and notification; zero runtime errors — PASS.
- `tools/save-atomicity-probe.mjs`: injected late Transit refusal restores all 14 module payloads, time, camera and terrain exactly; subsequent valid restore PASS.
- Inspected `budget-crisis.png` and `budget-recovery.png`; the state, explanation, action, tax, treasury and notification are legible.

## Limits

The exact previously reported hosted Slot 1 payload remains unavailable. This round verifies current rollback and legacy Simulation payloads but does not claim a cloud revision history. The recovery terms are deterministic and internally consistent; their long-form player feel still needs playtesting. Critic scores remain unchanged.
