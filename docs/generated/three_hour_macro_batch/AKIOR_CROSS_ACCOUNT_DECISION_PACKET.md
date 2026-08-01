# AKIOR Cross-Account Decision Packet (Subwave 6)
Prepares a LATER cross-account (AKIOR / other founder-controlled account) technical proof WITHOUT logging in or touching AKIOR. Per Amendment 01 §6, the only valid label is "cross-account, founder-controlled, public-repo technical proof" — never customer/market validation.
## Founder decision form
- [ ] Authorize cross-account proof on account: ______ (founder-controlled).
- [ ] Public non-sensitive repo: ______  Objective: ______  Provider: [ ]OFF [ ]ON cap $__/run.
- [ ] I understand this proves portability across accounts, not customer validation.
## Runbook (execute only after authorization)
Clone locally (never push to the account) → preflight (public + secret-scan) → scope lock → governed run (deterministic or capped provider) → Checker + Advisor → seal package labeled cross-account technical proof → stop at every gate.
## Refusal rules
Decline if repo is private, contains secrets/customer/prod data, or the objective needs deploy/merge/security-cert.
## Evidence requirements
Pre/post SHA · diffstat · test counts · Checker + Advisor verdicts · sealed package (SHA256SUMS + unzip -t).
## Hard stops (TRUE founder gates, none crossed)
AKIOR login · repo creation · external GitHub action · publishing · provider spend.
