# FounderGate Level-4 Eight-Hour Endurance Proof (ChatGPT review package)
When: 2026-07-31 08:55 EDT · **Final status: LEVEL4_EIGHT_HOUR_PROVEN_READY_FOR_OVERNIGHT_WIDE_BUILD_GATE**

An actual eight-hour unattended endurance run was PROVEN from disk (monitor 481.8 / ledger 482.4 min, 482/483 continuous samples) using the move-resilient, fail-closed harness. Run-to was 482 min so both spans clear the 480-min bar (the boundary lesson learned at Level 3).

## Read order
1. FINAL_STATUS.md — verdict + honest scope.
2. reports/LEVEL4_EIGHT_HOUR_PROOF.md — the proof from disk.
3. reports/CHECKER_LEVEL4_REPORT.md + reports/GATE_ADVISOR_REPORT.md — independent reviews.
4. evidence/processes/liveness_120/240/360/450min.txt — automated midpoint liveness records.
5. reports/BACKUP_SYNC_REPORT.md — non-main backup, no PR/merge.
6. evidence/ (JSON + raw logs) · scripts/ (harness) · FINAL_VERDICT.json.

## Method / honesty
Duration is decided only by the classifier over monitor+ledger disk timestamps; a completed timer is never a pass, and any evidence-write failure fails closed to HELD. PASS required BOTH spans >= 480 min. SHA256SUMS.txt covers every file.

## Boundaries
0 provider invocations · no external sends · no customer data · origin/main unchanged · PRs 200/201/202 untouched · no PR/merge/mark-ready · no product mutation. An overnight wide-build wave is the next rung but requires explicit founder authorization (product mutation + provider spend).
