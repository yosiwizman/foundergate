# TEST_REPORT — Wave 3 Hardening

Wave 3 E2E (`tests/e2e-dashboard/wave3-hardening.mjs`): **32/32 GREEN**.
Covers: normal run/export (30/30, never SHIP, real SEALED_EXPORT_LOCAL); server-off → UNKNOWN + Run
disabled; export-before-run disabled; run failure (ERROR); run refused (HOLD); run timeout (HOLD);
export failure (EXPORT_FAILED, chip not SEALED); browser reload → UNKNOWN; stale-green guard;
5-run repeatability; navigation misuse (Decisions no-op, Files DISPLAY_ONLY, Ask Guide static);
no raw logs / no full 40-char SHA in founder view; axe 0 serious/critical across 7 panels.
Failures are simulated via non-destructive route interception; the real backend served the
green / multi-run / real-export paths. Wave 2 E2E (`wave2-capture.mjs`) remains available.
