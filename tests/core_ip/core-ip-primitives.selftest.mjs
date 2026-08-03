// P0 Core IP self-test — proofs 1–21. LOCAL / DETERMINISTIC.
import * as C from '../../src/core_ip/core-ip-primitives.mjs';
let p = 0, f = 0; const ok = (c, m) => { if (c) { p++; console.log('OK   ' + m); } else { f++; console.log('BAD  ' + m); } };

// 1 evidence over self-report
ok(C.independentEvidenceRecord({ claim: 'built', self_report: 'PASS' }).accepted === false && C.independentEvidenceRecord({ claim: 'built', self_report: 'PASS', evidence: 'artifact-bytes' }).accepted === true, '1 evidence over self-report (self-report alone not accepted)');
// 2 exact-state binding changes when state changes
const b = C.exactStateBinding({ state: 'S1' }); ok(b.verify('S1') === true && b.verify('S2') === false, '2 exact-state binding changes when state changes');
// 3 stale evidence detected
ok(C.detectEvidenceStaleness({ bound_state: 'S1', current_state: 'S2' }).status === 'STALE' && C.detectEvidenceStaleness({ bound_state: 'S1', current_state: 'S1' }).fresh === true, '3 stale evidence detected');
// 4 producer/verifier disagreement recorded
ok(C.recordProducerVerifierDisagreement({ producer_result: 'PASS', verifier_result: 'FAIL' }).status === 'HOLD_DISAGREEMENT', '4 producer/verifier disagreement recorded');
// 5 baseline/candidate comparison works
ok(C.baselineVsCandidateVerification({ baseline: 'A', candidate: 'B' }).changed === true && C.baselineVsCandidateVerification({ candidate: 'B' }).status === 'HOLD_NO_BASELINE', '5 baseline/candidate comparison works (+no-baseline held)');
// 6 discriminating test requires previous-version failure
ok(C.discriminatingTestRecord({ fails_on_previous_version: false, passes_on_new_version: true }).status === 'HOLD_NOT_DISCRIMINATING' && C.discriminatingTestRecord({ fails_on_previous_version: true, passes_on_new_version: true }).discriminating === true, '6 discriminating test requires previous-version failure');
// 7 acceptance predicate fails without evidence
ok(C.acceptancePredicate({ required_evidence: ['tests', 'artifact'], present_evidence: ['tests'] }).accept === false && C.acceptancePredicate({ required_evidence: ['tests'], present_evidence: ['tests'] }).accept === true, '7 acceptance predicate fails without evidence');
// 8 verify after mutation required
ok(C.verifyAfterMutation({ post_mutation_verified: false }).status === 'HOLD_NO_POST_VERIFICATION' && C.verifyBeforeAcceptance({ verified: false }).accept === false, '8 verify after mutation / before acceptance required');
// 9 failure fingerprint controls retry budget
const fp = C.failureFingerprint({ kind: 'assert', where: 'x', message: 'm' }).fingerprint;
ok(C.retryBudgetForFingerprint({ fingerprint: fp, cap: 2, used: 2 }).status === 'EXCEEDED_FAIL_CLOSED' && C.retryBudgetForFingerprint({ fingerprint: fp, cap: 2, used: 0 }).allowed === true, '9 failure fingerprint controls retry budget');
// 10 retry without material change refused
ok(C.requireMaterialStateChangeBeforeRetry({ state_before: 'S', state_after: 'S' }).status === 'REFUSED_NO_MATERIAL_CHANGE' && C.requireMaterialStateChangeBeforeRetry({ state_before: 'S', state_after: 'S2' }).allowed === true, '10 retry without material change refused');
// 11 UNKNOWN first-class
ok(C.classifyFailure({ message: 'weird thing' }).classification === 'UNKNOWN' && C.classifyFailure({ message: 'weird' }).first_class_unknown === true, '11 UNKNOWN is first-class');
// 12 no-progress / churn detection
ok(C.detectNoProgress({ iteration_state_hashes: ['h', 'h', 'h'] }).no_progress === true && C.detectChurn({ recent_state_hashes: ['a', 'b', 'a'], threshold: 2 }).churn === true, '12 no-progress/churn detection works');
// 13 durable plan steps use stable IDs
const s1 = C.stableStepId({ goal: 'g', index: 1 }).step_id, s1b = C.stableStepId({ goal: 'g', index: 1 }).step_id, s2 = C.stableStepId({ goal: 'g', index: 2 }).step_id;
ok(s1 === s1b && s1 !== s2, '13 durable plan steps use stable IDs (deterministic)');
// 14 plan invalidation selective
const inv = C.selectivePlanInvalidation({ steps: [{ step_id: 'a', depends_on: [] }, { step_id: 'b', depends_on: ['a'] }, { step_id: 'c', depends_on: [] }], changed_step_ids: ['a'] });
ok(inv.invalidated.includes('a') && inv.invalidated.includes('b') && inv.preserved.includes('c'), '14 plan invalidation is selective (a+dependent b invalid, c preserved)');
// 15 admission gate blocks duplicate active run
ok(C.admissionGateDecision({ run_key: 'r1', active_run_keys: ['r1'], budget_cap: 10, budget_request: 1, deadline_at: 5 }).status === 'REFUSED_ADMISSION' && C.duplicateDetectionRecord({ run_key: 'r1', active_run_keys: ['r1'] }).duplicate === true, '15 admission gate blocks duplicate active run');
// 16 budget reservation fails closed
ok(C.budgetReservation({ cap: 10, request: 5, already_reserved: 8 }).status === 'EXCEEDED_FAIL_CLOSED' && C.budgetReservation({ cap: 10, request: 2, already_reserved: 0 }).reserved === true, '16 budget reservation fails closed');
// 17 wall-clock deadline recorded
ok(C.wallClockDeadlineRecord({ deadline_at: 100 }).recorded === true && C.wallClockDeadlineRecord({}).status === 'HOLD_NO_DEADLINE', '17 wall-clock deadline recorded (+missing held)');
// 18 scope verification catches out-of-scope diff
ok(C.scopeVerification({ allowed_paths: ['src/'], touched_paths: ['src/a.mjs', 'secret/keys'] }).status === 'HOLD_OUT_OF_SCOPE' && C.scopeVerification({ allowed_paths: ['src/'], touched_paths: ['src/a.mjs'] }).in_scope === true, '18 scope verification catches out-of-scope diff');
// 19 post-execution scope validation exists
ok(C.postExecutionScopeValidation({ allowed_paths: ['src/'], touched_paths: ['docs/x'] }).ok === false && typeof C.preAcceptanceScopeValidation === 'function', '19 post-execution scope validation exists');
// 20 cancellation persistent
ok(C.cancellationPersistenceRecord({ cancelled: true, persisted_across_restart: false }).status === 'HOLD_CANCELLATION_LOST' && C.cancellationPersistenceRecord({ cancelled: true, persisted_across_restart: true }).durable === true && C.supervisorCancellationRecord({ actor: 'external_supervisor' }).ok === true, '20 cancellation is persistent + supervisor-owned');
// 21 side-effect cleanup requires evidence
ok(C.sideEffectAwareCleanupRecord({ has_side_effects: true }).status === 'HOLD_CLEANUP_WITHOUT_EVIDENCE' && C.sideEffectAwareCleanupRecord({ has_side_effects: true, side_effect_evidence: 'log' }).ok === true, '21 side-effect cleanup requires evidence');
// bonus: architecture — AI cannot accept itself; human authority outside loop
ok(C.innerOuterLoopRecord().ai_can_accept_itself === false && C.humanAuthorityOutsideAiLoopRecord({ protected_action: 'deploy', founder_authorized: false }).status === 'HOLD_REQUIRES_FOUNDER', 'bonus architecture: outer authority + human gate for protected actions');
// coverage: all 46 catalog functions are exported
ok(C.CORE_IP_FUNCTIONS.every((fn) => typeof C[fn] === 'function'), `coverage: all ${C.CORE_IP_FUNCTIONS.length} core-ip functions exported`);

console.log(f === 0 ? `\nALL GREEN: ${p}/${p} core-ip proofs passed.` : `\nRED: ${f}/${p + f} failed.`);
process.exit(f === 0 ? 0 : 1);
