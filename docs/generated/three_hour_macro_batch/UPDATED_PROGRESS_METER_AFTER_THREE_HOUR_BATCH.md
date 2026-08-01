# Updated Progress Meter — AFTER Three-Hour Batch
| Capability | Label |
|-----------|-------|
| Real local runner (CLI) | OPERATIONAL_LOCAL (executes real tests + real SHA; never SHIP) |
| Founder dashboard Start | REAL_LOCAL (browser loads the real CLI run) with LOCAL_SIMULATION fallback |
| Real sealed export | SEALED_EXPORT_LOCAL (real ZIP via CLI: SHA256SUMS + ditto + unzip -t) |
| Founder dashboard Export | LOCAL_EXPORT JSON (browser) + SEALED_EXPORT_LOCAL (CLI) |
| No-terminal founder loop | PARTIAL_WITH_LIMITS → strong (browser loads REAL run; one operator CLI command produces it) |
| Non-developer operator dashboard | PARTIAL_WITH_LIMITS (real values shown; browser can't spawn the runner) |
| Evidence viewer | REAL_LOCAL (shows real commit/tests/decision) |
| Developer/reviewer expanded view | READY_WITH_LIMITS (bound to real 33-package index, read-only) |
| Repeatability execution | EXECUTED (22/22 + crash 5/5 + 5 soak cycles, 0 RED) |
| Public demo readiness | READY_WITH_LIMITS (clean, 30/30; publish = founder gate) |
| Cross-account AKIOR proof | PREP_READY_FOR_FOUNDER_GATE |
| Beta spine | FREEZE_CANDIDATE_READY_FOR_FOUNDER_GATE |
| Investor/commercial foundation | REFINED_WITH_LIMITS (no overclaim) |
| SaaS foundation | NOT_STARTED (gap map only) / BLOCKED_BY_FOUNDER_GATE for readiness |
| Protected founder gates | ALL INTACT (none crossed) |
| Market validation / paid customers | DEFERRED (not a blocker for Gates 1-7) |
