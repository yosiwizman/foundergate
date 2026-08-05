// FounderGate — GitHub App Read-Only Authority Model (LOCAL ONLY) — CORRECTED, FAIL-CLOSED.
// A candidate install spec is ACCEPTED only when every mandatory value is semantically valid and the
// permission set matches the read-only allowlist EXACTLY. Anything unrecognized/extra/omitted/ambiguous
// causes refusal or UNKNOWN. Live actions are always gated. Local simulation can never become live proof.

import { createHash } from 'node:crypto';
export const sha256 = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';

export const APP_CONCEPT = {
  APP_REGISTRATION: 'APP_REGISTRATION', APP_INSTALLATION: 'APP_INSTALLATION',
  INSTALLATION_ACCESS_TOKEN: 'INSTALLATION_ACCESS_TOKEN', PRIVATE_KEY: 'PRIVATE_KEY',
  APP_ID: 'APP_ID', INSTALLATION_ID: 'INSTALLATION_ID', REPOSITORY_SELECTION: 'REPOSITORY_SELECTION',
  CONTENTS_READ_ONLY: 'CONTENTS_READ_ONLY', METADATA_READ_ONLY: 'METADATA_READ_ONLY',
  ALL_REPOSITORIES_INSTALL: 'ALL_REPOSITORIES_INSTALL', MULTI_REPO_INSTALL: 'MULTI_REPO_INSTALL',
  FINE_GRAINED_PAT: 'FINE_GRAINED_PAT', DEPLOY_KEY: 'DEPLOY_KEY', BROAD_GH_AUTH: 'BROAD_GH_AUTH',
  NO_LIVE_ACTION: 'NO_LIVE_ACTION', LIVE_ACTION_GATE: 'LIVE_ACTION_GATE', CLEANUP: 'CLEANUP', UNKNOWN: 'UNKNOWN',
};

// The read-only permission allowlist. contents:read is required; metadata:read is required (mandatory for
// any fine-grained GitHub App). NOTHING else may appear.
const ALLOWED_PERMISSIONS = { contents: 'read', metadata: 'read' };
const ALLOWED_PERMISSION_KEYS = new Set(Object.keys(ALLOWED_PERMISSIONS));

// Any permission key here (or any key not in the allowlist) → refusal.
const FORBIDDEN_PERMISSION_KEYS = new Set([
  'administration', 'maintain', 'triage', 'workflows', 'actions', 'issues', 'pull_requests',
  'deployments', 'secrets', 'environments', 'hooks', 'webhooks', 'organization', 'members',
  'billing', 'account', 'packages', 'pages', 'statuses', 'checks',
]);

// Live actions always require a founder gate.
export function evaluateAppAction({ action, live_action_authority = false } = {}) {
  const liveActions = ['create_app', 'install_app', 'generate_installation_token'];
  if (liveActions.includes(action) && !live_action_authority) {
    return { decision: 'TRUE_FOUNDER_GATE', reason: `${action}_REQUIRES_FOUNDER_GATE` };
  }
  if (liveActions.includes(action) && live_action_authority) {
    return { decision: 'LIVE_ACTION_AUTHORIZED_ELSEWHERE', reason: 'founder_gate_flag_present' };
  }
  return { decision: 'UNKNOWN', reason: 'NOT_A_LIVE_ACTION_USE_validateInstallSpec' };
}

// FAIL-CLOSED semantic validation of a proposed installation spec.
// Returns {decision, reason}. ACCEPTED_READONLY_SPEC only when EVERYTHING is valid.
export function validateInstallSpec(spec = {}) {
  if (spec === null || typeof spec !== 'object') return { decision: 'HOLD_MALFORMED', reason: 'SPEC_NOT_OBJECT' };
  const { target_repo, installation_mode, permissions } = spec;

  // Target repository — must be present, well-formed owner/name, and exactly the sandbox.
  if (target_repo === undefined || target_repo === null || target_repo === '') return { decision: 'HOLD_MISSING_REPOSITORY', reason: 'TARGET_REPO_OMITTED' };
  if (typeof target_repo !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(target_repo)) return { decision: 'HOLD_MALFORMED', reason: 'TARGET_REPO_MALFORMED' };
  if (target_repo !== SANDBOX) return { decision: 'HOLD_TARGET_NOT_SANDBOX', reason: 'WRONG_REPOSITORY' };

  // Installation mode — must be exactly 'selected'. all/multi refused; anything else ambiguous.
  if (installation_mode === undefined || installation_mode === null) return { decision: 'HOLD_MISSING_INSTALL_MODE', reason: 'INSTALL_MODE_OMITTED' };
  if (installation_mode === 'all') return { decision: 'HOLD_SCOPE_UNSAFE', reason: 'ALL_REPOSITORIES_INSTALL_REFUSED' };
  if (installation_mode === 'multi') return { decision: 'HOLD_SCOPE_UNSAFE', reason: 'MULTI_REPO_INSTALL_REFUSED' };
  if (installation_mode !== 'selected') return { decision: 'UNKNOWN', reason: 'AMBIGUOUS_INSTALL_MODE' };

  // Permissions — must be a plain object, present, and match the allowlist EXACTLY.
  if (permissions === undefined || permissions === null) return { decision: 'HOLD_MISSING_PERMISSIONS', reason: 'PERMISSIONS_OMITTED' };
  if (typeof permissions !== 'object' || Array.isArray(permissions)) return { decision: 'HOLD_MALFORMED', reason: 'PERMISSIONS_NOT_OBJECT' };
  const keys = Object.keys(permissions);
  // Any explicitly forbidden or unknown (not-in-allowlist) key → refusal.
  for (const k of keys) {
    if (FORBIDDEN_PERMISSION_KEYS.has(k)) return { decision: 'HOLD_FORBIDDEN_PERMISSION', reason: `FORBIDDEN_PERMISSION_${k}` };
    if (!ALLOWED_PERMISSION_KEYS.has(k)) return { decision: 'HOLD_UNKNOWN_PERMISSION', reason: `UNKNOWN_PERMISSION_${k}` };
  }
  // contents must be present and read-only (write/admin/anything-else refused).
  if (!('contents' in permissions)) return { decision: 'HOLD_MISSING_CONTENTS_PERMISSION', reason: 'CONTENTS_OMITTED' };
  if (permissions.contents !== 'read') return { decision: 'HOLD_WRITE_PERMISSION_BLOCKED', reason: `CONTENTS_${String(permissions.contents).toUpperCase()}_REFUSED` };
  // metadata must be present and read.
  if (!('metadata' in permissions)) return { decision: 'HOLD_MISSING_METADATA_PERMISSION', reason: 'METADATA_OMITTED' };
  if (permissions.metadata !== 'read') return { decision: 'HOLD_MALFORMED', reason: 'METADATA_NOT_READ' };
  // Exact allowlist match (no extra keys — already covered above; no missing — covered above).
  if (keys.length !== ALLOWED_PERMISSION_KEYS.size) return { decision: 'HOLD_EXTRA_PERMISSION', reason: 'PERMISSION_SET_NOT_EXACT' };

  return { decision: 'ACCEPTED_READONLY_SPEC', reason: 'SANDBOX_ONLY_CONTENTS_READ_METADATA_READ' };
}

export const REQUIRED_READONLY_SPEC = {
  route_id: 'github_app_readonly', repository_selection: 'selected (only the sandbox)', sandbox_repo: SANDBOX,
  permissions: { ...ALLOWED_PERMISSIONS }, installation: 'single-repo only (never all-repos, never multi-repo)',
  token_lifetime: 'short-lived installation token (~1h)', removable: 'uninstall / revoke installation',
  proof_status: 'LOCAL_ONLY_PREPARED',
};

export function routeStatus({ live_action_authority = false } = {}) {
  return {
    route: 'github_app_readonly', local_only: true, live_action_authority,
    status: live_action_authority ? 'LIVE_ACTION_AUTHORIZED_ELSEWHERE' : 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED',
    proven: false, private_key_seen: false, installation_token_seen: false,
  };
}
