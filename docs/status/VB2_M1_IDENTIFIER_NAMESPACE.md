# VB2 M1 Identifier Namespace Reconciliation
Two DISTINCT identifier namespaces (verified, cannot be substituted):
- **qualification_run_id** = `integrated-8h-rerun-20260717T173028Z` — binds the evidence directory, intent, recovery state, result, final package.
- **driver_lease_run_id** = `run_f3124ace-e39f-4d52-9e46-1dc5b2f1e1b1` — binds only the driver, lease and internal runtime events.
All driver artifacts belong to this qualification run; no artifact from another run is attached. The
historical driver-launch ledger event used the field `run_id` for the driver/lease identifier — that
event is PRESERVED (not rewritten). The two IDs are structurally distinct (UUID-prefixed `run_` vs a
timestamped intent slug) and cannot be silently exchanged.
**M1_IDENTIFIER_NAMESPACE: RECONCILED_DUAL_NAMESPACE.** Future runs must use distinct fields
`qualification_run_id` and `driver_lease_run_id` (regression test: tools/policy/test_run_id_namespaces.py).
