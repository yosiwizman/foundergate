# Claims and Limits
## Allowed (evidence-bound)
- FounderGate now has a LOCAL provider-adapter contract (src/provider_adapters/provider_contract.mjs).
- FounderGate can GATE simulated providers: it verifies artifacts/tests/preview and issues PASS/HOLD/REFUSED, never trusting the provider claim.
- Claude Code is treated as ONE adapter, not the system.
- OpenAI/Codex/Hermes are represented by SIMULATED adapters only (no API/keys/network/spend).
- A hostile provider that overclaims is caught; forbidden-action requests are refused; private/remote repos are held.
- Real provider activation and private-repo access each require a SEPARATE founder gate.

## NOT allowed (explicitly not claimed)
NOT claimed / NOT true here: real OpenAI integration complete; NOT claimed: real Codex integration complete; NOT claimed: real Hermes integration complete; NOT claimed: arbitrary provider support complete; NOT claimed: private repo support complete; NOT claimed: SaaS ready; NOT claimed: production ready; NOT claimed: customer ready; NOT claimed: commercial ready; NOT claimed: security/compliance certified.
