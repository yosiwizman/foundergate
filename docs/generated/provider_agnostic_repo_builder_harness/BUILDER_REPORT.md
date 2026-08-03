# Builder Report — Provider-Agnostic Harness
**Builder does not self-certify; does NOT claim CLEAN.**

## Adapter contract + adapters
- src/provider_adapters/provider_contract.mjs (contract + forbidden actions + local build helper).
- src/provider_adapters/adapters.mjs — 5 adapters: claude_code_simulated, codex_openai_simulated, hermes_simulated, local_shell_deterministic, hostile_provider_simulated (all SIMULATED_PROVIDER_ONLY; $0, no network, no keys).
- src/provider_adapters/gated-flow.mjs — FounderGate GATE: runs adapter → captures claim → INDEPENDENTLY verifies via the shared classifier → PASS/HOLD/REFUSED. Provider cannot set checker/terminal verdicts (PENDING).
- src/repo_evidence/repo_check.mjs — local allowlisted repo evidence workflow; private/remote HELD.
- src/provider_adapters/run-harness.mjs — runs the 14-case matrix + writes provider_index.json.

## UI
Added "Provider / Repo Proof" panel (nav-provider): providers table (claim → FounderGate verification), repo checks table, and labels (Claude = one adapter; OpenAI/Codex/Hermes simulated; real activation + private repo need a founder gate; provider claim never enough; Gate 8 blocked).

## Tests run
gated-flow 17/17, repo-check 6/6, harness matrix (4 PASS_VERIFIED / 7 hostile held / private HELD), headed visible proof 7/7; regression wave11 14/14 + showroom 15/15. claim-blocker clean.

## Known limits / what Builder cannot certify
Simulated adapters only — NOT real OpenAI/Codex/Hermes integration. Local synthetic. No real provider/network/keys/spend. Not production/SaaS/secure/customer/commercial. Gate 8 blocked. Builder cannot certify its own correctness.
