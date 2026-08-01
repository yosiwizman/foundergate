# Start Flow Real Runner Status
- Real CLI runner: OPERATIONAL_LOCAL (executes real tests, binds real SHA).
- Browser Start: REAL_LOCAL (loads the CLI-produced real run) → LOCAL_SIMULATION only as a labeled fallback when no real run file exists.
- Honesty: decision never SHIP; empty/failed → INSUFFICIENT/DO_NOT_SHIP.
