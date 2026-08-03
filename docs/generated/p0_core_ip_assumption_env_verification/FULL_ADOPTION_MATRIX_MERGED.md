# FULL Adoption Matrix — MERGED (new P0/P1/P2/P3 governance primitives + prior 160-item P1–P10)

## Provenance
- **Part 1 (below, IDs G001–G082):** the NEW P0/P1/P2/P3 governance-primitive list, quoted **verbatim** from this run's operator prompt, each mapped to an implementation file + test + status.
- **Part 2:** the prior **160-item P1–P10** adoption matrix is **carried forward** from run/adoption-matrix-p1-assurance-core (`docs/generated/adoption_matrix_p1_assurance_core/FULL_ADOPTION_MATRIX_160.md`, in-repo). Its per-priority totals are reproduced below; no item is dropped.

## Part 1 — status totals (new governance list: 82 items)

| Status | Count |
| --- | ---: |
| INTEGRATED | 65 |
| PARTIAL | 14 |
| NOT_YET | 2 |
| BLOCKED_BY_FOUNDER_GATE | 1 |
| COMMERCIAL_FUTURE | 0 |
| **TOTAL (new)** | **82** |

## Part 1 — per-priority

| Priority | INTEGRATED | PARTIAL | NOT_YET | BLOCKED | COMMERCIAL | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P0_CORE_IP | 56 | 2 | 0 | 0 | 0 | 58 |
| P1_ASSURANCE | 8 | 2 | 0 | 0 | 0 | 10 |
| P2_COMMERCIAL_DIFFERENTIATOR | 0 | 5 | 2 | 1 | 0 | 8 |
| P3_LONG_TERM_IP | 1 | 5 | 0 | 0 | 0 | 6 |

## Part 1 — full item table

| ID | Item | Priority | Status | Impl file | Test | Evidence basis | Required next proof | This run implemented |
| --- | --- | --- | --- | --- | --- | --- | --- | :---: |
| G001 | Independent evidence collection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | tests/core_ip/core-ip-primitives.selftest.mjs | independentEvidenceRecord; selftest 1 | wire into every run | YES |
| G002 | Deterministic verification | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 5,6 | baseline/candidate + discriminating tests | keep | YES |
| G003 | Failure intelligence | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 9-12 | fingerprint + retry budget + churn | keep | YES |
| G004 | Durable planning | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 13,14 | plan ledger + stable IDs + selective invalidation | persist ledger | YES |
| G005 | Admission control | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 15-17 | admission gate + budget + deadline | keep | YES |
| G006 | Scope governance | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 18,19 | scope declaration/verification/diff | keep | YES |
| G007 | Runtime governance | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest 20,21 | checkpoint/cancellation/cleanup | keep | YES |
| G008 | Deterministic outer controller | P0_CORE_IP | PARTIAL | src/core_ip/core-ip-primitives.mjs | core-ip bonus | innerOuterLoop + evidenceDrivenController records | wire as always-on driver | YES |
| G009 | Assumption verification engine | P0_CORE_IP | INTEGRATED | src/assumption_verification/assumption-engine.mjs | tests/assumption_verification/assumption-engine.selftest.mjs | 10 assumptions verified; package | keep | YES |
| G010 | Evidence over self-report | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | independentEvidenceRecord | keep | YES |
| G011 | Exact-state evidence binding | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | exactStateBinding | keep | YES |
| G012 | Evidence staleness detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | detectEvidenceStaleness | keep | YES |
| G013 | Independent artifact verification | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | verifyArtifactIndependently | keep | YES |
| G014 | Producer/Verifier disagreement recording | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | recordProducerVerifierDisagreement | keep | YES |
| G015 | Verification bound to immutable state | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | bindVerificationToImmutableState | keep | YES |
| G016 | Baseline vs candidate verification | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | baselineVsCandidateVerification | keep | YES |
| G017 | Discriminating tests | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | discriminatingTestRecord | keep | YES |
| G018 | Tests that fail against previous version | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | discriminatingTestRecord | keep | YES |
| G019 | Acceptance predicates | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | acceptancePredicate | keep | YES |
| G020 | Verification before acceptance | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | verifyBeforeAcceptance | keep | YES |
| G021 | Verification after mutation | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | verifyAfterMutation | keep | YES |
| G022 | Failure fingerprinting | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | failureFingerprint | keep | YES |
| G023 | Retry budget per fingerprint | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | retryBudgetForFingerprint | keep | YES |
| G024 | Retry only after material state change | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | requireMaterialStateChangeBeforeRetry | keep | YES |
| G025 | Failed hypothesis detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | detectFailedHypothesis | keep | YES |
| G026 | Unknown as first-class state | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | classifyFailure | keep | YES |
| G027 | Failure classification engine | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | classifyFailure | keep | YES |
| G028 | No-progress detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | detectNoProgress | keep | YES |
| G029 | Churn detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | detectChurn | keep | YES |
| G030 | Durable plan ledger | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | durablePlanLedgerEntry | persist | YES |
| G031 | Stable step IDs | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | stableStepId | persist | YES |
| G032 | Step dependencies | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | stepDependencyRecord | persist | YES |
| G033 | Required evidence per step | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | requiredEvidencePerStep | persist | YES |
| G034 | Selective plan invalidation | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | selectivePlanInvalidation | persist | YES |
| G035 | Resume from checkpoint | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | resumeCheckpointRecord | persist | YES |
| G036 | One bounded action per iteration | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | boundedActionIteration | persist | YES |
| G037 | Admission Gate | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | admissionGateDecision | keep | YES |
| G038 | Active run detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | activeRunDetectionRecord | keep | YES |
| G039 | Duplicate detection | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | duplicateDetectionRecord | keep | YES |
| G040 | Budget reservation | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | budgetReservation | keep | YES |
| G041 | Cross-run budgets | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | crossRunBudgetRecord | keep | YES |
| G042 | Wall-clock deadline | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | wallClockDeadlineRecord | keep | YES |
| G043 | External supervisor ownership | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | externalSupervisorOwnership | keep | YES |
| G044 | Scope declaration | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | scopeDeclaration | keep | YES |
| G045 | Scope authorization | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | scopeAuthorizationRecord | keep | YES |
| G046 | Scope verification | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | scopeVerification | keep | YES |
| G047 | Actual diff verification | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | actualDiffVerificationRecord | keep | YES |
| G048 | Pre-acceptance scope validation | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | preAcceptanceScopeValidation | keep | YES |
| G049 | Post-execution scope validation | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | postExecutionScopeValidation | keep | YES |
| G050 | Checkpoint persistence | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | checkpointPersistenceRecord | keep | YES |
| G051 | Outcome-aware retention | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | outcomeAwareRetentionDecision | keep | YES |
| G052 | Cancellation persistence | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | cancellationPersistenceRecord | keep | YES |
| G053 | Cancellation as supervisor action | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | supervisorCancellationRecord | keep | YES |
| G054 | Side-effect-aware cleanup | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip selftest | sideEffectAwareCleanupRecord | keep | YES |
| G055 | Inner AI Loop | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip bonus | innerOuterLoopRecord | keep | YES |
| G056 | Outer Deterministic Loop | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip bonus | innerOuterLoopRecord (authority=outer) | wire as driver | YES |
| G057 | Evidence-driven outer controller | P0_CORE_IP | PARTIAL | src/core_ip/core-ip-primitives.mjs | core-ip bonus | evidenceDrivenControllerDecision | always-on | YES |
| G058 | Human authority outside the AI loop | P0_CORE_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip bonus | humanAuthorityOutsideAiLoopRecord | keep | YES |
| G059 | Environment integrity verification | P1_ASSURANCE | INTEGRATED | src/environment_integrity/environment-integrity.mjs | tests/environment_integrity/environment-integrity.selftest.mjs | 8 checks + seal (local; NOT real isolation) | real isolation harness (gated) | YES |
| G060 | Execution integrity verification | P1_ASSURANCE | INTEGRATED | src/execution_integrity/execution-integrity.mjs | tests/execution_integrity/execution-integrity.selftest.mjs | 10 checks; fails closed (local; NOT real sandbox) | real sandbox proof (gated) | YES |
| G061 | Continuous boundary monitoring | P1_ASSURANCE | INTEGRATED | src/boundary_monitoring/boundary-monitor.mjs | tests/boundary_monitoring/boundary-monitor.selftest.mjs | 8 dimensions; drift→PAUSE/STOP/QUARANTINE | live monitor (gated) | YES |
| G062 | Automatic containment | P1_ASSURANCE | INTEGRATED | src/containment/containment-decision.mjs | tests/containment/containment-decision.selftest.mjs | decision + evidence-before-shutdown | live enforcement (gated) | YES |
| G063 | Trust verification / Evidence confidence | P1_ASSURANCE | INTEGRATED | src/assurance_core/evidence-confidence.mjs | tests/assurance_core/evidence-confidence.selftest.mjs | evidence-only (NOT AI confidence) | cross-run scoring | YES |
| G064 | Context provenance | P1_ASSURANCE | INTEGRATED | src/assurance_core/ai-assurance-records.mjs | evidence-confidence selftest 30 | contextProvenanceRecord | bind to real retrieval | YES |
| G065 | AI configuration manifest | P1_ASSURANCE | INTEGRATED | src/assurance_core/ai-assurance-records.mjs | evidence-confidence selftest 30 | aiConfigurationManifest (real provider disabled) | version on change | YES |
| G066 | Threat model governance | P1_ASSURANCE | INTEGRATED | src/assurance_core/ai-assurance-records.mjs | falsification 18 | threatModelGovernance (stale→STALE) | approval workflow | YES |
| G067 | Evaluation governance | P1_ASSURANCE | PARTIAL | src/assurance_core/ai-assurance-records.mjs | falsification 19 | evaluationGovernance = PLANNED_WITH_SCHEMA (no real dataset) | local synthetic eval set | YES |
| G068 | Model qualification | P1_ASSURANCE | PARTIAL | src/assurance_core/ai-assurance-records.mjs | falsification 20 | modelQualification = PLANNED_WITH_SCHEMA; real→HOLD | after real adapter proof (gated) | YES |
| G069 | Continuous witness | P2_COMMERCIAL_DIFFERENTIATOR | PARTIAL | assumption+boundary records | - | witness records exist locally | always-on witnessing | YES |
| G070 | Environment evidence package | P2_COMMERCIAL_DIFFERENTIATOR | PARTIAL | src/environment_integrity/environment-integrity.mjs | - | environment_evidence_package + seal (local) | real isolation evidence (gated) | YES |
| G071 | Execution evidence | P2_COMMERCIAL_DIFFERENTIATOR | PARTIAL | src/execution_integrity/execution-integrity.mjs | - | execution_integrity record (local) | real sandbox evidence (gated) | YES |
| G072 | AI assurance certificate | P2_COMMERCIAL_DIFFERENTIATOR | NOT_YET | - | - | assurance records exist; certificate format not built | signed certificate + external attestation | NO |
| G073 | Continuous compliance | P2_COMMERCIAL_DIFFERENTIATOR | NOT_YET | - | - | claim-blocker + limits docs | compliance mapping (commercial) | NO |
| G074 | Customer evidence ledger | P2_COMMERCIAL_DIFFERENTIATOR | BLOCKED_BY_FOUNDER_GATE | - | - | - | requires real customer data (blocked) | NO |
| G075 | Runtime audit recorder | P2_COMMERCIAL_DIFFERENTIATOR | PARTIAL | action trace + evidence viewer | - | local replay exists | real runtime capture (gated) | YES |
| G076 | Execution replay | P2_COMMERCIAL_DIFFERENTIATOR | PARTIAL | evidence viewer replay | - | local replay exists | real-run replay (gated) | YES |
| G077 | Environment integrity engine | P3_LONG_TERM_IP | PARTIAL | src/environment_integrity/environment-integrity.mjs | - | records + seal | continuous real isolation (gated) | YES |
| G078 | Trust engine | P3_LONG_TERM_IP | PARTIAL | src/assurance_core/evidence-confidence.mjs | - | evidence-only confidence | cross-run trust scoring | YES |
| G079 | Runtime reality verification | P3_LONG_TERM_IP | PARTIAL | src/execution_integrity/execution-integrity.mjs | - | local records | real runtime capture (gated) | YES |
| G080 | Autonomous boundary enforcement | P3_LONG_TERM_IP | PARTIAL | src/boundary_monitoring + src/containment | - | records + decisions | live enforce (gated) | YES |
| G081 | Evidence-based AI governance | P3_LONG_TERM_IP | INTEGRATED | src/core_ip/core-ip-primitives.mjs | core-ip + assurance tests | primitives + records proven local | wire as always-on | YES |
| G082 | Supervisor kernel | P3_LONG_TERM_IP | PARTIAL | admissionGate + externalSupervisorOwnership + supervisorCancellation | - | ownership + cancellation records | standalone kernel outside AI loop (gated) | YES |

## Part 2 — prior 160-item matrix (carried forward, not dropped)

Reproduced totals from the prior run (full itemization in `docs/generated/adoption_matrix_p1_assurance_core/FULL_ADOPTION_MATRIX_160.md`):

| Prior status | Count |
| --- | ---: |
| INTEGRATED | 73 |
| PARTIAL | 27 |
| NOT_YET | 32 |
| BLOCKED_BY_FOUNDER_GATE | 11 |
| COMMERCIAL_FUTURE | 17 |
| **TOTAL (prior)** | **160** |

**Merged grand total accounted for:** 82 (new governance) + 160 (prior P1–P10) = 242 items, none skipped. Note: several new P0/P1 items are the deeper, now-implemented form of prior P1 assurance rows (e.g. AI configuration manifest, context provenance, threat-model versioning) — they are counted in both lists by design, with the new list reflecting the stronger local implementation.
