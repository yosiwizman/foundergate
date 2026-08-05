# Standalone Offline Capsule Verifier (`tools/evidence/verify_capsule.mjs`)
A zero-third-party-dependency Node tool that verifies any FounderGate non-recursive evidence capsule end-to-end, offline, without the original worktree:
1. extract outer capsule; 2. FINAL_EXTERNAL_SEAL.json ↔ .sha256 sidecar; 3. inner payload ZIP SHA-256 ↔ seal's `inner_payload_zip_sha256`; 4. extract inner payload + verify its internal SHA256SUMS.txt; 5. (`--run-selftests`) run each packaged repo_intake `*.selftest.mjs`; 6. guard: refuse any seal containing a placeholder token; 7. **no-false-green guard: refuse a seal whose surfaced `final_local_status` asserts a forbidden overclaim** (GITHUB_APP_PROVEN / PRODUCTION_READY / SUPPORT_COMPLETE / MERGE_READY / SECURITY_CERTIFIED / SCOPE_INDEPENDENTLY_VERIFIED / …), even if the checksums are internally consistent. Prints a structured verdict; exit 0 iff all PASS.

## Authenticity caveat (surfaced on every run)
A PASS attests capsule **integrity + consistency + the packaged self-tests ONLY**. The sidecar is a re-computable checksum, **not a cryptographic signature**, so the tool does **not authenticate** the seal's `final_local_status` label. Authenticate the status by cross-checking the surfaced `evaluated_sha` against the committed candidate in git **and** the independent Checker + Gate Advisor verdicts. The result sets `status_label_authenticated:false` and prints an explicit NOTE; the CLI labels the status line "surfaced status (NOT authenticated)".

## Correction applied (independent Checker finding)
An independent Checker demonstrated a false-green surface: a *consistent re-seal* with a fabricated overclaim status printed that status next to `OVERALL: PASS` with no caveat. Fixed by (a) the no-false-green status guard above and (b) the always-surfaced authenticity caveat.

- **Self-test 11/11** (valid → PASS incl. inner self-tests; tampered sidecar/inner-hash/inner-SHA256SUMS/placeholder/missing → FAIL; **fabricated-overclaim-status consistent re-seal → FAIL**; caveat present; surfaces status + evaluated_sha).
- **Run against the real GitHub App capsule → OVERALL PASS** (10/10 checks, inner self-tests executed) with the status surfaced as NOT authenticated.
- Usage: `node tools/evidence/verify_capsule.mjs <capsule.zip> [--run-selftests] [--json]`.
