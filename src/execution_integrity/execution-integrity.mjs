// FounderGate — Execution Integrity Verification (LOCAL / SYNTHETIC / DETERMINISTIC).
// Fails closed: any check whose evidence is missing → UNKNOWN (never assumed OK). No real syscalls/probes.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const CLASS = Object.freeze(['VERIFIED_LOCAL', 'UNKNOWN', 'VIOLATION']);

function chk(name, expected, observed) {
  if (observed === undefined || observed === null) return { name, classification: 'UNKNOWN', fail_closed: true, note: 'no evidence → fail closed' };
  if (observed === expected) return { name, classification: 'VERIFIED_LOCAL', fail_closed: false, note: 'evidence matches expectation' };
  return { name, classification: 'VIOLATION', fail_closed: true, note: `observed ${observed} != expected ${expected}` };
}

export function executionIntegrity(input = {}) {
  const o = input.observations || {};
  const checks = [
    chk('process_integrity', 'intact', o.process_integrity),
    chk('process_ownership', 'self_owned', o.process_ownership),
    chk('runtime_capability_verification', 'local_only', o.runtime_capability),
    chk('runtime_permission_verification', 'least_privilege', o.runtime_permission),
    chk('credential_verification', 'none_present', o.credentials),
    chk('secret_absence_verification', 'no_secrets', o.secrets),
    chk('filesystem_integrity', 'intact', o.filesystem),
    chk('mount_verification', 'expected_mounts', o.mounts),
    chk('container_verification', 'known', o.container),
    chk('sandbox_verification', 'local_synthetic_only', o.sandbox),
  ];
  const violations = checks.filter((c) => c.classification === 'VIOLATION').length;
  const unknown = checks.filter((c) => c.classification === 'UNKNOWN').length;
  const ok = violations === 0 && unknown === 0;
  return {
    record_type: 'execution_integrity', checks, violations, unknown,
    status: ok ? 'VERIFIED_LOCAL' : (violations ? 'VIOLATION' : 'HOLD_MISSING_EVIDENCE'),
    fails_closed: !ok,
    // honest limit: this is NOT a proof of real sandbox/container security — it is a local synthetic evidence record.
    limit: 'local synthetic evidence only; NOT a proof of real sandbox/container enforcement',
    package_hash: sha256(checks.map((c) => c.name + ':' + c.classification).join('|')),
  };
}
