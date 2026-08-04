# Checker Report — Overnight Real OpenAI Provider Gate (independent, read-only; no provider call made)
| # | Check | Result |
| --- | --- | --- |
| 1 | Exactly ONE real call (call_count 1, http 200, gpt-5-nano, run_id overnight…2240ET) | PASS |
| 2 | Gate refuses 2nd/other calls | PASS |
| 3 | Budget cap respected ($0.00032885 ≤ $0.25) | PASS |
| 4 | Credential not exposed (repo+evidence+preflight scan empty; only key_last4 KC8A + fingerprint; secret_scan clean) | PASS |
| 5 | No private/customer/production/repo data (synthetic only) | PASS |
| 6 | No deploy/bill/outreach/merge | PASS |
| 7 | Bound to request + run (input_fingerprint + run_contract_digest; bound_to_request/run true) | PASS |
| 8 | Provider did NOT self-certify (VERIFIED_WITH_LIMITS, decided_by foundergate_verifier) | PASS |
| 9 | 4 offline pre-call suites ALL GREEN (redaction 5, cost_guard 6, response_verifier 5, adapter 13 = 29) | PASS |
| 10 | Local replay matrix without real calls (all_pass true, no_real_call true, 10 cases; independently re-run) | PASS |
| 11 | claim-blocker clean (15 files); secret scan clean; main 65fd01669f80; PR #200 OPEN/draft; 5 screenshots | PASS |

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
