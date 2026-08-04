// FounderGate — Fine-grained PAT Read-Only Intake Runner (LOCAL orchestration).
// Read-only BY CONSTRUCTION: exposes no write/exec/provider methods. When a safe Keychain PAT is present and
// scope-accepted, it performs read-only intake using ONLY that token (via withKeychainPat). When absent, it
// returns a controlled TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED result — it never asks for a token.

import { keychainPatPresent, withKeychainPat } from './keychain_pat_loader.mjs';
import { evaluateForPatProof, scopeValidationLabel, CREDENTIAL_TYPE, SCOPE } from './pat_authority_model.mjs';
import { buildEvidence } from './fine_grained_pat_evidence.mjs';

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';

// intakeFn(token) is injected by the live caller to perform the actual read-only GitHub reads using the token.
// It must return { exact_commit, manifest_digest, snapshot_digest, file_count, total_bytes, held_fake_secret_files, redaction_summary }.
// In the token-absent path intakeFn is never called.
export function runPatProof({ account = SANDBOX, injectSecret = undefined, intakeFn = null, scope = SCOPE.UNKNOWN_AMBIGUOUS, metadata_sufficient = false } = {}) {
  const present = injectSecret !== undefined ? true : keychainPatPresent(account);
  if (!present) {
    const ev = buildEvidence({ token_present: false, intake_occurred: false });
    return { status: 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED', token_present: false, evidence: ev };
  }
  // Present → validate scope, then (if accepted) run read-only intake via the token, in memory only.
  const evaluation = evaluateForPatProof({ credential_type: CREDENTIAL_TYPE.FINE_GRAINED_PAT, scope, target_repo: account, sandbox_repo: SANDBOX });
  const label = scopeValidationLabel({ present: true, evaluation, metadata_sufficient });
  if (evaluation.decision !== 'ACCEPTED_READONLY') {
    const ev = buildEvidence({ token_present: true, intake_occurred: false, scope_validation_label: label,
      revocation_status: 'PAT_REVOCATION_REQUIRES_FOUNDER_MANUAL_ACTION' });
    return { status: 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS', token_present: true, evaluation, evidence: ev };
  }
  const loaded = withKeychainPat(account, (token) => (typeof intakeFn === 'function' ? intakeFn(token) : null), { injectSecret });
  if (loaded.status !== 'TOKEN_LOADED_INTO_MEMORY') {
    const ev = buildEvidence({ token_present: true, intake_occurred: false, scope_validation_label: 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS' });
    return { status: 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS', token_present: true, loader_status: loaded.status, evidence: ev };
  }
  const r = loaded.result || {};
  const finalLabel = metadata_sufficient ? 'FINE_GRAINED_PAT_PROOF_READY_WITH_LIMITS' : 'FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS';
  const ev = buildEvidence({
    token_present: true, intake_occurred: true, label: finalLabel, scope_validation_label: label,
    token_fingerprint_redacted: loaded.fingerprint_redacted,
    exact_commit: r.exact_commit, manifest_digest: r.manifest_digest, snapshot_digest: r.snapshot_digest,
    file_count: r.file_count, total_bytes: r.total_bytes, held_fake_secret_files: r.held_fake_secret_files,
    redaction_summary: r.redaction_summary, revocation_status: r.revocation_status || 'PAT_REVOCATION_REQUIRES_FOUNDER_MANUAL_ACTION',
  });
  return { status: finalLabel, token_present: true, evidence: ev };
}
