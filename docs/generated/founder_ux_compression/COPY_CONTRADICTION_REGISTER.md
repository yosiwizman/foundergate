# Copy Contradiction Register
- RESOLVED: dashboard intro "falls back to a clearly-labeled LOCAL_SIMULATION" -> removed (no simulation fallback exists; the real fallback is UNKNOWN/server-off).
- RESOLVED: dashboard footer "Start/Export work locally via LOCAL_SIMULATION" -> corrected to "real local check + real sealed export via the loopback run-server".
- CONFIRMED CLEAN: app.mjs status strings were already correct ("COMPLETE — real local run via the loopback server"); only the STATIC index.html copy was stale.
- No remaining REAL_LOCAL_RUN / LOCAL_SIMULATION contradiction (grep 0).
