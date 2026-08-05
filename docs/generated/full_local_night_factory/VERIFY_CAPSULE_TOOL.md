# Standalone Offline Capsule Verifier (`tools/evidence/verify_capsule.mjs`)
A zero-third-party-dependency Node tool that verifies any FounderGate non-recursive evidence capsule end-to-end, offline, without the original worktree:
1. extract outer capsule; 2. FINAL_EXTERNAL_SEAL.json ↔ .sha256 sidecar; 3. inner payload ZIP SHA-256 ↔ seal's `inner_payload_zip_sha256`; 4. extract inner payload + verify its internal SHA256SUMS.txt; 5. (`--run-selftests`) run each packaged repo_intake `*.selftest.mjs`; 6. guard: refuse any seal containing a placeholder token. Prints a structured verdict; exit 0 iff all PASS.
- **Self-test 8/8** (valid → PASS incl. inner self-tests; tampered sidecar/inner-hash/inner-SHA256SUMS/placeholder/missing → FAIL; surfaces status + evaluated_sha).
- **Run against the real GitHub App capsule → OVERALL PASS** (9/9 checks, inner self-tests executed) — an independent, reusable re-confirmation of that sealed evidence.
- Usage: `node tools/evidence/verify_capsule.mjs <capsule.zip> [--run-selftests] [--json]`.
