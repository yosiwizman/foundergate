# Move-Resilient Logging Qualification (Phase 4)

**This is a repair qualification only — NOT Level 2, NOT Level 3, NOT an endurance proof.**

Ran the corrected harness at fast cadence against a disposable run root, simulating the exact L3B failure (Desktop folder relocation) plus a forced fixed-root write failure.

## Attempt 1 — FAIL (gate did its job)
The qualification caught a real startup bug in the **new** driver: it wrote `run_root_identity.json` into the `level2-proof/` subdir before that subdir existed, so `fg_driver.sh` failed closed at startup and `timer.log` stayed empty. Monitor and ledger were already correct. **Fix:** `fg_init_root` now creates the run subdir up front. This is precisely why Part B is gated behind a short qualification.

## Attempt 2 — PASS (all checks)
| Check | Result |
|-------|--------|
| Fixed evidence root is OUTSIDE the Desktop run folder | ✅ PASS |
| monitor writes to fixed root | ✅ PASS |
| ledger writes to fixed root | ✅ PASS |
| timer writes to fixed root | ✅ PASS |
| **Moving the Desktop folder does NOT stop fixed-root logging** | ✅ PASS (monitor/ledger/timer each grew 9→17 lines *after* the move) |
| Duration proof reads fixed-root logs only | ✅ PASS |
| Fixed-root write failure → `HELD_EVIDENCE_WRITE_FAILURE` | ✅ PASS |
| Loops halt after write failure (fail-closed) | ✅ PASS (0 loops left alive) |

Fixed root used: `~/.foundergate/runs/<run_id>_QUAL/` (disposable; cleaned up after).
Unit tests: `fg_duration_classify.selftest.mjs` 13/13.

## Verdict: `MOVE_RESILIENT_LOGGING_QUALIFIED` → eligible for Phase 5 Checker.
The L3B root cause (logs die when the Desktop folder moves; timer declares a phantom completion) is now mechanically prevented.
