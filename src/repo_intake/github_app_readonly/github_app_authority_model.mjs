// FounderGate — GitHub App Read-Only Authority Model (LOCAL ONLY).
// Models the GitHub App credential route and enforces that NO live app creation/installation/token generation
// happens without a separate founder gate. No real secret is handled here — labels + config descriptors only.

import { createHash } from 'node:crypto';
export const sha256 = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

export const APP_CONCEPT = {
  APP_REGISTRATION: 'APP_REGISTRATION',
  APP_INSTALLATION: 'APP_INSTALLATION',
  INSTALLATION_ACCESS_TOKEN: 'INSTALLATION_ACCESS_TOKEN',
  PRIVATE_KEY: 'PRIVATE_KEY',
  APP_ID: 'APP_ID',
  INSTALLATION_ID: 'INSTALLATION_ID',
  REPOSITORY_SELECTION: 'REPOSITORY_SELECTION',
  CONTENTS_READ_ONLY: 'CONTENTS_READ_ONLY',
  METADATA_READ_ONLY: 'METADATA_READ_ONLY',
  ALL_REPOSITORIES_INSTALL: 'ALL_REPOSITORIES_INSTALL',
  MULTI_REPO_INSTALL: 'MULTI_REPO_INSTALL',
  FINE_GRAINED_PAT: 'FINE_GRAINED_PAT',
  DEPLOY_KEY: 'DEPLOY_KEY',
  BROAD_GH_AUTH: 'BROAD_GH_AUTH',
  NO_LIVE_ACTION: 'NO_LIVE_ACTION',
  LIVE_ACTION_GATE: 'LIVE_ACTION_GATE',
  CLEANUP: 'CLEANUP',
  UNKNOWN: 'UNKNOWN',
};

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';

// Evaluate a proposed GitHub App action given the current live-action authority flag.
// Returns a decision that BLOCKS every live action unless a founder gate is present.
export function evaluateAppAction({ action, live_action_authority = false, repository_selection, permissions = {}, target_repo } = {}) {
  // Live actions require a founder gate — always.
  const liveActions = ['create_app', 'install_app', 'generate_installation_token'];
  if (liveActions.includes(action) && !live_action_authority) {
    return { decision: 'TRUE_FOUNDER_GATE', reason: `${action}_REQUIRES_FOUNDER_GATE` };
  }
  // Scope constraints (apply to a would-be install spec, live or simulated).
  if (repository_selection === 'all') return { decision: 'HOLD_SCOPE_UNSAFE', reason: 'ALL_REPOSITORIES_INSTALL_REFUSED' };
  if (repository_selection === 'multi') return { decision: 'HOLD_SCOPE_UNSAFE', reason: 'MULTI_REPO_INSTALL_REFUSED' };
  if (target_repo && target_repo !== SANDBOX) return { decision: 'HOLD_TARGET_NOT_SANDBOX', reason: 'TARGET_NOT_SANDBOX' };
  if (permissions.contents === 'write') return { decision: 'HOLD_WRITE_PERMISSION_BLOCKED', reason: 'CONTENTS_WRITE_REFUSED' };
  if (permissions.administration) return { decision: 'HOLD_ADMIN_PERMISSION_BLOCKED', reason: 'ADMIN_REFUSED' };
  if (permissions.workflows) return { decision: 'HOLD_WORKFLOW_PERMISSION_BLOCKED', reason: 'WORKFLOW_REFUSED' };
  if (permissions.issues || permissions.pull_requests) return { decision: 'HOLD_UNNEEDED_PERMISSION_BLOCKED', reason: 'UNNEEDED_PERMISSION' };
  if (permissions.secrets) return { decision: 'HOLD_SECRET_PERMISSION_BLOCKED', reason: 'SECRET_PERMISSION_REFUSED' };
  if (permissions.deployments) return { decision: 'HOLD_DEPLOYMENT_PERMISSION_BLOCKED', reason: 'DEPLOYMENT_REFUSED' };
  // The only acceptable read spec: single sandbox repo, Contents:read, Metadata:read.
  if (repository_selection === 'selected' && permissions.contents === 'read') {
    return { decision: 'ACCEPTED_READONLY_SPEC', reason: 'SANDBOX_ONLY_CONTENTS_READ' };
  }
  return { decision: 'UNKNOWN', reason: 'INSUFFICIENT_SPEC' };
}

// The read-only permission spec a future live proof must match exactly.
export const REQUIRED_READONLY_SPEC = {
  route_id: 'github_app_readonly',
  repository_selection: 'selected (only the sandbox)',
  sandbox_repo: SANDBOX,
  permissions: { contents: 'read', metadata: 'read' },
  forbidden_permissions: ['contents:write', 'administration', 'workflows', 'issues', 'pull_requests', 'secrets', 'deployments', 'webhooks:unauthorized'],
  installation: 'single-repo only (never all-repos, never multi-repo)',
  token_lifetime: 'short-lived installation token (~1h)',
  removable: 'uninstall / revoke installation',
  proof_status: 'LOCAL_ONLY_PREPARED', // never "proven" until a live gated proof runs
};

export function routeStatus({ live_action_authority = false } = {}) {
  return {
    route: 'github_app_readonly',
    local_only: true,
    live_action_authority,
    status: live_action_authority ? 'LIVE_ACTION_AUTHORIZED_ELSEWHERE' : 'TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED',
    proven: false,               // GitHub App is NEVER "proven" by this local macro
    private_key_seen: false,
    installation_token_seen: false,
  };
}
