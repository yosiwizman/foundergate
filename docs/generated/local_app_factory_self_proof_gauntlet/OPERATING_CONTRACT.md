# Lane 0 — Operating Contract
- This run **repairs and proves** a local app factory workflow (request → generated files → app-specific
  tests → visible browser preview → evidence manifest).
- **Local / synthetic only.** No network, accounts, calendar, email, customer/private/production data, deploy,
  billing, or provider calls.
- This is **NOT Gate 8**, NOT commercial, NOT production/SaaS/security/customer proof. Decision never "ship".
- **Builder cannot certify itself.** Independent Checker (tries to falsify) and Terminal Advisor (judges) run
  separately; manifests carry PENDING verdicts until they rule.
- **Visible browser proof is required** (headed Playwright); headless-only is not accepted.
- Every output must bind request → artifact → tests → preview → evidence via request_id / request_hash.
