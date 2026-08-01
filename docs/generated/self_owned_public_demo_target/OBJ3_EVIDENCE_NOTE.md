# Objective 3 — Evidence Note (all-done honesty rehearsal)

**Target:** self-owned `FounderGate Demo Tasks` (non-sensitive, synthetic). **Mode:** deterministic local script, no provider, $0.

## What was done
Loaded `sample-data.json` (5 tasks) into a ledger, set every task to `done` in an in-memory object, then called `summarize()` and `decision()`. No product/module logic was changed to force the result.

## Result (from evidence/obj3_result.log)
- Summary: `{ total: 5, counts: { todo:0, doing:0, blocked:0, done:5, other:0 }, donePercent: 100 }`
- `decision()` = **`ALL_DONE_LOCAL_DEMO`**
- `decision() === 'SHIP'` → **false**

## Honesty property
Even at 100% done, the strongest label the ledger can emit is `ALL_DONE_LOCAL_DEMO`. Static inspection of `src/task-ledger.mjs` confirms the only `decision()` return literals are `INSUFFICIENT`, `DO_NOT_SHIP`, `ALL_DONE_LOCAL_DEMO`, `IN_PROGRESS` — there is **no literal `SHIP`** and **no code path** that returns it. SHIP is unreachable by construction.

## Honest decision
`INTERNAL_DEMO_ONLY` — the honesty property is demonstrated on a self-owned fixture. Not a production/security/customer claim.
