# Hybrid Local Exact-SHA CI Provider V1 (provider-neutral, no GitHub-hosted runner)

Two mandatory layers bound to ONE exact-SHA source of the same repository tree:
- **Layer A — Mac full suite:** the COMPLETE repository selftest suite on the founder-controlled
  Mac Mini Pro from a disposable git worktree at the exact SHA (host-coupled infra tests execute).
- **Layer B — Docker portable:** the PR-relevant PORTABLE tests inside a network-DISABLED,
  read-only-rootfs, no-secret, no-mount container from the SAME exact-SHA git archive (tmpfs).

A PASS requires BOTH layers to pass. No GitHub billing/hosted-runner is used; NO persistent
GitHub self-hosted runner is registered (ephemeral local execution only). Docker exclusions are
limited to mechanically host-dependent tests that execute on the Mac (see test-manifest.v1.json).

Runner: `hybrid-exact-sha-ci.sh <repo> <full-40hex-sha> <docker-portable-cmd> <evidence-dir>`.
Evidence packets: `.foundergate/evidence/hybrid-ci/pr182-packet.json`, `pr183-packet.json`.
