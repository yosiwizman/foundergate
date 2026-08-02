# Test Report — Post-Publish Verification
| Test | Result |
|------|--------|
| Public clone self-test (fresh clone) | ALL GREEN: 30/30 |
| receipt-consistency guard self-test | ALL GREEN: 3/3 |
| final-head guard self-test | ALL GREEN: 7/7 |
| Public repo dependencies | none (no install) |
| Public repo HEAD == published commit | YES (0bb2817174c9) |

All tests pass. The public artifact is independently runnable and self-verifying; FounderGate's evidence guards remain non-vacuous (their self-tests still catch injected defects).
