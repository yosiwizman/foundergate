# FounderGate Phase 7 — Founder URL-Drop UI Decision Packet

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`). Founder-facing **witness candidate**, not an accepted product surface. **Phase-6 Advisor: PASS. Phase-7 independent checker: CHECKER-CLEAN (24/24; tests: urldrop 16, intake 55, patch-guard 7).** M1 not contacted (founder-relayed RUNNING); `main` unmodified (`e1ca1989…`) at all checkpoints; PR #151–#157 untouched.

## Determinations
| Determination | Value |
|---|---|
| PHASE6_ADVISOR | **PASS** |
| UI_READS_REAL_OR_LABELED_STATE | **YES** (missing→UNKNOWN, stale→STALE, no invented green) |
| FIXED_FIXTURE_RESTRICTION_ENFORCED | **YES** (only pypa/sampleproject runs live) |
| GENERAL_PUBLIC_REPO_EXECUTION | **HELD** |
| PRIVATE_REPOSITORY_SUPPORT | **NO** (refused) |
| CUSTOMER_CODE | **NONE** |
| LIVE_UI_TO_RUNTIME_PROVEN | **YES** (fresh run: GUARD_PASS, egress DENIED, socket ABSENT, compileall 0, teardown, VM destroyed) |
| EXACT_COMMIT_DISPLAYED | **621e4974…** |
| SNAPSHOT_FINGERPRINT_DISPLAYED | archive `fd8597e4…` / manifest `649ecb02…` (12 files) |
| COMPILEABILITY_OBSERVED | **YES** |
| BUILD_PROVEN | **NO** · TESTS_PROVEN **NO** · SECURITY_PROVEN **NO** · PRODUCTION_READY **NO** |
| DOCKER_SOCKET_BLOCKED | **YES** · HOST_MOUNTS_ABSENT **YES** · LOOPBACK_BINDING **YES** |
| DEFAULT_DENY_EGRESS | **YES** |
| SNAPSHOT_DELETION / VM_DESTRUCTION | **YES / YES** |
| PLAYWRIGHT/BROWSER_PROOF | **YES** (20 assertions; 1 correction cycle) |
| ACCESSIBILITY_EVIDENCE / FALSE_GREEN_REPORT | **YES / YES** |
| PATCH_MAINTENANCE_GUARD | **YES** (fails closed; retest required on upgrade) |
| M1_NOT_CONTACTED / REMOTE_MAIN_UNCHANGED / RUNNER_RISK | **YES / YES / NONE** |
| OPENSANDBOX_ADOPTION / PRODUCTION_INTEGRATION / MAIN_MERGE | **NO / NO / NO** |

## Correction cycles
**1** (browser proof caught the Pause-modal `[hidden]` CSS override; fixed + re-verified). No three-cycle blocking failure.

## Recommendation
**READY-FOR-FOUNDER-WITNESS.** The founder-facing URL-drop prototype reads real exact-commit/fingerprint/compileability evidence for the one fixed public fixture, enforces the fixed-fixture restriction (others HELD; private refused), fails closed (UNKNOWN/STALE), and honestly labels build/tests/security/production as **not proven**. Independent Advisor + checker clean; runtime torn down; VM destroyed; M1 untouched; main unmerged. This authorizes a **founder witness of human perception/usability only** — not product acceptance, adoption, production integration, general public-repository execution, private repositories, customer code, or a main merge.
