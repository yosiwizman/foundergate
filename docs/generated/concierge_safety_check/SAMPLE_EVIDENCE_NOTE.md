# Sample Evidence Note (SYNTHETIC dry-run)

> Illustrative shape only. Synthetic repo, no provider was run, no money spent, nothing fetched externally. The numbers below are FIXTURE values to show the format, clearly labelled SAMPLE.

**Run:** SAMPLE concierge Safety Check
**Repo:** sample-org/todo-cli (SYNTHETIC, public, non-sensitive)
**Objective:** Add input validation to `add-task`; prove existing tests still pass.
**Mode:** no-provider deterministic rehearsal (cost $0.00).

## What happened
- Isolated worktree created off a local copy of the sample repo. No push to any external repo.
- Bounded change staged to `src/add-task.js` only (within allowed paths).
- Exact SHA (SAMPLE): `sample000deadbeefsample000deadbeefsample00`.
- Changed files (SAMPLE): `src/add-task.js` (+18 / -2).

## Tests
- Full pure suite (SAMPLE): 12 / 12 pass.
- Focused suite for the change (SAMPLE): 4 / 4 pass.
- Duration (from disk logs, SAMPLE): 41s.

## Independent review
- Checker (read-only): CLEAN (SAMPLE) — change within allowed paths, no secrets, tests green.
- Gate Advisor (read-only): SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS (SAMPLE).

## Honest decision
**SUITABLE_FOR_CONCIERGE_TRIAL_WITH_LIMITS** (SAMPLE). Not "SHIP." This says: on this bounded, non-sensitive, local run the change is coherent and tests pass — it does NOT certify production readiness, security, or fitness for your production pipeline.

## Limitations
Local only; synthetic fixture; no provider ran; no production deployment; no security/compliance certification; no customer data. See SAMPLE_LIMITATIONS.md.
