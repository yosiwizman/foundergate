# Test Report — Provider Harness
| Test | Result |
| --- | --- |
| tests/provider_adapters/gated-flow.selftest.mjs | 17/17 |
| tests/repo_evidence/repo-check.selftest.mjs | 6/6 |
| run-harness matrix (4 PASS_VERIFIED / 7 hostile held/refused / private HELD) | OK |
| tests/e2e-dashboard/provider-visible-proof.mjs (HEADED) | 7/7 |
| wave11-safety-check (regression, a11y) | 14/14 |
| showroom-ui (regression) | 15/15 |
Provider claim is never PASS: honest adapters verify to OK; hostile overclaims are HOLD/REFUSED; private repo HELD.
