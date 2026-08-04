# Current Proof Register
| Proof | Status | Evidence | Checker | Advisor | Proves | Does NOT prove | Stale? | Recheck before investor/customer? |
|---|---|---|---|---|---|---|---|---|
| Provider-agnostic harness | READY_WITH_LIMITS | provider_agnostic_repo_builder_harness | CLEAN_WITH_LIMITS | PROVIDER_AGNOSTIC_HARNESS_READY_WITH_LIMITS | gate over any simulated worker | real provider at scale | point-in-time | yes |
| P1 Assurance Core | READY_WITH_LIMITS | adoption_matrix_p1_assurance_core | CLEAN_WITH_LIMITS | P1_ASSURANCE_CORE_READY_WITH_LIMITS | local assurance records | production assurance | point-in-time | yes |
| P0 Core IP | READY_WITH_LIMITS | p0_core_ip_assumption_env_verification | CLEAN_WITH_LIMITS | P0_CORE_IP_READY_WITH_LIMITS | deterministic primitives | always-on controller (see P0.2) | point-in-time | yes |
| P0.2 Outer Controller + Env Gauntlet | READY_WITH_LIMITS | p0_outer_controller_env_challenge_gauntlet | CLEAN_WITH_LIMITS | OUTER_CONTROLLER_READY_WITH_LIMITS | always-on gate over local synthetic worker | real sandbox/network security | point-in-time | yes |
| P0.3 Physical Containment Model | READY_WITH_LIMITS | p0_physical_containment_assurance_model | CLEAN_WITH_LIMITS | PHYSICAL_CONTAINMENT_MODEL_READY_WITH_LIMITS | 3-level model + claim blocker | real physical containment | point-in-time | yes |
| Harvest Macro (W1–W8) | READY_WITH_LIMITS | harvest_autonomous_macro_operation + 8 witness ZIPs | CLEAN_WITH_LIMITS | INTEGRATE_WITH_LIMITS | 8 local wide-safe lanes | production/customer/paid | point-in-time | yes |
| **Real OpenAI Provider Proof** | **REAL_OPENAI_PROVIDER_PROOF_READY_WITH_LIMITS** | **FounderGate_RealOpenAIProviderProof_Overnight_20260803T2240ET.zip** (SHA256 9a45d3a2eaccb6dd48fc74cdf9e66a6a680fbc537e40359db6eb30094b1615b2) | **CLEAN_WITH_LIMITS** | **REAL_PROVIDER_PROOF_READY_WITH_LIMITS** | one bounded gated+verified real OpenAI call | real provider support complete, Codex, private repo, production/SaaS/commercial/customer/security | point-in-time | yes |

## Real OpenAI Provider Proof — detail
- Status: REAL_OPENAI_PROVIDER_PROOF_READY_WITH_LIMITS
- Evidence: FounderGate_RealOpenAIProviderProof_Overnight_20260803T2240ET.zip · SHA256 9a45d3a2eaccb6dd48fc74cdf9e66a6a680fbc537e40359db6eb30094b1615b2
- Call: one real OpenAI API call · Model: gpt-5-nano · HTTP 200
- Cost: $0.00032885 / $0.25 cap · No retry · No second call
- Verifier: PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS (FounderGate decided; provider did not self-certify)
- Checker: CLEAN_WITH_LIMITS · Gate Advisor: REAL_PROVIDER_PROOF_READY_WITH_LIMITS
- Does not prove: real provider support complete, Codex support, private repo support, production/SaaS/commercial/customer/security readiness.

## Evidence location precision (honest, per reviewer note)
- In-repo backing for every ✅ is the on-disk evidence DIRECTORY under `docs/generated/<layer>/` (all present and verifiable in the repo). The green checks are bound to those directories + the live provider call/verification records, NOT to the ZIP filenames alone.
- The sealed WITNESS ZIPs (harvest `FounderGate_Witness_01..08_*.zip` and `FounderGate_RealOpenAIProviderProof_Overnight_20260803T2240ET.zip`) live on the **Desktop**, relocated by the macOS Desktop auto-organizer into `~/Desktop/founder gate over all documents/`. They are present there; the provider ZIP SHA256 (9a45d3a2eaccb6dd48fc74cdf9e66a6a680fbc537e40359db6eb30094b1615b2) was computed from that location this run.
- Per §13 staleness rule: re-seal/re-verify any ZIP SHA at its current path before external/investor/customer circulation.
