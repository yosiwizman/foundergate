# OpenSandbox Phase 6 — Public-Repo Intake Runtime Spike Decision Packet

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). Live runtime inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM (patched `opensandbox-server==0.2.1`), destroyed after capture. **Independent checker: CHECKER-CLEAN (27/27; 36/36 tests; all falsifications failed).** runc (no microVM/hardened/production claim). Public fixture `pypa/sampleproject` (not customer code). **M1 not contacted** (founder-relayed RUNNING); `main` unmodified (`e1ca1989…`).

**Pins:** base = PR#156 head `e1147c50eb9b7f3bef17c6760556a0f52964df13` · exact source commit `621e4974ca25ce531773def586ba3ed8e736b3fc` · archive sha256 `fd8597e4…` · canonical manifest sha256 `649ecb02…` · images `execd@sha256:1dc98c7d…` `egress@sha256:973130e0…` `python@sha256:db3ff2e1…`.

## Determinations
| Determination | Value |
|---|---|
| PUBLIC_GITHUB_SOURCE_RESOLUTION_PROVEN | **YES** |
| EXACT_COMMIT_BINDING_PROVEN | **YES** |
| EXACT_COMMIT_ARCHIVE_ACQUIRED | **YES** |
| ARCHIVE_SHA256_PROVEN | **YES** |
| ARCHIVE_ENTRY_VALIDATION_PROVEN | **YES** |
| SAFE_EXTRACTION_PROVEN | **YES** |
| CANONICAL_MANIFEST_PROVEN | **YES** |
| SNAPSHOT_TRANSFER_PROVEN | **YES** |
| IN_SANDBOX_MANIFEST_MATCH_PROVEN | **YES** |
| NO_PRO_SIDE_REPOSITORY_CODE_EXECUTION | **YES** |
| COMPILEABILITY_OBSERVED | **YES** |
| REPOSITORY_BUILD_PROVEN | **NO** |
| REPOSITORY_TESTS_PROVEN | **NO** |
| DEFAULT_DENY_EGRESS_PROVEN | **YES** |
| DOCKER_SOCKET_BLOCKED | **YES** |
| HOST_MOUNTS_ABSENT | **YES** |
| LOOPBACK_ONLY_BINDING_REPROVEN | **YES** |
| PROVIDER_ACCEPTANCE_BLOCKED | **YES** |
| SANDBOX_TEARDOWN_PROVEN | **YES** |
| SOURCE_SNAPSHOT_DELETION_PROVEN | **YES** |
| VM_DESTRUCTION_PROVEN | **YES** |
| M1_NOT_CONTACTED | **YES** |
| REMOTE_MAIN_UNCHANGED_DURING_SPIKE | **YES** |
| M1_PUSH_TRIGGER_RISK | **NONE** |
| CUSTOMER_CODE_EXECUTION_AUTHORIZED | **NO** |
| PRIVATE_REPOSITORY_INTAKE_AUTHORIZED | **NO** |
| OPENSANDBOX_ADOPTION_AUTHORIZED | **NO** |
| PRODUCTION_INTEGRATION_AUTHORIZED | **NO** |
| MAIN_MERGE_AUTHORIZED | **NO** |

## Recommendation: **PROCEED_TO_FOUNDER_URL_DROP_UI_PROTOTYPE**
All PROCEED conditions are met: checker clean; exact-commit binding; exact-commit archive + SHA-256; archive validation; canonical-manifest match (in-sandbox == Pro, before and after compile+cleanup); snapshot transfer; **compileability observed only** (compileall exit 0; build/tests explicitly NOT proven); **no Pro-side repository execution**; default-deny egress; Docker socket blocked; no host mounts; loopback-only binding; provider acceptance blocked; sandbox teardown; source-snapshot deletion; VM destruction; **M1 not contacted**; **remote main unchanged** at every checkpoint; **M1_PUSH_TRIGGER_RISK NONE**.
This authorizes **only a later founder-facing URL-drop prototype** — **not** customer use, private repositories, adoption, production integration, or merge. The Phase-4.1 patch remains FounderGate-local (re-verify on OpenSandbox upgrades); runc/root-in-container hardening and build/test semantics remain separate, later, gated questions. The founder gate remains.

## Claim classes
VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN (no "PASS").
