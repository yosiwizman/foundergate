# Fine-grained PAT Readiness Contract (B2)

**No real PAT is created or used.** Contract a future PAT proof must satisfy:
- Resource: repository; **selected** = the one sandbox repo (never "all repositories").
- Permissions: **Contents: read** only. No write, no workflow, no administration, no org-wide.
- Expiry required. Revocation check required.
- Token value **never** entered in chat, **never** printed, **never** packaged.
- Founder setup burden: founder mints the token out-of-band and provides it through a secure path — never pasted into a prompt.

`evaluatePatConfig()` returns **REFUSED** for write/workflow/all-repos/org-wide/token-value-in-band, **HELD** for missing read-contents/selection/expiry, and **READY_PLANNED** only for an exact read-only match — which remains **PLANNED_BLOCKED** pending a separate founder gate.
