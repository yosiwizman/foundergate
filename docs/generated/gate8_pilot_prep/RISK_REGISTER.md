# Pilot Risk Register (preparation)
| # | Risk | Mitigation (planning) |
|---|------|-----------------------|
| 1 | Evaluator over-reads a demo as production-ready | Lead every surface with INTERNAL_DEMO_ONLY + "not production/secure/SaaS"; claims matrix enforced |
| 2 | Accidental use of real/customer data in a session | Intake rules forbid any non-synthetic/non-self-owned input; refuse if unsure |
| 3 | Pricing hypothesis mistaken for an offer | Mark all pricing as hypothesis; no price published/charged; no payment link |
| 4 | Scope creep toward deployment/SaaS mid-pilot | Out-of-scope list is explicit; those are separate true founder gates |
| 5 | Credential/secret exposure in shared session | No secrets in demo; sealed exports scanned token-free; reviewer mode read-only |
| 6 | Outreach/contact happening prematurely | This gate forbids outreach; a contact step is a separate later decision |
| 7 | Overclaim in verbal walkthrough | Demo script pins language to the claims matrix |
