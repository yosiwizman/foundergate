// FounderGate — Assumption Verification Engine (LOCAL / SYNTHETIC / DETERMINISTIC).
// Declares assumptions, verifies each against a locally-provided observed state, and packages the result.
// No real network probing, no credential use — observed states are supplied synthetically by the caller.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const STATUS = Object.freeze(['VERIFIED', 'VIOLATED', 'UNKNOWN', 'STALE', 'MONITORING_REQUIRED']);
export const VIOLATION_ACTION = Object.freeze(['CONTINUE', 'PAUSE', 'STOP', 'QUARANTINE']);

// evaluate a single assumption. `expiration_index`/`now_index` are integer logical clocks (no wall clock).
export function verifyAssumption(a) {
  const observed = a.observed_state;
  let status;
  if (observed === undefined || observed === null) status = 'UNKNOWN';
  else if (a.expiration_index != null && a.now_index != null && a.now_index > a.expiration_index) status = 'STALE';
  else if (observed === a.expected_state) status = a.continuous_monitoring_required ? 'MONITORING_REQUIRED' : 'VERIFIED';
  else status = 'VIOLATED';
  const action = status === 'VIOLATED' ? (a.violation_action || 'STOP') : (status === 'UNKNOWN' || status === 'STALE' ? 'PAUSE' : 'CONTINUE');
  return {
    record_type: 'assumption_verification', id: a.id, declared_assumption: a.declared_assumption,
    verification_method: a.verification_method || 'local_synthetic_observation',
    expected_state: a.expected_state, observed_state: observed,
    evidence_ref: a.evidence_ref || null, evidence_hash: observed != null ? sha256(String(observed)) : null,
    confidence: status === 'VERIFIED' ? 'HIGH' : (status === 'MONITORING_REQUIRED' ? 'MEDIUM' : 'NONE'),
    expiration_index: a.expiration_index ?? null, now_index: a.now_index ?? null,
    continuous_monitoring_required: !!a.continuous_monitoring_required,
    status, violation_action: action,
  };
}

// the 10 local sample assumptions (Lane D). observed==expected → verified; caller may override to force VIOLATED/UNKNOWN/STALE.
export function sampleAssumptions(overrides = {}) {
  const base = [
    { id: 'A01', declared_assumption: 'internet is blocked', expected_state: 'blocked', verification_method: 'local isolation record (no external call made)', continuous_monitoring_required: true },
    { id: 'A02', declared_assumption: 'only allowed tools exist', expected_state: 'allowlist_only' },
    { id: 'A03', declared_assumption: 'credentials absent', expected_state: 'absent', continuous_monitoring_required: true },
    { id: 'A04', declared_assumption: 'repo clean', expected_state: 'clean' },
    { id: 'A05', declared_assumption: 'filesystem writable/read-only state known', expected_state: 'known' },
    { id: 'A06', declared_assumption: 'model cannot reach production', expected_state: 'no_prod_path', continuous_monitoring_required: true },
    { id: 'A07', declared_assumption: 'private repo access blocked', expected_state: 'blocked', continuous_monitoring_required: true },
    { id: 'A08', declared_assumption: 'provider keys absent', expected_state: 'absent', continuous_monitoring_required: true },
    { id: 'A09', declared_assumption: 'deploy path absent', expected_state: 'absent' },
    { id: 'A10', declared_assumption: 'billing path absent', expected_state: 'absent' },
  ];
  return base.map((a) => {
    const o = overrides[a.id] || {};
    // default: observed matches expected (locally verified synthetic record). For monitoring items, mark MONITORING_REQUIRED.
    return verifyAssumption({ ...a, observed_state: 'observed_state' in o ? o.observed_state : a.expected_state, evidence_ref: `local://assumption/${a.id}`, expiration_index: o.expiration_index, now_index: o.now_index, violation_action: o.violation_action });
  });
}

export function verifyAssumptions(assumptions) {
  const results = (assumptions || []).map(verifyAssumption);
  return packageAssumptions(results);
}

export function packageAssumptions(results) {
  const by = (s) => results.filter((r) => r.status === s).length;
  const verified = by('VERIFIED'), monitoring = by('MONITORING_REQUIRED');
  const violations = by('VIOLATED'), unknown = by('UNKNOWN'), stale = by('STALE');
  // "verified" for the summary line counts VERIFIED + MONITORING_REQUIRED (both are non-violated, evidence-present)
  const declared = results.length, verifiedTotal = verified + monitoring;
  const worst = violations ? 'QUARANTINE' : (unknown || stale ? 'PAUSE' : 'CONTINUE');
  return {
    record_type: 'assumption_verification_package',
    declared, verified: verifiedTotal, verified_strict: verified, monitoring_required: monitoring,
    violations, unknown, stale,
    all_clear: violations === 0 && unknown === 0 && stale === 0,
    package_action: worst,
    summary: `${declared} assumptions declared; ${verifiedTotal} verified; ${violations} violations; evidence package generated.`,
    package_hash: sha256(results.map((r) => r.id + ':' + r.status + ':' + (r.evidence_hash || '')).join('|')),
    results,
  };
}
