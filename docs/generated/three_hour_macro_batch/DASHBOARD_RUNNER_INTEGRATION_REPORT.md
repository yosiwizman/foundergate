# Dashboard Runner Integration Report
- The founder panel consumes a single status snapshot (buildPanel) and renders it to accessible HTML (render-html.mjs), verified in a real browser (Lane A).
- Accepted beta slice state renders (chip: foundergate-beta-freeze-1 — accepted with limits).
- Stale and UNKNOWN states render truthfully (UNKNOWN page verified in-browser; stale => ready=false).
- Hold/refused semantics are represented: any missing/invalid signal => UNKNOWN; export unavailable => disabled button with reason.
- Focused tests: panel 14/14; E2E 15/15. No new terminal dependency introduced.
