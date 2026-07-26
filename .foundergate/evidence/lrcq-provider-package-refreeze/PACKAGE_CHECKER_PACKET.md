# FounderGate PR #197 — INDEPENDENT PACKAGE CHECKER PACKET (FG-PPR-197)

**You are a fresh, independent, READ-ONLY package Checker.** You write nothing, sign nothing, enroll
nothing, consume nothing, merge nothing and invoke no productive provider or model. You may execute the
provider only with `--version`.

**The Builder does not issue your verdict.** Nothing in this repository — including the Builder
verification ledger, the acceptance matrix, or a green test suite — is acceptance. Only your independent
reproduction is.

---

## 0. Frozen state you must reconcile first

| item | expected |
|---|---|
| repository | `yosiwizman/foundergate` |
| stacked lane branch | `lane/lrcq-provider-package-refreeze-ebd4ff5` |
| stacked PR | **#198**, OPEN, draft, unmerged, base `lane/lrcq-founder-signature-authority-8d1899f` |
| approved authority candidate | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` |
| approved authority tree | `012e0560fd21f7328088ec290f30f9eac84dc1ef` |
| package candidate | `58b36206669a27d1ce6171f0f3149721c24f35c7` |
| package candidate tree | `0838399d2089e8a360ee26f62bf0c0e6b1bd03b8` |
| evidence-only head | resolve **procedurally** (see §14) |
| PR #197 head | `39dea6364d3a32420034f0ba4895486d1b918fa1` — **must be unchanged** |
| PR #196 head | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` — **must be unchanged** |
| protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` — **must be unchanged** |
| clean authority Checker | `sha256:fba5f6c2a397489b6a1e31da58fa6bd54434bc8fbf35d6e65689e67c79a87365` |
| authority Advisor | `sha256:e2177f9201e13aa1e4e452af5d32a5e040ce323263cc9bb46277f43469da3cc0` |
| provider target | `/Users/yosiwizman/.local/share/claude/versions/2.1.220` |
| provider sha256 | `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` |
| `active_keys` | `[]` |

Any mismatch is a **STATE MISMATCH**, not something to work around.

---

## The sixteen items you must independently reproduce

### 1. Authority candidate and tree binding

```
git rev-parse ebd4ff5672ba657b039521a8b377a094a2ea67ea^{tree}
git merge-base --is-ancestor ebd4ff5672ba657b039521a8b377a094a2ea67ea 39dea6364d3a32420034f0ba4895486d1b918fa1
jq -r '.reviewed_runtime_sha, .reviewed_runtime_tree, .evidence_commit_sha' \
  .foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json
git diff --name-only ebd4ff5672ba657b039521a8b377a094a2ea67ea HEAD -- src/
```

Require: tree matches; ancestry holds; the packet binds the authority candidate/tree; `evidence_commit_sha`
is still the freeze placeholder; **the `src/` diff is empty** (no source changed at all).

Reject if the packet binds any other candidate — in particular the stale `306f44aa`, which the prior
committed packet carried and which this wave corrected.

### 2. Provider path, version, hash and filesystem identity

```
stat -f 'mode=%Sp links=%l dev=%d inode=%i size=%z mtime=%Sm' /Users/yosiwizman/.local/share/claude/versions/2.1.220
test -L /Users/yosiwizman/.local/share/claude/versions/2.1.220 && echo SYMLINK_BLOCKER || echo NOT_A_SYMLINK
shasum -a 256 /Users/yosiwizman/.local/share/claude/versions/2.1.220
openssl dgst -sha256 -r /Users/yosiwizman/.local/share/claude/versions/2.1.220
/Users/yosiwizman/.local/share/claude/versions/2.1.220 --version
stat -f 'dev=%d inode=%i size=%z mtime=%Sm' /Users/yosiwizman/.local/share/claude/versions/2.1.220
```

Require: regular non-symlink executable; both hashes equal the expected digest; version `2.1.220`;
metadata identical before and after. Confirm the two alternate installed versions (`2.1.218`, `2.1.219`)
are enumerated in the re-freeze record and explicitly **not accepted**.

Confirm the prior artifact `PROVIDER_REFREEZE_2_1_220.json` was inspected and its **old candidate binding
was not carried forward**.

### 3. Checker and Advisor report digests

```
shasum -a 256 .foundergate/evidence/lrcq-provider-package-refreeze/CHECKER_197_SIXTH_AUTHORITY_REPORT.json
shasum -a 256 .foundergate/evidence/lrcq-provider-package-refreeze/ADVISOR_197_SEQUENTIAL_REPORT.json
```

Require byte-identity with the reviewed reports. Then confirm both verdict lines, that the Checker
reported **zero** findings, and that the Advisor reported **exactly one** finding (ADV-197-01, LOW,
non-blocking).

Confirm neither review accepted this package: the Checker required the re-freeze, and the Advisor recorded
provider status as PROVISIONAL / NOT REFROZEN.

### 4. ADV-197-01 correction

```
grep -c 'ALL FOUR prior reports' \
  .foundergate/evidence/lrcq-assurance-factory/V4_AUTHORITY_ACCEPTANCE_MATRIX.json \
  .foundergate/evidence/lrcq-provider-package-refreeze/V4_AUTHORITY_ACCEPTANCE_MATRIX.json
git diff 39dea6364d3a32420034f0ba4895486d1b918fa1 58b36206669a27d1ce6171f0f3149721c24f35c7 \
  -- .foundergate/evidence/lrcq-assurance-factory/V4_AUTHORITY_ACCEPTANCE_MATRIX.json
```

Require: both counts `0`; the source-artifact diff is **exactly one line**; all five historical FINDINGS
digests appear in full; every historical report carries `is_acceptance: false`; **none is described as
acceptance**; the current clean Checker and Advisor are recorded as separate classes.

### 5. All package-file hashes

```
jq -r '.files | to_entries[] | "\(.value|sub("^sha256:";""))  \(.key)"' \
  .foundergate/evidence/lrcq-provider-package-refreeze/PACKAGE_SHA256_MANIFEST.json | shasum -a 256 -c -
```

Require every entry OK. Confirm the manifest is non-recursive (it excludes only itself) and re-derive
`aggregate` with `canon()` from `tools/terminal0/lrcq/evidence-set.mjs`.

### 6. Deterministic regeneration

Clone the package candidate into **two** disposable directories outside Git, at different paths, copy the
protected-main ref across (`git fetch <src> 'refs/remotes/origin/main:refs/remotes/origin/main'`), and run:

```
node tools/terminal0/lrcq/generate-run-manifest.mjs
node tools/terminal0/lrcq/classify-and-packet.mjs
node tools/terminal0/lrcq/generate-founder-gate-packet.mjs
node tools/terminal0/lrcq/refreeze-package.mjs \
  --observed-at 2026-07-26T00:18:16Z --version-probe "2.1.220 (Claude Code)" \
  --digest-shasum 8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081 \
  --digest-openssl 8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081
```

Require: the two regenerations differ **only** in the declared path bindings (`repository_root`,
`permitted_worktree_root`, `repository_root_realpath`, `repository_git_common_dir_realpath`,
`lifecycle_root_realpath`), their derived digests, and the one enumerated unsigned-evidence path field
(`UNSIGNED_GATE_PACKET.repository_boundary`). **Any other difference is a finding.** Do not accept a
weakened comparison.

Also verify the driver reads no wall clock, no randomness and no environment variable, and that running it
again at the same path changes nothing.

### 7. All six ceilings

`max_budget_usd` ≤ 10 · `run_duration_s` ≤ 18000 · `per_job_timeout_s` ≤ 2700 · `max_parallel_width` ≤ 2 ·
`max_output_bytes` ≤ 10485760 · `termination_grace_s` ≤ 30 — in the activation payload **and** the run
manifest.

### 8. All ten exclusions

`no_protected_main_merge`, `no_pr_merge`, `no_push_unless_authorized`, `no_m1`, `no_akior`,
`no_customer_data`, `no_live_action`, `no_permission_bypass`, `no_deploy`, `no_external_comms` — each
exactly `true`. Confirm no package field, environment variable, CLI argument or unsigned overlay can widen
any of them.

### 9. Invalid-package zero-spawn attacks

Re-run the attack matrix yourself on **disposable copies outside Git**, with your own counted instrument.
Cover: provider hash, provider version, provider target, authority SHA, authority tree, one package file,
one SHA-manifest entry, **every ceiling widened individually**, **every exclusion removed and falsified
individually**, a substituted historical Checker verdict, an altered clean-Checker digest, an altered
Advisor digest, a fake founder key, a fake founder signature, activation without a valid signature, and a
replayed activation packet.

Require refusal **before any productive provider spawn** in every case.

**Check the stage accounting, not just the tally.** The Builder's matrix records 74/74 refused, but
separates *how*: three cases were **detected as binding defects**, thirty-two **stopped at the signature
gate** (refused, but the tampering was not identified there, because an unsigned template reaches the
signature gate before a field can be compared), and thirty-nine were caught by non-preflight controls.
Detection of the signature-gate cases is proven separately on **signed** bytes. Confirm that split is
honest and that no case is claimed as detected when it was not.

### 10. Positive deterministic stub control

Prove your spawn counter can go **up**. Drive the real production spawn boundary against a deterministic
stub under a genuine `SUPERVISOR_EXECUTION` capability and observe the counter increment. A zero-spawn
result from an instrument never shown to increment proves nothing. Note that the production boundary
spawns from inside the detached supervisor, whose environment it scrubs — so a parent-process hook cannot
see it, and a cross-process durable counter is required there.

### 11. Unsigned and unactivated state

`founder_signature`, `signer_key_fingerprint`, `authorization_text_digest`, `activation_nonce`,
`issued_epoch`, `expiry_epoch`, `hard_deadline_epoch` all `null`; `unsigned: true`;
`confers_no_authority: true`; no consumption marker anywhere.

### 12. `active_keys` equals `[]`

```
jq -c '.active_keys, .revoked_keys, .max_current_keys' docs/governance/FOUNDER_KEY_AUTHORITY.json
```

### 13. KEY_ENROLLMENT refusal

```
node tools/terminal0/lrcq/run-five-hour.mjs --final-template-preflight <capsule FINAL template>
```

Require `SIGNATURE-REQUIRED`, `founder_gate: KEY_ENROLLMENT`, `zero_invocation: true`,
`invocations.providerSpawn: 0`, and an empty `binding_defects`.

### 14. Package / evidence commit split

```
git log --oneline 58b36206669a27d1ce6171f0f3149721c24f35c7..HEAD
git diff --name-status 58b36206669a27d1ce6171f0f3149721c24f35c7 HEAD
```

Require: **exactly one** evidence-only commit; it touches only
`.foundergate/evidence/lrcq-provider-package-refreeze/`; it modifies **no** package artifact, authority
file, generator, source file, tool or package dependency.

### 15. Nonrecursive seal

Confirm the package candidate does not claim or embed its own commit SHA: the committed payload keeps the
freeze placeholder in `evidence_commit_sha`, and only the out-of-tree FINAL template binds
`58b36206669a27d1ce6171f0f3149721c24f35c7`. Confirm the evidence tail is resolved **procedurally** from
Git history and not by a self-referential digest.

### 16. Post-review immutability

Re-verify at the end that PR #197 is still at `39dea636`, PR #196 at `8d1899f7`, protected main at
`ba7d6547`, the eight authority files byte-identical, `active_keys` still `[]`, and that no key,
signature, activation, run, merge or deployment occurred during your review.

---

## Also run

```
npm test        # twice, consecutively
```

Require 154/154 (or the mechanically updated total, with the change explained), zero failures, zero
skips, identical family totals across both runs, and no real provider or model invocation.

---

## Your verdict

If — and only if — you independently reproduced all sixteen items:

```
FOUNDERGATE-PR197-PROVIDER-PACKAGE-CHECKER: CLEAN
```

Otherwise report FINDINGS or INSUFFICIENT_EVIDENCE. An undefined or unreachable result is
`INSUFFICIENT_EVIDENCE`, never CLEAN.

**Do not invent CLEAN.** **The Builder must not issue this verdict.**

## What this package explicitly does NOT claim

Real productive Claude capability · package acceptance · UI proof · complete OS isolation · that the
eventual five-hour run will succeed.
