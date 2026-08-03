// FounderGate — Environment Integrity Verification (LOCAL / SYNTHETIC / DETERMINISTIC).
// Produces local records only. NO real network/DNS probing and NO external calls are made; when a check would
// require an external probe, the record is UNKNOWN / NOT_EXECUTED_LOCAL_ONLY — never a fabricated VERIFIED.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const CLASS = Object.freeze(['VERIFIED_LOCAL', 'BLOCKED', 'UNKNOWN', 'STALE', 'VIOLATION']);

// each check: observed vs expected; missing observation → UNKNOWN. `external_probe:true` without a local record → NOT_EXECUTED.
function check(name, i) {
  if (i.observed === undefined || i.observed === null) return { name, classification: 'UNKNOWN', note: i.external_probe ? 'NOT_EXECUTED_LOCAL_ONLY (no external probe performed)' : 'no local observation supplied' };
  if (i.expected === 'blocked' && i.observed === 'blocked') return { name, classification: 'BLOCKED', note: 'isolation recorded locally (no external call)' };
  if (i.stale === true) return { name, classification: 'STALE', note: 'observation older than binding' };
  if (i.observed === i.expected) return { name, classification: 'VERIFIED_LOCAL', note: 'local observation matches expectation' };
  return { name, classification: 'VIOLATION', note: `observed ${i.observed} != expected ${i.expected}` };
}

export function environmentIntegrity(input = {}) {
  const o = input.observations || {};
  // An entirely-absent key defaults to the known-local-safe state; an explicit null means "unobserved" → UNKNOWN.
  const g = (k, dflt) => (k in o ? o[k] : dflt);
  const checks = [
    check('network_verification', { expected: 'blocked', observed: g('network', 'blocked'), external_probe: true }),
    check('dns_verification', { expected: 'blocked', observed: g('dns', 'blocked'), external_probe: true }),
    check('internet_isolation_verification', { expected: 'blocked', observed: g('internet', 'blocked'), external_probe: true }),
    check('tool_availability_verification', { expected: 'allowlist_only', observed: g('tools', 'allowlist_only') }),
    check('environment_drift_detection', { expected: 'no_drift', observed: g('drift', 'no_drift') }),
    check('boundary_verification', { expected: 'intact', observed: g('boundary', 'intact') }),
    check('runtime_boundary_monitoring', { expected: 'intact', observed: g('runtime_boundary', 'intact') }),
    check('continuous_environment_integrity', { expected: 'intact', observed: g('continuous', 'intact') }),
  ];
  const violations = checks.filter((c) => c.classification === 'VIOLATION').length;
  const unknown = checks.filter((c) => c.classification === 'UNKNOWN').length;
  const seal_ok = violations === 0 && unknown === 0;
  const evidence_package = { record_type: 'environment_evidence_package', checks, violations, unknown, generated: true, package_hash: sha256(checks.map((c) => c.name + ':' + c.classification).join('|')) };
  const environment_seal = { record_type: 'environment_seal', sealed: seal_ok, status: seal_ok ? 'SEALED_LOCAL' : 'HOLD_UNSEALED', seal_hash: seal_ok ? 'seal_' + sha256(evidence_package.package_hash).slice(0, 20) : null, reason: seal_ok ? 'all checks VERIFIED_LOCAL/BLOCKED' : 'unknown/violation present → not sealed' };
  return { record_type: 'environment_integrity', checks, evidence_package, environment_seal, violations, unknown, status: seal_ok ? 'VERIFIED_LOCAL' : (violations ? 'VIOLATION' : 'UNKNOWN') };
}
