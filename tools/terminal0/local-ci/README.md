# Hybrid Local Exact-SHA CI Provider V1 (provider-neutral, no GitHub-hosted runner)

Two mandatory layers bound to ONE exact-SHA source of the same repository tree:
- **Layer A — Mac full suite:** the COMPLETE repository selftest suite on the founder-controlled
  Mac Mini Pro from a disposable **git checkout at the exact SHA** (a real `.git` is required so
  host-coupled + git-provenance infra tests execute).
- **Layer B — Docker portable:** the PR-relevant PORTABLE tests inside a network-DISABLED,
  read-only-rootfs, no-secret, no-mount container built from the SAME exact-SHA `git archive`
  extracted into tmpfs.

A PASS requires BOTH layers to pass. No GitHub billing/hosted-runner is used; NO persistent
GitHub self-hosted runner is registered (ephemeral local execution only). Docker exclusions are
limited to mechanically host-dependent tests that execute on the Mac (see `test-manifest.v1.json`).

## Governance
The PR #185 governance clarification is **merged and ACTIVE** on protected `main`
(`.foundergate/governance/local_exact_sha_ci_clarification.json`, `status: "ACTIVE"`,
`authority_model.authoritative_ref = refs/heads/main`). Qualifying ephemeral local exact-SHA CI
MAY satisfy the `exact_sha_ci_green` evidence predicate **only when all 17 controls are proven**.
Local CI is **not** the default provider. Test evidence is **not** merge authority and **not**
production-readiness proof. Every PR still requires its own founder merge gate. This PR (#184)
remains **open and unmerged**.

## Runner
`hybrid-exact-sha-ci.sh <repo> <full-40hex-sha> <docker-portable-cmd> <evidence-dir>`

The runner acquires the exact SHA via a disposable `git worktree` (the correct primitive for a raw
SHA), runs Layer A, extracts the same exact-SHA `git archive` into a network-disabled container for
Layer B, re-verifies the tree fingerprint, tears down, and writes real `mac.log`, `docker.log`,
and `summary.txt` into `<evidence-dir>`. (The committed evidence for PR #182/#183 was produced with
an equivalent `git clone --branch <exact-head>` acquisition, tree-fingerprint-verified identical,
because this Terminal-0 session's hardened firewall blocks `git worktree add`; see the evidence
index `acquisition_note`.)

## Committed evidence (what is actually in this PR)
- **Evidence packets** (schema `hybrid-local-ci-evidence-packet-2`):
  `.foundergate/evidence/hybrid-ci/pr182-packet.json`, `pr183-packet.json`. Mac/Docker totals in
  each packet are **parsed from the committed raw logs** and each log is bound by SHA-256.
- **Raw run transcripts** (real, committed): `.foundergate/evidence/hybrid-ci/raw/`
  `pr182-mac-fullsuite.log`, `pr182-docker-portable.log`, `pr183-mac-fullsuite.log`,
  `pr183-docker-portable.log`.
- **Evidence index:** `.foundergate/evidence/hybrid-ci/pr184-evidence-index.json`.
- **Generator** (`gen-evidence-packets.mjs`) is repository-neutral: it takes `<repo-root>` and
  `<raw-log-dir>` as validated CLI arguments and fails closed on a missing/invalid input — no
  hardcoded username, home directory, or author worktree path.

Reproduce packets: `node tools/terminal0/local-ci/gen-evidence-packets.mjs <repo-root> <raw-log-dir>`
(deterministic for equivalent inputs).
