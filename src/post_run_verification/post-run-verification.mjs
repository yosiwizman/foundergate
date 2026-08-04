// FounderGate — Post-Run Verification (LOCAL / SYNTHETIC / DETERMINISTIC). Never produces "secure".
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const STATUS = Object.freeze(['VERIFIED_WITHIN_BOUNDARIES', 'BOUNDARY_VIOLATION_DETECTED_AND_STOPPED', 'BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED', 'MONITORING_LOST', 'EVIDENCE_INCOMPLETE', 'ENVIRONMENT_MISMATCH', 'UNKNOWN']);

export function postRunVerification(input = {}) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail || '' });
  add('no_residual_worker_process', input.residual_process_record !== true, input.residual_process_record ? 'a synthetic worker process record remains' : 'none');
  add('no_unexpected_listener', input.unexpected_listener_record !== true);
  add('temp_credentials_absent_or_revoked', input.temp_credentials === undefined || input.temp_credentials === 'absent' || input.temp_credentials === 'revoked');
  add('temp_env_destroyed_or_preserved_per_policy', input.temp_env === undefined || ['destroyed', 'preserved'].includes(input.temp_env));
  add('no_unauthorized_network_event', input.unauthorized_network_event !== true);
  add('evidence_continuous', input.evidence_completeness === 'COMPLETE');
  add('violations_classified', Array.isArray(input.violations));
  add('teardown_evidence_exists', input.teardown_evidence === true || input.violations?.length === 0);

  const monitoringLost = input.evidence_completeness === 'MONITORING_LOST';
  const evidenceIncomplete = ['PARTIAL', 'INCOMPLETE', 'UNKNOWN'].includes(input.evidence_completeness);
  const envMismatch = input.runtime_overall === 'VIOLATION' && input.mismatch_kind === 'environment';
  const violations = input.violations || [];
  const stopped = input.stop_status === 'STOP_CONFIRMED' || input.stop_status === 'SAFE_SHUTDOWN_CONFIRMED';

  let status;
  if (monitoringLost) status = 'MONITORING_LOST';
  else if (evidenceIncomplete) status = 'EVIDENCE_INCOMPLETE';
  else if (envMismatch) status = 'ENVIRONMENT_MISMATCH';
  else if (violations.length && stopped) status = 'BOUNDARY_VIOLATION_DETECTED_AND_STOPPED';
  else if (violations.length && !stopped) status = 'BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED';
  else if (checks.every((c) => c.ok) && violations.length === 0) status = 'VERIFIED_WITHIN_BOUNDARIES';
  else status = 'UNKNOWN';

  // final outcome must agree with evidence
  const agrees = !(status === 'VERIFIED_WITHIN_BOUNDARIES' && (violations.length || !checks.every((c) => c.ok)));
  return {
    record_type: 'post_run_verification', status,
    checks, outcome_agrees_with_evidence: agrees,
    never_secure: true, // this module structurally cannot emit "secure"
    worker_can_self_certify: false,
    verification_hash: sha256({ status, checks }),
  };
}
