# Claims and Limits — Real OpenAI Provider Gate
## Allowed (evidence-bound) claims
- FounderGate executed exactly ONE budget-capped real OpenAI API call (gpt-5-nano) using synthetic input only.
- The call was routed through the deterministic gate, bound to the run contract, cost-guarded, redacted, and independently verified.
- Provider output did NOT self-certify acceptance; FounderGate's verifier produced the result (PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS).
- Actual cost $0.00035445 ≤ $0.25 cap. No retry, no second call, no secret leak.

## NOT allowed (explicitly not claimed)
- NOT claimed: production readiness.
- NOT claimed: SaaS readiness.
- NOT claimed: commercial readiness.
- NOT claimed: customer proof or paid proof.
- NOT claimed: security or compliance certification.
- NOT claimed: real provider support complete (this is ONE bounded proof, not general provider integration).
- NOT claimed: Codex / other provider proof.

## Standing limits
- One real call only; synthetic input only; gpt-5-nano cheapest safe text model. The key never entered evidence/ZIP/logs.
- Real private repo / customer data / Gate 8 / real hardware / deploy / bill / merge remain blocked; each needs a separate explicit founder phrase.
