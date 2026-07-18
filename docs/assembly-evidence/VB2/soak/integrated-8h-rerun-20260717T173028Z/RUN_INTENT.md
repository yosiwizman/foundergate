# RUN_INTENT — VB2 Integrated 8h Soak, CLEAN RERUN (cross-machine parallel-lane contract)

- **Run ID:** integrated-8h-rerun-20260717T173028Z
- **Evaluated SHA (exact):** b9af1def60009ac9dae69bf519b5e0a2680d4600
- **Host:** qual-host-m1 — Apple M1, Macmini9,1, arm64, 8 GiB, macOS 26.5.2 (25F84), user macm1 (M1 qualification machine, mechanically proven)
- **Detached worktree:** /Users/macm1/Projects/foundergate-wt-vb2-integrated-8h-rerun-20260717T173028Z (HEAD detached == evaluated SHA, no branch)
- **Evidence dir:** docs/assembly-evidence/VB2/soak/integrated-8h-rerun-20260717T173028Z/ (in the detached worktree)
- **Mode:** NARROW-SENSITIVE QUALIFICATION · FAIL-CLOSED · EXACT-SHA · NO ACCEPTANCE · NO MERGE · NO GIT STATE CHANGE DURING ACTIVE RUN

## Fix vs prior NOT-PASSED run
Prior run (branch soak-evidence-vb2-integrated-8h, commit e718b93) was NOT-PASSED because a docs/evidence
checkpoint `git commit` (73e2c40) moved the active Git HEAD during the frozen window. This rerun eliminates
that failure mode: all evidence is written as UNCOMMITTED files inside a dedicated detached worktree, and NO
git state change occurs during the active window. The prior run is permanently preserved and untouched.

## Path deviation (transparent)
Contract specified worktree parent /Users/yosiwizman/Projects/. That user does not exist on this machine
(actual user macm1, home /Users/macm1). Worktree created under /Users/macm1/Projects/ instead. This changes
no qualification invariant (detached HEAD at exact SHA, isolation, no git mutation during run).

## Cross-machine isolation
Remote main advanced to e1ca1989 (Apple M4 Pro concurrent work on isolated branches/draft PRs). This M1 does
NOT fetch/pull/consume that during the run; the evaluated commit b9af1def is immutable and built from the
local object. Pro work is a separate machine and is not a quiet-host violation.

## Disk-first
RUN_LEDGER.jsonl is the append-only authority; RUN_RECOVERY_STATE.json tracks the state machine. No material
fact lives only in terminal scrollback.
