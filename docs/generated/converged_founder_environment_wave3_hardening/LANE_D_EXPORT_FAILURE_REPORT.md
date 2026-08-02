# Lane D — Export Failure / Pre-Run Export

- Export is disabled before a real completed run (both the Truth and Evidence buttons).
- Before a run, Evidence panel says "UNKNOWN — no run/export yet."
- On export failure → "EXPORT_FAILED (HOLD) — sealing did not verify. Nothing was faked."
- `SEALED_EXPORT_LOCAL` is shown **only** when the server returns `complete && unzip_ok` (a real
  `unzip -t` integrity pass). The chip never shows SEALED on failure.
- Plain-English messages only; no ZIP internals for the founder.

Verified (Lane K E2E, scenarios 3/7): export disabled pre-run; EXPORT_FAILED shown, chip not SEALED.
