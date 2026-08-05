// FounderGate — GitHub App Evidence Replay (LOCAL, deterministic) — CORRECTION2, LOCAL-ONLY, FAIL-CLOSED.
// This module is a LOCAL-MACRO replay. It is STRUCTURALLY INCAPABLE of returning a live-proof status:
// there is NO code path that yields a live-proof-verified status. Only `mode: local_simulation` records
// that pass full envelope validation return REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY; anything else HOLDs.
// A future live proof must use a separate founder-gated live-evidence pipeline that does NOT exist here.

import { sha256 } from './github_app_authority_model.mjs';
import { scanForSecrets } from './github_app_secret_guard.mjs';

export const EVIDENCE_SCHEMA_VERSION = 'github_app_local_macro_evidence@2';
const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const NEXT_GATE = 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED';
const ALLOWED_LOCAL_LABELS = new Set(['LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS', 'LOCAL_GITHUB_APP_ROUTE_PARTIAL_WITH_LIMITS']);
const ACCEPTED_CLEANUP_LOCAL = new Set(['not_applicable_local']);

// Every field here must be strictly === false. true / missing / non-boolean → fail closed.
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

const isBoolFalse = (v) => v === false;
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;

export function replay(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return { status: 'HOLD_MISSING_EVIDENCE', uses_ai_reasoning: false, reason: 'no_or_non_object' };
  }
  if (evidence.record_type !== 'github_app_local_macro_evidence') {
    return { status: 'HOLD_MISSING_EVIDENCE', uses_ai_reasoning: false, reason: 'wrong_record_type' };
  }
  // CORRECTION 1: this local module refuses any live-proof mode outright — before anything else.
  if (evidence.mode === 'live_app_proof' || evidence.contract_satisfied === true || evidence.github_app_proven === true) {
    return { status: 'HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE', uses_ai_reasoning: false,
      reason: 'local_replay_cannot_certify_live_proof' };
  }
  if (evidence.mode !== 'local_simulation') {
    return { status: 'HOLD_CONTRADICTORY_EVIDENCE', uses_ai_reasoning: false, reason: `unknown_mode:${evidence.mode}` };
  }
  // Any secret material anywhere → fatal.
  if (!scanForSecrets(JSON.stringify(evidence)).clean) {
    return { status: 'HOLD_CONTRADICTORY_EVIDENCE', uses_ai_reasoning: false, reason: 'secret_material_present' };
  }
  // Digest must recompute exactly.
  const base = { ...evidence }; delete base.evidence_digest;
  if (typeof evidence.evidence_digest !== 'string' || ('gae_' + sha256(base).slice(0, 24)) !== evidence.evidence_digest) {
    return { status: 'HOLD_REPLAY_MISMATCH', uses_ai_reasoning: false, reason: 'digest_invalid' };
  }
  // CORRECTION 2: full envelope validation — every mandatory field present, typed, exact.
  if (evidence.schema_version !== EVIDENCE_SCHEMA_VERSION) return H('schema_version', evidence.schema_version);
  if (!ALLOWED_LOCAL_LABELS.has(evidence.label)) return H('label', evidence.label);
  if (evidence.live_action_authority !== false) return H('live_action_authority', evidence.live_action_authority);
  if (evidence.claims_live_proof !== false) return H('claims_live_proof', evidence.claims_live_proof);
  if (evidence.github_app_proven !== false) return H('github_app_proven', evidence.github_app_proven);
  if (evidence.sandbox_repo !== SANDBOX) return H('sandbox_repo', evidence.sandbox_repo);
  if (evidence.next_gate !== NEXT_GATE) return H('next_gate', evidence.next_gate);
  if (!ACCEPTED_CLEANUP_LOCAL.has(evidence.cleanup_status)) return H('cleanup_status', evidence.cleanup_status);
  if (!isPosInt(evidence.refusal_matrix_total)) return H('refusal_matrix_total', evidence.refusal_matrix_total);
  if (evidence.refusal_matrix_all_held !== true) return H('refusal_matrix_all_held', evidence.refusal_matrix_all_held);
  if (!isPosInt(evidence.executable_refusal_paths)) return H('executable_refusal_paths', evidence.executable_refusal_paths);
  if (!isNonNegInt(evidence.catalog_only_assertions)) return H('catalog_only_assertions', evidence.catalog_only_assertions);
  if (evidence.executable_refusal_paths + evidence.catalog_only_assertions !== evidence.refusal_matrix_total) return H('refusal_count_agreement', 'exec+catalog!=total');
  // Every prohibited flag strictly false (true/missing/non-boolean → HOLD).
  for (const flag of PROHIBITED_FLAGS) if (!isBoolFalse(evidence[flag])) return H(flag, evidence[flag]);

  return {
    status: 'REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY', uses_ai_reasoning: false,
    mode: 'local_simulation', github_app_proven: false, live_action_required: true, result_label: evidence.label,
  };
  function H(field, val) { return { status: 'HOLD_REPLAY_MISMATCH', uses_ai_reasoning: false, reason: `envelope:${field}=${JSON.stringify(val)}` }; }
}

// Build the local-macro evidence record (mode = local_simulation; digest-sealed; all prohibited flags false).
export function buildLocalEvidence(i = {}) {
  const ev = {
    record_type: 'github_app_local_macro_evidence',
    schema_version: EVIDENCE_SCHEMA_VERSION,
    mode: 'local_simulation',
    label: i.label || 'LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS',
    live_action_authority: false, github_app_proven: false, claims_live_proof: false,
  };
  for (const flag of PROHIBITED_FLAGS) ev[flag] = false;
  ev.cleanup_status = 'not_applicable_local';
  ev.refusal_matrix_total = i.refusal_matrix_total ?? 41;
  ev.refusal_matrix_all_held = i.refusal_matrix_all_held ?? true;
  ev.executable_refusal_paths = i.executable_refusal_paths ?? 39;
  ev.catalog_only_assertions = i.catalog_only_assertions ?? 2;
  ev.sandbox_repo = SANDBOX;
  ev.next_gate = NEXT_GATE;
  ev.evidence_digest = undefined;
  ev.evidence_digest = 'gae_' + sha256({ ...ev, evidence_digest: undefined }).slice(0, 24);
  return ev;
}
