# P1 Falsification / Hostile Report

Harness: `tests/assurance_core/falsification.mjs`. Every hostile input MUST fail closed (HOLD / UNKNOWN / REFUSED /
EXCEEDED_FAIL_CLOSED). **No PASS is permitted.** Result: **12/12 fail-closed, 0 PASS.**

| # | Hostile input | Observed | Fail-closed? |
| ---: | --- | --- | :---: |
| 1 | missing runtime manifest | HOLD | ✅ |
| 2 | stale context snapshot (content mutated) | HOLD | ✅ |
| 3 | changed config fingerprint (tamper) | HOLD | ✅ |
| 4 | unknown scan completeness | UNKNOWN | ✅ |
| 5 | provider self-certification attempt | HOLD_REQUIRES_FOUNDER_GATE | ✅ |
| 6 | missing function preservation record | HOLD_MISSING | ✅ |
| 7 | security patch accepted without validation | HOLD | ✅ |
| 8 | risk budget exceeded | EXCEEDED_FAIL_CLOSED | ✅ |
| 9 | tool capability unknown | HOLD | ✅ |
| 10 | MCP capability unknown | HOLD | ✅ |
| 11 | real provider enabled in config | HOLD | ✅ |
| 12 | protected action requested (Gate 8) | REFUSED | ✅ |

No hostile case produced PASS/OK/SAFE/QUALIFIED-real. Fail-closed is the default.
