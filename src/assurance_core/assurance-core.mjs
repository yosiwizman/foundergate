// FounderGate — P1 Assurance Core (LOCAL / SYNTHETIC / DETERMINISTIC ONLY).
// Produces and validates the P1 assurance records. No network, no provider call, no credentials, no spend.
// Determinism rule: every record is a pure function of its inputs. Callers pass timestamps/ids explicitly;
// this module never reads the clock or randomness. Fingerprints are sha256 over canonical (key-sorted) JSON.
import { createHash } from 'node:crypto';

// ---- canonical hashing -------------------------------------------------------
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value === undefined ? null : value);
}
export function sha256(input) {
  return createHash('sha256').update(typeof input === 'string' ? input : canonical(input)).digest('hex');
}

// ---- constants: what stays blocked ------------------------------------------
export const BLOCKED_GATES = Object.freeze(['real_provider_activation', 'private_repo_access', 'gate_8_real_evaluator', 'deploy', 'billing', 'outreach', 'customer_data', 'protected_main_mutation', 'pr_200_mutation', 'merge']);
export const FORBIDDEN_ACTIONS = Object.freeze(['network', 'credentials', 'api_key', 'deploy', 'bill', 'payment', 'contact', 'private_repo', 'customer_data', 'provider_spend', 'merge', 'mark_ready']);
export const SCAN_STATES = Object.freeze(['COMPLETE', 'PARTIAL', 'UNKNOWN']);
export const CONFIDENCE_LEVELS = Object.freeze(['NONE', 'LOW', 'MEDIUM', 'HIGH']);
export const THREAT_MODEL_VERSION = 'FG-TM-2026.08.03';

function fail(record_type, reason, extra = {}) { return { record_type, valid: false, status: 'HOLD', reason, ...extra }; }
function ok(record_type, extra = {}) { return { record_type, valid: true, status: 'OK', ...extra }; }

// ============================================================================
// 1. AI System Configuration Manifest
// ============================================================================
export function makeConfigManifest(input) {
  const model_id = input.model_id || 'unspecified';
  const provider_id = input.provider_id || 'unspecified';
  const cfg = {
    record_type: 'ai_system_configuration_manifest',
    model_id, provider_id,
    mode: input.mode || 'simulated',
    real_provider_enabled: false,
    tools: (input.tools || []).slice().sort(),
    mcp_servers: (input.mcp_servers || []).slice().sort(),
    threat_model_version: input.threat_model_version || THREAT_MODEL_VERSION,
    captured_at: input.captured_at || null,
  };
  cfg.config_fingerprint = exactConfigFingerprint(cfg);
  return cfg;
}
export function validateConfigManifest(cfg) {
  if (!cfg || cfg.record_type !== 'ai_system_configuration_manifest') return fail('ai_system_configuration_manifest', 'wrong record type');
  if (cfg.real_provider_enabled === true) return fail('ai_system_configuration_manifest', 'real provider must be disabled in this run', { blocked: true });
  if (!cfg.model_id || !cfg.provider_id) return fail('ai_system_configuration_manifest', 'model_id and provider_id required');
  if (!cfg.threat_model_version) return fail('ai_system_configuration_manifest', 'threat_model_version required');
  if (cfg.config_fingerprint !== exactConfigFingerprint(cfg)) return fail('ai_system_configuration_manifest', 'fingerprint mismatch (tampered)');
  return ok('ai_system_configuration_manifest', { config_fingerprint: cfg.config_fingerprint });
}

// ============================================================================
// 17. Exact AI Configuration Fingerprinting  (deterministic)
// ============================================================================
export function exactConfigFingerprint(cfg) {
  const material = {
    model_id: cfg.model_id, provider_id: cfg.provider_id, mode: cfg.mode,
    real_provider_enabled: cfg.real_provider_enabled === true,
    tools: (cfg.tools || []).slice().sort(), mcp_servers: (cfg.mcp_servers || []).slice().sort(),
    threat_model_version: cfg.threat_model_version,
  };
  return 'cfg_' + sha256(material).slice(0, 24);
}

// ============================================================================
// 2. Context Provenance Record
// ============================================================================
export function makeContextProvenance(input) {
  const sources = (input.sources || []).map((s) => ({ id: s.id, kind: s.kind, local: s.local !== false, hash: sha256(String(s.content ?? s.hash ?? s.id)) }));
  return { record_type: 'context_provenance_record', captured_at: input.captured_at || null, sources, provenance_hash: sha256(sources.map((s) => s.id + ':' + s.hash).join('|')) };
}
export function validateContextProvenance(rec) {
  if (!rec || rec.record_type !== 'context_provenance_record') return fail('context_provenance_record', 'wrong record type');
  if (!rec.sources || rec.sources.length === 0) return fail('context_provenance_record', 'no provenance sources recorded');
  if (rec.sources.some((s) => s.local === false)) return fail('context_provenance_record', 'non-local source present (blocked this run)', { blocked: true });
  if (rec.sources.some((s) => !s.id || !s.hash)) return fail('context_provenance_record', 'source missing id/hash');
  return ok('context_provenance_record', { provenance_hash: rec.provenance_hash, count: rec.sources.length });
}

// ============================================================================
// 19. Immutable Context Snapshot  (hash changes when content changes; frozen)
// ============================================================================
export function makeImmutableContextSnapshot(content, meta = {}) {
  const snapshot_hash = sha256(content);
  return Object.freeze({ record_type: 'immutable_context_snapshot', snapshot_hash, captured_at: meta.captured_at || null, byte_length: (typeof content === 'string' ? content : canonical(content)).length });
}
export function verifyImmutableSnapshot(snapshot, content) {
  if (!snapshot || snapshot.record_type !== 'immutable_context_snapshot') return fail('immutable_context_snapshot', 'wrong record type');
  const current = sha256(content);
  if (current !== snapshot.snapshot_hash) return fail('immutable_context_snapshot', 'content changed since snapshot (immutability violated)', { expected: snapshot.snapshot_hash, actual: current });
  return ok('immutable_context_snapshot', { snapshot_hash: snapshot.snapshot_hash });
}

// ============================================================================
// 20. AI Runtime Manifest  (assembles config + runtime state)
// ============================================================================
export function makeRuntimeManifest(input) {
  const cfg = input.config_manifest;
  const rt = {
    record_type: 'ai_runtime_manifest',
    config_fingerprint: cfg ? cfg.config_fingerprint : null,
    provider_id: cfg ? cfg.provider_id : null,
    provider_mode: input.provider_mode || (cfg ? cfg.mode : 'simulated'),
    real_provider_enabled: false,
    context_snapshot_hash: input.context_snapshot_hash || null,
    scan_completeness_state: input.scan_completeness_state || 'UNKNOWN',
    risk_budget_status: input.risk_budget_status || 'UNKNOWN',
    evidence_confidence: input.evidence_confidence || 'NONE',
    threat_model_version: cfg ? cfg.threat_model_version : THREAT_MODEL_VERSION,
    blocked_gates: BLOCKED_GATES.slice(),
    captured_at: input.captured_at || null,
  };
  rt.runtime_fingerprint = 'rt_' + sha256(rt).slice(0, 24);
  return rt;
}
export function validateRuntimeManifest(rt) {
  if (!rt || rt.record_type !== 'ai_runtime_manifest') return fail('ai_runtime_manifest', 'missing/wrong runtime manifest');
  if (rt.real_provider_enabled === true) return fail('ai_runtime_manifest', 'real provider must be disabled', { blocked: true });
  if (!rt.config_fingerprint) return fail('ai_runtime_manifest', 'no config fingerprint bound');
  if (!SCAN_STATES.includes(rt.scan_completeness_state)) return fail('ai_runtime_manifest', 'invalid scan completeness state');
  if (!rt.blocked_gates || !BLOCKED_GATES.every((g) => rt.blocked_gates.includes(g))) return fail('ai_runtime_manifest', 'blocked-gate list incomplete');
  return ok('ai_runtime_manifest', { runtime_fingerprint: rt.runtime_fingerprint });
}

// ============================================================================
// 9 & 10. Tool / MCP Capability Classification
// ============================================================================
const CAP_LEVELS = ['READ_ONLY_LOCAL', 'WRITE_LOCAL', 'NETWORK', 'PRIVILEGED', 'UNKNOWN'];
function classifyCapability(kind, item) {
  if (!item || !item.id) return { id: item && item.id, kind, capability: 'UNKNOWN', allowed: false, reason: 'unclassified' };
  const cap = item.capability && CAP_LEVELS.includes(item.capability) ? item.capability : 'UNKNOWN';
  const networkish = cap === 'NETWORK' || cap === 'PRIVILEGED' || item.network === true;
  return { id: item.id, kind, capability: cap, network: !!item.network, allowed: cap !== 'UNKNOWN' && !networkish, reason: cap === 'UNKNOWN' ? 'unclassified → not allowed' : (networkish ? 'network/privileged → blocked this run' : 'local capability ok') };
}
export function classifyTool(tool) { return { record_type: 'tool_capability_classification', ...classifyCapability('tool', tool) }; }
export function classifyMcp(server) { return { record_type: 'mcp_capability_classification', ...classifyCapability('mcp', server) }; }

// ============================================================================
// 18. Provider-Neutral Security Interface  (labels simulated / real-disabled)
// ============================================================================
export function providerNeutralInterface(provider_id) {
  return { record_type: 'provider_neutral_security_interface', provider_id: provider_id || 'unspecified', mode: 'simulated', real_disabled: true, can_self_certify: false, label: 'SIMULATED / REAL-DISABLED', note: 'A provider is a replaceable worker; its claim is never proof. Real activation requires a founder gate.' };
}

// ============================================================================
// 11. Agent Action Trace
// ============================================================================
export function newActionTrace(run_id) { return { record_type: 'agent_action_trace', run_id: run_id || null, actions: [] }; }
export function recordAction(trace, action) {
  trace.actions.push({ seq: trace.actions.length, actor: action.actor || 'builder', action: action.action, target: action.target || null, forbidden: FORBIDDEN_ACTIONS.includes(action.action), at: action.at || null });
  return trace;
}
export function validateActionTrace(trace) {
  if (!trace || trace.record_type !== 'agent_action_trace') return fail('agent_action_trace', 'wrong record type');
  if (trace.actions.length === 0) return fail('agent_action_trace', 'no actions recorded');
  const forbidden = trace.actions.filter((a) => a.forbidden);
  if (forbidden.length) return fail('agent_action_trace', 'forbidden action(s) recorded as attempted', { forbidden: forbidden.map((a) => a.action) });
  return ok('agent_action_trace', { count: trace.actions.length });
}

// ============================================================================
// 12. Evidence Confidence Model  (rejects missing evidence)
// ============================================================================
export function evidenceConfidence(evidence = {}) {
  const has = (k) => evidence[k] === true;
  const signals = ['artifact_present', 'tests_run', 'independent_checker', 'context_snapshot', 'not_overclaimed'];
  const present = signals.filter(has);
  let level = 'NONE';
  if (present.length >= 5) level = 'HIGH'; else if (present.length >= 3) level = 'MEDIUM'; else if (present.length >= 1) level = 'LOW';
  const rejected = !has('artifact_present') || !has('tests_run');
  return { record_type: 'evidence_confidence_model', signals_present: present, level: rejected ? 'NONE' : level, accepted: !rejected, reason: rejected ? 'missing required evidence (artifact and/or tests) → confidence NONE' : 'evidence present' };
}

// ============================================================================
// 13. Risk Budget Framework  (fails closed when exceeded)
// ============================================================================
export function riskBudget(input) {
  const cap = input.cap_usd != null ? input.cap_usd : 0;
  const spent = input.spent_usd != null ? input.spent_usd : 0;
  const network_calls = input.network_calls || 0;
  const exceeded = spent > cap || network_calls > 0;
  return { record_type: 'risk_budget_framework', cap_usd: cap, spent_usd: spent, network_calls, status: exceeded ? 'EXCEEDED_FAIL_CLOSED' : 'WITHIN_BUDGET', proceed: !exceeded, reason: exceeded ? 'budget/network exceeded → fail closed' : 'within local zero-spend budget' };
}

// ============================================================================
// 14. Scan Completeness States
// ============================================================================
export function scanCompleteness(input) {
  const scanned = input.scanned || 0, total = input.total || 0, errors = input.errors || 0;
  let state = 'UNKNOWN';
  if (total > 0 && errors === 0 && scanned === total) state = 'COMPLETE';
  else if (total > 0 && scanned > 0 && scanned < total) state = 'PARTIAL';
  else if (total === 0) state = 'UNKNOWN';
  else if (errors > 0) state = 'PARTIAL';
  return { record_type: 'scan_completeness_state', scanned, total, errors, state };
}

// ============================================================================
// 15. Threat Model Versioning
// ============================================================================
export function threatModelVersion(version) { return { record_type: 'threat_model_version', version: version || THREAT_MODEL_VERSION, recorded: true }; }

// ============================================================================
// 5. Function Preservation Verification
// ============================================================================
export function functionPreservation(input) {
  const before = input.before_behavior_hash || (input.before != null ? sha256(input.before) : null);
  const after = input.after_behavior_hash || (input.after != null ? sha256(input.after) : null);
  const present = !!(before && after);
  const preserved = present && before === after;
  return { record_type: 'function_preservation_record', before_hash: before, after_hash: after, present, preserved, status: !present ? 'HOLD_MISSING' : (preserved ? 'PRESERVED' : 'CHANGED'), reason: !present ? 'function preservation record required (before/after missing)' : (preserved ? 'behavior preserved' : 'behavior changed — needs review') };
}

// ============================================================================
// 4 & 16. Security Finding Lifecycle + Patch Safety Validation
//   Separation: finding (reporter) → validation (validator≠reporter) → patch (patcher) → acceptance (acceptor≠patcher)
// ============================================================================
export function securityFindingLifecycle(input) {
  const s = { finding: input.finding || null, validation: input.validation || null, patch: input.patch || null, acceptance: input.acceptance || null };
  const actors = { reporter: s.finding && s.finding.by, validator: s.validation && s.validation.by, patcher: s.patch && s.patch.by, acceptor: s.acceptance && s.acceptance.by };
  const problems = [];
  if (!s.finding) problems.push('no finding');
  if (s.acceptance && !s.validation) problems.push('accepted without validation');
  if (s.acceptance && s.validation && s.patch && actors.acceptor && actors.patcher && actors.acceptor === actors.patcher) problems.push('acceptor equals patcher (no separation)');
  if (s.validation && actors.validator && actors.reporter && actors.validator === actors.reporter) problems.push('validator equals reporter (no independence)');
  const accepted = problems.length === 0 && !!s.acceptance;
  return { record_type: 'security_finding_lifecycle_record', stages: s, actors, problems, status: problems.length ? 'HOLD' : (accepted ? 'ACCEPTED_WITH_SEPARATION' : 'IN_PROGRESS'), accepted };
}
export function patchSafetyValidation(input) {
  const validated = input.validated === true && input.validated_by && input.validated_by !== input.patched_by;
  const preservation = input.function_preservation && input.function_preservation.preserved === true;
  const safe = validated && preservation;
  return { record_type: 'security_patch_safety_validation_record', validated: !!validated, function_preserved: !!preservation, status: safe ? 'SAFE_TO_ACCEPT' : 'HOLD', reason: !validated ? 'patch not independently validated' : (!preservation ? 'function preservation not proven' : 'patch validated and preservation proven') };
}

// ============================================================================
// 6. Independent Checker Verification Record
// ============================================================================
export function independentCheckerRecord(input) {
  const independent = input.checker_actor && input.builder_actor && input.checker_actor !== input.builder_actor;
  return { record_type: 'independent_checker_verification_record', builder_actor: input.builder_actor || null, checker_actor: input.checker_actor || null, independent: !!independent, verdict: input.verdict || 'PENDING', status: independent ? 'OK' : 'HOLD', reason: independent ? 'checker independent of builder' : 'checker must differ from builder' };
}

// ============================================================================
// 7. Mutation / Falsification Record
// ============================================================================
export function mutationFalsificationRecord(cases) {
  // fail-closed = any non-green state: HOLD / UNKNOWN / REFUSED / EXCEEDED / FAIL_CLOSED / BLOCKED / CHANGED. Never PASS/OK/SAFE/QUALIFIED-real.
  const list = (cases || []).map((c) => ({ name: c.name, expected: 'HOLD/UNKNOWN/REFUSED/EXCEEDED_FAIL_CLOSED', observed: c.observed, passed_closed: /HOLD|UNKNOWN|REFUSED|EXCEEDED|FAIL_CLOSED|BLOCKED|CHANGED/.test(String(c.observed)) }));
  const anyGreen = list.some((c) => !c.passed_closed);
  return { record_type: 'mutation_falsification_record', cases: list, all_fail_closed: !anyGreen, status: anyGreen ? 'HOLD' : 'OK' };
}

// ============================================================================
// 8. Model & Provider Qualification Process
// ============================================================================
export function providerQualification(input) {
  const real = input.real_provider === true;
  return { record_type: 'model_provider_qualification_record', provider_id: input.provider_id || 'unspecified', real_provider: false, qualified_scope: 'simulated_local_only', requires_founder_gate_for_real: true, status: real ? 'HOLD_REQUIRES_FOUNDER_GATE' : 'QUALIFIED_SIMULATED', can_self_certify: false };
}

// ============================================================================
// 3. Evaluation Dataset Governance (PLANNED_WITH_SCHEMA — no real dataset yet)
// ============================================================================
export function evaluationDatasetGovernance() {
  return { record_type: 'evaluation_dataset_governance_stub', status: 'PLANNED_WITH_SCHEMA', real_dataset_present: false, schema: { id: 'string', source: 'local_synthetic_only', labels: 'string[]', splits: ['train?', 'eval'], provenance_hash: 'sha256' }, note: 'No real evaluation dataset exists yet; represented as planned schema only. Real/customer data blocked.' };
}

// ============================================================================
// Protected-actions guard
// ============================================================================
export function assertProtectedActionsBlocked(requested = []) {
  const violations = requested.filter((r) => BLOCKED_GATES.includes(r) || FORBIDDEN_ACTIONS.includes(r));
  return { record_type: 'protected_actions_guard', requested, violations, blocked_ok: violations.length === 0 ? true : false, status: violations.length ? 'REFUSED' : 'OK' };
}

// ============================================================================
// Coverage roll-up for the UI
// ============================================================================
export const P1_ITEMS = Object.freeze([
  'ai_system_configuration_manifest', 'context_provenance_record', 'evaluation_dataset_governance', 'security_finding_lifecycle', 'function_preservation_verification', 'independent_checker_verification', 'mutation_falsification_testing', 'model_provider_qualification', 'tool_capability_classification', 'mcp_capability_classification', 'agent_action_trace', 'evidence_confidence_model', 'risk_budget_framework', 'scan_completeness_states', 'threat_model_versioning', 'security_patch_safety_validation', 'exact_ai_configuration_fingerprinting', 'provider_neutral_security_interface', 'immutable_context_snapshot', 'ai_runtime_manifest',
]);
export function p1Coverage() {
  // 19 implemented-local; evaluation_dataset_governance is PLANNED_WITH_SCHEMA (partial, honest).
  const partial = ['evaluation_dataset_governance'];
  const integrated = P1_ITEMS.filter((i) => !partial.includes(i));
  return { total: P1_ITEMS.length, integrated: integrated.length, partial: partial.length, not_yet: 0, integrated_items: integrated, partial_items: partial };
}
