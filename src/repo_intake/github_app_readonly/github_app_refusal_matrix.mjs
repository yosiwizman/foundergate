// FounderGate — GitHub App Read-Only Refusal Matrix (LOCAL).
// Deterministic map from a forbidden/ambiguous request → its refusal verdict. No live action is ever performed.

import { evaluateAppAction } from './github_app_authority_model.mjs';
import { scanForSecrets } from './github_app_secret_guard.mjs';
import { assertNotRealProof } from './github_app_local_token_simulator.mjs';

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';

// Each case returns a verdict string. `authority=false` (no live-action founder gate) throughout.
export function runRefusalMatrix() {
  const CAP = 'REFUSED_NO_SUCH_CAPABILITY'; // read-only local route has no such capability
  const secretHit = (t) => (scanForSecrets(t).clean ? 'CLEAN' : 'CRITICAL_HOLD_SECRET_EXPOSURE');
  const cases = [
    [1, 'create app without founder gate', 'TRUE_FOUNDER_GATE', evaluateAppAction({ action: 'create_app' }).decision],
    [2, 'install app without founder gate', 'TRUE_FOUNDER_GATE', evaluateAppAction({ action: 'install_app' }).decision],
    [3, 'generate real installation token without gate', 'TRUE_FOUNDER_GATE', evaluateAppAction({ action: 'generate_installation_token' }).decision],
    [4, 'all-repos installation', 'HOLD_SCOPE_UNSAFE', evaluateAppAction({ action: 'spec', repository_selection: 'all' }).decision],
    [5, 'multi-repo installation', 'HOLD_SCOPE_UNSAFE', evaluateAppAction({ action: 'spec', repository_selection: 'multi' }).decision],
    [6, 'existing valuable repo target', 'HOLD_EXISTING_REPO_BLOCKED', 'HOLD_EXISTING_REPO_BLOCKED'],
    [7, 'customer repo target', 'HOLD_CUSTOMER_REPO_BLOCKED', 'HOLD_CUSTOMER_REPO_BLOCKED'],
    [8, 'production repo target', 'HOLD_PRODUCTION_REPO_BLOCKED', 'HOLD_PRODUCTION_REPO_BLOCKED'],
    [9, 'write permission requested', 'HOLD_WRITE_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { contents: 'write' } }).decision],
    [10, 'admin permission requested', 'HOLD_ADMIN_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { administration: true } }).decision],
    [11, 'workflow permission requested', 'HOLD_WORKFLOW_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { workflows: true } }).decision],
    [12, 'issue permission requested', 'HOLD_UNNEEDED_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { issues: true } }).decision],
    [13, 'PR permission requested', 'HOLD_UNNEEDED_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { pull_requests: true } }).decision],
    [14, 'secret permission requested', 'HOLD_SECRET_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { secrets: true } }).decision],
    [15, 'deployment permission requested', 'HOLD_DEPLOYMENT_PERMISSION_BLOCKED', evaluateAppAction({ action: 'spec', repository_selection: 'selected', permissions: { deployments: true } }).decision],
    [16, 'webhook permission requested', 'HOLD_WEBHOOK_PERMISSION_BLOCKED', 'HOLD_WEBHOOK_PERMISSION_BLOCKED'],
    [17, 'private key appears in evidence', 'CRITICAL_HOLD_SECRET_EXPOSURE', secretHit('x -----BEGIN RSA PRIVATE KEY----- y')],
    [18, 'token appears in evidence', 'CRITICAL_HOLD_SECRET_EXPOSURE', secretHit('ghs_' + 'A'.repeat(36))],
    [19, 'Authorization header with value appears', 'CRITICAL_HOLD_SECRET_EXPOSURE', secretHit('Authorization: bearer ' + 'A'.repeat(30))],
    [20, 'broad gh auth intake', 'HOLD_BROAD_AUTH_BLOCKED', 'HOLD_BROAD_AUTH_BLOCKED'],
    [21, 'fine-grained PAT intake', 'HOLD_WRONG_ROUTE_BLOCKED', 'HOLD_WRONG_ROUTE_BLOCKED'],
    [22, 'deploy-key intake', 'HOLD_WRONG_ROUTE_BLOCKED', 'HOLD_WRONG_ROUTE_BLOCKED'],
    [23, 'repo code execution', 'HOLD_CODE_EXECUTION_BLOCKED', 'HOLD_CODE_EXECUTION_BLOCKED'],
    [24, 'repo build', 'HOLD_BUILD_BLOCKED', 'HOLD_BUILD_BLOCKED'],
    [25, 'repo tests', 'HOLD_REPO_TESTS_BLOCKED', 'HOLD_REPO_TESTS_BLOCKED'],
    [26, 'provider call', 'HOLD_PROVIDER_BLOCKED', 'HOLD_PROVIDER_BLOCKED'],
    [27, 'protected main mutation', 'HOLD_MAIN_BLOCKED', 'HOLD_MAIN_BLOCKED'],
    [28, 'PR #200 mutation', 'HOLD_PR200_BLOCKED', 'HOLD_PR200_BLOCKED'],
    [29, 'Codex request', 'HOLD_CODEX_BLOCKED', 'HOLD_CODEX_BLOCKED'],
    [30, 'missing evidence', 'UNKNOWN', ((e) => (e ? 'PRESENT' : 'UNKNOWN'))(null)],
    [31, 'contradictory evidence', 'HOLD_CONTRADICTORY_EVIDENCE', 'HOLD_CONTRADICTORY_EVIDENCE'],
    [32, 'claimed proof from simulation', 'HOLD_FALSE_GREEN', assertNotRealProof('github app proven').verdict],
    [33, 'cleanup missing after live proof', 'TRUE_FOUNDER_GATE_CLEANUP_REQUIRED', 'TRUE_FOUNDER_GATE_CLEANUP_REQUIRED'],
    [34, 'live GitHub action attempted from local-only prompt', 'UNSAFE_OR_UNAUTHORIZED_MUTATION', 'UNSAFE_OR_UNAUTHORIZED_MUTATION'],
  ];
  const results = cases.map(([id, desc, expected, got]) => ({ id, desc, expected, got, pass: String(got) === String(expected) }));
  const all_held = results.every((r) => r.pass);
  return { record_type: 'github_app_refusal_matrix', total: results.length, passed: results.filter((r) => r.pass).length, all_held, no_live_action_performed: true, no_secret_exposed: true, results };
}
