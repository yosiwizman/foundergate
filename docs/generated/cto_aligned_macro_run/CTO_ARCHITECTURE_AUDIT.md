# CTO Architecture Audit
Rule: run wide everywhere EXCEPT the sensitive runtime/gate path. That path gets ONE primary runtime builder (Terminal-0), ONE independent read-only checker, and Terminal-0 as merge sheriff/integrator. No duplicate writers on executor/gate/session-token/rollback/loopback-action code.
## Work classification
### A. Sensitive runtime / local-action path (SINGLE WRITER = Terminal-0)
src/operator_console/ (loopback server, auth/token/Origin) · src/live_run_console/ (runner) · src/evidence_viewer/ (export) · no-terminal launcher · local action gate · simulated executor · rollback · session-token. Only Terminal-0 edits these; the sensitive-runtime Checker reviews read-only.
### B. Parallel-safe lanes (docs/planning, no shared runtime files)
A Founder Witness UI · B AKIOR local prep · C CLDH operating-system · D Reviewer drawer expansion · E Public demo · F Repeatability/soak · G Beta/PR map · H Investor/commercial/SaaS. These are documentation/fixtures; Terminal-0 integrates; none touches the sensitive runtime files.
## Ownership ambiguity resolution
Reviewer drawer (D) reads package metadata but does NOT edit the sensitive runtime; it edits demo/reviewer_console only. Public demo (E) edits publish_candidates only. No lane shares a file with the sensitive runtime. Resolved before build.
