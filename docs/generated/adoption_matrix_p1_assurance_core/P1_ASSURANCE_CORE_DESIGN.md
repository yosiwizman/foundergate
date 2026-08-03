# P1 Assurance Core — Design (local synthetic)

All 20 P1 structures are implemented as deterministic local records in `src/assurance_core/assurance-core.mjs`
(no network, no provider call, no credentials). Determinism: every record is a pure function of its inputs;
callers pass timestamps/ids explicitly; fingerprints are sha256 over canonical key-sorted JSON.

| # | P1 structure | Function(s) | Fail-closed behavior |
| ---: | --- | --- | --- |
| 1 | AI System Configuration Manifest | `makeConfigManifest` / `validateConfigManifest` | rejects real-provider-enabled, missing ids, tampered fingerprint |
| 2 | Context Provenance Record | `makeContextProvenance` / `validateContextProvenance` | rejects empty or non-local sources |
| 3 | Evaluation Dataset Governance | `evaluationDatasetGovernance` | **PLANNED_WITH_SCHEMA** — no real dataset; real/customer data blocked |
| 4 | Security Finding → Validation → Patch → Acceptance | `securityFindingLifecycle` | HOLD if accepted-without-validation or no actor separation |
| 5 | Function Preservation Verification | `functionPreservation` | HOLD_MISSING if before/after absent; CHANGED if behavior differs |
| 6 | Independent Checker Verification | `independentCheckerRecord` | HOLD if checker == builder |
| 7 | Mutation / Falsification Testing | `mutationFalsificationRecord` | HOLD if any hostile case is not fail-closed |
| 8 | Model & Provider Qualification | `providerQualification` | real provider → HOLD_REQUIRES_FOUNDER_GATE; cannot self-certify |
| 9 | Tool Capability Classification | `classifyTool` | UNKNOWN/network/privileged → not allowed |
| 10 | MCP Capability Classification | `classifyMcp` | UNKNOWN/network/privileged → not allowed |
| 11 | Agent Action Trace | `newActionTrace` / `recordAction` / `validateActionTrace` | HOLD if a forbidden action is recorded |
| 12 | Evidence Confidence Model | `evidenceConfidence` | NONE (rejected) when artifact or tests missing |
| 13 | Risk Budget Framework | `riskBudget` | EXCEEDED_FAIL_CLOSED on any spend or network call |
| 14 | Scan Completeness States | `scanCompleteness` | COMPLETE / PARTIAL / UNKNOWN (never assumes complete) |
| 15 | Threat Model Versioning | `threatModelVersion` | records version (FG-TM-2026.08.03) |
| 16 | Security Patch Safety Validation | `patchSafetyValidation` | HOLD unless independently validated AND preservation proven |
| 17 | Exact AI Configuration Fingerprinting | `exactConfigFingerprint` | deterministic sha256 over config material |
| 18 | Provider-Neutral Security Interface | `providerNeutralInterface` | labels SIMULATED / REAL-DISABLED; can_self_certify=false |
| 19 | Immutable Context Snapshot | `makeImmutableContextSnapshot` / `verifyImmutableSnapshot` | frozen; HOLD when content hash changes |
| 20 | AI Runtime Manifest | `makeRuntimeManifest` / `validateRuntimeManifest` | HOLD if real provider enabled, no config binding, or invalid scan state |

**Coverage:** 19 integrated locally, **1 planned** (Evaluation Dataset Governance = PLANNED_WITH_SCHEMA, because no real
dataset exists and real/customer data is blocked). Evidence: self-test 18/18, falsification 12/12, UI panel + headed proof.
