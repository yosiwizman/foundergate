# SaaS Foundation Readiness Map (Planning only — nothing built here)
| Area | Intended model | Present today | Missing before real SaaS |
|------|----------------|---------------|--------------------------|
| User roles | founder/operator + reviewer + (later) customer admin | founder/operator + reviewer concepts | real multi-tenant roles |
| Tenant model | isolated per-tenant evidence + config | single-tenant local | tenant isolation + storage |
| Repo connection | user-authorized GitHub app, least privilege | manual gh auth (isolated configs) | scoped app, token vaulting |
| Data classification | synthetic/demo only today; customer data later gated | synthetic only | data-handling policy + controls |
| Evidence storage | signed, hash-locked receipts | local sealed ZIPs + guards | durable, access-controlled store |
| Billing design | metered runs (later) | none | billing system (true gate) |
| Auth boundary | loopback + token + Origin (local); real authn later | local loopback only | real identity provider |
| Support / incident | documented process | none | runbook + on-call |
| Security boundary register | single-writer sensitive runtime; simulated actions only | design + guards | real threat model + audit |
| Deployment plan | none (local only) | none | infra + deploy pipeline (true gate) |

Conclusion: strong local governance foundation; everything customer/production/billing/deploy remains unbuilt and separately gated. Commercial readiness ≤10%.
