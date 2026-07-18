# VB2 INTEGRATED 8-HOUR SOAK — CLEAN RERUN RESULT (final seal from disk)

**Verdict: VB2-SOAK: PASS** — all 18 final-seal checks PASS (AND-gate), derived from disk evidence, not exit code.

| Item | Value |
|---|---|
| M1 host | qual-host-m1 · Apple M1 (Macmini9,1) · arm64 · 8 GiB · macOS 26.5.2 · user macm1 |
| Run ID | integrated-8h-rerun-20260717T173028Z |
| Evaluated SHA (exact) | b9af1def60009ac9dae69bf519b5e0a2680d4600 |
| Worktree (detached) | /Users/macm1/Projects/foundergate-wt-vb2-integrated-8h-rerun-20260717T173028Z |
| Start / End | 2026-07-17T17:37:33.708Z → 2026-07-18T01:52:33.655Z |
| Span | 8.250h (claim 8h) |
| Availability | 100.000% — 34/34 samples (ok 34 / fail 0), SLO 99% |
| Quiet-host | INTACT — 0 downgrades, 0 episodes, 0 foreign-heavy, eligible_final true |
| System sleep | 0 (driver + sentinel agree) |
| caffeinate | -dimsu, no -t; PreventSystemSleep on behalf of driver pid 8564; held every run tick |
| Frozen integrity | begin==end manifest (340 files, 098b428f…); observed HEAD == SHA on all 99 sentinel ticks |
| Lease | ACQUIRE→PREFLIGHT_PASS→ACTIVATE→RELEASE(SOAK_COMPLETE, ok:true); no override; no lock |
| Capability | launch baseline lease cap; post-release empty; no override/bypass |
| Attestation | correct anchor ACCEPTED (intact); wrong anchor REJECTED (broken-anchor) |
| Rehearsals | A (detector fires: foreign heavy + stale heartbeat) PASS; B (store path 0 / bypass 1) PASS |
| Git during active window | NONE (isolated detached worktree; fix vs prior NOT-PASSED run) |

The prior NOT-PASSED run (branch soak-evidence-vb2-integrated-8h, commit e718b93) remains permanently preserved and untouched. This rerun eliminated the prior failure (a mid-run evidence commit moved HEAD) by writing all evidence as uncommitted files in a dedicated detached worktree with zero git operations during the 8h window.
