# Independent Gate Advisor Report — Fine-Grained PAT Rerun (scope hold)

**Binding**
- Reviewer: independent read-only Gate Advisor (agent `a818b62b4d41b782c`, "Independent Terminal Advisor"), separate from the Checker.
- Branch: `run/private-repo-fine-grained-pat-proof-rerun-20260804T0745ET`, head `a7b9d19`.
- Posture: read-only; modified nothing, exposed no token, made no provider call.

**Verdict: TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED** (a correctly-scoped sandbox-only PAT is still required; the gate remains honestly uncrossed).

---

All confirmed. The sandbox repo genuinely exists and is private under broad auth — so the fine-grained PAT's 404 is a real token-scope gap, not a missing repo. No raw token anywhere in evidence, and the live-intake module has no print/disk/argv sink for the token.

**Gate Advisor Adjudication — Fine-Grained PAT Rerun (token present, wrong scope)**
Head `a7b9d19` · read-only, separate from Checker. `origin/main` = `65fd01669f80…` (unchanged); PR #200 OPEN, untouched.

**1. Is HOLD the correct, safe call — YES, unambiguously.** The token fails on both axes this gate cares about: **404 on the sandbox** (I verified the repo genuinely exists and is private under broad auth, so the 404 is a real token-scope gap — the PAT is not granted the sandbox) **and** its `/user/repos` surface is **100+ repos across multiple owners** (broad/ambiguous). Proceeding would be wrong twice: it could not achieve the intended sandbox intake, and using a broad token would prove "intake with a broad credential" — the opposite of the least-privilege single-repo read-only proof this gate exists to establish. Refusing intake is precisely correct.

**2. Hold honest, free of false-green/overclaim — YES.** Label `HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS`; `intake_occurred:false`; all downstream evidence null with an explicit `not_asserted` note. CLAIMS forbids and does not assert "actual-sandbox-intake-proven" or "narrow-single-repo-scope-verified." No fabrication.

**3. Any token exposed / safe by design — NO exposure; YES safe.** Only a redacted fingerprint (`fgpat_46a4db8921b7ccdd`, a hash) appears; scan for a raw `github_pat_…` returned nothing. The live-intake module places the token only in the `Authorization` header of node:https GETs — never argv, disk, print, or return — carries no auth to the redirect-followed signed tarball URL, and is read-only by construction. Safe by design.

**4. Stayed inside authorization — YES.** `no_nonsandbox_repo_contents_fetched:true`; the driver is hardcoded to the sandbox and bails on any non-200, so no non-sandbox contents were fetched (the `/user/repos` call is a metadata listing for breadth assessment, not a contents read). All existing/customer/broad-auth/deploy-key/provider/write flags false.

**5. UI honest + blocked gates blocked — YES.** FINAL_STATUS shows the scope-hold plus exact remediation and honest mechanical observations; no forbidden labels. GitHub App, existing/customer repo, write/merge, provider, deploy, bill, Gate 8 all BLOCKED; PR #200 and protected `main` untouched.

**6. Founder remediation correct and sufficient — YES.** Recreate the fine-grained PAT restricted to ONLY the sandbox with **Contents: Read + Metadata: Read** (no other repo access, no write/workflow/org-wide), store under Keychain service `foundergate-github-fgpat-sandbox-readonly`, rerun. That is exactly the minimal correct scope.

**7. Next recommended founder gate.** Re-run **this same gate** after the founder creates the correctly-scoped PAT and re-stores it in Keychain — then it proves actual verified-narrow read-only intake. FounderGate never sees the token value.

No overclaim, no false-green, no token exposure, no required corrections. A model safety outcome: presented with a real but wrongly-scoped credential, FounderGate refused intake, fetched nothing outside the sandbox, kept the token unexposed, and handed back a precise, minimal remediation.

**GATE_ADVISOR_VERDICT: TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED**
