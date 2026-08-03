// FounderGate — P0 Core IP primitives (LOCAL / SYNTHETIC / DETERMINISTIC).
// Every function is a pure function of its inputs; no clock, no randomness, no network, no provider calls.
// Records fail closed: absent evidence → UNKNOWN/HOLD/REFUSED, never a silent PASS.
import { createHash } from 'node:crypto';

function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
export function sha256(x) { return createHash('sha256').update(typeof x === 'string' ? x : canonical(x)).digest('hex'); }
const short = (x, n = 24) => sha256(x).slice(0, n);
const rec = (record_type, extra) => ({ record_type, ...extra });
const HELD = ['HOLD', 'UNKNOWN', 'REFUSED', 'QUARANTINE', 'STOP', 'PAUSE', 'BLOCKED', 'STALE', 'VIOLATED', 'CHANGED', 'EXCEEDED_FAIL_CLOSED'];
export function isFailClosed(status) { return HELD.some((h) => String(status).includes(h)); }

// ===== Evidence & Verification =====
export function independentEvidenceRecord(i = {}) {
  const self = i.self_report ?? null, ev = i.evidence ?? null;
  return rec('independent_evidence', { claim: i.claim ?? null, self_report: self, evidence: ev, evidence_hash: ev != null ? short(ev) : null,
    // evidence over self-report: a claim is only OK if independent evidence exists, regardless of self-report
    status: ev != null ? 'OK' : 'HOLD_NO_EVIDENCE', accepted: ev != null, reason: ev != null ? 'independent evidence present' : 'self-report is not evidence' });
}
export function exactStateBinding(i = {}) { const h = short(i.state ?? ''); return rec('exact_state_binding', { state_hash: h, bound_at: i.at ?? null, verify: (s) => short(s) === h }); }
export function detectEvidenceStaleness(i = {}) {
  const cur = i.current_state_hash ?? (i.current_state != null ? short(i.current_state) : null);
  const bound = i.bound_state_hash ?? (i.bound_state != null ? short(i.bound_state) : null);
  const stale = !bound || !cur || cur !== bound;
  return rec('evidence_staleness', { bound_state_hash: bound, current_state_hash: cur, status: stale ? 'STALE' : 'FRESH', fresh: !stale, reason: stale ? 'evidence bound to a different state' : 'evidence matches current state' });
}
export function verifyArtifactIndependently(i = {}) {
  const declared = i.declared_hash ?? null, observed = i.artifact != null ? short(i.artifact) : (i.observed_hash ?? null);
  const ok = !!declared && !!observed && declared === observed;
  return rec('independent_artifact_verification', { declared_hash: declared, observed_hash: observed, status: ok ? 'OK' : 'HOLD_ARTIFACT_MISMATCH', verified: ok });
}
export function recordProducerVerifierDisagreement(i = {}) {
  const disagree = i.producer_result !== i.verifier_result;
  return rec('producer_verifier_disagreement', { producer_result: i.producer_result ?? null, verifier_result: i.verifier_result ?? null, disagree, status: disagree ? 'HOLD_DISAGREEMENT' : 'OK', winner: disagree ? 'verifier' : 'agreement', reason: disagree ? 'producer overruled by independent verifier' : 'producer and verifier agree' });
}
export function bindVerificationToImmutableState(i = {}) { const h = short(i.state ?? ''); return rec('verification_immutable_binding', { state_hash: h, verification: i.verification ?? null, frozen: true, valid_for: (s) => short(s) === h }); }

// ===== Deterministic Verification =====
export function baselineVsCandidateVerification(i = {}) {
  const b = i.baseline_hash ?? (i.baseline != null ? short(i.baseline) : null), c = i.candidate_hash ?? (i.candidate != null ? short(i.candidate) : null);
  if (!b) return rec('baseline_vs_candidate', { status: 'HOLD_NO_BASELINE', changed: null, reason: 'baseline required' });
  const changed = b !== c;
  return rec('baseline_vs_candidate', { baseline_hash: b, candidate_hash: c, changed, status: 'OK', reason: changed ? 'candidate differs from baseline' : 'candidate identical to baseline' });
}
export function discriminatingTestRecord(i = {}) {
  const failsOnPrev = i.fails_on_previous_version === true, passesOnNew = i.passes_on_new_version === true;
  const discriminating = failsOnPrev && passesOnNew;
  return rec('discriminating_test', { fails_on_previous_version: failsOnPrev, passes_on_new_version: passesOnNew, discriminating, status: discriminating ? 'OK' : 'HOLD_NOT_DISCRIMINATING', reason: discriminating ? 'test distinguishes versions' : 'a test that never failed the old version proves nothing' });
}
export function acceptancePredicate(i = {}) {
  const need = i.required_evidence || [], have = new Set(i.present_evidence || []);
  const missing = need.filter((e) => !have.has(e));
  return rec('acceptance_predicate', { required_evidence: need, missing, status: missing.length ? 'HOLD_MISSING_EVIDENCE' : 'ACCEPT', accept: missing.length === 0 });
}
export function verifyBeforeAcceptance(i = {}) { const v = i.verified === true; return rec('verify_before_acceptance', { verified: v, status: v ? 'ACCEPT' : 'HOLD_UNVERIFIED', accept: v }); }
export function verifyAfterMutation(i = {}) { const v = i.post_mutation_verified === true; return rec('verify_after_mutation', { post_mutation_verified: v, status: v ? 'OK' : 'HOLD_NO_POST_VERIFICATION', ok: v }); }

// ===== Failure Intelligence =====
export function failureFingerprint(i = {}) { return rec('failure_fingerprint', { fingerprint: 'fp_' + short({ kind: i.kind, where: i.where, message: i.message }, 16) }); }
export function retryBudgetForFingerprint(i = {}) {
  const cap = i.cap ?? 2, used = i.used ?? 0; const allowed = used < cap;
  return rec('retry_budget', { fingerprint: i.fingerprint ?? null, cap, used, status: allowed ? 'RETRY_ALLOWED' : 'EXCEEDED_FAIL_CLOSED', allowed });
}
export function requireMaterialStateChangeBeforeRetry(i = {}) {
  const changed = (i.state_before_hash ?? short(i.state_before ?? 'a')) !== (i.state_after_hash ?? short(i.state_after ?? 'a'));
  return rec('material_change_before_retry', { changed, status: changed ? 'RETRY_ALLOWED' : 'REFUSED_NO_MATERIAL_CHANGE', allowed: changed, reason: changed ? 'state changed materially' : 'retrying identical state is churn' });
}
export function detectFailedHypothesis(i = {}) { const failed = i.expected !== i.observed; return rec('failed_hypothesis', { expected: i.expected ?? null, observed: i.observed ?? null, failed, status: failed ? 'HYPOTHESIS_FAILED' : 'OK' }); }
export function classifyFailure(i = {}) {
  const m = String(i.message || '').toLowerCase(); let cls = 'UNKNOWN';
  if (/timeout|deadline/.test(m)) cls = 'TIMEOUT'; else if (/permission|denied|forbidden/.test(m)) cls = 'PERMISSION'; else if (/network|dns|connect/.test(m)) cls = 'NETWORK'; else if (/assert|expected/.test(m)) cls = 'ASSERTION'; else if (/missing|not found|enoent/.test(m)) cls = 'MISSING_ARTIFACT';
  return rec('failure_classification', { classification: cls, first_class_unknown: cls === 'UNKNOWN' });
}
export function detectNoProgress(i = {}) {
  const hashes = (i.iteration_state_hashes || []); const stuck = hashes.length >= 2 && new Set(hashes).size === 1;
  return rec('no_progress', { iterations: hashes.length, distinct_states: new Set(hashes).size, status: stuck ? 'HOLD_NO_PROGRESS' : 'OK', no_progress: stuck });
}
export function detectChurn(i = {}) {
  const hashes = (i.recent_state_hashes || []); const seen = {}; let churn = false;
  for (const h of hashes) { seen[h] = (seen[h] || 0) + 1; if (seen[h] >= (i.threshold ?? 2)) churn = true; }
  return rec('churn', { revisits: Object.values(seen).filter((c) => c >= (i.threshold ?? 2)).length, status: churn ? 'HOLD_CHURN' : 'OK', churn });
}

// ===== Planning =====
export function stableStepId(i = {}) { return rec('stable_step_id', { step_id: 'step_' + short({ goal: i.goal, index: i.index }, 12) }); }
export function durablePlanLedgerEntry(i = {}) { return rec('durable_plan_ledger_entry', { step_id: i.step_id ?? null, description: i.description ?? null, depends_on: i.depends_on || [], required_evidence: i.required_evidence || [], state: i.state ?? 'PENDING', evidence_present: (i.present_evidence || []).slice() }); }
export function stepDependencyRecord(i = {}) {
  const done = new Set(i.completed_steps || []); const unmet = (i.depends_on || []).filter((d) => !done.has(d));
  return rec('step_dependency', { depends_on: i.depends_on || [], unmet, status: unmet.length ? 'BLOCKED_DEPENDENCIES' : 'READY', ready: unmet.length === 0 });
}
export function requiredEvidencePerStep(i = {}) { const need = i.required_evidence || [], have = new Set(i.present_evidence || []); const missing = need.filter((e) => !have.has(e)); return rec('required_evidence_per_step', { required: need, missing, complete: missing.length === 0, status: missing.length ? 'HOLD_STEP_EVIDENCE_MISSING' : 'OK' }); }
export function selectivePlanInvalidation(i = {}) {
  const changed = new Set(i.changed_step_ids || []); const invalidated = (i.steps || []).filter((s) => changed.has(s.step_id) || (s.depends_on || []).some((d) => changed.has(d))).map((s) => s.step_id);
  const preserved = (i.steps || []).map((s) => s.step_id).filter((id) => !invalidated.includes(id));
  return rec('selective_plan_invalidation', { invalidated, preserved, status: 'OK', reason: 'only changed steps + dependents invalidated; rest preserved' });
}
export function resumeCheckpointRecord(i = {}) { return rec('resume_checkpoint', { checkpoint_id: 'ckpt_' + short(i.completed_steps || [], 12), completed_steps: i.completed_steps || [], resume_from: i.next_step ?? null, resumable: true }); }
export function boundedActionIteration(i = {}) { const n = (i.actions || []).length; return rec('bounded_action_iteration', { actions: i.actions || [], status: n <= 1 ? 'OK' : 'HOLD_MULTIPLE_ACTIONS', bounded: n <= 1, reason: n <= 1 ? 'one bounded action per iteration' : 'more than one action in a single iteration' }); }

// ===== Admission Control =====
export function activeRunDetectionRecord(i = {}) { const active = (i.active_runs || []).length > 0; return rec('active_run_detection', { active_runs: i.active_runs || [], active }); }
export function duplicateDetectionRecord(i = {}) { const dup = (i.active_run_keys || []).includes(i.run_key); return rec('duplicate_detection', { run_key: i.run_key ?? null, duplicate: dup, status: dup ? 'REFUSED_DUPLICATE' : 'OK' }); }
export function budgetReservation(i = {}) { const cap = i.cap ?? 0, req = i.request ?? 0, reserved = i.already_reserved ?? 0; const ok = reserved + req <= cap; return rec('budget_reservation', { cap, request: req, already_reserved: reserved, status: ok ? 'RESERVED' : 'EXCEEDED_FAIL_CLOSED', reserved: ok }); }
export function crossRunBudgetRecord(i = {}) { const total = (i.runs || []).reduce((a, r) => a + (r.spent || 0), 0); const ok = total <= (i.global_cap ?? 0); return rec('cross_run_budget', { total_spent: total, global_cap: i.global_cap ?? 0, status: ok ? 'WITHIN_GLOBAL_BUDGET' : 'EXCEEDED_FAIL_CLOSED', ok }); }
export function wallClockDeadlineRecord(i = {}) { const has = i.deadline_at != null; return rec('wall_clock_deadline', { deadline_at: i.deadline_at ?? null, status: has ? 'OK' : 'HOLD_NO_DEADLINE', recorded: has }); }
export function admissionGateDecision(i = {}) {
  const reasons = [];
  if ((i.active_run_keys || []).includes(i.run_key)) reasons.push('duplicate_active_run');
  if ((i.already_reserved ?? 0) + (i.budget_request ?? 0) > (i.budget_cap ?? 0)) reasons.push('budget_exceeded');
  if (i.deadline_at == null) reasons.push('no_deadline');
  return rec('admission_gate', { run_key: i.run_key ?? null, admit: reasons.length === 0, status: reasons.length ? 'REFUSED_ADMISSION' : 'ADMITTED', reasons });
}
export function externalSupervisorOwnership(i = {}) { const ext = i.owner === 'external_supervisor'; return rec('external_supervisor_ownership', { owner: i.owner ?? null, status: ext ? 'OK' : 'HOLD_OWNERSHIP_INSIDE_AI', ok: ext, reason: ext ? 'lifecycle owned outside the AI loop' : 'a run must not own its own supervisor' }); }

// ===== Scope Governance =====
export function scopeDeclaration(i = {}) { return rec('scope_declaration', { allowed_paths: (i.allowed_paths || []).slice().sort(), declared_at: i.at ?? null, scope_hash: short((i.allowed_paths || []).slice().sort()) }); }
export function scopeAuthorizationRecord(i = {}) { const authed = i.authorized === true; return rec('scope_authorization', { scope_hash: i.scope_hash ?? null, authorized: authed, status: authed ? 'OK' : 'HOLD_UNAUTHORIZED_SCOPE' }); }
export function scopeVerification(i = {}) {
  const allowed = i.allowed_paths || [], touched = i.touched_paths || [];
  const inScope = (p) => allowed.some((a) => p === a || p.startsWith(a.endsWith('/') ? a : a + '/'));
  const out = touched.filter((p) => !inScope(p));
  return rec('scope_verification', { out_of_scope: out, status: out.length ? 'HOLD_OUT_OF_SCOPE' : 'OK', in_scope: out.length === 0 });
}
export function actualDiffVerificationRecord(i = {}) { const declared = new Set(i.declared_changes || []); const actual = i.actual_changes || []; const undeclared = actual.filter((f) => !declared.has(f)); return rec('actual_diff_verification', { undeclared_changes: undeclared, status: undeclared.length ? 'HOLD_UNDECLARED_DIFF' : 'OK', matches: undeclared.length === 0 }); }
export function preAcceptanceScopeValidation(i = {}) { const r = scopeVerification(i); return rec('pre_acceptance_scope_validation', { out_of_scope: r.out_of_scope, status: r.status, ok: r.in_scope }); }
export function postExecutionScopeValidation(i = {}) { const r = scopeVerification(i); return rec('post_execution_scope_validation', { out_of_scope: r.out_of_scope, status: r.status, ok: r.in_scope }); }

// ===== Runtime Governance =====
export function checkpointPersistenceRecord(i = {}) { return rec('checkpoint_persistence', { checkpoint_id: i.checkpoint_id ?? ('ckpt_' + short(i.state ?? '', 12)), persisted: i.persisted !== false, status: i.persisted !== false ? 'PERSISTED' : 'HOLD_NOT_PERSISTED' }); }
export function outcomeAwareRetentionDecision(i = {}) { const keep = i.outcome === 'FAILURE' || i.outcome === 'VIOLATION' || i.has_side_effects === true; return rec('outcome_aware_retention', { outcome: i.outcome ?? null, retain: keep, status: keep ? 'RETAIN' : 'PRUNE_SAFE', reason: keep ? 'retain evidence for failures/violations/side-effects' : 'clean success may be pruned' }); }
export function cancellationPersistenceRecord(i = {}) { const p = i.persisted_across_restart === true; return rec('cancellation_persistence', { cancelled: i.cancelled === true, persisted_across_restart: p, status: (i.cancelled && !p) ? 'HOLD_CANCELLATION_LOST' : 'OK', durable: p || !i.cancelled }); }
export function supervisorCancellationRecord(i = {}) { const bySup = i.actor === 'external_supervisor'; return rec('supervisor_cancellation', { actor: i.actor ?? null, status: bySup ? 'OK' : 'HOLD_SELF_CANCELLATION', ok: bySup, reason: bySup ? 'cancellation is a supervisor action' : 'a run cancelling itself is not authoritative' }); }
export function sideEffectAwareCleanupRecord(i = {}) { const need = i.has_side_effects === true; const ok = !need || i.side_effect_evidence != null; return rec('side_effect_aware_cleanup', { has_side_effects: need, evidence_present: i.side_effect_evidence != null, status: ok ? 'OK' : 'HOLD_CLEANUP_WITHOUT_EVIDENCE', ok }); }

// ===== Architecture =====
export function innerOuterLoopRecord(i = {}) { return rec('inner_outer_loop', { inner: 'AI proposes (non-authoritative)', outer: 'deterministic controller verifies + decides', authority: 'outer', ai_can_accept_itself: false, status: 'OK' }); }
export function evidenceDrivenControllerDecision(i = {}) {
  const ev = i.evidence || {}; const missing = (i.required || []).filter((k) => !ev[k]);
  return rec('evidence_driven_controller', { decision: missing.length ? 'HOLD' : (i.proposed_decision || 'PROCEED'), missing_evidence: missing, driven_by: 'evidence', status: missing.length ? 'HOLD_INSUFFICIENT_EVIDENCE' : 'OK' });
}
export function humanAuthorityOutsideAiLoopRecord(i = {}) { const gated = i.protected_action ? i.founder_authorized === true : true; return rec('human_authority_outside_ai_loop', { protected_action: i.protected_action ?? null, founder_authorized: i.founder_authorized === true, status: gated ? 'OK' : 'HOLD_REQUIRES_FOUNDER', ok: gated, reason: i.protected_action ? 'protected actions require a human founder gate outside the AI loop' : 'no protected action' }); }

// ===== catalog for coverage =====
export const CORE_IP_FUNCTIONS = Object.freeze([
  'independentEvidenceRecord','exactStateBinding','detectEvidenceStaleness','verifyArtifactIndependently','recordProducerVerifierDisagreement','bindVerificationToImmutableState',
  'baselineVsCandidateVerification','discriminatingTestRecord','acceptancePredicate','verifyBeforeAcceptance','verifyAfterMutation',
  'failureFingerprint','retryBudgetForFingerprint','requireMaterialStateChangeBeforeRetry','detectFailedHypothesis','classifyFailure','detectNoProgress','detectChurn',
  'durablePlanLedgerEntry','stableStepId','stepDependencyRecord','requiredEvidencePerStep','selectivePlanInvalidation','resumeCheckpointRecord','boundedActionIteration',
  'admissionGateDecision','activeRunDetectionRecord','duplicateDetectionRecord','budgetReservation','crossRunBudgetRecord','wallClockDeadlineRecord','externalSupervisorOwnership',
  'scopeDeclaration','scopeAuthorizationRecord','scopeVerification','actualDiffVerificationRecord','preAcceptanceScopeValidation','postExecutionScopeValidation',
  'checkpointPersistenceRecord','outcomeAwareRetentionDecision','cancellationPersistenceRecord','supervisorCancellationRecord','sideEffectAwareCleanupRecord',
  'innerOuterLoopRecord','evidenceDrivenControllerDecision','humanAuthorityOutsideAiLoopRecord',
]);
