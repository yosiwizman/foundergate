# VB2 M1 Soak — Pro-Side Ingest & Verification (no M1 contact; read from published origin branch)

**Verdict from raw evidence:** VB2-SOAK: PASS (18/18 AND-gate, derived from disk, not exit code).
- Evidence branch: soak-evidence-vb2-integrated-8h-rerun-20260717T173028Z
- Evidence commit: `68cb1fa76c12fc57507d6dc36389c85f2c48f17a` · Parent (evaluated SHA): `b9af1def60009ac9dae69bf519b5e0a2680d4600`
- Commit is exactly ONE evidence-publication commit above the evaluated parent; diff = 47 files, all under `docs/assembly-evidence/VB2/soak/integrated-8h-rerun-20260717T173028Z/` (evidence-only; the .mjs files are captured soak-harness artifacts, not product code). No source/policy/product/workflow code changed.
- Qualification run ID: integrated-8h-rerun-20260717T173028Z · Driver/lease run ID: run_f3124ace-e39f-4d52-9e46-1dc5b2f1e1b1
- Evaluated SHA b9af1def = "Merge PR #149 lane-a-vb2-build" — an ancestor of current main AND the cumulative head.
- Span 8.25h (29700s ≥ 28800s claim). Availability 100% (34/34, SLO 99%). Quiet-host INTACT (0 downgrades). System sleep 0. caffeinate held every tick. begin==end freeze manifest (340 files, 098b428f…). Observed HEAD == SHA on all 99 sentinel ticks. Lease ACQUIRE→PREFLIGHT_PASS→ACTIVATE→RELEASE(ok). Capability lifecycle clean. Attestation: correct anchor ACCEPTED (intact), wrong anchor REJECTED (broken-anchor). Rehearsals A/B PASS. **Git during active window: NONE** (isolated detached worktree — the fix vs the prior NOT-PASSED run).
- Prior NOT-PASSED run (branch soak-evidence-vb2-integrated-8h, commit e718b93) preserved untouched.
