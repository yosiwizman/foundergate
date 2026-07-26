# FounderGate PR #197 — Provider / Package Re-Freeze: Verification Instructions

These instructions are for an **independent read-only package Checker**. Everything below is mechanical.
Nothing here is acceptance: the Builder cannot accept its own package.

## 0. Frozen inputs

| item | value |
|---|---|
| approved authority candidate | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` |
| approved authority tree | `012e0560fd21f7328088ec290f30f9eac84dc1ef` |
| prior reviewed evidence head (PR #197) | `39dea6364d3a32420034f0ba4895486d1b918fa1` |
| PR #196 head | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| clean authority Checker | `sha256:fba5f6c2a397489b6a1e31da58fa6bd54434bc8fbf35d6e65689e67c79a87365` |
| authority Advisor | `sha256:e2177f9201e13aa1e4e452af5d32a5e040ce323263cc9bb46277f43469da3cc0` |
| provider target | `/Users/yosiwizman/.local/share/claude/versions/2.1.220` |
| provider version | `2.1.220` |
| provider sha256 | `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` |

## 1. Authority binding

```
git rev-parse ebd4ff5672ba657b039521a8b377a094a2ea67ea^{tree}      # => 012e0560fd21f7328088ec290f30f9eac84dc1ef
git merge-base --is-ancestor ebd4ff5672ba657b039521a8b377a094a2ea67ea 39dea6364d3a32420034f0ba4895486d1b918fa1
jq -r .reviewed_runtime_sha .foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json
```

The activation payload's `reviewed_runtime_sha` / `reviewed_runtime_tree` MUST be the approved authority
candidate and tree. `evidence_commit_sha` MUST still be the freeze placeholder: a commit cannot embed its
own hash, and the out-of-tree FINAL template is what binds the exact package candidate.

## 2. Provider identity — reproduce independently

```
stat -f 'mode=%Sp links=%l dev=%d inode=%i size=%z mtime=%Sm' /Users/yosiwizman/.local/share/claude/versions/2.1.220
test -L /Users/yosiwizman/.local/share/claude/versions/2.1.220 && echo SYMLINK_BLOCKER || echo NOT_A_SYMLINK
shasum -a 256 /Users/yosiwizman/.local/share/claude/versions/2.1.220
openssl dgst -sha256 -r /Users/yosiwizman/.local/share/claude/versions/2.1.220
/Users/yosiwizman/.local/share/claude/versions/2.1.220 --version     # metadata probe ONLY — never a model request
```

(Absolute tool paths are recorded in the evidence-only tail commit. They are omitted here because this
generator lives in the production launcher directory, where the authority-route regression forbids any
alternate shell/executor surface — including such a string appearing in the file at all.)

Both hashes must equal `8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081` and the version must be `2.1.220`.
Re-stat afterwards: device, inode, size and mtime must be unchanged.

## 3. Report digests

```
shasum -a 256 .foundergate/evidence/lrcq-provider-package-refreeze/CHECKER_197_SIXTH_AUTHORITY_REPORT.json   # fba5f6c2a397489b6a1e31da58fa6bd54434bc8fbf35d6e65689e67c79a87365
shasum -a 256 .foundergate/evidence/lrcq-provider-package-refreeze/ADVISOR_197_SEQUENTIAL_REPORT.json        # e2177f9201e13aa1e4e452af5d32a5e040ce323263cc9bb46277f43469da3cc0
```

The preserved copies are byte-identical to the reviewed reports.

## 4. ADV-197-01

`grep -c 'ALL FOUR prior reports'` over both matrices must be `0`, and each of the five historical
FINDINGS digests must appear in full in the regenerated matrix's `review_report_register`. None of the
five may be described as acceptance.

## 5. Package file hashes

```
jq -r '.files | to_entries[] | "\(.value|sub("^sha256:";""))  \(.key)"' \
  .foundergate/evidence/lrcq-provider-package-refreeze/PACKAGE_SHA256_MANIFEST.json | shasum -a 256 -c -
```

Every entry of `.foundergate/evidence/lrcq-provider-package-refreeze/PACKAGE_SHA256_MANIFEST.json` must verify. The manifest is non-recursive: it excludes
only itself. Verify `aggregate` by re-canonicalizing the `files` map with
`canon()` from `tools/terminal0/lrcq/evidence-set.mjs` and hashing it.

## 6. Deterministic regeneration

```
node tools/terminal0/lrcq/generate-run-manifest.mjs
node tools/terminal0/lrcq/refreeze-package.mjs --observed-at <the recorded instant> --version-probe "2.1.220 (Claude Code)"
git status --porcelain     # must be empty when regenerated at the SAME repository path
```

The driver reads no clock, no randomness and no environment variable. Regenerating at a DIFFERENT
filesystem path changes exactly the explicitly-declared, launcher-verified path bindings
(`repository_root`, `permitted_worktree_root`, `repository_root_realpath`, `lifecycle_root_realpath`)
and nothing else.

## 7. Ceilings and exclusions

All six ceilings must hold at or below: max_budget_usd 10, run_duration_s 18000, per_job_timeout_s 2700,
max_parallel_width 2, max_output_bytes 10485760, termination_grace_s 30. All ten exclusions must be
exactly `true`: no_protected_main_merge, no_pr_merge, no_push_unless_authorized, no_m1, no_akior, no_customer_data, no_live_action, no_permission_bypass, no_deploy, no_external_comms.

## 8. Refusal under attack

Every invalid-package attack must refuse BEFORE any productive provider spawn, with a counted spawn
instrument and a positive deterministic-stub control proving the counter can observe a spawn.

## 9. Unsigned / unactivated state

`active_keys` must be `[]`; `founder_signature`, `signer_key_fingerprint`,
`authorization_text_digest`, `activation_nonce` and `issued_epoch` must all be `null`; the real
repository must classify its founder gate as `KEY_ENROLLMENT`.

## 10. What this package does NOT claim

Real productive Claude capability, package acceptance, UI proof, and complete OS isolation are all
explicitly NOT proven. Builder verification is not package acceptance.
