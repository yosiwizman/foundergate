# Deterministic FounderGate Capsule Generator (FG-LRCQ-ACT-026)

`generate-capsule.mjs` is **tooling**. It deterministically emits an **8-file flat immutable capsule** for
review, reusing the **authoritative** FounderGate components (no bespoke schema, no duplicated logic). It
never signs, issues, consumes, spawns a provider/model, or reads the wall clock to produce authority-bearing
output; its only subprocess is `git`.

## Reused authoritative components
- `buildActivationMaterialPacket` (generate-run-manifest.mjs) — the full Activation V3 packet/template recipe.
- `loadAndVerifyManifest` + `manifestDigest` (run-manifest.mjs) — manifest loaded from disk; `run_manifest_digest = manifestDigest(obj)`.
- `verifyProviderTarget` (provider-verify.mjs) — re-hashes the immutable provider binary + verifies version.
- `buildEvidenceSet` (evidence-set.mjs) — non-recursive evidence set (fixed founder-capsule exclusions).
- `prMetadataDigest` (pr-metadata-canon.mjs) — canonical live-PR metadata digest.

## The capsule (exactly 8 files, flat, no subdirectories)
1. `SYSTEM_STATE.json` — binds evaluated_sha + evidence_commit_sha + both trees, ancestry, `pr_body_digest`, provider identity, activation/replay truth, generator version+digest; `founder_signature: null`.
2. `FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json` — binds **evidence_commit_sha** (the exact future candidate); records evaluated_sha as reviewed ancestor; unsigned/unissued/unexpired.
3–6. `FOUNDER_SUMMARY.md`, `BUILT_VS_UNPROVEN.md`, `OPEN_RISKS.md`, `NEXT_FOUNDER_GATE.md` — deterministic; they state the capsule is *designed for* three-control verification and that generation does **not** certify verifier success.
7. `EVIDENCE_SET_MANIFEST.json` — authoritative `buildEvidenceSet` schema; founder-capsule aggregate excludes exactly `{EVIDENCE_SET_MANIFEST.json, SHA256SUMS.txt}`.
8. `SHA256SUMS.txt` — generated **last**, over every other file (incl. the manifest), relative paths.

The **unsigned activation material packet** (binds evaluated_sha) is a **committed repository artifact
OUTSIDE the capsule** — the capsule is 8 files, not 9.

## Two-SHA (non-recursive)
`evaluated_sha` = reviewed ancestor; `evidence_commit_sha` = package-only branch HEAD. The tracked material
packet binds evaluated_sha and never contains evidence_commit_sha; the FINAL template binds evidence_commit_sha.

## Authority (all fail-closed; verified by real controls, not source regex)
Mechanically checked before any write: `evaluatedTree===rev-parse(sha^{tree})`, ancestry, `evidence===HEAD`,
`branch===current`, `githubHead===HEAD`, `protectedMainBaseline===origin/main`, package-only diff; manifest via
`loadAndVerifyManifest`; provider via `verifyProviderTarget` (binary re-hash + version); a **versioned
required-member registry** (generation fails, naming the exact member ID, on any absent/dir/unsafe-symlink
member); output containment (resolves the full symlink chain and refuses escape into the repo or the real
PR#189 review-evidence tree; refuses a pre-existing/symlink destination). Atomic staging→rename; failure
leaves no accepted partial capsule.

## Three acceptance controls (proven on the SAME disposable capsule)
1. Real `run-five-hour.mjs --final-template-preflight` → `SIGNATURE-REQUIRED`, `zero_invocation`, no non-sig refusals.
2. Real `verifyEvidenceSet` → valid, no problems.
3. Real `verifyCapsule` → `valid: true, problems: []` (`CAPSULE-VERIFIER: VALID`). Its live-metadata check runs
   via an injected metadata provider in tests; an unavailable provider yields a **non-accepting SKIP** (SKIP ≠ VALID).

`capsule-verifier.mjs` exports `verifyCapsule({repo, capsuleDir, prNumber, githubMetadataProvider})`; the
production CLI calls it with the real repo, PR #189, and live GitHub metadata. Fixture injection is a function
parameter only — **not** reachable via CLI args, env, or capsule contents. No skip/bypass/reduced-assertion path.

## Review envelope (external)
The generator emits **only** the 8-file capsule. Checker/Advisor reports live in a sibling `<CAPSULE_ROOT>-review/`
directory and are **never** capsule members (adding one inside the capsule fails verification). They bind the
frozen candidate + capsule aggregate + evidence-set digest + SHA-256 of SHA256SUMS; the Advisor report binds the
checker digest and proof the checker completed first. No checksum/evidence-set regeneration occurs after review.

## Policies
Qualification before use; no manual SHA/digest edits; no wall clock; unsigned-only; the generator may not be
used on the real PR #189 package in the same wave it is introduced. Real Claude productivity/cost/witness/25-job/
5-hour remain unproven until an authorized retry.
