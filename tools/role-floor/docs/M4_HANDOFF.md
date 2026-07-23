# M4 ROLE-FLOOR HANDOFF

This document is the authority for moving the role-floor package to the M4.
It is written to disk deliberately: **chat memory is not authority**. Another
Advisor must be able to continue from these files alone, without reconstructing
any conversation.

The machine-readable twin of this document is `M4_HANDOFF.json` in this
directory. External copies, including the post-commit SHAs, live under
`${HOME}/Desktop/FounderGate_M1_Role_Floor_Build/`.

---

## 1. What this package is

A tmux operating floor with two host profiles sharing one implementation.

- **m1** — orchestrator, builder, checker, advisor. Four windows. No
  integration, verification or merge authority; those requests return
  `M4_HANDOFF_REQUIRED`.
- **m4** — the same four plus serial-integration, final-verifier and
  merge-sheriff. Seven windows. Holds integration authority, and only
  integration authority.

## 2. Status of this work

- Built in an isolated clone on the M1: `/Users/macm1/Projects/foundergate-m1-role-floor-build`
- Branch: `lane/m1-role-floor-orchestrator-ba7d654`
- Parent commit: `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423`
- Parent tree: `a0fd38b7e05748028c22aff87695865a217a20d0`
- **Local only. Not pushed. No PR. Not merged. Not integrated into any
  manifest or launcher. Never activated.**
- The clone's push URL is deliberately set to `DISABLED`.

Package version and per-file digests: `../PACKAGE_DIGESTS.txt`.
The commit SHA and tree are recorded in the external
`M4_ROLE_FLOOR_HANDOFF.json`, because a file cannot contain the digest of the
commit that introduces it.

## 3. Transfer to the M4

GitHub has not received this work. Transfer by git bundle:

```bash
# on the M1 (already produced by the build)
ls ~/Desktop/FounderGate_M1_Role_Floor_Build/foundergate-role-floor.bundle

# on the M4, after independent audit authorizes it
git bundle verify /path/to/foundergate-role-floor.bundle
git fetch /path/to/foundergate-role-floor.bundle lane/m1-role-floor-orchestrator-ba7d654
```

The bundle contains the branch and the ancestry needed to apply it. Verify its
SHA-256 against the external evidence before fetching. Do not execute anything
from the bundle before the audit completes.

## 4. Prerequisites on the M4

Verified, never installed by this package:

- `tmux` — required; the floor is four or seven tmux windows
- `claude` CLI — required
- `git`, `jq`, `shasum` — required
- bash 3.2 or later (the package targets stock macOS bash)

**Prohibited automatic installations:** Homebrew, npm, pip, apt, curl-to-shell,
and any other unattended install. If a prerequisite is missing, the bootstrap
returns `M4_BOOTSTRAP_BLOCKED` naming it, and changes nothing.

## 5. Expected repository identity

The M4 repository path is **configuration, not a guess**. Resolution order:

1. `--repo <path>`
2. `FG_RF_M4_REPO`
3. `expected_repository_identity.default_path` in `config/hosts/m4.json`
   (currently `${HOME}/Projects/foundergate`)

The bootstrap additionally requires the origin remote's basename to equal
`expected_origin_basename` (`foundergate`). A mismatch is
`BOOTSTRAP_REFUSED_WRONG_REPOSITORY`. Edit `config/hosts/m4.json` if the M4
uses a different path; do not edit the check.

## 5a. Physical host enrollment — REQUIRED before any M4 authority

`--host m4` selects a **configuration**. It proves nothing about which computer
is running, and an earlier version of this package allowed a full seven-window
M4 floor with merge authority to start on an M1 against a scratch repository.

Any profile carrying integration authority now additionally requires an
external, signed, hardware-bound enrollment record. `config/hosts/m4.json`
ships with `host_enrollment.enrollment_authority_fingerprint: null`, so **every
M4 authority path fails closed today** with
`HOST_ENROLLMENT_NOT_CONFIGURED`. Enrolling is a host-local, founder-gated
action performed **on the M4**, in this order:

1. On founder-controlled hardware, generate an enrollment authority keypair.
   Keep the private half there. Copy only the `.pub` to the M4 as
   `${HOME}/.foundergate/host-enrollment/m4.enrollment-authority.pub`.
2. On the M4, read its identity read-only:
   `ioreg -rd1 -c IOPlatformExpertDevice | grep -E 'IOPlatformUUID|IOPlatformSerialNumber'`.
3. Write `${HOME}/.foundergate/host-enrollment/m4.enrollment.json` containing
   `{schema, version, host_profile:"m4", hardware:{platform_uuid, serial_number},
   enrolled_at, not_after_epoch}` with those exact values.
4. Back on founder hardware, sign the canonical form:
   `jq -S -c . m4.enrollment.json > body` then
   `ssh-keygen -Y sign -f <enrollment private key> -n foundergate.host-enrollment.v1 body`,
   and place the result at `m4.enrollment.json.sig` on the M4.
5. Paste the enrollment authority key's SHA-256 fingerprint into
   `host_enrollment.enrollment_authority_fingerprint` in `config/hosts/m4.json`.

The package **verifies** this record. It cannot create, sign, or self-approve
one, and no in-repository edit produces M4 authority on a machine that is not
enrolled. Wrong hardware, a wrong host key fingerprint, a missing record, an
expired record, or a record signed by the wrong authority are each a named,
closed refusal. Copying this repository to another machine fails on the
hardware comparison.

## 6. Exact M4 bootstrap command

Verification only, creating nothing:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --host m4 --check --repo <M4_REPO_PATH>
```

After a clean independent audit and explicit founder authorization, supplying
the candidate identity **from the audit's out-of-band evidence**, not from this
repository:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --host m4 --repo <M4_REPO_PATH> \
  --expect-sha <audited commit sha> --expect-tree <audited tree sha> \
  [--expect-bundle-sha256 <sha> --bundle <path>] --allow-start
```

`--allow-start` **refuses** without an external candidate identity
(`BOOTSTRAP_REFUSED_NO_EXTERNAL_IDENTITY`), and refuses if the package worktree
is dirty (`BOOTSTRAP_REFUSED_PACKAGE_WORKTREE_DIRTY`). That second check is
what makes the first meaningful: modifying a package file and regenerating
`PACKAGE_DIGESTS.txt` leaves HEAD untouched but the worktree dirty, and
committing the modification moves HEAD.

The bootstrap refuses, in order: an unknown host profile, a profile without M4
authority, an unenrolled machine, a missing prerequisite, a wrong or missing
repository, a missing or mismatched external candidate identity, a dirty
package worktree, a package version mismatch, a package digest mismatch, a
prompt digest mismatch. Each refusal is named and changes nothing.

**`PACKAGE_DIGESTS.txt` is an INTEGRITY check only.** It ships inside the tree
it describes and cannot establish that this is the audited package. The report
labels it as such.

## 7. M4 authority boundaries

Enforced by `config/hosts/m4.json` and the shared gates:

- The artifact-class table refuses any role writing outside its entry: a
  Builder cannot write a checker verdict, a Checker cannot write advisor state,
  an Advisor cannot write verifier state, a serial writer cannot write a merge
  receipt.
- Serial integration starts only from exact-SHA accepted inputs — a CLEAN
  checker verdict bound to precisely that SHA and tree.
- Only one shared-surface integration writer may hold a lease at a time.
- Final verifier evaluates the exact final tree and SHA; a moved SHA is a
  refusal, not a re-run.
- Merge sheriff cannot produce a merge receipt without a verified host
  enrollment, an exact final PASS, **and** a one-time founder decision receipt
  carrying a valid signature from the pinned founder public key.
- Founder signature, production activation, deployment and destructive actions
  are hard stops on M4 exactly as on M1.
- M4 Terminal-0 remains the human operating position; the floor never claims
  it.

**What is NOT enforced.** Role separation is not a security boundary against a
hostile process running as the same macOS user. All seven role windows run as
one uid; the per-run writer secret at `control/.writer_secret` is readable by
that uid, and an actor who reads it can recompute the role capability
commitments, the artifact MACs, the lease seals, the retry ledger seal and the
event-chain digests. The previous version's claim that "no role can impersonate
another role's state writer" was disproved by audit and has been removed. Treat
role separation as accident resistance plus an audit trail. The one authority
that survives a fully compromised same-user account is the founder receipt.

### The founder decision receipt

**VERIFY here. SIGN elsewhere.** The receipt is a detached SSHSIG signature
produced by an Ed25519 **private** key that lives only on founder-controlled
hardware and never reaches an M1 or an M4. This machine holds the **public**
half only, pinned by SHA-256 fingerprint in the digest-covered host profile.
`FG_RF_FOUNDER_PUBKEY_FILE` may only *locate* a key; a key whose fingerprint
differs from the pin is refused with
`FOUNDER_PUBKEY_FINGERPRINT_MISMATCH`.

There is no signing verb anywhere under `bin/` or `lib/`, and no private key
anywhere in the package. `grep -rn -- '-Y sign' bin lib` returns nothing; the
selftest asserts it.

Founder-side signing procedure:

```bash
jq -S -c 'del(.signature)' receipt.json > body
ssh-keygen -Y sign -f <founder private key> -n foundergate.founder-receipt.v2 body
jq -S --rawfile s body.sig '. + {signature:$s}' receipt.json > signed-receipt.json
```

The signed body must contain exactly these keys, in sorted order, with no
duplicates and nothing extra: `action`, `branch`, `candidate_sha`,
`candidate_tree`, `decision`, `expires_at_epoch`, `host_profile`, `issued_at`,
`issued_at_epoch`, `nonce`, `repository`, `repository_origin`, `run_id`,
`schema`, `signer_fingerprint`, `task_id`, `verification_report_digest`.
Anything else is `FOUNDER_RECEIPT_MALFORMED` before any cryptography runs.

A receipt is spent **once**. Consumption is recorded in the keyed
`control/CONSUMED_RECEIPTS.json` ledger *and* as a `founder_receipt_consumed`
event in the keyed, length-anchored chain. Deleting the ledger does not restore
the receipt: verification then returns
`FOUNDER_RECEIPT_LEDGER_CONSUMED_LEDGER_MISSING` and the gate stays shut.

`config/hosts/m4.json` ships with `founder_trust_root.public_key_fingerprint:
null`, so **the merge gate refuses today** with
`FOUNDER_TRUST_ROOT_NOT_ENROLLED`. Pinning a real fingerprint is a founder
action, not a Builder action.

**The package writes a merge receipt; it never executes a merge.** Receipt
verification performs no git operation at all.

## 8. Required before any M4 activation

1. **Independent audit.** A checker context that did not build this package
   examines the exact committed SHA and tree, runs both selftests, and returns
   a verdict:
   ```bash
   bash tools/role-floor/selftest/role-floor-selftest.sh --json /tmp/role-floor-tests.json
   bash tools/role-floor/selftest/role-floor-security-selftest.sh --json /tmp/role-floor-sec.json
   ```
2. **Live tmux verification.** Re-run both selftests on a host with tmux so the
   live window cases execute instead of skipping.
3. **Physical host enrollment** (§5a). Until it is done, every M4 authority
   path refuses.
4. **Founder verification key enrollment.** Until
   `founder_trust_root.public_key_fingerprint` is pinned, the merge gate
   refuses.
5. **Serial integration.** Registering this package in FounderGate manifests or
   launchers is a shared-surface write. It requires the M4 serial-integration
   role and was deliberately not performed on the M1.
6. **Founder gate.** Activation is a founder decision, taken with a signed
   decision receipt, not by the floor.

## 9. Exact next action after a clean audit

In order, stopping at any refusal:

1. Verify the bundle: `git bundle verify <bundle>`; compare its SHA-256 to the
   external evidence.
2. Fetch the branch into the M4 repository.
3. Run `fg-m4-bootstrap.sh --host m4 --check --repo <M4_REPO_PATH>` and require
   `STATUS: M4_BOOTSTRAP_VERIFIED`.
4. Run the selftest on the M4 with tmux present; require zero failures and no
   skipped live-tmux cases.
5. Open a serial-integration lane for manifest/launcher registration.
6. Take the founder gate before any activation.

## 10. Limitations carried forward

- **Role separation is not a security boundary against a same-user process.**
  See §7. Do not rely on it as one. Separate OS users with ACLs on the run
  root, or separate machines, would be required; neither is implemented.
- The keyed seals (role capabilities, artifact MACs, lease seals, retry ledger,
  event chain, checksum manifest) are keyed with a secret readable by the same
  user. They raise the cost of tampering and make it visible. They do not
  prevent it.
- The external event-chain witness is written by the same user to the same
  machine. It detects careless rewriting; it is not an independent notary.
- The founder verification key fingerprint and the M4 enrollment authority
  fingerprint are pinned in package files. An actor who can rewrite the package
  working tree can rewrite those pins — which is exactly why the M4 bootstrap
  requires an external `--expect-sha`/`--expect-tree` and a clean worktree.
- No role has ever been launched: no real Builder, Checker or Advisor session
  has run through this package.
- The M4 repository path and origin basename are defaults in
  `config/hosts/m4.json` and must be confirmed on the M4.
- **No founder verification key is enrolled and no machine is enrolled.** Both
  pins are `null` in the shipped profiles. The merge gate and every M4
  authority path therefore refuse by construction until a founder enrolls them.
- **Commit-message discrepancy carried forward.** Commit `a891b9b8`'s subject
  says "add M4 role-floor profile and durable handoff"; the commit actually
  contains the `fg_split_noglob` one-writer-control fix in four files. The M4
  profile files were added by `2f18159c`. History was not rewritten because
  both commits are sealed in the original transfer bundle. See the "Record of
  corrections" section of `../README.md`.
