# Correction Items
- 01 (E2E assertion) — status-val reflects run mode REAL_LOCAL_RUN, not the server 'complete' envelope; assertion fixed. Resolved (E2E 3/3).
- 02 (dead code) — removed a no-op `internalOk` line in export-package.mjs (Checker nit). sealed-export tests still 5/5. Resolved.
- 03 (honest disclosure) — disclosed the loopback API's lack of auth/CSRF (Advisor); made NO security claim; tempered the no-terminal classification (pure cold-start is still PARTIAL because the server start is a terminal step). Resolved.
