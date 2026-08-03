// FounderGate — Automatic Containment (LOCAL / SYNTHETIC / DETERMINISTIC).
// Derives a containment decision from assumption + environment + execution + boundary status. Fails closed.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const DECISION = Object.freeze(['CONTINUE', 'PAUSE', 'STOP', 'QUARANTINE', 'SAFE_SHUTDOWN']);

export function containmentDecision(input = {}) {
  const a = input.assumption_action || 'CONTINUE';       // CONTINUE|PAUSE|STOP|QUARANTINE
  const env = input.environment_status || 'UNKNOWN';     // VERIFIED_LOCAL|VIOLATION|UNKNOWN
  const exe = input.execution_status || 'UNKNOWN';       // VERIFIED_LOCAL|VIOLATION|HOLD_MISSING_EVIDENCE
  const boundary = input.boundary_action || 'CONTINUE';  // CONTINUE|PAUSE|STOP|QUARANTINE
  const reasons = [];
  let decision = 'CONTINUE';
  const escalate = (d, why) => { const rank = { CONTINUE: 0, PAUSE: 1, STOP: 2, QUARANTINE: 3, SAFE_SHUTDOWN: 4 }; if (rank[d] > rank[decision]) decision = d; if (why) reasons.push(why); };

  if (env === 'VIOLATION') escalate('QUARANTINE', 'environment violation');
  if (exe === 'VIOLATION') escalate('QUARANTINE', 'execution violation');
  if (a === 'QUARANTINE' || boundary === 'QUARANTINE') escalate('QUARANTINE', 'assumption/boundary quarantine');
  if (a === 'STOP' || boundary === 'STOP') escalate('STOP', 'assumption/boundary stop');
  if (env === 'UNKNOWN' || exe === 'HOLD_MISSING_EVIDENCE' || exe === 'UNKNOWN' || a === 'PAUSE' || boundary === 'PAUSE') escalate('PAUSE', 'unknown state → pause (fail closed)');

  const shuttingDown = decision === 'QUARANTINE' || decision === 'SAFE_SHUTDOWN';
  // evidence before shutdown is REQUIRED
  const evidence_before_shutdown = input.pre_shutdown_evidence != null;
  if (shuttingDown && !evidence_before_shutdown) reasons.push('HOLD: shutdown requires evidence captured first');
  const recovery_evidence = input.recovery_evidence != null;

  return {
    record_type: 'containment_decision',
    inputs: { assumption_action: a, environment_status: env, execution_status: exe, boundary_action: boundary },
    decision,
    quarantine_mode: decision === 'QUARANTINE',
    safe_shutdown: decision === 'SAFE_SHUTDOWN' || decision === 'QUARANTINE',
    evidence_before_shutdown, recovery_evidence,
    status: (shuttingDown && !evidence_before_shutdown) ? 'HOLD_SHUTDOWN_WITHOUT_EVIDENCE' : decision,
    proceed: decision === 'CONTINUE',
    reasons,
    decision_hash: sha256({ a, env, exe, boundary, decision }),
  };
}
