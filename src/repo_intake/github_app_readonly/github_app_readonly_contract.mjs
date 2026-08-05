// FounderGate — GitHub App Read-Only Intake Contract (LOCAL) — CORRECTED, SEMANTIC VALIDATION.
// Field PRESENCE is insufficient: every value is semantically validated (SHA format, digest format, integer
// counts + agreement, exact enum values, exact route/permission identity). A semantically-invalid record can
// NEVER return a live-proof-satisfied result. This macro produces no live record; validation runs on candidates.

import { sha256 } from './github_app_authority_model.mjs';
import { validateInstallSpec } from './github_app_authority_model.mjs';

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const ACCEPTED_SECRET_CLASSIFICATIONS = new Set(['CLEAN', 'HELD_SENSITIVE_FILES']);
const ACCEPTED_CLEANUP_COMPLETED = new Set(['completed', 'uninstalled_and_removed']);
const isSha40 = (v) => typeof v === 'string' && /^[0-9a-f]{40}$/.test(v);
const isDigest = (prefix, v) => typeof v === 'string' && new RegExp(`^${prefix}_[0-9a-f]{16,64}$`).test(v);
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;

export const REQUIRED_FIELDS = [
  'route_identity', 'repo', 'repo_private', 'installation_mode', 'permissions',
  'exact_commit', 'manifest_digest', 'archive_digest', 'file_count', 'byte_count',
  'manifest_file_count', 'secret_classification', 'held_secret_count',
  'no_code_execution', 'no_build', 'no_repo_tests', 'no_provider_call',
  'existing_repo_touched', 'customer_repo_touched', 'production_repo_touched',
  'protected_main_touched', 'pr_200_touched', 'cleanup_status',
  'evidence_replay_valid', 'refusal_evidence_valid', 'secret_contents_present',
];

// Validate a candidate LIVE proof record. Returns a status; only a fully-semantically-valid record →
// CONTRACT_SATISFIED_WOULD_BE_LIVE_PROOF.
export function validate(record = {}) {
  if (record === null || typeof record !== 'object') return { status: 'OVERCLAIM_REFUSED', reason: 'NOT_OBJECT' };
  const missing = REQUIRED_FIELDS.filter((f) => record[f] === undefined || record[f] === null);
  if (missing.length) return { status: 'OVERCLAIM_REFUSED', missing, note: 'missing required fields; live proof cannot be certified' };

  // Route + repo identity.
  if (record.route_identity !== 'github_app_readonly') return { status: 'HOLD_WRONG_ROUTE', reason: 'ROUTE_NOT_GITHUB_APP' };
  if (record.repo !== SANDBOX) return { status: 'HOLD_TARGET_NOT_SANDBOX', reason: 'WRONG_REPOSITORY' };
  if (record.repo_private !== true) return { status: 'HOLD_NOT_PRIVATE', reason: 'PRIVATE_FLAG_NOT_TRUE' };

  // Installation mode + permissions via the fail-closed authority validator.
  const specCheck = validateInstallSpec({ target_repo: record.repo, installation_mode: record.installation_mode, permissions: record.permissions });
  if (specCheck.decision !== 'ACCEPTED_READONLY_SPEC') return { status: 'HOLD_SPEC_INVALID', reason: specCheck.reason, spec_decision: specCheck.decision };

  // Commit + digests — semantic format.
  if (!isSha40(record.exact_commit)) return { status: 'HOLD_INVALID_COMMIT', reason: 'COMMIT_NOT_40_HEX_LOWERCASE' };
  if (!isDigest('man', record.manifest_digest)) return { status: 'HOLD_INVALID_MANIFEST_DIGEST', reason: 'MANIFEST_DIGEST_MALFORMED' };
  if (!isDigest('arc', record.archive_digest)) return { status: 'HOLD_INVALID_ARCHIVE_DIGEST', reason: 'ARCHIVE_DIGEST_MALFORMED' };

  // Counts — non-negative integers + agreement.
  if (!isNonNegInt(record.file_count)) return { status: 'HOLD_INVALID_FILE_COUNT', reason: 'FILE_COUNT_NOT_NONNEG_INT' };
  if (!isNonNegInt(record.byte_count)) return { status: 'HOLD_INVALID_BYTE_COUNT', reason: 'BYTE_COUNT_NOT_NONNEG_INT' };
  if (!isNonNegInt(record.manifest_file_count)) return { status: 'HOLD_INVALID_MANIFEST_COUNT', reason: 'MANIFEST_COUNT_NOT_NONNEG_INT' };
  if (record.file_count !== record.manifest_file_count) return { status: 'HOLD_COUNT_DISAGREEMENT', reason: 'FILE_COUNT_NEQ_MANIFEST_COUNT' };

  // Secret classification + held count + no contents.
  if (!ACCEPTED_SECRET_CLASSIFICATIONS.has(record.secret_classification)) return { status: 'HOLD_UNKNOWN_SECRET_CLASSIFICATION', reason: 'SECRET_CLASSIFICATION_NOT_ACCEPTED' };
  if (!isNonNegInt(record.held_secret_count)) return { status: 'HOLD_INVALID_HELD_COUNT', reason: 'HELD_COUNT_NOT_NONNEG_INT' };
  if (record.secret_contents_present !== false) return { status: 'HOLD_SECRET_CONTENTS_PRESENT', reason: 'SECRET_CONTENTS_MUST_BE_ABSENT' };

  // Safety flags.
  for (const f of ['no_code_execution', 'no_build', 'no_repo_tests', 'no_provider_call']) {
    if (record[f] !== true) return { status: 'HOLD_UNSAFE_EXECUTION', reason: `${f}_NOT_TRUE` };
  }
  for (const f of ['existing_repo_touched', 'customer_repo_touched', 'production_repo_touched', 'protected_main_touched', 'pr_200_touched']) {
    if (record[f] !== false) return { status: 'HOLD_PROHIBITED_TOUCH', reason: `${f}_MUST_BE_FALSE` };
  }

  // Cleanup + replay/refusal evidence.
  if (!ACCEPTED_CLEANUP_COMPLETED.has(record.cleanup_status)) return { status: 'HOLD_CLEANUP_INCOMPLETE', reason: 'CLEANUP_NOT_COMPLETED' };
  if (record.evidence_replay_valid !== true) return { status: 'HOLD_REPLAY_INVALID', reason: 'REPLAY_NOT_VALID' };
  if (record.refusal_evidence_valid !== true) return { status: 'HOLD_REFUSAL_INVALID', reason: 'REFUSAL_NOT_VALID' };

  return { status: 'CONTRACT_SATISFIED_WOULD_BE_LIVE_PROOF', digest: 'gac_' + sha256(record).slice(0, 24), note: 'a live record matching this would be a valid GitHub App read-only proof; NOT produced by this local macro' };
}

export const CONTRACT = {
  route_id: 'github_app_readonly', sandbox_repo: SANDBOX, required_fields: REQUIRED_FIELDS,
  semantic_rules: {
    exact_commit: '40-char lowercase hex Git SHA', manifest_digest: 'man_<16-64 hex>', archive_digest: 'arc_<16-64 hex>',
    counts: 'non-negative integers; file_count === manifest_file_count',
    secret_classification: [...ACCEPTED_SECRET_CLASSIFICATIONS], cleanup_status: [...ACCEPTED_CLEANUP_COMPLETED],
    permissions: 'exact allowlist { contents:read, metadata:read }; selected-repo-only',
  },
  proof_status: 'LOCAL_ONLY_PREPARED', live_gate: 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED',
};
