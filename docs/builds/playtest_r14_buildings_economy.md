# Human playtest R14 — building continuity, demand and loans

Date: 2026-09-12

## Player defects

- Completed buildings repeatedly disappeared and returned while nearby buildings changed construction phase.
- Painted zoning could remain empty without explaining that its land-use demand was low.
- Statistics exposed only a net balance, so a losing city did not show which systems caused the deficit.
- Hamlet displayed a fixed **Take loan ¢50,000** action even though its milestone loan capacity is ¢30,000. Simulation rejected the request, while UI still reported **Loan requested**.

## Bounded changes

- Buildings now choose the current distance LOD in the same frame that a dirty chunk is rebuilt. This preserves the chunk owner, meshes, construction timing and LOD thresholds while removing the invisible interval.
- The zoning panel and RCI tooltip now state the live demand percentage and whether each zone type is high, active or low. They explicitly explain that low-demand painted zones wait.
- Statistics now separates income and expenses into their existing Simulation-owned terms. A deficit or negative treasury identifies the largest current cost and explains that loans add repayments.
- The loan offer uses the remaining milestone capacity. Loan actions now publish an immediate approved or refused result, and Statistics shows outstanding debt, payment per day and available credit.

No tuning constants, tax calculation, upkeep, growth, construction timing, coverage, deterministic RNG, save schema or owner contract changed.

## Verification

- `npm run build`: PASS, 164 modules.
- `src/modules/simulation/selftest.mjs`: deterministic 90-day repeat and exact save/load PASS; scheduled loan repayment PASS.
- `tools/building-blink-probe.mjs`: forced a real building update and inspected its rebuilt chunk over 16 consecutive rendered frames; exactly one LOD stayed visible in every frame, `blankFrames=0`, errors=0.
- `tools/loan-ux-probe.mjs`: Hamlet offered ¢30,000; click changed treasury ¢150,000→¢180,000; recorded ¢32,400 debt and ¢1,080/day for 30 days; a second request above remaining capacity changed neither money nor loans and returned the reason. Save/load restored money and debt exactly. Page errors=0.
- Economy screenshot inspected at `shots/playtest-fixes-r14/economy-loan.png`.

## Limits

The loan is short-term liquidity, not a bailout: a city already losing ¢675/day will lose more while paying the loan. This round improves truthful feedback and diagnosis; it does not introduce a bankruptcy/recovery game state or rebalance the player's current road network. Human replay remains required for pacing and clarity.
