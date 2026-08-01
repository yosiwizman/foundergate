# Objective 2 — Evidence Note (removeTask)
**Target:** self-owned FounderGate Demo Tasks. **Mode:** deterministic, no provider, $0.
## What changed
Added `removeTask(ledger, id)` to `src/task-ledger.mjs`: finds the task by id, throws `no task with id <id>` if absent, splices it out, and returns the removed task. Remaining ids are NOT renumbered and `ledger.seq` is untouched (so the next added task keeps a fresh incrementing id).
## Tests (3 added)
1. removes the requested task (and leaves others).
2. throws on unknown id.
3. does not renumber remaining ids (after removing the middle of a/b/c, ids stay [1,3] and the next add is 4).
## Result
Demo self-test 30/30; full suite 117/117; CLI still runs.
## Honest decision
`INTERNAL_DEMO_ONLY` — feature works on a self-owned fixture. Not a production/security/customer claim.
