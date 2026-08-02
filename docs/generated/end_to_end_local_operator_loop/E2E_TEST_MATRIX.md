# E2E Test Matrix
End-to-end loop (`tests/e2e-dashboard/end2end-loop.mjs`): **27/27 GREEN**
- default safe repo + default objective → READY → run 30/30 → export SEALED (receipt complete)
- custom safe objective → eligible → run passes
- unsafe objective → REFUSED → Run disabled
- unknown source → REFUSED/HOLD → Run disabled
- custom safe path → SAFE; unsafe path → HOLD → Run disabled
- export before run → disabled
- 3× repeated runs + 3× repeated exports → stable
- reload → UNKNOWN (no fake green)
- panels consistent (Decisions view-only, Files display-only, Ask Guide static)
- no full SHA / raw logs in founder view
- axe 0 serious/critical across 7 panels

Also passing (regression): Wave 3 hardening **32/32**, Wave 2 **24/24**. fg.css byte-identical (no third UI).
