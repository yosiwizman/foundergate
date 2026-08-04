# Claims & Limits — Private Repo Credential Route Matrix (B7)

## Allowed claim (exact)
FounderGate now has a **local credential-route matrix** that clearly separates the **deploy-key proof** (proven with limits) from the **planned fine-grained PAT, GitHub App**, existing founder repo, and customer repo gates. It is local/synthetic policy code plus tests and a read-only dashboard.

## What IS in this matrix
- 7 routes modeled with scope · revocation · auditability · setup burden · risk · proof status · next gate · forbidden claims.
- Exactly ONE route is `PROVEN_WITH_LIMITS` (the read-only deploy key). Fine-grained PAT / GitHub App / uploaded archive are `PLANNED_BLOCKED`; customer relay is `FUTURE_BLOCKED`; existing founder repo and customer repo are `TRUE_FOUNDER_GATE`.
- Readiness *contracts* (not proofs) for fine-grained PAT and GitHub App that REFUSE over-broad scope and HOLD unknowns.
- A repo-gate classifier that refuses any silent class upgrade.
- A 20/20 negative/refusal matrix, and UI that shows UNKNOWN when evidence is missing.

## Forbidden claims (none asserted here)
fine-grained-PAT proven · GitHub-App proven · existing-founder-private-repo proven · customer-repo proven · private-repo-support-complete · production/SaaS/commercial/customer/paid/security readiness · merge-ready · Gate-8 complete · Codex supported.

## Hard boundary
No real credential was created or used. No fine-grained PAT, GitHub App, existing, or customer repo was touched. No provider call, no code execution, no deploy, no billing, no merge. PR #200 and protected `main` untouched. **Never SHIP.**
