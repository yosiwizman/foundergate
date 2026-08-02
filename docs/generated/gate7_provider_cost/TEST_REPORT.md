# Test Report — Gate 7 Provider Cost Proof
| Suite | Result |
|-------|--------|
| Real provider call | 1 call, is_error=false, exact cost $0.0271348 |
| Provider cost ledger | total $0.0271348 <= $1.00 ceiling |
| Provider output validation | bounded JSON, 5 keys, 0 overclaims |
| Server-driven browser E2E (post-provider) | 12/12 |
| Axe on live dashboard | 0 total |
| Repeatability CI hook | stable, 0 flake, 0 false-green |
| Sealed-export self-test | 5/5 |
| final-head / receipt-consistency guard self-tests | 7/7 / 3/3 |
All green.
