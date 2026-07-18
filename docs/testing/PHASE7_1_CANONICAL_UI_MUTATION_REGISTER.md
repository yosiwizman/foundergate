# Phase 7.1-Q Mutation Register (guard-fires map)

Controlled mutations and the guard/test that fails on each (no test was weakened to obtain green):
1 old-UI-as-canonical → only neutral-first served · 2 completed-before-run → /api/state NEUTRAL ·
3 result-without-run-id → run_id required · 4/5 wrong repo/commit binding → result carries repo+commit ·
6 stale-as-current → stale storage ignored · 7 cleanup-before-proof → teardown gate · 8 missing cleanup →
teardown_complete false · 9 missing Evidence Pack → pack gated on complete+teardown · 10 corrupted pack
hash → evidence sha256 verify (TBF validate_evidence) · 11/12 stale/unrelated PID → launcher identity +
--stop · 13 other-worktree :4700 → UNKNOWN_SERVICE fail-closed · 14 noncanonical health → identity match
required · 15 mixed-version assets → single canonical service_entry · 16 stale storage → ignored ·
17 crash during run → readRun re-derives from disk ledger · 18 refresh during run → RUNNING shows pending,
not success · 19 duplicate check → one-job lock (activeRun→HELD) · 20 duplicate launcher → ALREADY_UP same
PID · 21 provider unavailable → run FAILED shows no success · 22 orphan VM → teardown/destroy stage +
no-lingering scan · 23 backend failure green UI → results gated on COMPLETE · 24 fabricated witness-ready →
TBF derived-only (rejected) · 25 fabricated merge-ready → TBF merge validator.
Mechanized subset proven by: tools/qual/qualification.selftest.mjs, tools/macos/launcher.test.sh,
tools/policy/test_tbf_mutation.py; remainder mapped to existing guards above.
