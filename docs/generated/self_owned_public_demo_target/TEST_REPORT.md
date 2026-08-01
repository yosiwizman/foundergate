# Test & Scan Report — Self-Owned Public Demo Target

| Check | Result | Classification |
|-------|--------|----------------|
| Demo target self-test (`node tests/task-ledger.selftest.mjs`) | 24 / 24 green | DEMO_SUITE_PASS |
| CLI smoke (`node cli.mjs`) | runs; honest IN_PROGRESS on sample | CLI_SMOKE_PASS |
| Full FounderGate suite (regression) | 117 / 117 green | FULL_SUITE_PASS |
| Secret scan (real token shapes) | 0 | SECRET_SCAN_PASS |
| Network usage in code | 0 | NETWORK_SCAN_PASS |
| External dependencies | 0 | ZERO_DEP_PASS |
| Forbidden-claim positive-assertion scan | 0 | CLAIM_DISCIPLINE_PASS |
| Provider invocations / spend / contact / deploy (this op) | 0 / $0 / 0 / 0 | NO_PROVIDER_NO_SPEND_NO_CONTACT_PASS |

Honesty property under test: `decision()` never returns "SHIP" — the strongest local label is ALL_DONE_LOCAL_DEMO (asserted by the suite).
