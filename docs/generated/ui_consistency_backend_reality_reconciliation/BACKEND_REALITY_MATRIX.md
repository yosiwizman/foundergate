# Backend Reality Matrix (Lane C)
| Feature | Label | Basis |
|---------|-------|-------|
| Run safe demo check (Founder Mode) | LIVE_LOCAL | real /api/start on loopback server; real runner; 30/30 |
| Export evidence package (Founder Mode) | LIVE_LOCAL | real /api/export; real sealed ZIP; unzip-verified |
| Truth Dashboard (deck) | DISPLAY_ONLY | design mockup (founder-design-v2 / v8a1); 0 backend calls |
| Preview Bay (deck) | DISPLAY_ONLY | design mockup (v8a2 preview); 0 backend calls |
| Protected Files (deck) | DISPLAY_ONLY | design mockup (v8a3 filecabinet); labeled protected/blocked, not live enforcement |
| Decision ledger | ACCEPTED_WITH_LIMITS | decision() honest (never SHIP); recorded in sealed receipts; not a hosted ledger |
| Evidence storage | LIVE_LOCAL (local files) / PLANNED (durable hosted) | local sealed ZIPs today; durable/access-controlled store is planned only |
| Spend ceiling | ACCEPTED_WITH_LIMITS | proven once at Gate 7 (--max-budget-usd, exact cost $0.0271348); not at scale |
| Real-action controls | MOCK_ONLY / SIMULATED | action executor is SIMULATED only; forbidden types refused; no real destructive action |
| Customer intake | NOT_ACCEPTED | forbidden; no customer data path exists |
| SaaS hosting | PLANNED | brief only; nothing built/deployed |
| Billing | PLANNED / NOT_ACCEPTED | no PSP/payment path exists or authorized |
| Provider execution | ACCEPTED_WITH_LIMITS | one real bounded claude -p call (Gate 7); not at scale |
| Reviewer console | LIVE_LOCAL (read-only) | reads real sealed-package index; no action buttons |
| Gate Advisor | ACCEPTED_WITH_LIMITS (process) | independent review each run; a role, not a hosted service |
| Independent Checker | ACCEPTED_WITH_LIMITS (process) | independent review each run; a role, not a hosted service |
| Panic / pause path | LIVE_LOCAL (basic) | dashboard Stop/pause + honest UNKNOWN/HOLD; not a full incident system |
UNKNOWN: none outstanding for the listed items.
