# Standalone Offline Capsule Verifier (`tools/evidence/verify_capsule.mjs`)
A zero-third-party-dependency Node tool that verifies any FounderGate non-recursive evidence capsule end-to-end, offline, without the original worktree:
1. extract outer capsule; 2. FINAL_EXTERNAL_SEAL.json ↔ .sha256 sidecar; 3. inner payload ZIP SHA-256 ↔ seal's `inner_payload_zip_sha256`; 4. extract inner payload + verify its internal SHA256SUMS.txt; 5. (`--run-selftests`) run each packaged repo_intake `*.selftest.mjs`; 6. guard: refuse any seal containing a placeholder token; 7. **no-false-green status guard (ALLOWLIST, best-effort): the surfaced `final_local_status` must match a KNOWN-GOOD FounderGate status shape** (ends in a `…_LIMITS` qualifier, a `TRUE_FOUNDER_GATE*`/`*_REQUIRED`/`HOLD*`/`WAIT*`/`FAIL` gate label, or an authorized-queue-exhausted label); any UNRECOGNIZED status is treated as UNVERIFIED and FAILs. This closes the denylist-evasion class (reordered/synonym overclaims). The **load-bearing control is the authenticity caveat**, not this shape guard.

## Authenticity caveat (surfaced on every run)
A PASS attests capsule **integrity + consistency + the packaged self-tests ONLY**. The sidecar is a re-computable checksum, **not a cryptographic signature**, so the tool does **not authenticate** the seal's `final_local_status` label. Authenticate the status by cross-checking the surfaced `evaluated_sha` against the committed candidate in git **and** the independent Checker + Gate Advisor verdicts. The result sets `status_label_authenticated:false` and prints an explicit NOTE; the CLI labels the status line "surfaced status (NOT authenticated)".

## Correction applied (independent Checker finding)
An independent Checker demonstrated a false-green surface: a *consistent re-seal* with a fabricated overclaim status printed that status next to `OVERALL: PASS` with no caveat. Fixed by (a) the no-false-green status guard above and (b) the always-surfaced authenticity caveat.

- **Self-test 15/15** (valid → PASS incl. inner self-tests; tampered sidecar/inner-hash/inner-SHA256SUMS/placeholder/missing → FAIL; **fabricated + reordered/synonym overclaim statuses → FAIL via recognized-shape allowlist; known-good shapes accepted**; caveat present; surfaces status + evaluated_sha).
- **Run against the real GitHub App capsule → OVERALL PASS** (10/10 checks, inner self-tests executed) with the status surfaced as NOT authenticated.
- Usage: `node tools/evidence/verify_capsule.mjs <capsule.zip> [--run-selftests] [--json]`.
