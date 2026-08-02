# Existing Operator Surface Inventory
Discovered (not rewritten):
- demo/founder_operator_dashboard/ — founder-facing dashboard (index.html, state-model.mjs, launch .command, assets, runs/).
- demo/founder_decision_room/, demo/reviewer_console/, demo/saas_foundation_shell/ — additional local surfaces.
- src/operator_console/ — loopback run-server (run-server.mjs, server-core.mjs, session-token.mjs, action-gate.mjs, rollback.mjs).
- src/evidence_viewer/export-package.mjs — REAL sealed export (exportSealedPackage()).
- src/ui/founder-view/ — pure "invents nothing / UNKNOWN when missing" composition (founder-view.mjs + selftests, no-invented-state.selftest).
- src/evidence_finalizer/ — final-head-guard.mjs, receipt-consistency-guard.mjs.
- tests/founder_no_terminal_ux/ — sealed-export.selftest, dashboard-copy.selftest; tests/evidence_binding/ — guard selftests.
Decision: BUILD ON these. No deletion, no rename of public proof artifacts, no blind rewrite.
