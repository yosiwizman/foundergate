# Outside-Advisor Review Packet — Credential Route Matrix (B7)

## Scope
Local/synthetic route-separation policy: modules (`credential_route_policy_model`, `fine_grained_pat_readiness`, `github_app_readiness`, `repo_gate_classifier`), self-tests, a 20-case negative matrix, a read-only dashboard, and docs. No real credential; no real/existing/customer repo; no provider; no merge.

## Independently checkable
- Self-tests: policy 12/12 · PAT 9/9 · App 8/8 · classifier 8/8 · negative matrix 20/20.
- `NEGATIVE_REFUSAL_RESULTS.json` — every refusal/hold case + `all_held:true`.
- `credential_route_matrix_index.json` — the exact matrix the UI renders (only `deploy_key` proven).
- `ui_proof/` — headed browser proof (13/13) + screenshots + video.

## Adversarial questions answered
1. **Can a planned route read as proven?** No — the policy invariant enforces exactly one `PROVEN_WITH_LIMITS` route (deploy key); the UI proof asserts fine-grained PAT and GitHub App are not marked proven.
2. **Can a sandbox proof be treated as a customer/existing repo?** No — `repo_gate_classifier` refuses silent upgrades without the exact `FOUNDER_GATE:<TARGET>` token.
3. **Does anything here touch a live credential or repo?** No — pure policy code + synthetic configs.

## Not to be read into this
No route other than the deploy key is proven. Existing-founder-repo and customer-repo remain TRUE FOUNDER GATES.
