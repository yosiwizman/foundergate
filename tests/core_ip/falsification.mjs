// Lane M — P0/Assurance falsification. Every hostile input MUST fail closed (HOLD/UNKNOWN/REFUSED/QUARANTINE/
// STOP/PAUSE/EXCEEDED/STALE/VIOLATED/NONE). No PASS/ACCEPT/OK/SEALED. LOCAL / DETERMINISTIC.
import * as C from '../../src/core_ip/core-ip-primitives.mjs';
import * as A from '../../src/assumption_verification/assumption-engine.mjs';
import { environmentIntegrity } from '../../src/environment_integrity/environment-integrity.mjs';
import { executionIntegrity } from '../../src/execution_integrity/execution-integrity.mjs';
import { monitorDimension } from '../../src/boundary_monitoring/boundary-monitor.mjs';
import { containmentDecision } from '../../src/containment/containment-decision.mjs';
import { computeEvidenceConfidence } from '../../src/assurance_core/evidence-confidence.mjs';
import { contextProvenanceRecord, threatModelGovernance, evaluationGovernance, modelQualification } from '../../src/assurance_core/ai-assurance-records.mjs';

const GREEN = /(^|[^A-Z_])(PASS|ACCEPT|OK|SEALED_LOCAL|VERIFIED_LOCAL|ADMITTED|RESERVED|CONTINUE)([^A-Z_]|$)/;
const cases = [];
const add = (name, observed) => cases.push({ name, observed: String(observed), fail_closed: !GREEN.test(String(observed)) });

add('producer self-reports success without evidence', C.independentEvidenceRecord({ claim: 'done', self_report: 'PASS 99/99' }).status);
add('stale evidence used as fresh', C.detectEvidenceStaleness({ bound_state: 'OLD', current_state: 'NEW' }).status);
add('baseline missing', C.baselineVsCandidateVerification({ candidate: 'X' }).status);
add('no previous-version failure for discriminating test', C.discriminatingTestRecord({ fails_on_previous_version: false, passes_on_new_version: true }).status);
add('acceptance attempted before verification', C.verifyBeforeAcceptance({ verified: false }).status);
add('mutation without post-verification', C.verifyAfterMutation({ post_mutation_verified: false }).status);
add('retry without state change', C.requireMaterialStateChangeBeforeRetry({ state_before: 'S', state_after: 'S' }).status);
add('duplicate active run', C.admissionGateDecision({ run_key: 'r', active_run_keys: ['r'], budget_cap: 10, budget_request: 1, deadline_at: 1 }).status);
add('budget exceeded', C.budgetReservation({ cap: 1, request: 5, already_reserved: 0 }).status);
add('deadline missing', C.wallClockDeadlineRecord({}).status);
add('scope expanded silently', C.scopeVerification({ allowed_paths: ['src/'], touched_paths: ['prod/secrets'] }).status);
add('cancellation lost after restart', C.cancellationPersistenceRecord({ cancelled: true, persisted_across_restart: false }).status);
add('unknown environment treated as verified', environmentIntegrity({ observations: { boundary: null } }).environment_seal.status);
add('boundary violation ignored', monitorDimension('secret', 's1', 's2').action);
add('containment without evidence', containmentDecision({ environment_status: 'VIOLATION' }).status);
add('AI confidence substituted for evidence confidence', (() => { const r = computeEvidenceConfidence({ ai_confidence: 0.99, violations: 1 }); return r.level + (r.uses_ai_confidence ? '_USES_AI' : ''); })());
add('missing context provenance', (() => { const r = contextProvenanceRecord({}); return r.retrieved_documents.length === 0 ? 'HOLD_NO_PROVENANCE' : 'OK'; })());
add('stale threat model', threatModelGovernance({ approved: true, stale: true }).status);
add('eval leakage unchecked (no real dataset)', evaluationGovernance({}).status);
add('model rollback unqualified (real provider)', modelQualification({ real_provider: true }).status);

for (const c of cases) console.log((c.fail_closed ? 'OK   ' : 'BAD  ') + `${c.name} → ${c.observed}`);
const bad = cases.filter((c) => !c.fail_closed);
console.log(bad.length === 0 ? `\nALL FAIL-CLOSED: ${cases.length}/${cases.length} hostile cases held; 0 green.` : `\nRED: ${bad.length} hostile case(s) not fail-closed: ${bad.map((b) => b.name).join('; ')}`);
process.exit(bad.length === 0 ? 0 : 1);
