# Lane A — Public Demo Cleanup Candidate — Report

## Plan → executed
Build a clean, publish-ready candidate for the self-owned demo (from the publish-readiness audit's fix list) WITHOUT publishing. The candidate lives at `publish_candidates/self_owned_demo_repo/` — separate from any audited/live target, so no shared-file conflict.

## What was done (all fix-list items exhausted)
1. **Internal docs excluded** — the candidate contains NO `FUTURE_PUBLIC_REPO_PLAN.md` / `SAFETY_CHECK_REHEARSAL.md` / internal strategy notes.
2. **Neutral README** — describes the module on its own terms; the "no design partner" line and FounderGate sales framing are gone (internal-ref scan = 0).
3. **Stale test count fixed** — README states 30 tests / "ALL GREEN: 30/30" (stale "24" scan = 0).
4. **LICENSE added** — MIT, matching package.json.
5. **.gitignore added** — node_modules/, *.log, .DS_Store.
6. **KNOWN_LIMITATIONS.md kept** — neutral, honest (not production/secure/compliant).

## Tests & scans
- Candidate self-test: **30/30 green** (`evidence/laneA_selftest.log`).
- CLI smoke: runs.
- Sensitivity: secret 0 · network 0 · dependencies 0 · internal-refs 0 · stale-24 0 · LICENSE present · .gitignore present.

## Verdict
**READY_AFTER_FIXES → now READY_WITH_LIMITS as a candidate.** The candidate is clean and safe to publish as an internal-demo-grade repo. Publishing itself remains a TRUE FOUNDER GATE — not done here.

## Changed files (Lane A)
publish_candidates/self_owned_demo_repo/{src/task-ledger.mjs, cli.mjs, sample-data.json, package.json, LICENSE, .gitignore, README.md, KNOWN_LIMITATIONS.md, tests/task-ledger.selftest.mjs}; docs/generated/public_demo_cleanup/*.

## Limitations
Internal-demo grade; not production/customer-ready/secure/compliant. A publish action, repo creation, and any external step remain founder gates.

## Next safe action
Founder decision: publish this candidate under your own account as a NEW repo (see PUBLISH_DECISION_BUNDLE.md). Nothing here publishes.
