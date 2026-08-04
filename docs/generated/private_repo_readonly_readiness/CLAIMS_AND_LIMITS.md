# Claims and Limits (W10) — Private Repo Read-Only Readiness
## Allowed claim (evidence passed)
FounderGate has built and tested a **local private-repo read-only readiness harness** with synthetic fixtures, credential gates, exact-commit/snapshot modeling, secret classification, write-attempt refusal (25/25), evidence replay, UI proof, Checker, and Gate Advisor.
## Forbidden claims
- NOT private repo support complete · NOT actual private repo accessed · NOT customer repo support · NOT "private repo safe for customers".
- NOT production/SaaS/commercial/paid ready · NOT security/compliance certified · NOT "no secrets possible" · NOT unhackable · NOT merge-ready.
## Standing limits
- LOCAL / SYNTHETIC only; no real private repo, no real credential, no provider call, no code execution. Never SHIP.
- Actual private-repo read-only access is a separate 🔴 founder gate (exact repo + read-only credential + explicit founder phrase).
