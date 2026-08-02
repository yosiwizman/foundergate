# Lane B — Adapter Result Normalization
Every adapter result maps to a founder-safe status with explanation, evidence status, export
eligibility, decision ceiling (INTERNAL_DEMO_ONLY, never SHIP), and next safe action:
| Status | Meaning | Evidence | Export eligible | Next action |
| --- | --- | --- | --- | --- |
| PASS | tests/fixture passed | FRESH | yes | export |
| FAIL | tests failed | UNKNOWN | no | fix or pick another |
| NO_TESTS_FOUND | no tests present | UNKNOWN | no | add tests / pick another |
| BROKEN_PROJECT | syntax/module error | UNKNOWN | no | fix or pick another |
| UNKNOWN | can't determine (missing/timeout/no python) | UNKNOWN | no | ask ChatGPT |
| HOLD_REFUSED | unknown fixture key | UNKNOWN | no | pick a safe fixture |
| UNSAFE_SOURCE_REFUSED | unsafe name, refused pre-exec | UNKNOWN | no | choose a safe fixture |
Never SHIP in any case.
