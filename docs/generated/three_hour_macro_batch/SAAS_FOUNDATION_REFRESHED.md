# SaaS Foundation Readiness (Refreshed — planning only)
| Area | Intended model | Present today | Missing before real SaaS |
|------|----------------|---------------|--------------------------|
| Auth boundary | real IdP + session; least privilege | local loopback + session token + Origin check | real identity provider, account system |
| Tenant model | isolated per-tenant evidence + config | single-tenant local | tenant isolation + per-tenant storage |
| Repo connection | user-authorized GitHub App, scoped | manual gh auth (isolated configs) | scoped App, token vaulting, revocation |
| Evidence storage | durable, access-controlled, signed | local sealed ZIPs + hash-locked receipts + guards | durable store + access control + retention |
| Billing design | metered runs | none | metering + billing system (TRUE GATE) |
| Support/incident | runbook + on-call | none | process + tooling |
| Data classification | synthetic/demo now; customer later gated | synthetic only | policy + controls + DLP |
| Security boundary register | single-writer sensitive runtime; simulated actions only | design + guards + refusers | threat model + audit + pen-test |
| Deployment prerequisites | infra + pipeline | none (local only) | infra, CI/CD, secrets mgmt (TRUE GATE) |
Commercial readiness remains ≤10%. Nothing here is built or deployed this run.
