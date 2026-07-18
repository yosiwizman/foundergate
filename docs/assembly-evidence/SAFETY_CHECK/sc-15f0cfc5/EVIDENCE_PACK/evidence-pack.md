# FounderGate Evidence Pack — Design Partner Edition

**Run ID:** `sc-15f0cfc5` · **Repository:** pypa/sampleproject · **Exact commit:** `621e4974ca25ce531773def586ba3ed8e736b3fc`

| Fingerprint | Value |
|---|---|
| archive SHA-256 | `fd8597e4d351a9fd42007f48339dc93ee6469d8555fd0ff24906c69905357c01` |
| snapshot SHA-256 | `649ecb02d79d5cee55c86549b6dff26fb341c4a4de6d3c92d959c42714b6e7de` |

## Claims
- **compileability:** OBSERVED
- **build:** NOT_PROVEN
- **tests:** NOT_PROVEN
- **security:** NOT_PROVEN
- **production_readiness:** NOT_PROVEN
- **network_isolation:** OBSERVED (default-deny; example.com denied)
- **docker_socket:** OBSERVED (absent)
- **host_mounts:** OBSERVED (none; only provider execd-staging volume)
- **port_binding:** OBSERVED (loopback-only)
- **in_sandbox_manifest_match:** PROVEN
- **teardown:** PROVEN (session gone)
- **snapshot_deletion:** PROVEN (removed under observable state)
- **vm_destruction:** PROVEN (instance removed)
- **general_public_execution:** HELD
- **private_repositories:** REFUSED

## Limitations
- compileability observed only — build/tests/security/production NOT proven
- runc standard container (not microVM)
- OpenSandbox tested, not adopted
- deletion is observable-state, not forensic erasure
- fixed public evaluation fixture only

## Environment
disposable Ubuntu 24.04 ARM64 (Lima/VZ) on Apple M4 Pro; patched opensandbox-server 0.2.1 (loopback)

## Checker
independent Phase-7.1 checkers — PENDING (see integration report)

> This is an evidence packet, not a certification.

_FounderGate Evidence Pack — evidence of the named checks on the exact recorded version; not a security, compliance, production-readiness, or bug-free certification._
