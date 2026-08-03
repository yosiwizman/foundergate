# Lane G — False-Green Regression Report
Automated campaign: tests/local_app_factory/false-green-regression.mjs → **11/11 PASS**.
| # | Guard | Result |
| --- | --- | --- |
| 1 | Request A never previews app B (each preview_url bound to its own request_id) | PASS |
| 2-4 | Unsupported/held requests → not SUPPORTED, no artifact (no DONE/PASS/preview) | PASS |
| 5 | Absent app has no manifest → UI shows UNKNOWN, not green | PASS |
| 6 | A deliberately-failing test never yields ALL GREEN/PASS (fails closed) | PASS |
| 7-8 | preview_url + request_hash match each app's manifest | PASS |
| 9 | No factory app previews the stale Wave 9 planner | PASS |
| 10 | Builder-written manifests carry PENDING checker verdict (no self-certification) | PASS |

Additional live regression: a real bug WAS found and fixed during this run — the generated budget/inventory/
notes aggregate line used a `data-testid` element with no `id`, so the aggregate silently stayed 0 while the
list rendered (visible in the first browser pass). This was a genuine defect surfaced by visible-browser proof,
corrected in the archetype library (added ids), and re-verified (Net:60 etc.). Failure was not hidden.
