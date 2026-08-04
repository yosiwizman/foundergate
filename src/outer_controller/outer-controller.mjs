// FounderGate — Always-On Deterministic Outer Controller (LOCAL / SYNTHETIC).
// The worker CANNOT override this. The controller loads+validates the run contract, attests the environment,
// runs boundary challenges, admits or refuses, runs a local synthetic worker, compares expected vs observed,
// triggers containment on any violation/unknown/monitoring-loss/deadline, records an independent evidence plane,
// runs post-run verification, and produces a final verdict. It never emits "secure".
import { makeRunContract, validateRunContract } from '../environment_run_contract/run-contract.mjs';
import { preRunAttestation, goodFacts } from '../pre_run_attestation/pre-run-attestation.mjs';
import { runChallenges } from '../boundary_challenges/boundary-challenges.mjs';
import { createEvidencePlane, recordStreams, sealEvidencePlane } from '../evidence_plane/evidence-plane.mjs';
import { compareRuntime } from '../runtime_reality/runtime-reality.mjs';
import { decideStop } from '../stop_controller/stop-controller.mjs';
import { postRunVerification } from '../post_run_verification/post-run-verification.mjs';

export const FINAL_VERDICTS = Object.freeze([
  'VERIFIED_WITHIN_BOUNDARIES', 'BOUNDARY_VIOLATION_DETECTED_AND_STOPPED', 'BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED',
  'MONITORING_LOST', 'EVIDENCE_INCOMPLETE', 'ENVIRONMENT_MISMATCH', 'UNKNOWN',
  'HOLD_PRE_RUN_ATTESTATION_FAILED', 'HOLD_CHALLENGE_FAILED_OPEN',
]);

// scenario shape (from a fixture): { contract?, facts?, challenge_observations?, expected_runtime, observed_runtime,
//   monitoring_lost?, evidence_gap?, worker_final_claim? }
export function runOuterController(scenario = {}) {
  const trace = [];
  const step = (name, data) => { trace.push({ step: name, ...data }); };
  const plane = createEvidencePlane({ run_id: scenario.run_id || 'gauntlet' });

  // 1-2. load + validate contract
  const contract = scenario.contract || makeRunContract(scenario.contract_input || {});
  const cval = validateRunContract(contract);
  recordStreams(plane, { contract_digest: contract.contract_digest, worker_identity: contract.exact_agent_or_worker_identity, runtime_digest: contract.sandbox_or_runtime_digest });
  step('validate_contract', { status: cval.status });
  if (!cval.valid) return finalize('HOLD_PRE_RUN_ATTESTATION_FAILED', { reason: 'invalid_contract', cval, trace, plane });

  // 3. pre-run attestation
  const facts = scenario.facts || goodFacts(contract);
  const att = preRunAttestation(contract, facts);
  recordStreams(plane, { pre_run_attestation: att });
  step('pre_run_attestation', { verdict: att.verdict });
  if (att.verdict !== 'PASS') return finalize('HOLD_PRE_RUN_ATTESTATION_FAILED', { att, trace, plane, worker_claim: scenario.worker_final_claim });

  // 4. active boundary challenges
  const challenges = runChallenges(scenario.challenge_observations || {});
  recordStreams(plane, { challenge_results: challenges });
  step('boundary_challenges', { status: challenges.status, fail_open: challenges.fail_open, unknown: challenges.unknown });
  if (challenges.status === 'FAIL_OPEN') {
    const stop = triggerContainment('challenge_fail_open', plane);
    return finalize('HOLD_CHALLENGE_FAILED_OPEN', { challenges, stop, trace, plane });
  }
  if (challenges.status === 'UNKNOWN') {
    const stop = triggerContainment('challenge_unknown', plane);
    return finalize('UNKNOWN', { challenges, stop, trace, plane });
  }

  // 5. admission decision (all gates passed)
  step('admission', { admit: true });

  // 6. start local synthetic worker + 7. observe runtime + 8. compare expected vs observed
  const monitoring_lost = scenario.monitoring_lost === true;
  recordStreams(plane, { monitor_health: monitoring_lost ? 'LOST' : 'OK' });
  if (monitoring_lost) {
    const stop = triggerContainment('monitoring_lost', plane);
    return finalize('MONITORING_LOST', { stop, trace, plane, monitoring_lost: true });
  }
  const runtime = compareRuntime(scenario.expected_runtime || {}, scenario.observed_runtime || {});
  recordStreams(plane, { runtime_reality: runtime });
  step('runtime_reality', { overall: runtime.overall });

  // 9. containment on violation / deadline
  let stop = null, violations = [];
  if (runtime.overall === 'VIOLATION') {
    violations = Object.entries(runtime.dimensions).filter(([, v]) => v === 'VIOLATION').map(([k]) => k);
    stop = triggerContainment('runtime_violation', plane, scenario.stop_confirmable !== false);
  } else if (runtime.overall === 'UNKNOWN') {
    stop = triggerContainment('runtime_unknown', plane, scenario.stop_confirmable !== false);
  }

  // 10-11. record post-run stream, seal evidence plane, then compute post-run verification with the sealed completeness.
  recordStreams(plane, { post_run_verification: 'recorded' });
  const seal = sealEvidencePlane(plane, { monitoring_lost, gap_detected: scenario.evidence_gap === true });
  const post = postRunVerification({
    residual_process_record: scenario.residual_process_record,
    unexpected_listener_record: scenario.unexpected_listener_record,
    unauthorized_network_event: violations.includes('destinations'),
    evidence_completeness: seal.completeness,
    violations, teardown_evidence: stop ? stop.confirmed : true,
    stop_status: stop ? stop.status : undefined,
    runtime_overall: runtime.overall, mismatch_kind: scenario.mismatch_kind,
  });

  // 12. final verdict = post-run verification status (deterministic; worker claim ignored)
  return finalize(post.status, { att, challenges, runtime, stop, seal, post, trace, plane, worker_claim_ignored: scenario.worker_final_claim || null });

  function triggerContainment(reason, pl, confirmable = true) {
    recordStreams(pl, { violations: reason });
    const d = decideStop({ reason, pre_stop_evidence_sealed: true, violation_persisted: true, tools_revoked: true, worker_stopped: confirmable, descendants_terminated: confirmable, artifacts_preserved: true, verified_stopped: confirmable });
    recordStreams(pl, { stop_events: d.status });
    step('containment', { reason, status: d.status });
    return d;
  }
  function finalize(final_verdict, ctx) {
    const sealNow = ctx.seal || sealEvidencePlane(ctx.plane, { monitoring_lost: ctx.monitoring_lost === true, gap_detected: scenario.evidence_gap === true });
    // deterministic: worker's own claim is recorded but NEVER used to set the verdict
    return {
      record_type: 'outer_controller_result', run_id: scenario.run_id || 'gauntlet',
      final_verdict, never_secure: true, worker_can_override: false,
      contract_digest: ctx.plane ? ctx.contract_digest || contract.contract_digest : null,
      evidence_plane_digest: sealNow.evidence_plane_digest, evidence_completeness: sealNow.completeness,
      attestation_verdict: ctx.att ? ctx.att.verdict : (final_verdict.startsWith('HOLD_PRE') ? 'FAIL/HOLD' : 'n/a'),
      challenge_status: ctx.challenges ? ctx.challenges.status : 'n/a',
      runtime_overall: ctx.runtime ? ctx.runtime.overall : 'n/a',
      stop_status: ctx.stop ? ctx.stop.status : 'n/a',
      post_run_status: ctx.post ? ctx.post.status : 'n/a',
      worker_final_claim_ignored: scenario.worker_final_claim || null,
      trace: ctx.trace,
    };
  }
}
