# P0 Core IP Map

All primitives implemented locally in `src/core_ip/core-ip-primitives.mjs` (46 deterministic functions) unless noted.
Test: `tests/core_ip/core-ip-primitives.selftest.mjs` (23/23) + falsification `tests/core_ip/falsification.mjs` (20/20 fail-closed).

## Evidence & Verification — INTEGRATED (local)
| Item | Function | Status |
| --- | --- | --- |
| Independent evidence collection | independentEvidenceRecord | INTEGRATED |
| Evidence over self-report | independentEvidenceRecord (self-report alone rejected) | INTEGRATED |
| Exact-state evidence binding | exactStateBinding | INTEGRATED |
| Evidence staleness detection | detectEvidenceStaleness | INTEGRATED |
| Independent artifact verification | verifyArtifactIndependently | INTEGRATED |
| Producer/Verifier disagreement recording | recordProducerVerifierDisagreement | INTEGRATED |
| Verification bound to immutable state | bindVerificationToImmutableState | INTEGRATED |

## Deterministic Verification — INTEGRATED (local)
baselineVsCandidateVerification · discriminatingTestRecord (requires previous-version failure) · acceptancePredicate · verifyBeforeAcceptance · verifyAfterMutation — all INTEGRATED.

## Failure Intelligence — INTEGRATED (local)
failureFingerprint · retryBudgetForFingerprint · requireMaterialStateChangeBeforeRetry · detectFailedHypothesis · classifyFailure (UNKNOWN first-class) · detectNoProgress · detectChurn — all INTEGRATED.

## Planning — INTEGRATED (local)
durablePlanLedgerEntry · stableStepId · stepDependencyRecord · requiredEvidencePerStep · selectivePlanInvalidation · resumeCheckpointRecord · boundedActionIteration — all INTEGRATED.

## Admission Control — INTEGRATED (local)
admissionGateDecision · activeRunDetectionRecord · duplicateDetectionRecord · budgetReservation (fail-closed) · crossRunBudgetRecord · wallClockDeadlineRecord · externalSupervisorOwnership — all INTEGRATED.

## Scope Governance — INTEGRATED (local)
scopeDeclaration · scopeAuthorizationRecord · scopeVerification · actualDiffVerificationRecord · preAcceptanceScopeValidation · postExecutionScopeValidation — all INTEGRATED.

## Runtime Governance — INTEGRATED (local)
checkpointPersistenceRecord · outcomeAwareRetentionDecision · cancellationPersistenceRecord · supervisorCancellationRecord · sideEffectAwareCleanupRecord — all INTEGRATED.

## Architecture — INTEGRATED (local, record-level)
innerOuterLoopRecord (AI proposes, deterministic outer decides) · evidenceDrivenControllerDecision · humanAuthorityOutsideAiLoopRecord (protected actions require a founder gate) — INTEGRATED as records; the live wiring into every run is the next maturity step.

**Next maturity step:** wire these primitives as the actual outer controller around every FounderGate run (today they are a proven, tested local library + evidence, not yet the always-on runtime driver).
