# Credential Route Policy Model (B1)

Local/synthetic policy model. **No real credential is created or used.** It separates the one proven route from the planned/blocked and true-founder-gate routes so nothing silently inherits "proven".

| Route | Scope | Revocation | Auditability | Setup burden | Risk | Proof status | Next gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Deploy key | 1 repo, read-only | delete key; post-revocation fails | high | low (FG-managed) | LOW | **PROVEN_WITH_LIMITS** | — |
| Fine-grained PAT | selected repo, Contents:read | revoke token; expiry | medium | medium (founder mints) | MEDIUM | PLANNED_BLOCKED | founder gate |
| GitHub App | 1 install, Contents:read | uninstall; ~1h tokens | high | medium-high | MEDIUM | PLANNED_BLOCKED | founder gate |
| Uploaded archive | none (snapshot) | n/a; archive deleted | high | low-medium | LOW | PLANNED_BLOCKED | founder gate |
| Customer relay | none held by FG | customer-side | contract (future) | high | HIGH | FUTURE_BLOCKED | founder+customer |
| Existing founder repo | real valuable repo | per route | per route | founder auth | HIGH | **TRUE_FOUNDER_GATE** | founder gate |
| Customer prod repo | third-party data | per route+contract | per route+contract | founder+customer | CATEGORICAL | **TRUE_FOUNDER_GATE** | founder+customer |

**Invariant (enforced in code + tests):** exactly ONE route is PROVEN_WITH_LIMITS today (deploy key); both real-repo classes are TRUE_FOUNDER_GATE; every route carries explicit forbidden claims.
