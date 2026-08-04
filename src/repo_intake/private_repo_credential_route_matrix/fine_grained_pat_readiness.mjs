// FounderGate — Fine-grained PAT Readiness Contract (LOCAL / SYNTHETIC ONLY).
// NO real PAT is created, read, printed, or packaged here. This module only VALIDATES a proposed
// (synthetic) fine-grained-PAT configuration against the read-only contract and refuses anything broader.

export const PAT_CONTRACT = {
  route_id: 'fine_grained_pat',
  required: {
    resource: 'repository',
    repository_selection: 'selected (the one sandbox repo)',
    permissions: { contents: 'read' },      // read contents only
    expiry_required: true,                    // must have an expiry
  },
  forbidden: {
    contents_write: true,
    workflow: true,                           // no workflow scope
    administration: true,
    org_wide: true,                           // no org-wide selection
    all_repositories: true,
    packages_write: true,
    secrets: true,
  },
  handling: {
    token_value_ever_in_chat: false,
    token_value_ever_printed: false,
    token_value_ever_packaged: false,
    revocation_check_required: true,
  },
  proof_status: 'PLANNED_BLOCKED',
  future_true_gate: 'FOUNDER: authorize a fine-grained-PAT read-only proof on the founder-owned sandbox (separate gate).',
};

// Validate a proposed (synthetic) PAT config. Returns REFUSED for any over-broad scope, HELD for unknowns,
// READY_PLANNED only if it matches the read-only contract exactly. Never asserts a real PAT was used.
export function evaluatePatConfig(cfg = {}) {
  const reasons = [];
  const perms = cfg.permissions || {};
  // Over-broad / forbidden scopes → REFUSED.
  if (perms.contents === 'write' || perms.contents === 'admin') reasons.push('REFUSED_WRITE_SCOPE');
  if (perms.workflow) reasons.push('REFUSED_WORKFLOW_SCOPE');
  if (perms.administration) reasons.push('REFUSED_ADMIN_SCOPE');
  if (cfg.repository_selection === 'all' || cfg.all_repositories) reasons.push('REFUSED_ALL_REPOS');
  if (cfg.org_wide || cfg.resource === 'organization') reasons.push('REFUSED_ORG_WIDE');
  if (cfg.token_value) reasons.push('REFUSED_TOKEN_VALUE_PRESENT'); // a real/looking token value must never be handed in-band
  // Missing required read contract → HELD (not silently accepted).
  const held = [];
  if (perms.contents !== 'read') held.push('HELD_NO_READ_CONTENTS');
  if (cfg.repository_selection !== 'selected') held.push('HELD_REPO_SELECTION_NOT_SELECTED');
  if (cfg.expiry == null && cfg.expiry_required !== false) held.push('HELD_NO_EXPIRY');

  if (reasons.length) return { status: 'REFUSED', reasons, note: 'over-broad or unsafe PAT scope refused' };
  if (held.length) return { status: 'HELD', reasons: held, note: 'incomplete/unknown scope held; not accepted' };
  return {
    status: 'READY_PLANNED',
    reasons: [],
    note: 'matches read-only fine-grained-PAT contract; still PLANNED_BLOCKED pending a separate founder gate. No real PAT was created or used.',
    proof_status: 'PLANNED_BLOCKED',
  };
}
