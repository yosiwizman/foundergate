# Lane K — Browser E2E Report

Command: `OP_PORT=4880 node tests/e2e-dashboard/wave2-capture.mjs`
Target: `http://127.0.0.1:4880/demo/founder_operating_environment/index.html`

**Result: ALL GREEN — 24/24 checks passed.** Observed: tests `30/30`, decision
`INTERNAL_DEMO_ONLY (never SHIP)`, axe serious/critical `0`.

Verified:
- deck-style visual identity preserved (shell grid + dark bg `rgb(13,17,23)`; fg.css byte-identical to deck);
- sidebar navigation switches panels (active state updates; other panels hidden);
- run uses real `/api/start` (tests reach 30/30 only from a real backend response);
- export uses real `/api/export` (→ `SEALED_EXPORT_LOCAL`);
- decision never says SHIP;
- evidence becomes FRESH/SEALED only after a real run/export;
- Decisions buttons disabled (view-only); notice "No real-world action is authorized here.";
- Files / Protected Files labeled `DISPLAY_ONLY`;
- Ask Guide static limits present (no provider call);
- no raw logs and no full 40-character SHA in founder-facing panels;
- Founder Mode fallback link present (not removed).

Screenshots (in the sealed receipt): 01_truth_dashboard_before_run.png · 02_preview_panel_before_run.png ·
03_run_started.png · 04_truth_dashboard_after_run.png · 05_preview_panel_after_run.png ·
06_evidence_ready.png · 07_export_complete.png · 08_decisions_view_only.png ·
09_ask_guide_limits.png · 10_files_display_only.png · 11_founder_mode_fallback.png
