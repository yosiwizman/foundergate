# OpenSandbox Phase 5 — Customer-Intake Design Decision Packet

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). **DESIGN + ISOLATED PROTOTYPE ONLY — no runtime, no network, no customer repository, no customer execution.** **Independent checker: CHECKER-CLEAN (21/21; 22/22 prototype tests; all falsification failed).** M1/AKIOR/WRX90 untouched; VB2 soak not started; `main` unmodified (`e1ca1989…`, clean); PR #151–#155 untouched (open drafts).

**Pins:** base = PR#155 head `900fa8f01148bd54da665f0060baa16a0a9754ad` · OpenSandbox `192b5bf5…` (tested candidate, not adopted) · future M1 evaluated SHA `b9af1def…` (NOT STARTED).

## Determinations
| Determination | Value |
|---|---|
| PUBLIC_GITHUB_URL_INTAKE_CONTRACT_DEFINED | **YES** |
| EXACT_COMMIT_BINDING_DEFINED | **YES** |
| IMMUTABLE_SNAPSHOT_DIGEST_DEFINED | **YES** |
| PATH_TRAVERSAL_FAIL_CLOSED | **YES** |
| UNSAFE_SYMLINK_FAIL_CLOSED | **YES** |
| SIZE_LIMIT_FAIL_CLOSED | **YES** |
| SECRET_INDICATOR_HOLD_DEFINED | **YES** |
| PRIVATE_REPOSITORY_PATH_AUTHORIZED | **NO** |
| CUSTOMER_CODE_EXECUTION_AUTHORIZED | **NO** |
| PROVIDER_ACCEPTANCE_BLOCKED | **YES** |
| CUSTOMER_INTAKE_PROTOTYPE_PROVEN | **YES** (22/22 tests) |
| CROSS_MACHINE_PARALLELISM_READY | **YES** |
| M1_PUSH_TRIGGER_RISK | **NONE** |
| PRODUCTION_INTEGRATION_AUTHORIZED | **NO** |
| OPENSANDBOX_ADOPTION_AUTHORIZED | **NO** |
| MAIN_MERGE_AUTHORIZED | **NO** |

## Basis
- **Intake contract** (`CUSTOMER_REPOSITORY_INTAKE_CONTRACT.md` + `contract.py`): 12 operations; a URL is not identity — the **exact commit SHA** is, and an **immutable snapshot digest** is required. Fail-closed rejects (SSH/`file://`/non-GitHub/`http`/embedded+query credentials, path traversal, absolute paths, unsafe symlinks, over-size/count, mutable-ref mismatch, missing digest) and HOLDs (secret-like files, submodules, LFS; private → rejected in the public path). Only four statuses; never safe/secure/accepted.
- **GitHub URL design** (`GITHUB_URL_INTAKE_DESIGN.md`): explicit untrusted-input posture; no code executes during intake; private path documented PLANNED/NOT-AUTHORIZED with option trade-offs.
- **Trust boundaries + evidence model**: no customer repo mounted from the live FounderGate FS or home/src; disposable acquisition workspace; four separated authority layers (source observation / policy / checker / founder acceptance) — no provider writes founder acceptance.
- **Cross-machine lane contract**: supersedes the global Pro-freeze; M1 uses a detached exact SHA with no git-write during the active run; a Pro branch commit cannot move the M1 detached HEAD; `main` must not merge during the soak; collision rule + 5 cases verified; **M1_PUSH_TRIGGER_RISK NONE** (0 self-hosted runners; GitHub-hosted workflows; selftests push=main-only).

## Recommendation: **PROCEED_TO_PUBLIC_REPO_INTAKE_RUNTIME_SPIKE**
All PROCEED conditions met: checker clean; exact-commit binding; immutable digest; traversal/symlink/size fail-closed; provider acceptance blocked; isolated prototype passed (22/22); cross-machine parallelism READY; M1 push-trigger risk NONE. **This authorizes only a later, bounded public-repo intake runtime spike — not customer use, adoption, M1 execution, or merge.** A future public-repo runtime spike must run in a disposable host with default-deny egress, acquire only an exact-commit immutable snapshot into a disposable workspace, and keep the OpenSandbox loopback-bind patch (Phase 4.1) in force. The founder gate remains.

## Claim classes
VERIFIED-DESIGN · VERIFIED-PROTOTYPE (tests) · PARTIALLY-VERIFIED · UNVERIFIED · UNKNOWN (no "PASS"; no runtime evidence this phase).
