# TEST_REPORT — End-to-End Local Operator Loop
end-to-end loop `tests/e2e-dashboard/end2end-loop.mjs`: 27/27 GREEN.
Wave 3 hardening `wave3-hardening.mjs`: 32/32 GREEN. Wave 2 `wave2-capture.mjs`: 24/24 GREEN.
Green paths use the real local backend (real /api/start + /api/export, SEALED_EXPORT_LOCAL,
unzip-verified). Unsafe source/objective refused client-side; failures simulated via non-destructive
route interception. axe 0 serious/critical across 7 panels. No fake green / export / stale evidence.
