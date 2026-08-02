# Crash-Test Execution Report
Executed tests/repeatability/ladder-runner.mjs.
- 01 clean → PASS (real final-head guard).
- 02 stale final-head, 03 stale metric, 04 missing file → FAIL (real guards).
- 05 corrupted sums, 06 truncated zip, 07 broken freeze → FAIL (real shasum/unzip).
- 08 wrong-account, 09 offline → HOLD.
- 10 secret token, 12 unsafe action → REFUSED. 11 overclaim → FAIL.
Total: 12/12 as expected; exit 0.
