# FFS-1 Test Matrix
| Obligation | Evidence | Result |
|---|---|---|
| foreground_founder_surface VERIFIED | docs/testing/evidence/foreground-founder-surface/{RESULT,WINDOW_VISIBILITY,WINDOW_TIMELINE,DOM_ACTIONS,SCREENSHOT_INDEX}.json + screenshots/ + video/ + trace/ + console/network/page-errors + downloads/ | PASS (FOREGROUND_TEST_VERIFIED) |
| real launcher + Google Chrome + frontmost + onscreen + not minimized | RESULT.json + WINDOW_TIMELINE.jsonl (frontmost Google Chrome, 1 window, bounds 100,80,1320,940) | PASS |
| DOM-driven download (no API substitution) | DOM_ACTIONS.jsonl (#pack-dl click) + downloads/evidence-pack-sc-15f0cfc5.zip | PASS |
| completion invariant | src/safety_check/completion-invariant.selftest.mjs (UNKNOWN/CORRUPT pack blocks acceptance) | PASS |
| Evidence Pack recovery | docs/assembly-evidence/SAFETY_CHECK/sc-15f0cfc5/EVIDENCE_PACK (regenerated, hash-verified) | PASS |
| policy mutation proofs | tools/policy/test_ffs_mutation.py (20 + baseline) | 22/22 PASS |
| headless exact-SHA CI (separate) | tbf1-policy + phase7-1 CI at qual head | (see CI) |
