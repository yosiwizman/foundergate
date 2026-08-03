# Lane H — Longer Local Matrix Run
- Adapter matrix (17 fixtures) covering all supported adapters + runtime-missing + dependency-missing
  + unsafe/refused + monorepo, with a real aggregated batch export.
- 50 governed local checks (soak), each honest 30/30; reload → UNKNOWN (no stale green).
- Evidence viewer compare across two aggregate packages.
- History export/import + ledger export/import + synthetic protected-files policy export.
Verified: wave5-generalization 24/24 (incl. 50/50 soak). Full regression: 147 E2E checks GREEN
(wave5 24, wave4 20, local-product-loop 20, end2end 27, wave3 32, wave2 24); axe 0 serious/critical.
