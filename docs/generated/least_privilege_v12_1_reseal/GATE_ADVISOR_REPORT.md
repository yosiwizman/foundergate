# Independent Gate Advisor Report — Least-Privilege Read-Only Deploy Key Proof

**Binding**
- Reviewer: independent read-only Gate Advisor (agent `a818b62b4d41b782c`, "Independent Terminal Advisor").
- **evaluated_sha:** `931dd5314f373e22d717561daaf64c25a460f972` (the report verifies "sealing head 931dd53").
- Branch: `run/private-repo-least-privilege-deploy-key-20260804T0630ET`.
- Posture: read-only, separate from the Checker; the Advisor modified nothing and made no provider call (only read-only `gh api` GETs).
- Captured verbatim into the V12.1 package (produced after the prior ZIP was sealed).

**Verdict: GATE_READY_WITH_LIMITS** (Gate Advisor allowed set → `V12_1_RESEAL_READY_WITH_LIMITS` carried the same READY-with-limits judgment on the underlying proof).

---

Independently confirmed. My adjudication follows.

**Gate Advisor Adjudication — Least-Privilege Read-Only Deploy Key Proof**
Branch: `run/private-repo-least-privilege-deploy-key-20260804T0630ET` (sealing head `931dd53`) · read-only, separate from Checker; I modified nothing and made no provider call (only read-only `gh api` GETs). Remote `origin/main` = `65fd01669f80…` (unchanged); PR #200 OPEN on `lane/wave1-safety-copy-reconcile-4f2394a5`, untouched.

**Least-privilege claim honestly bounded — YES.** CLAIMS_AND_LIMITS explicitly refuses every adjacent overclaim: NOT fine-grained-PAT, NOT GitHub-App, NOT customer-repo, NOT existing-valuable-repo, NOT private-repo-support-complete, NOT production/SaaS/commercial/paid/certified. The claim is scoped precisely to "one temporary repo-scoped read-only deploy key on the founder-owned private sandbox." Each larger credential form and repo class remains a distinct blocked founder gate.

**Revocation genuinely mechanical — YES, and I independently verified it.** The records show the deploy key deleted (exit 0), present-count 0, and a post-revocation `git ls-remote` returning exit 128 / access denied using the same private key — a mechanical failure, not an assertion. I then confirmed it myself, read-only: `gh api repos/yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET/keys` returns **`[]`** — deploy key `159240599` is genuinely gone. Private key destroyed; ephemeral root excluded from git and ZIP.

**Credential boundary real — YES.** Intake ran over the deploy key only (`intake_auth_route: ssh_deploy_key_identities_only`, `IdentitiesOnly=yes`, `broad_gh_auth_used_for_intake: false`); broad GitHub auth was confined to creating and deleting the key. The temporary ed25519 private key lived in a mode-700 ephemeral root, was never committed/packaged/printed (`private_key_packaged: false`, `credential_value_seen: false`), and my scan of the evidence dir for any `BEGIN … PRIVATE KEY` material returned nothing. The read-only nature of the key is API-confirmed (`read_only=true`), and the fingerprint `SHA256:0u9PdN9…4QrQ` is consistent across records.

**Proof counts accurate (neither over- nor under-stated) — YES.** Write/mutation refusals 25/25 (confirmed in WRITE_REFUSAL_RESULTS.json, `all_held: true`). Five fake-secret files held, with 6 type-classifications (one file carries two types) — internally consistent, not inflated. Exact commit `fb54698d…`, file_count 9, total_bytes 1104, manifest/archive digests bound; REPLAY_VERIFIED; repo confirmed `.private = true` live. The 17/17 headed UI proof is evidenced by the `ui_proof`/screenshots artifacts.

**Blocked/untouched surfaces — all correctly held.** `existing_repo_touched: false`, `customer_repo_touched: false`, `code_execution: false`, `build_run: false`, `provider_call: false`, `write_during_read_proof: false`; deploy, bill, merge, and Gate 8 all blocked. The only real GitHub mutations were the authorized create+delete of the deploy key itself (a settings operation, now fully reversed) — correctly within this gate's scope and honestly recorded.

No overclaim, no authority leak, no required corrections. One optional housekeeping note for the founder: the sandbox repo still exists as a real private repo and can be deleted at will; the credential that could touch it is already revoked and destroyed.

**GATE_ADVISOR_VERDICT: GATE_READY_WITH_LIMITS**
