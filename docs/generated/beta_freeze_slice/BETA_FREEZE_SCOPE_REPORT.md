# Beta Freeze — Scope Report
A frozen, minimal beta-scope candidate for internal review. Frozen = hash-locked via FREEZE_MANIFEST.txt.
- Core: vetted synthetic task-ledger demo (source yosiwizman/task-ledger-demo@0bb2817174c9, unchanged).
- IN scope: local dependency-free module + 30-assertion self-test + honest decision() (never SHIP) + synthetic data.
- OUT of scope: network, server, DB, auth, multi-user, persistence, provider, deploy, hosting, billing, telemetry, customer/private/production data, security/compliance, SaaS, market/customer validation, PR/merge/release.
- "Beta" here = frozen minimal slice for internal evaluation, NOT a public/hosted/customer beta.
