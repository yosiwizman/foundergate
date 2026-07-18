# OpenSandbox Phase 6 — Result (public-repo intake runtime spike)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). **Runtime:** patched `opensandbox-server==0.2.1` inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM, destroyed after capture. **Isolation:** runc (no microVM/hardened/production claim). **M1 not contacted** (state founder-relayed). `main` unmodified (`e1ca1989…`). Public fixture `pypa/sampleproject` (open-source; not customer code).

Claim classes: VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN.

## PROVEN BY THIS SPIKE
- Public URL → **exact commit** `621e4974…` bound BEFORE acquisition (git ls-remote HEAD); **exact-commit archive** only. [VERIFIED-RUNTIME]
- **Archive SHA-256** `fd8597e4…`; host-allowlisted transport (`codeload.github.com`, no cross-host redirect); bounded (5978 B); pre-extraction validation clean. [VERIFIED-RUNTIME+DISK]
- **Canonical manifest** (12 files) `649ecb02…`; **in-sandbox recomputed manifest == Pro manifest**, and **still matches after compile + bytecode cleanup**. [VERIFIED-RUNTIME]
- **Safe extraction** + archive-entry validation (absolute/traversal/symlink/hardlink/device/duplicate/case-collision/size/count) fail-closed. [VERIFIED-RUNTIME]
- **No Pro-side repository code execution**; inside the sandbox **only** `python -m compileall` ran → exit 0 → **COMPILEABILITY_OBSERVED**. No `setup.py`/`pip`/build/tests/scripts/entry-points/Makefile/CI. [VERIFIED-RUNTIME]
- **Loopback-only port binding reproven** (GUARD_PASS; sidecar 44772/8080/18080 → 127.0.0.1). **Default-deny egress** (example.com + direct IPv4/IPv6 denied; nft `policy drop`). **Docker socket blocked** (absent, no API, no CLI); **no host mounts / no macOS path / no FG source**. [VERIFIED-RUNTIME+DOCKER-METADATA]
- **Provider-neutral evidence** (adapter returned observations; no provider-field leak; no founder-acceptance field). **Sandbox teardown**, **source-snapshot deletion**, and **VM destruction** all proven. [VERIFIED-RUNTIME+VM-METADATA]
- **M1 not contacted**; **remote main unchanged** (`e1ca1989`) at all three checkpoints; **M1_PUSH_TRIGGER_RISK NONE**. [VERIFIED-RUNTIME]

## NOT PROVEN
- **REPOSITORY BUILD — NOT PROVEN.** **REPOSITORY TESTS — NOT PROVEN.** Only byte-compilation was observed.
- runc is not a microVM/kernel boundary; production/customer readiness not claimed. [CONTRADICTED as a claim / UNVERIFIED]
- Forensic erasure of the snapshot/VM disk — only observable-state removal. [UNKNOWN]
- Private-repository intake — out of scope / not authorized. [UNKNOWN]

## SOURCE-ACQUISITION FINDINGS
`git ls-remote HEAD` cleanly yields a 40-hex commit with no auth; codeload serves the exact-commit tarball directly (single URL, no redirect). Host-allowlist + bounded streaming worked.

## EXACT-COMMIT FINDINGS
The default HEAD was resolved to one immutable commit and every downstream artifact bound to it; no branch/mutable-tag archive was used.

## ARCHIVE-VALIDATION FINDINGS
All structural attacks are rejected before extraction (proven by 14 synthetic-tar unit tests + the live clean scan). Symlinks are rejected outright for this first runtime spike.

## SNAPSHOT-DIGEST FINDINGS
Archive digest and canonical-manifest digest are stable and reproduced identically inside the sandbox and after cleanup — the immutable snapshot identity held end-to-end.

## SANDBOX FINDINGS
Governed sandbox: `Privileged=false`, `CapAdd=null`, no host bind mounts (only the Docker named execd-staging volume), no docker socket, workload root (recorded risk).

## COMPILEABILITY FINDINGS
`python -m compileall` exit 0 on `src/` — the tree byte-compiles. This is **not** build or test success.

## EGRESS FINDINGS
`dns+nft` default-deny with an empty allowlist blocked DNS, HTTPS, direct IPv4, and IPv6. Not called "secure".

## DELETION FINDINGS
VM-side snapshot and the Pro acquisition root were deleted and proven absent under observable filesystem state (not forensic erasure).

## CROSS-MACHINE FINDINGS
The Pro spike ran fully in an isolated branch/worktree while the M1 soak was (founder-reported) running; remote main never changed; no self-hosted runner; the M1 was never contacted.

## REMAINING RISKS
1. Patch is FounderGate-local (Phase-4.1); re-verify on each OpenSandbox upgrade (MEDIUM). 2. runc only; root-in-container. 3. First path is public-only; private-repo path unbuilt. 4. Only compileability observed — build/test/run semantics are a later, separately-gated question.

## RECOMMENDATION
**PROCEED_TO_FOUNDER_URL_DROP_UI_PROTOTYPE** (design only). The public URL → exact commit → immutable snapshot → disposable sandbox → compileability-observed → teardown → deletion → VM-destruction path is proven end-to-end for this fixture, checker pending, with default-deny egress, loopback-only binding, Docker-socket block, no host mounts, provider-neutral evidence, and no repository-defined execution. This authorizes only a later founder-facing URL-drop prototype — **not** customer use, private repositories, adoption, production integration, or merge.
