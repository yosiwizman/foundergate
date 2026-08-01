# Demo Objectives — three future FounderGate check targets

Each is a small, bounded objective a FounderGate Safety Check could be run against on THIS self-owned repo. None require a prospect, provider spend (unless the founder later authorizes a bounded real run), network, or sensitive data.

## Objective 1 — Small bug fix
**Task:** `summarize()` should treat an unknown status defensively. Add a guard so a task with a status outside `STATUSES` is counted under a new `other` bucket instead of being silently dropped, and cover it with a test.
- Bounded to `src/task-ledger.mjs` + `tests/`.
- Success = new test passes, existing 24 still green.
- Expected honest decision label: `SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS` (local).

## Objective 2 — Small feature
**Task:** add `removeTask(ledger, id)` that removes a task by id (throwing on unknown id) and renumbers nothing (ids stay stable). Add tests for success + unknown-id.
- Bounded to `src/task-ledger.mjs` + `tests/`.
- Success = feature works, tests green, CLI still runs.

## Objective 3 — Evidence / decision-package check
**Task:** produce an evidence note + decision package for a run that sets all sample tasks to `done`, and confirm `decision()` returns `ALL_DONE_LOCAL_DEMO` (never `SHIP`). Verify the honesty property holds.
- This exercises FounderGate's evidence-note + honest-decision discipline end to end on a self-owned target.

Each objective is intentionally tiny so an honest "do-not-ship / insufficient" is a valid, low-stakes outcome.


> Label note: `SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS` / `INTERNAL_DEMO_ONLY` are **concierge-process decision labels** an operator assigns to a Safety Check run — they are NOT outputs of this module's `decision()` function (which returns only `INSUFFICIENT` / `DO_NOT_SHIP` / `IN_PROGRESS` / `ALL_DONE_LOCAL_DEMO`, never SHIP).
