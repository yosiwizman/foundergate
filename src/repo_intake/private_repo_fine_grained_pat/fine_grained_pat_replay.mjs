// FounderGate — Fine-grained PAT Evidence Replay (LOCAL, deterministic; uses_ai_reasoning=false).
// Reconstructs the result from sealed evidence ONLY and re-checks the digest + all safety invariants.

import { sha256 } from './pat_authority_model.mjs';

export function replay(evidence) {
  if (!evidence || evidence.record_type !== 'fine_grained_pat_proof_evidence') {
    return { status: 'HOLD_NO_EVIDENCE', uses_ai_reasoning: false };
  }
  const base = { ...evidence };
  delete base.evidence_digest;
  const recomputed = 'fgp_' + sha256(base).slice(0, 24);
  const digest_ok = recomputed === evidence.evidence_digest;

  // Safety invariants that must ALWAYS hold regardless of the token-present/absent branch.
  const alwaysSafe =
    evidence.token_value_seen_by_log === false &&
    evidence.token_printed === false &&
    evidence.token_packaged === false &&
    evidence.broad_gh_auth_used_for_intake === false &&
    evidence.deploy_key_used_for_intake === false &&
    evidence.existing_valuable_repo_touched === false &&
    evidence.customer_repo_touched === false &&
    evidence.code_execution === false &&
    evidence.build_run === false &&
    evidence.tests_run_from_repo === false &&
    evidence.provider_call === false &&
    evidence.write_during_read_proof === false;

  if (!digest_ok) return { status: 'HOLD_REPLAY_MISMATCH', reason: 'digest', uses_ai_reasoning: false };
  if (!alwaysSafe) return { status: 'HOLD_REPLAY_MISMATCH', reason: 'safety_invariant', uses_ai_reasoning: false };

  // Branch: token absent → the honest gate-required replay; token present + intake → verified-with-limits replay.
  if (!evidence.token_present) {
    return {
      status: 'REPLAY_VERIFIED_GATE_REQUIRED', uses_ai_reasoning: false,
      token_present: false, intake_occurred: false,
      result_label: 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED',
      credential_type: evidence.credential_type,
      not_asserted: evidence.not_asserted,
    };
  }
  // Present path requires intake binding to be internally consistent.
  const intakeConsistent = !evidence.intake_occurred || (evidence.exact_commit && evidence.snapshot_digest && evidence.manifest_digest);
  if (!intakeConsistent) return { status: 'HOLD_REPLAY_MISMATCH', reason: 'intake_binding_missing', uses_ai_reasoning: false };
  return {
    status: 'REPLAY_VERIFIED', uses_ai_reasoning: false,
    token_present: true, intake_occurred: evidence.intake_occurred,
    credential_type: evidence.credential_type,
    intake_auth_route: evidence.intake_auth_route,
    exact_commit: evidence.exact_commit,
    scope_validation_label: evidence.scope_validation_label,
    revocation_status: evidence.revocation_status,
    result_label: evidence.label,
  };
}
