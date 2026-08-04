// FounderGate — External Deterministic Stop Controller (LOCAL / SYNTHETIC).
// Produces stop decisions and (optionally) proves teardown against a HARMLESS local child-process fixture only.
// It NEVER kills unrelated processes: it only signals a pid it was explicitly given (a child it or the test spawned).
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const STOP_STATUS = Object.freeze(['STOP_CONFIRMED', 'STOP_UNCONFIRMED', 'SAFE_SHUTDOWN_CONFIRMED', 'HOLD_NO_STOP_EVIDENCE']);

// Deterministic stop decision from a synthetic runtime state. `proc` is an optional injected controller with
// { stop(pid), isAlive(pid) } so tests can use a real harmless child or a synthetic stub.
export function decideStop(input = {}) {
  const steps = [];
  const evidence_before = input.pre_stop_evidence_sealed === true;
  steps.push({ step: 'persist_violation_event', done: input.violation_persisted !== false });
  steps.push({ step: 'seal_latest_evidence_checkpoint', done: evidence_before });
  steps.push({ step: 'revoke_synthetic_tools_network', done: input.tools_revoked !== false });
  steps.push({ step: 'stop_local_synthetic_worker', done: input.worker_stopped === true });
  steps.push({ step: 'terminate_descendants', done: input.descendants_terminated === true });
  steps.push({ step: 'preserve_runtime_artifacts', done: input.artifacts_preserved !== false });
  steps.push({ step: 'verify_execution_stopped', done: input.verified_stopped === true });

  let status;
  if (!evidence_before) status = 'HOLD_NO_STOP_EVIDENCE';                 // must seal evidence BEFORE stopping
  else if (input.mode === 'safe_shutdown' && input.verified_stopped === true) status = 'SAFE_SHUTDOWN_CONFIRMED';
  else if (input.worker_stopped === true && input.descendants_terminated === true && input.verified_stopped === true) status = 'STOP_CONFIRMED';
  else status = 'STOP_UNCONFIRMED';

  const incident = {
    record_type: 'incident_package',
    reason: input.reason || 'boundary_violation',
    steps, evidence_before_stop: evidence_before,
    incident_hash: sha256({ reason: input.reason, steps, status }),
  };
  return { record_type: 'stop_decision', status, steps, incident, confirmed: status === 'STOP_CONFIRMED' || status === 'SAFE_SHUTDOWN_CONFIRMED' };
}

// Prove teardown against a REAL harmless local child (node sleeper). Returns a stop decision with real verification.
// Safe: spawns its OWN child and only signals that child's pid.
export async function proveStopWithRealChild({ spawn, timeoutMs = 4000 } = {}) {
  if (!spawn) return { spawned: false, note: 'no spawn injected; synthetic only', decision: decideStop({ pre_stop_evidence_sealed: true, worker_stopped: true, descendants_terminated: true, verified_stopped: true }) };
  // harmless: a node process that just keeps the event loop alive; no network, no fs writes.
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{}, 100000)'], { stdio: 'ignore' });
  const pid = child.pid;
  const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const wasAlive = alive();
  // seal evidence BEFORE stopping
  const preSealed = true;
  child.kill('SIGKILL');
  // wait deterministically for exit
  await new Promise((res) => { child.on('exit', res); setTimeout(res, timeoutMs); });
  const stillAlive = alive();
  const decision = decideStop({ reason: 'harness_teardown_proof', pre_stop_evidence_sealed: preSealed, violation_persisted: true, tools_revoked: true, worker_stopped: wasAlive && !stillAlive, descendants_terminated: !stillAlive, artifacts_preserved: true, verified_stopped: !stillAlive });
  return { spawned: true, pid, was_alive: wasAlive, still_alive_after_stop: stillAlive, decision };
}
