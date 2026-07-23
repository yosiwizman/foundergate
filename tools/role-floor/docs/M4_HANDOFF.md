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

## 6. Exact M4 bootstrap command

Verification only, creating nothing:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --host m4 --check --repo <M4_REPO_PATH>
```

After a clean independent audit and explicit founder authorization:

```bash
bash tools/role-floor/bin/fg-m4-bootstrap.sh --host m4 --repo <M4_REPO_PATH> --allow-start
```

The bootstrap refuses, in order: an unknown host profile, a profile without M4
authority, a missing prerequisite, a wrong or missing repository, a package
version mismatch, a package digest mismatch, a prompt digest mismatch. Each
refusal is named and changes nothing.

## 7. M4 authority boundaries

Enforced by `config/hosts/m4.json` and the shared gates:

- Builder cannot check or approve its own work.
- Checker cannot repair findings or write advisor state.
- Advisor cannot write code or verifier state.
- Serial integration starts only from exact-SHA accepted inputs — a CLEAN
  checker verdict bound to precisely that SHA and tree.
- Only one shared-surface integration writer may hold a lease at a time.
- Final verifier evaluates the exact final tree and SHA; a moved SHA is a
  refusal, not a re-run.
- Merge sheriff cannot produce a merge receipt without an exact final PASS
  **and** a mechanically valid founder decision receipt.
- No role can impersonate another role's state writer.
- Founder signature, production activation, deployment and destructive actions
  are hard stops on M4 exactly as on M1.
- M4 Terminal-0 remains the human operating position; the floor never claims
  it.

The founder decision receipt is signed with a key at
`${FG_RF_FOUNDER_KEY_FILE}` (default `${HOME}/.foundergate/founder_receipt.key`),
which lives outside the package and outside the run root. The floor can verify
a receipt. It has no way to mint one. **The package writes a merge receipt; it
never executes a merge.**

## 8. Required before any M4 activation

1. **Independent audit.** A checker context that did not build this package
   examines the exact committed SHA and tree, runs the selftest, and returns a
   verdict. Suggested command:
   ```bash
   bash tools/role-floor/selftest/role-floor-selftest.sh --json /tmp/role-floor-tests.json
   ```
2. **Live tmux verification.** tmux was **not installed** on the build machine.
   Every tmux behaviour in this package is proven against a recording stub, not
   against a live tmux server. The M4 audit must re-run the selftest on a host
   with tmux so the live four-window and seven-window cases execute instead of
   skipping.
3. **Serial integration.** Registering this package in FounderGate manifests or
   launchers is a shared-surface write. It requires the M4 serial-integration
   role and was deliberately not performed on the M1.
4. **Founder gate.** Activation is a founder decision, taken with a decision
   receipt, not by the floor.

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

- No live tmux verification on the build machine (see §8.2).
- No role has ever been launched: no real Builder, Checker or Advisor session
  has run through this package.
- The M4 repository path and origin basename are defaults in
  `config/hosts/m4.json` and must be confirmed on the M4.
- The founder receipt key file does not exist yet; the merge gate therefore
  refuses by construction until the founder creates one.
