# Negative / Refusal Matrix (B5)

20 adversarial cases, all held (see NEGATIVE_REFUSAL_RESULTS.json — **20/20**, no real credential created, no real repo touched):

existing-repo-without-gate · customer-repo-without-gate · PAT-value-in-chat · App-install-without-gate · over-broad-PAT(all-repos) · write-scoped-PAT · org-wide-token · workflow-permission · deploy-key-left-installed · missing-revocation · code-execution · repo-build · repo-tests · provider-call · private-key-packaging · token-logging · unknown-scope(HELD) · unsupported-Git-provider(HELD) · missing-exact-commit(HELD) · **evidence-missing→UNKNOWN**.

Refusals are structural: the credential-route matrix is read-only policy code with no write/exec/provider capability, and upgrades require an explicit founder-gate token.
