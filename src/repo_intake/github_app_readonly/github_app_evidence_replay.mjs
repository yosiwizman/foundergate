// FounderGate — GitHub App Evidence Replay (LOCAL, deterministic) — CORRECTED, FAIL-CLOSED.
// Validates EVERY safety-relevant field. A digest-valid but unsafe (or missing/unknown) record NEVER returns a
// verified status. Local simulation can never become live proof.

import { sha256 } from './github_app_authority_model.mjs';
import { scanForSecrets } from './github_app_secret_guard.mjs';

// Every field here must be strictly === false for a safe record. true OR missing OR non-boolean → fail closed.
export const PROHIBITED_FLAGS = [
  'protected_main_touched', 'pr_200_touched', 'production_repo_touched',
  'existing_valuable_repo_touched', 'customer_repo_touched',
  'fine_grained_pat_used', 'deploy_key_used', 'broad_gh_auth_used',
  'live_github_app_token_used', 'live_private_key_used',
  'live_github_app_created', 'live_github_app_installed', 'live_installation_token_generated',
  'code_execution', 'build_run', 'repo_tests_run',
  'provider_call', 'codex_called', 'deployment_performed', 'billing_performed',
  'external_messages_sent', 'akior_accessed', 'real_hardware_accessed',
  'secret_material_exposed', 'private_key_seen', 'installation_token_seen',
];

// cleanup_status must be one of these for a local-simulation record (cleanup N/A locally) or 'completed' for live.
const ACCEPTED_CLEANUP_LOCAL = new Set(['not_applicable_local', 'n/a-local', 'NOT APPLICABLE (local-only)']);

export function replay(evidence) {
  if (!evidence || typeof evidence !== 'object' || evidence.record_type !== 'github_app_local_macro_evidence') {
    return { status: 'HOLD_MISSING_EVIDENCE', uses_ai_reasoning: false, reason: 'no_or_wrong_record' };
  }
  // Any secret material anywhere in the record → fatal.
  if (!scanForSecrets(JSON.stringify(evidence)).clean) {
    return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'secret_material_present', uses_ai_reasoning: false };
  }
  // Digest must recompute exactly.
  const base = { ...evidence }; delete base.evidence_digest;
  if (typeof evidence.evidence_digest !== 'string' || ('gae_' + sha256(base).slice(0, 24)) !== evidence.evidence_digest) {
    return { status: 'HOLD_REPLAY_MISMATCH', reason: 'digest_invalid', uses_ai_reasoning: false };
  }
  // FAIL-CLOSED: every prohibited flag must be strictly === false. true/missing/non-boolean → mismatch.
  for (const flag of PROHIBITED_FLAGS) {
    if (evidence[flag] !== false) {
      return { status: 'HOLD_REPLAY_MISMATCH', reason: `unsafe_or_unknown_field:${flag}=${JSON.stringify(evidence[flag])}`, uses_ai_reasoning: false };
    }
  }
  // Cleanup must be an accepted value (local record).
  if (evidence.mode === 'local_simulation' && !ACCEPTED_CLEANUP_LOCAL.has(evidence.cleanup_status)) {
    // cleanup is allowed to be null ONLY if the record explicitly marks it not-applicable via cleanup_status.
    if (evidence.cleanup_status !== null && evidence.cleanup_status !== undefined) {
      return { status: 'HOLD_REPLAY_MISMATCH', reason: `cleanup_status_unaccepted:${evidence.cleanup_status}`, uses_ai_reasoning: false };
    }
  }
  // A local-simulation record can NEVER claim/become a live proof.
  if (evidence.mode === 'local_simulation') {
    if (evidence.claims_live_proof === true || evidence.github_app_proven === true) {
      return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'simulation_claims_live', uses_ai_reasoning: false };
    }
    return {
      status: 'REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY', uses_ai_reasoning: false,
      mode: 'local_simulation', github_app_proven: false, live_action_required: true, result_label: evidence.label,
    };
  }
  if (evidence.mode === 'live_app_proof' && evidence.contract_satisfied === true) {
    return { status: 'REPLAY_VERIFIED_LIVE_APP_PROOF', uses_ai_reasoning: false, mode: 'live_app_proof', result_label: evidence.label };
  }
  return { status: 'HOLD_CONTRADICTORY_EVIDENCE', reason: 'mode_unresolved', uses_ai_reasoning: false };
}

// Build the local-macro evidence record (mode = local_simulation; digest-sealed; all prohibited flags false).
export function buildLocalEvidence(i = {}) {
  const ev = {
    record_type: 'github_app_local_macro_evidence', mode: 'local_simulation',
    label: i.label || 'LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS',
    live_action_authority: false, github_app_proven: false, claims_live_proof: false,
  };
  for (const flag of PROHIBITED_FLAGS) ev[flag] = false;
  ev.cleanup_status = 'not_applicable_local';
  ev.refusal_matrix_total = i.refusal_matrix_total ?? null;
  ev.refusal_matrix_all_held = i.refusal_matrix_all_held ?? null;
  ev.executable_refusal_paths = i.executable_refusal_paths ?? null;
  ev.catalog_only_assertions = i.catalog_only_assertions ?? null;
  ev.sandbox_repo = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
  ev.next_gate = 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED';
  ev.evidence_digest = undefined;
  ev.evidence_digest = 'gae_' + sha256({ ...ev, evidence_digest: undefined }).slice(0, 24);
  return ev;
}
