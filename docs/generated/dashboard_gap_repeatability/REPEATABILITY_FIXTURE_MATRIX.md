# Repeatability Fixture Matrix (synthetic, executable)
| # | Fixture | Real check used | Expected verdict | Expected reason | Safe behavior proven |
|---|---------|-----------------|------------------|-----------------|----------------------|
| 01 | clean receipt | final-head guard (real) | PASS | all bindings match | clean passes |
| 02 | stale final-head | final-head guard (real) | FAIL | evidence/final_head.txt != head | stale caught |
| 03 | stale metric out_of_path=2 | receipt-consistency guard (real) | FAIL | stale metric detected | stale metric caught |
| 04 | missing evidence file | final-head guard (real) | FAIL | final_head.txt absent | missing input caught |
| 05 | corrupted SHA256SUMS | shasum -c | FAIL | checksum mismatch | tamper caught |
| 06 | truncated ZIP | unzip -t | FAIL | archive invalid | corruption caught |
| 07 | broken freeze manifest | shasum -c FREEZE_MANIFEST | FAIL | file changed after freeze | tamper caught |
| 08 | wrong-account | account exact-match | HOLD | expected != actual | no substitution; HOLD |
| 09 | no-network (offline) | offline gate | HOLD | cannot verify remotely | HOLD not fake pass |
| 10 | secret-like token | secret scan | REFUSED | token pattern present | refuse to proceed |
| 11 | overclaim text | overclaim scan | FAIL | positive overclaim asserted | caught |
| 12 | unsafe action requested | forbidden-type refuser | REFUSED | delete/deploy/push/etc. | refused |
Rule proven: NO defect fixture may return PASS (false-green tripwire asserts count == 0).
