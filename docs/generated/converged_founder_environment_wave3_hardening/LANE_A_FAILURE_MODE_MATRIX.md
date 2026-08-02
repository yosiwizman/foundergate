# Lane A — Failure-Mode Matrix

Correct status vocabulary: **UNKNOWN** (not enough evidence) · **HOLD** (safe stop, retry/ask) ·
**ERROR** (run did not complete) · **COMPLETE** (real success). "Never happens" = no fake green,
no fake export, no stale success shown as current, no raw logs/SHA to the founder.

| # | Failure mode | Founder-visible behavior | Status | Must never happen | Change? |
| --- | --- | --- | --- | --- | --- |
| 1 | Local server off | backend UNAVAILABLE; Run disabled; chips UNKNOWN | UNKNOWN | fake green | code+test ✓ |
| 2 | Server starts late | health poll + on-click recheck re-enables Run when up | UNKNOWN→COMPLETE | stuck forever | code+test ✓ |
| 3 | /api/session fails | token retried on run; safe UNKNOWN if backend down | UNKNOWN | silent broken run | code ✓ |
| 4 | /api/start fails | ERROR message; export stays disabled | ERROR | export enabled | code+test ✓ |
| 5 | Run refused | HOLD — REFUSED (allowlist) | HOLD | run pretends success | code+test ✓ |
| 6 | Run interrupted | ERROR/HOLD; chips reset to UNKNOWN | ERROR/HOLD | stale success | code+test ✓ |
| 7 | Run timeout | HOLD — stopped safely (AbortController) | HOLD | infinite spinner | code+test ✓ |
| 8 | Export before run | Export disabled; Evidence UNKNOWN | UNKNOWN | export runs | code+test ✓ |
| 9 | Export fails | EXPORT_FAILED (HOLD); chip not SEALED | HOLD | fake SEALED | code+test ✓ |
| 10 | Unverifiable ZIP | server returns EXPORT_FAILED (unzip -t) | HOLD | SEALED without verify | already ✓ / test ✓ |
| 11 | Browser reload after run | fresh UNKNOWN; export disabled | UNKNOWN | faked prior green | test ✓ |
| 12 | Stale evidence | new run resets all panels to UNKNOWN first | UNKNOWN | old 30/30 as current | code+test ✓ |
| 13 | Panels out of order | each panel honest; no result before run | UNKNOWN | implied result | test ✓ |
| 14 | Decisions clicked | buttons disabled; "no real-world action" | VIEW ONLY | any real action | test ✓ |
| 15 | Files clicked | DISPLAY_ONLY; synthetic names | DISPLAY ONLY | real fs scan | test ✓ |
| 16 | No network | loopback-only; external calls impossible | UNKNOWN | external call | design ✓ |
| 17 | Repeated runs | 5 real runs each honest 30/30 | COMPLETE | deadlock/false green | test ✓ |
| 18 | Repeated exports | each export re-verified; no cross-run state | COMPLETE/HOLD | stale SEALED | test ✓ |
| 19 | Launcher double-click | reuse/start server, wait for health, open | COMPLETE | terminal needed | launcher ✓ |
| 20 | Evidence location unclear | plain-English receipt; "send only if asked" | COMPLETE | ZIP internals shown | help ✓ |
