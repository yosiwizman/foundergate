# Falsification / Hostile Report — P0 Core IP + Assurance

Harness: `tests/core_ip/falsification.mjs`. Every hostile input MUST fail closed (HOLD / UNKNOWN / REFUSED /
QUARANTINE / STOP / PAUSE / EXCEEDED / STALE / NONE). **No PASS/ACCEPT/OK/SEALED.** Result: **20/20 fail-closed.**

| # | Hostile input | Observed | Fail-closed? |
| ---: | --- | --- | :---: |
| 1 | producer self-reports success without evidence | HOLD_NO_EVIDENCE | ✅ |
| 2 | stale evidence used as fresh | STALE | ✅ |
| 3 | baseline missing | HOLD_NO_BASELINE | ✅ |
| 4 | no previous-version failure for discriminating test | HOLD_NOT_DISCRIMINATING | ✅ |
| 5 | acceptance attempted before verification | HOLD_UNVERIFIED | ✅ |
| 6 | mutation without post-verification | HOLD_NO_POST_VERIFICATION | ✅ |
| 7 | retry without state change | REFUSED_NO_MATERIAL_CHANGE | ✅ |
| 8 | duplicate active run | REFUSED_ADMISSION | ✅ |
| 9 | budget exceeded | EXCEEDED_FAIL_CLOSED | ✅ |
| 10 | deadline missing | HOLD_NO_DEADLINE | ✅ |
| 11 | scope expanded silently | HOLD_OUT_OF_SCOPE | ✅ |
| 12 | cancellation lost after restart | HOLD_CANCELLATION_LOST | ✅ |
| 13 | unknown environment treated as verified | HOLD_UNSEALED | ✅ |
| 14 | boundary violation ignored | QUARANTINE | ✅ |
| 15 | containment without evidence | HOLD_SHUTDOWN_WITHOUT_EVIDENCE | ✅ |
| 16 | AI confidence substituted for evidence confidence | NONE (AI confidence ignored) | ✅ |
| 17 | missing context provenance | HOLD_NO_PROVENANCE | ✅ |
| 18 | stale threat model | STALE | ✅ |
| 19 | eval leakage unchecked (no real dataset) | PLANNED_WITH_SCHEMA | ✅ |
| 20 | model rollback unqualified (real provider) | HOLD_REQUIRES_FOUNDER_GATE | ✅ |

No hostile case produced a green result. Fail-closed is the default.
