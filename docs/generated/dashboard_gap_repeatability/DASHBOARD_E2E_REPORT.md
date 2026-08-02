# Dashboard E2E Report (static structural)
Static structural check of demo/founder_operator_dashboard/index.html — all required elements PRESENT:
start-btn, status-val, evidence-freshness, commit-val, tests-val, checker-val, advisor-val, decision-val, limitations-val, next-action-val, export-status, and "No raw logs" copy.
Pure-render check: founder view shows status line + all chips + proves/not-proves/next-action/founder-gated + download-evidence action; UNKNOWN render proves honest UNKNOWN when the server is off.
Note: full in-browser pixel E2E was not run (see accessibility report) — structural + pure-render checks are reported honestly instead of a faked browser pass.
