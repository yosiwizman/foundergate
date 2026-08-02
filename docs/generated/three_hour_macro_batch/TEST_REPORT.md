# Test Report — 3-Hour Safe Macro-Batch
| Suite | Result |
|-------|--------|
| Founder panel self-test | ALL GREEN: 14/14 |
| Browser E2E (real chromium) | ALL GREEN: 15/15 |
| Axe accessibility (axe-core 4.12.1) | 0 violations (0 serious/critical) |
| Repeatability CI (5 runs + final 3) | deterministic; 0 flake; 0 false-green |
| Crash-test ladder (single) | 12/12 |
| Sealed-export self-test | 5/5 |
| final-head guard self-test | 7/7 |
| receipt-consistency guard self-test | 3/3 |
All green. Lane A used a locally-cached browser (no install/network/deploy).
