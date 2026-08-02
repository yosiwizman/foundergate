# Dashboard Gap Baseline (before this run)
The existing founder dashboard already had: start/stop/export buttons, run-status, evidence-freshness (UNKNOWN default), commit, tests, checker, advisor, decision, limitations, next-action, export status, "no raw logs" copy, and a real loopback-driven start + real sealed export.
Gaps this run closes:
- A single PURE, tested view-model that turns a snapshot into founder chips with strict UNKNOWN-not-fake-green semantics (new: src/ui/founder-operator-panel/panel.mjs + 14 selftests).
- Explicit founder-mode vs developer-mode text renderers with a proven no-SHA-leak rule in founder mode.
- Accepted-beta-slice chip (foundergate-beta-freeze-1) and "still founder-gated" panel.
- Executable repeatability/crash-test ladder (was planning-only).
