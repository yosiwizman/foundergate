# Independent Gate Advisor Report — Fine-Grained PAT Proof (intake proven, scope limits)

**Binding**
- Reviewer: independent read-only Gate Advisor (agent `a818b62b4d41b782c`, "Independent Terminal Advisor"), separate from the Checker.
- Branch: `run/private-repo-fine-grained-pat-proof-ready-20260804T0810ET`, head `0c7e85d`.
- Posture: read-only; modified nothing, exposed no token, made no provider call, attempted no write.

**Verdict: FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS.**

---

Independently confirmed: the real sandbox HEAD is `fb54698d…` (matches evidence exactly), the tree has 9 blobs (matches file_count), no raw token appears anywhere in evidence, and the 30/30 refusal matrix holds.

**Gate Advisor Adjudication — Fine-Grained PAT Proof (new token; actual intake proven with scope limits)**
Head `0c7e85d` · read-only, separate from Checker. `origin/main` = `65fd01669f80…` (unchanged); PR #200 OPEN, untouched.

**1. Intake genuine and correctly credited to the fine-grained PAT only — YES.** `intake_occurred: true`, `intake_auth_route: fine_grained_pat_keychain_only`, `broad_gh_auth_used_for_intake: false`, `deploy_key_used_for_intake: false`. Fingerprint `fgpat_99a4a9b8dd970464` differs from the prior failed `fgpat_46a4db8921b7ccdd` (genuinely replaced); sandbox now 200 (was 404). I independently confirmed the bound facts against the real repo via my own broad auth: exact commit `fb54698d…` and file_count 9 both match. The intake really happened, over the fine-grained PAT alone.

**2. Is SCOPE-LIMITS the honest, correct ceiling — YES, exactly.** GitHub's `/repos/{owner}/{repo}` `permissions` reflects the user's **role** (owner ⇒ admin/push=true), NOT the fine-grained token's grant, and GitHub exposes no read API for a PAT's permission set. The only mechanical way to prove the token *cannot* write is to attempt a write and observe 403 — **forbidden**. So FounderGate correctly separates read-only **intake** (proven; only GETs, real contents bound) from read-only **scope** (asserted-by-config, not independently verified). Full READY would be an overclaim; PARTIAL/no-intake would understate a genuine bound intake. `FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS` is the precise honest ceiling — and CLAIMS lists "read-only-scope-independently-verified" among the forbidden, not-asserted claims.

**3. Token exposed / safe by design — NO exposure; YES safe.** Only the redacted fingerprint appears; scan for a raw `github_pat_…` returned nothing. Token placed solely in the HTTPS Authorization header — never argv, disk, print, or return — carries no auth to the redirect-followed tarball URL, read-only by construction. Safe by design.

**4. Existing/customer repos untouched; no code exec/provider/writes — YES.** All corresponding flags false; intake targeted only the sandbox; structural checks passed; 5 fake secrets held (contents never sent to a model).

**5. UI honest + blocked gates blocked — YES.** UI proof 18/18; FINAL_STATUS presents intake-proven with an explicit "Why 'with scope limits'" caveat, not a false "fully verified." GitHub App, existing/customer repo, write/merge, provider, deploy, bill, Gate 8 all BLOCKED; PR #200 and protected `main` untouched.

**6. Next recommended founder gate.** Lead option: the **GitHub App read-only proof** (next credential route — short-lived tokens, uninstall-based revocation). Optional: (a) to close this gate's one open limitation, a *founder-authorized* controlled single write-attempt-expecting-403 probe would upgrade scope-limits → independently-verified (a distinct gate, since it authorizes a write attempt); (b) housekeeping — the 7-day fine-grained PAT can be revoked now the proof is complete (7-day expiry is a backstop). Existing-founder-repo and customer-repo remain the higher-value true founder gates.

No overclaim, no false-green, no token exposure, no required corrections. This run lands the actual fine-grained-PAT intake and draws the exact right epistemic line by refusing to claim read-only *scope* it cannot prove without a forbidden write. The label is the honest ceiling.

**GATE_ADVISOR_VERDICT: FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS**
