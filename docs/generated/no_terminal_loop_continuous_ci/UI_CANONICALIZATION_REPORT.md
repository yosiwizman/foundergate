# UI Canonicalization Report (Anti-Drift Lock)
## Canonical founder/operator dashboard (chosen)
**demo/founder_operator_dashboard/** — it is already wired to the loopback run-server (assets/app.mjs calls /api/session, /api/start, /api/export), has the founder chips/testids, and enforces "never SHIP" via assets/runner.mjs. This run makes it THE canonical no-terminal founder surface.

## Other surfaces — classified (NOT competing dashboards)
| Surface | Role now |
|---------|----------|
| demo/reviewer_console/ | Developer/reviewer technical surface (kept) |
| demo/founder_decision_room/ | Supporting decision surface (legacy/demo) |
| demo/saas_foundation_shell/ | Planning/demo shell (non-canonical) |
| src/operator_console/ | Backend loopback server (the engine, not a UI) |
| src/evidence_viewer/ | Sealed export module (backend) |
| src/ui/founder-view/ | Reusable pure composition (invents-nothing) — component library |
| src/ui/founder-operator-panel/ | Reusable pure view-model + renderer + NEW server adapter |

## What was reused / connected / newly built
- REUSED: the existing canonical dashboard (no visual redesign), its app.mjs server wiring, the run-server, the sealed exporter, the panel view-model.
- CONNECTED: proved the canonical dashboard drives the REAL loopback server end-to-end in a browser (Lane E).
- NEWLY BUILT (minimal, justified): src/ui/founder-operator-panel/server-snapshot.mjs — a small ADAPTER mapping run-server JSON → panel snapshot. Why an existing file couldn't do it: the server (state producer) and the panel (view-model) had no shared mapping; adding it to either would couple them. The adapter is connective glue, not a UI. Also tests/no-terminal-loop/server-drive.mjs and tests/e2e-dashboard/server-driven.e2e.mjs (tests, not UIs).
- DUPLICATE UI AVOIDED: no new founder dashboard was created. The goal (fewer disconnected UIs, one canonical path) is met.

## Remaining unconnected
- founder_decision_room and saas_foundation_shell remain demo/planning surfaces, intentionally not wired (out of scope; not competing with canonical).
