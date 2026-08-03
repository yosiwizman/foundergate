# Checker Report — Independent Read-Only (Adoption Matrix + P1 Assurance Core)
| # | Check | Result |
| --- | --- | --- |
| 1 | 160 items accounted for (exactly 160 numbered rows; provenance honest: P1 verbatim, P2–P10 derived/pending, none passed off as founder-supplied) | PASS |
| 2 | P1 not overclaimed (19 INTEGRATED + 1 PARTIAL; Evaluation Dataset Governance = PLANNED_WITH_SCHEMA; not 20/20) | PASS |
| 3 | Assurance Core evidence exists (assurance-core.mjs; self-test ALL GREEN 18/18; falsification ALL FAIL-CLOSED 12/12, 0 PASS; evidence JSON + 6 screenshots) | PASS |
| 4 | Missing/partial honestly labeled (PARTIAL 29, NOT_YET 34, BLOCKED_BY_FOUNDER_GATE 13, COMMERCIAL_FUTURE 19 present) | PASS |
| 5 | Hostile falsification fails closed (every case HOLD/EXCEEDED_FAIL_CLOSED/REFUSED; 0 PASS) | PASS |
| 6 | No real provider / private repo / deploy / bill / contact / customer data (only a FORBIDDEN_ACTIONS deny-list + AC_STAMP deterministic timestamp; no fetch/HTTP/keys) | PASS |
| 7 | No PR #200 / protected-main mutation (origin/main == 65fd01669f80…; PR #200 OPEN/draft untouched) | PASS |
| 8 | No overclaim (claim-blocker: files_scanned 10, violations [], clean true) | PASS |

Noted honestly: this run is NOT strictly docs-only — it modified 2 tracked demo UI files (app.mjs, index.html) plus new
local assurance assets/tests/module. All changes are local UI/logic wiring for the Assurance Core panel; no provider/
deploy/network activation and no main/PR mutation. Verification is point-in-time; the harness is the run's own deterministic local suite.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
