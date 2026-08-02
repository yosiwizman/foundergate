# E2E Test Report
- local-product-loop.mjs: 18/18 (batch, run history, local ledger, synthetic protected-files, a11y)
- end2end-loop.mjs: 27/27 (intake, classification, governed run, refusals, evidence)
- wave3-hardening.mjs: 32/32 (failure modes)
- wave2-capture.mjs: 24/24 (multi-panel, real backend)
Total: 101 checks GREEN. axe 0 serious/critical across all panels. fg.css byte-identical (no third UI).
Green paths use the real local backend (real /api/start + /api/export, unzip-verified). Unsafe cases
refused client-side; failures simulated via non-destructive route interception.
