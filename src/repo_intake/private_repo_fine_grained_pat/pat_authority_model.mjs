// FounderGate — Fine-grained PAT Authority & Scope Model (LOCAL).
// Classifies a credential type + scope for the fine-grained-PAT read-only proof and enforces the route rules.
// No token value is ever passed in here — only a credential-type label + scope descriptor.

import { createHash } from 'node:crypto';
export const sha256 = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

export const CREDENTIAL_TYPE = {
  FINE_GRAINED_PAT: 'FINE_GRAINED_PAT',
  CLASSIC_PAT: 'CLASSIC_PAT',
  DEPLOY_KEY: 'DEPLOY_KEY',
  GITHUB_APP: 'GITHUB_APP',
  BROAD_GH_AUTH: 'BROAD_GH_AUTH',
  UNKNOWN: 'UNKNOWN',
};

export const SCOPE = {
  REPO_SCOPED_READONLY: 'REPO_SCOPED_READONLY',
  WRITE_SCOPED: 'WRITE_SCOPED',
  ORG_WIDE: 'ORG_WIDE',
  WORKFLOW_CAPABLE: 'WORKFLOW_CAPABLE',
  UNKNOWN_AMBIGUOUS: 'UNKNOWN_AMBIGUOUS',
};

// Decide whether a credential is acceptable for THIS proof (fine-grained PAT read-only intake against the sandbox).
export function evaluateForPatProof({ credential_type, scope, target_repo, sandbox_repo }) {
  // Only a fine-grained PAT is allowed as the intake credential for this proof.
  if (credential_type === CREDENTIAL_TYPE.CLASSIC_PAT) return { decision: 'REFUSED', reason: 'CLASSIC_PAT_REFUSED_FOR_THIS_PROOF' };
  if (credential_type === CREDENTIAL_TYPE.BROAD_GH_AUTH) return { decision: 'REFUSED', reason: 'BROAD_GH_AUTH_REFUSED_FOR_INTAKE' };
  if (credential_type === CREDENTIAL_TYPE.DEPLOY_KEY) return { decision: 'REFUSED', reason: 'DEPLOY_KEY_REFUSED_FOR_PAT_PROOF' };
  if (credential_type === CREDENTIAL_TYPE.GITHUB_APP) return { decision: 'REFUSED', reason: 'GITHUB_APP_NOT_THIS_PROOF' };
  if (credential_type !== CREDENTIAL_TYPE.FINE_GRAINED_PAT) return { decision: 'HOLD', reason: 'UNKNOWN_CREDENTIAL_TYPE' };

  // Fine-grained PAT: scope must be repo-scoped read-only, and target must be exactly the sandbox repo.
  if (scope === SCOPE.WRITE_SCOPED) return { decision: 'REFUSED', reason: 'WRITE_SCOPED_PAT_REFUSED' };
  if (scope === SCOPE.ORG_WIDE) return { decision: 'REFUSED', reason: 'ORG_WIDE_PAT_REFUSED' };
  if (scope === SCOPE.WORKFLOW_CAPABLE) return { decision: 'REFUSED', reason: 'WORKFLOW_CAPABLE_PAT_REFUSED' };
  if (scope === SCOPE.UNKNOWN_AMBIGUOUS) return { decision: 'HOLD', reason: 'PAT_SCOPE_UNKNOWN_AMBIGUOUS' };
  if (target_repo && sandbox_repo && target_repo !== sandbox_repo) return { decision: 'REFUSED', reason: 'TARGET_NOT_SANDBOX_REPO' };
  if (scope === SCOPE.REPO_SCOPED_READONLY) {
    return { decision: 'ACCEPTED_READONLY', reason: 'FINE_GRAINED_PAT_REPO_SCOPED_READONLY' };
  }
  return { decision: 'HOLD', reason: 'PAT_SCOPE_NOT_CONFIRMED' };
}

// Map an evaluation + whether GitHub exposed enough metadata → a scope-validation label.
export function scopeValidationLabel({ present, evaluation, metadata_sufficient }) {
  if (!present) return 'TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED';
  if (!evaluation) return 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS';
  if (evaluation.decision === 'REFUSED' || evaluation.decision === 'HOLD') return 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS';
  if (evaluation.decision === 'ACCEPTED_READONLY' && metadata_sufficient) return 'PAT_SCOPE_READONLY_REPO_SCOPED_VERIFIED';
  if (evaluation.decision === 'ACCEPTED_READONLY' && !metadata_sufficient) return 'PAT_INTAKE_VERIFIED_SCOPE_PARTIAL';
  return 'HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS';
}
