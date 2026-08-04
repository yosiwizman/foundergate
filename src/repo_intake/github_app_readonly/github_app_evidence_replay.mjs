// FounderGate — GitHub App Evidence Replay (LOCAL, deterministic; uses_ai_reasoning=false).
// Reconstructs what was proven from sealed evidence. CRITICAL: it NEVER converts local simulation into a
// live proof — a local-simulation record can only replay to REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY.

import { sha256 } from './github_app_authority_model.mjs';
import { scanForSecrets } from './github_app_secret_guard.mjs';

export function replay(evidence) {
  if (!evidence || evidence.record_type !== 'github_app_local_macro_evidence') {
    return { status: 'HOLD_MISSING_EVIDENCE', uses_ai_reasoning: false };
  }
  // Any secret in the evidence is fatal.
  if (!scanForSecrets(JSON.stringify(evidence)).clean) {
    return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'secret_material_present', uses_ai_reasoning: false };
  }
  const base = { ...evidence }; delete base.evidence_digest;
  const recomputed = 'gae_' + sha256(base).slice(0, 24);
  if (recomputed !== evidence.evidence_digest) return { status: 'HOLD_REPLAY_MISMATCH', reason: 'digest', uses_ai_reasoning: false };

  // Safety invariants that must always hold for the local macro.
  const safe =
    evidence.live_github_app_created === false &&
    evidence.live_github_app_installed === false &&
    evidence.live_installation_token_generated === false &&
    evidence.private_key_seen === false &&
    evidence.installation_token_seen === false &&
    evidence.existing_valuable_repo_touched === false &&
    evidence.customer_repo_touched === false &&
    evidence.code_execution === false &&
    evidence.provider_call === false;
  if (!safe) return { status: 'HOLD_REPLAY_MISMATCH', reason: 'safety_invariant', uses_ai_reasoning: false };

  // A local-simulation record can NEVER become a live proof.
  if (evidence.mode === 'local_simulation') {
    // Guard against any live-proof claim smuggled into a simulation record.
    if (evidence.claims_live_proof === true || evidence.github_app_proven === true) {
      return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'simulation_claims_live', uses_ai_reasoning: false };
    }
    return {
      status: 'REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY', uses_ai_reasoning: false,
      mode: 'local_simulation', github_app_proven: false,
      live_action_required: true, result_label: evidence.label,
    };
  }
  if (evidence.mode === 'live_app_proof' && evidence.contract_satisfied === true) {
    return { status: 'REPLAY_VERIFIED_LIVE_APP_PROOF', uses_ai_reasoning: false, mode: 'live_app_proof', result_label: evidence.label };
  }
  return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'mode_unresolved', uses_ai_reasoning: false };
}

// Build the local-macro evidence record (mode = local_simulation; digest-sealed).
export function buildLocalEvidence(i = {}) {
  const ev = {
    record_type: 'github_app_local_macro_evidence',
    mode: 'local_simulation',
    label: i.label || 'LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS',
    live_action_authority: false,
    github_app_proven: false,
    claims_live_proof: false,
    live_github_app_created: false,
    live_github_app_installed: false,
    live_installation_token_generated: false,
    private_key_seen: false,
    installation_token_seen: false,
    existing_valuable_repo_touched: false,
    customer_repo_touched: false,
    production_repo_touched: false,
    code_execution: false,
    build_run: false,
    repo_tests_run: false,
    provider_call: false,
    broad_gh_auth_used: false,
    fine_grained_pat_used: false,
    deploy_key_used: false,
    protected_main_touched: false,
    pr_200_touched: false,
    refusal_matrix_total: i.refusal_matrix_total ?? null,
    refusal_matrix_all_held: i.refusal_matrix_all_held ?? null,
    sandbox_repo: 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET',
    next_gate: 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED',
    evidence_digest: undefined,
  };
  ev.evidence_digest = 'gae_' + sha256({ ...ev, evidence_digest: undefined }).slice(0, 24);
  return ev;
}
