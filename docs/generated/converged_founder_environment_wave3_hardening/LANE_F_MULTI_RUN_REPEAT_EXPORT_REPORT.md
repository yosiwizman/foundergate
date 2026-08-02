# Lane F — Multi-Run / Repeat Export Stability

- 5 consecutive real runs each produce an honest 30/30 (no deadlock, no false green).
- Each run calls `resetRunState()` first, so no stale success or stale export state crosses between
  runs. Evidence freshness updates honestly (UNKNOWN → FRESH → SEALED per real run/export).
- No UI deadlock; Run re-enables after each run (subject to health).
- No raw logs / full SHA appear in the founder view.

Verified (Lane K E2E, scenarios 9/10): stale-green guard (prior 30/30 cleared to UNKNOWN on a new
failing run) and 5-run repeatability both pass.
