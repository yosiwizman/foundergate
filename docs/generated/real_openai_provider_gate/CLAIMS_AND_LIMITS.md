# Claims and Limits — Overnight Real OpenAI Provider Gate
## Allowed (evidence-bound) claims
- FounderGate executed exactly ONE budget-capped real OpenAI API call (gpt-5-nano) using synthetic input only.
- Then ran a LOCAL-ONLY post-provider replay/refusal matrix (10 cases) with NO further real calls.
- Provider output did NOT self-certify; FounderGate's verifier produced the result (PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS).
- Actual cost $0.00032885 ≤ $0.25 cap. No retry, no second call, no secret leak.

## NOT allowed (explicitly not claimed)
- NOT claimed: production readiness · NOT SaaS readiness · NOT commercial readiness · NOT customer proof · NOT paid proof.
- NOT claimed: security or compliance certification.
- NOT claimed: real provider support complete (ONE bounded proof, not general provider integration).
- NOT claimed: Codex / other provider proof.

## Standing limits
- One real call only; synthetic input only; gpt-5-nano. Key never entered evidence/ZIP/logs (only key_last4 + fingerprint).
- Codex / any second-or-repeat real call / private repo / Gate 8 / real hardware / deploy / bill / merge remain blocked; each needs a separate explicit founder phrase.
