# Lane B — Truth Dashboard Refinement

Refined without changing product direction (deck-style preserved; fg.css unmodified).

- **Local backend** chip shows "reachable (127.0.0.1)" or "UNAVAILABLE (UNKNOWN)".
- **Tests** chip: `UNKNOWN` before run → `30/30` after a real run.
- **Decision** chip: `UNKNOWN` before run → `INTERNAL_DEMO_ONLY` after run, always suffixed
  "(never SHIP)". Never surfaces an achievable SHIP.
- **Evidence** chip: `UNKNOWN` before export → `FRESH (ready to export)` after a real run →
  `SEALED_EXPORT_LOCAL` after a real export.
- **Checker / Gate Advisor** labels read "separate review (process)" — a review process, not a
  hosted service.
- No raw logs; no full 40-character SHA in the founder-facing view (technical view shows only a
  short build id).

Verified by Lane K E2E: chips move UNKNOWN → real values only on real backend responses.
