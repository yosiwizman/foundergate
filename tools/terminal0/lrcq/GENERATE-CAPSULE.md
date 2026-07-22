# Deterministic FounderGate Capsule Generator (FG-LRCQ-ACT-026)

`generate-capsule.mjs` is **tooling**. It deterministically emits the 9-file founder-gate capsule from an
explicit input contract. It **never** signs, issues, consumes, spawns a provider/model, or reads the wall
clock to produce authority-bearing output. Its only subprocess is `git` (an ancestry check).

## Why this exists
The founder-gate capsule was historically produced by **manual hand-editing** of SHA/digest fields (see
the "freeze step-B" commits) — the exact practice that leaves stale digests and non-reproducible
founder-signing material. This generator replaces that with one deterministic, testable process.

## Purpose
Produce, for review, an **unsigned** capsule binding a reviewed production candidate and a package-only
evidence commit — so a later, separate wave (never this one) can present it for a founder decision.

## Input contract (explicit; fail-closed)
`generateCapsule(inputs, outDir)` requires: `repoRoot`, `evaluatedSha`/`evaluatedTree`,
`evidenceCommitSha`/`evidenceCommitTree` (distinct; evaluated must be an ancestor of evidence),
`branch`, `prNumber`, `prTitle`, `prBody`, `protectedMainBaseline`, `runManifest` (job_count 25,
max_cost_usd 10, max_duration_s 18000, immutable `resolved_provider_target` under `/versions/`,
provider identity/version, v2 backlog path+digest matching on disk), `digestSources` (field→source path,
recomputed — never copied), `committedMembers`, `activationIdentity`, `consumedOnce:true`,
`replayBlocked:true`, `rawEvidenceDigest`. Optional cross-checks: `expectRunManifestDigest`,
`expectPrBodyDigest`. Any missing/malformed/UNKNOWN/contradictory/traversal/alias/mismatch input is
**refused before any file is written**.

## Output contract (atomic; temp dir → rename)
1. `UNSIGNED_ACTIVATION_MATERIAL_PACKET.json` — binds **evaluated_sha**; recomputed digests; unsigned.
2. `SYSTEM_STATE.json` — binds **both** SHAs + trees, ancestry, `prMetadataDigest(live title,body)`,
   provider identity, activation/replay truth, generator version+digest; `founder_signature:null`.
3. `FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json` — binds **evidence_commit_sha** as the exact future
   execution candidate; records evaluated_sha as reviewed ancestor; unsigned/unissued/unexpired/unconsumed.
4-7. `FOUNDER_SUMMARY.md`, `BUILT_VS_UNPROVEN.md`, `OPEN_RISKS.md`, `NEXT_FOUNDER_GATE.md` — rendered
   deterministically from structured inputs; invent no claims; state UNSIGNED / not-approved / not-merged /
   not-production-proven.
8. `EVIDENCE_SET_MANIFEST.json` — non-recursive; hashes committed + capsule members; **excludes itself and
   SHA256SUMS**; digest = `sha256(canon(body without the digest field))`.
9. `SHA256SUMS.txt` — generated **last**, over every other file (bijection), relative paths only.

## Invariants (enforced + tested)
- **Two-SHA, non-recursive:** the tracked material packet binds evaluated_sha and **never** its own
  containing commit (`evidence_commit_sha` must not appear in it). The external FINAL template binds
  evidence_commit_sha. This is how self-referential SHA recursion is avoided.
- **Deterministic:** identical inputs → byte-identical outputs (key-sorted serialization; no clock/random).
- **Unsigned-only:** `founder_signature`/`issued_epoch`/`expiry_epoch`/`hard_deadline_epoch` are null.
- **Digests recomputed** from source files, never copied from a stale packet.
- **Fail-closed + atomic:** on any validation/write failure, no accepted partial capsule is left.

## Policies
- **Qualification before use:** this generator must pass a fresh checker + sequential advisor *before* its
  output is ever used. It may **not** be introduced and used on the real PR #189 package in the same wave.
- **No manual SHA/digest edits** to generated artifacts — regenerate deterministically instead.
- **No wall clock:** any time-like value is an explicit input or omitted.
- The real `capsule-verifier.mjs` and `--final-template-preflight` bind live PR #189 + the real manifest;
  they are exercised in the later *use* wave, not during generator qualification (which uses disposable
  fixtures).
