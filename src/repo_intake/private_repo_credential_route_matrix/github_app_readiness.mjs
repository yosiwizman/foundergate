// FounderGate — GitHub App Readiness Contract (LOCAL / SYNTHETIC ONLY).
// NO real GitHub App is created or installed here. Validates a proposed (synthetic) app installation
// configuration against the read-only contract and refuses anything broader.

export const APP_CONTRACT = {
  route_id: 'github_app',
  required: {
    installations: 1,                          // exactly one installation
    permissions: { contents: 'read', metadata: 'read' },
    repository_selection: 'selected (the one sandbox repo)',
    installation_token_lifetime: 'short-lived (~1h)',
    removable: true,                           // uninstall / revoke installation
  },
  forbidden: {
    contents_write: true,
    administration: true,
    members_write: true,
    org_wide: true,
    webhook_required_without_authorization: true,  // no standing webhook unless separately authorized
    multiple_installations: true,
  },
  handling: {
    private_key_ever_in_chat: false,
    private_key_ever_printed: false,
    private_key_ever_packaged: false,
    installation_token_ever_printed: false,
    audit_trail_required: true,
  },
  proof_status: 'PLANNED_BLOCKED',
  future_true_gate: 'FOUNDER: authorize a GitHub App read-only proof on the founder-owned sandbox (separate gate).',
};

export function evaluateAppConfig(cfg = {}) {
  const reasons = [];
  const perms = cfg.permissions || {};
  if (perms.contents === 'write') reasons.push('REFUSED_WRITE_PERMISSION');
  if (perms.administration) reasons.push('REFUSED_ADMIN_PERMISSION');
  if (perms.members === 'write') reasons.push('REFUSED_MEMBERS_WRITE');
  if (cfg.org_wide || cfg.repository_selection === 'all') reasons.push('REFUSED_ORG_WIDE_OR_ALL_REPOS');
  if ((cfg.installations || 1) > 1) reasons.push('REFUSED_MULTIPLE_INSTALLATIONS');
  if (cfg.webhook && !cfg.webhook_authorized) reasons.push('REFUSED_UNAUTHORIZED_WEBHOOK');
  if (cfg.private_key) reasons.push('REFUSED_PRIVATE_KEY_PRESENT'); // app private key must never be handed in-band

  const held = [];
  if (perms.contents !== 'read') held.push('HELD_NO_READ_CONTENTS');
  if (cfg.repository_selection !== 'selected') held.push('HELD_REPO_SELECTION_NOT_SELECTED');
  if (cfg.removable === false) held.push('HELD_NOT_REMOVABLE');

  if (reasons.length) return { status: 'REFUSED', reasons, note: 'over-broad or unsafe GitHub App config refused' };
  if (held.length) return { status: 'HELD', reasons: held, note: 'incomplete/unknown app config held; not accepted' };
  return {
    status: 'READY_PLANNED',
    reasons: [],
    note: 'matches read-only GitHub App contract; still PLANNED_BLOCKED pending a separate founder gate. No real app was created or installed.',
    proof_status: 'PLANNED_BLOCKED',
  };
}
