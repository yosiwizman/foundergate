# Checker Report — Independent Read-Only (Task-Planner NL Matcher)
| # | Check | Result |
| --- | --- | --- |
| 1 | "build to do app" + to-do/todo/task list/checklist → task_planner | PASS |
| 2 | binding.selftest 22/22 incl. FOUNDER_BLIND_REGRESSION_TO_DO_APP_MUST_BIND_TO_TASK_PLANNER | PASS |
| 3 | calculator still → calculator (MATCH_ORDER: calculator before task_planner) | PASS |
| 4 | real reminders+calendar → UNSUPPORTED; reminder emails → UNSUPPORTED; deploy → HELD; PR#200 → HELD | PASS |
| 5 | unrelated ("social network") → UNSUPPORTED | PASS |
| 6 | e2e task-planner-nl-matcher 11/11; unsafe/unrelated show no DONE/PASS (no false-green) | PASS |
| 7 | Change limited to template-registry.mjs (regex) + tests + docs; GATE/REFUSE run BEFORE match so guards can't be bypassed; deploy/billing strings are guard patterns, not actions | PASS |
| 8 | main untouched (65fd01669f80); PR #200 untouched (OPEN/draft/7d865fe61e3a) | PASS |
| 9 | Gate 8 remains blocked | PASS |

**CHECKER_VERDICT: CLEAN_WITH_LIMITS** — narrow matcher broadening; safety guards intact and precede the match; no false-green, no protected mutation, Gate 8 blocked.
