// FounderGate — Fine-grained PAT Evidence Builder (LOCAL).
// Produces the sealed evidence record. Never carries a token value — only safe metadata + a redacted fingerprint.

import { sha256 } from './pat_authority_model.mjs';

export function buildEvidence(i = {}) {
  const ev = {
    record_type: 'fine_grained_pat_proof_evidence',
    // Result label depends on whether a safe PAT was present and intake occurred.
    label: i.label || 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED',
    // Presence / route
    token_present: !!i.token_present,
    credential_type: 'FINE_GRAINED_PAT',
    token_source: 'macOS Keychain',
    intake_occurred: !!i.intake_occurred,
    scope_validation_label: i.scope_validation_label || 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED',
    intake_auth_route: i.intake_occurred ? 'fine_grained_pat_keychain_only' : 'none',
    // Safety flags — all must hold for READY.
    token_value_seen_by_log: false,
    token_printed: false,
    token_packaged: false,
    token_fingerprint_redacted: i.token_fingerprint_redacted || null,
    broad_gh_auth_used_for_intake: false,
    deploy_key_used_for_intake: false,
    existing_valuable_repo_touched: false,
    customer_repo_touched: false,
    code_execution: false,
    build_run: false,
    tests_run_from_repo: false,
    provider_call: false,
    write_during_read_proof: false,
    // Binding (only when intake occurred)
    repo: i.repo || 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET',
    repo_is_founder_owned_sandbox: true,
    repo_private: i.repo_private !== undefined ? i.repo_private : true,
    exact_commit: i.exact_commit || null,
    manifest_digest: i.manifest_digest || null,
    snapshot_digest: i.snapshot_digest || null,
    file_count: i.file_count ?? null,
    total_bytes: i.total_bytes ?? null,
    held_fake_secret_files: i.held_fake_secret_files ?? null,
    redaction_summary: i.redaction_summary || null,
    // Revocation/expiry
    revocation_status: i.revocation_status || 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED',
    // Non-assertion note: explicit override wins; else the token-absent default; else null when intake occurred.
    not_asserted: i.not_asserted !== undefined ? i.not_asserted : (i.token_present ? null : 'PAT read-only intake — no safe Keychain PAT was found.'),
    evidence_digest: undefined,
  };
  ev.evidence_digest = 'fgp_' + sha256({ ...ev, evidence_digest: undefined }).slice(0, 24);
  return ev;
}
