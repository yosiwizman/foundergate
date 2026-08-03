# Operating Contract — Round 2 (repeatability)
- This run re-runs the local app factory workflow with FRESH apps to prove repeatability.
- Local / synthetic only. No network, accounts, calendar, email, customer/private/production data, deploy, billing, provider.
- NOT Gate 8, NOT commercial, NOT production/SaaS/security/customer proof. Decision never "ship".
- Builder cannot certify itself; independent Checker + Terminal Advisor rule; manifests carry PENDING until they do.
- Visible/headed browser proof required (no headless substitution).
- Every output binds request → artifact → tests → preview → evidence via request_id/request_hash.
