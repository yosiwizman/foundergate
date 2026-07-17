# Machine-Verification Applicability Matrix (TBF-1)

Authoritative machine copy: `.foundergate/policies/test_before_founder.json` → `impact_matrix`.
The validators derive required tests from that JSON; this doc is the human-readable mirror.
UNKNOWN fails closed. A required test class cannot be marked NOT_APPLICABLE.

| Impact | Minimum required test classes |
|---|---|
| DOCUMENTATION_ONLY | link/path validation; schema validation (where applicable); claim-register comparison; protected-authority check; independent doc review when governance/claims change |
| UI_AFFECTING | syntax+unit; actual Playwright; **headed local browser**; **headless exact-SHA CI**; screenshots; video (acceptance-critical); trace; console log; network log; page-error log; responsive/mobile; keyboard-only; focus; automated accessibility; 200% zoom; reduced-motion (where applicable); initial neutral-state; stale-state; cache/storage/service-worker; false-green; independent checker; final read-only Advisor before acceptance-critical witness |
| API_AFFECTING | contract tests; schema validation; auth/authz (where applicable); negative requests; malformed input; idempotency/duplicate; timeout behavior; evidence binding |
| RUNTIME_AFFECTING | unit; integration; bounded live runtime (where authorized); negative; fault injection; crash recovery; rollback; cleanup; teardown; orphan detection; resource limits; exact-version proof; independent checker |
| DATA_AFFECTING | migration; backup/restore (where applicable); corruption; schema compatibility; rollback; deletion proof; privacy classification |
| RECOVERY_AFFECTING | crash recovery; rollback; cleanup; teardown; orphan detection; unit |
| SECURITY_BOUNDARY_AFFECTING | deny-path; bypass attempts; mutation; secret scans; permission; isolation; independent adversarial checker |
| GATE_OR_AUTHORITY_AFFECTING | unauthorized-path; second-authority; signature-bypass; protected-file check; mutation proof the gate fires; independent checker; founder signature (where required) |
| DEPENDENCY_AFFECTING / PROVIDER_AFFECTING | source+license verification; version pinning; compatibility; failure behavior; replacement/disable path; update-drift guard; qualification evidence |
| LIVE_ACTION_AFFECTING / PRODUCTION_AFFECTING | all applicable lower-layer tests; human-expert review (where required); rollback rehearsal; incident path; explicit founder gate; no inferred authority |
| UNKNOWN | FAIL CLOSED — lane blocked until reclassified |

The invariant floor (`tools/policy/tbf_lib.py`) hard-guarantees the UI, RUNTIME, GATE and SECURITY
minimums cannot be silently removed from the policy JSON.
