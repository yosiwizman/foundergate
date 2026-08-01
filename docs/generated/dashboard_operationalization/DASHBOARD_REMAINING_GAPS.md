# Dashboard Remaining Gaps (safe local follow-ons, not founder gates)
1. Replace LOCAL_SIMULATION with a real deterministic-runner endpoint (a small local Node run-server) so Start binds a real SHA + real test run.
2. Wire Export to the real sealed-package builder (SHA256SUMS + ditto) — needs a local packaging endpoint, not a browser.
3. Bind evidence freshness/commit to actual run artifacts.
These are safe, local, reversible; each is a candidate for a later run. None is a founder gate.
