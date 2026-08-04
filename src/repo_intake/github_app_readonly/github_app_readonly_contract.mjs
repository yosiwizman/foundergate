// FounderGate — GitHub App Read-Only Intake Contract (LOCAL).
// Defines what a FUTURE live GitHub App read-only proof must satisfy, and refuses to certify a candidate
// record that is missing any required field (overclaim refusal). This macro never produces a live record;
// the contract validator is exercised against synthetic candidates only.

import { sha256 } from './github_app_authority_model.mjs';

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';

export const REQUIRED_FIELDS = [
  'repo', 'repo_private', 'installation_restricted_to_sandbox_only',
  'permissions_contents_read', 'permissions_metadata_read',
  'no_write_admin_workflow_issue_pr_secret_deploy',
  'exact_commit', 'manifest_digest', 'archive_digest', 'file_count', 'byte_count',
  'secret_classification', 'no_code_execution', 'no_build', 'no_repo_tests',
  'no_provider_call', 'cleanup_status',
];

// Validate a candidate LIVE proof record against the contract.
// For this local macro, no live record exists → validate() is called with synthetic candidates only.
export function validate(record = {}) {
  const missing = REQUIRED_FIELDS.filter((f) => record[f] === undefined || record[f] === null);
  if (missing.length) return { status: 'OVERCLAIM_REFUSED', missing, note: 'missing required fields; live proof cannot be certified' };
  if (record.repo !== SANDBOX) return { status: 'HOLD_TARGET_NOT_SANDBOX', note: 'target must be exactly the sandbox' };
  if (record.repo_private !== true) return { status: 'HOLD_NOT_PRIVATE' };
  if (record.installation_restricted_to_sandbox_only !== true) return { status: 'HOLD_INSTALL_NOT_SANDBOX_ONLY' };
  if (record.permissions_contents_read !== true || record.permissions_metadata_read !== true) return { status: 'HOLD_MISSING_READ_PERMISSIONS' };
  if (record.no_write_admin_workflow_issue_pr_secret_deploy !== true) return { status: 'HOLD_EXTRA_PERMISSIONS' };
  if ([record.no_code_execution, record.no_build, record.no_repo_tests, record.no_provider_call].some((v) => v !== true)) return { status: 'HOLD_UNSAFE_EXECUTION' };
  return { status: 'CONTRACT_SATISFIED_WOULD_BE_LIVE_PROOF', digest: 'gac_' + sha256(record).slice(0, 24), note: 'a live record matching this would be a valid GitHub App read-only proof; NOT produced by this local macro' };
}

// The contract itself as a document object.
export const CONTRACT = {
  route_id: 'github_app_readonly',
  sandbox_repo: SANDBOX,
  required_fields: REQUIRED_FIELDS,
  proof_status: 'LOCAL_ONLY_PREPARED',
  live_gate: 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED',
};
