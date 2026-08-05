// FounderGate — GitHub App Read-Only Refusal Matrix (LOCAL) — CORRECTED, EXECUTABLE EVIDENCE.
// Every case is classified: EXECUTABLE_REFUSAL_PATH invokes a REAL enforcement function (authority validator,
// live-action gate, secret guard, replay engine, contract validator, false-green guard). CATALOG_ONLY_POLICY_
// ASSERTION is a policy statement with no distinct enforcement function. Counts are reported separately; we do
// NOT claim catalog entries as executed enforcement.

import { evaluateAppAction, validateInstallSpec } from './github_app_authority_model.mjs';
import { scanForSecrets } from './github_app_secret_guard.mjs';
import { assertNotRealProof } from './github_app_local_token_simulator.mjs';
import { buildLocalEvidence, replay } from './github_app_evidence_replay.mjs';
import { validate as validateContract } from './github_app_readonly_contract.mjs';

const SANDBOX = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const EXEC = 'EXECUTABLE_REFUSAL_PATH';
const CAT = 'CATALOG_ONLY_POLICY_ASSERTION';

import { sha256 } from './github_app_authority_model.mjs';
// Re-seal helper: recompute the gae_ digest over a (mutated) record so the digest is valid and the ONLY reason
// replay fails is the unsafe flag itself, not a stale digest.
function reseal(ev) { const c = { ...ev }; delete c.evidence_digest; c.evidence_digest = 'gae_' + sha256(c).slice(0, 24); return c; }
// Route a prohibited runtime fact through the real replay engine → it must fail closed.
function replayRejects(flag) { const ev = buildLocalEvidence(); ev[flag] = true; return replay(reseal(ev)); }

export function runRefusalMatrix() {
  const cases = [];
  const add = (id, desc, kind, fn, expected) => {
    let got; try { got = fn(); } catch (e) { got = 'THREW:' + e.message; }
    cases.push({ id, desc, kind, enforcement_fn: fn.__name || null, expected, got, pass: String(got) === String(expected) });
  };
  const D = (name, f) => { f.__name = name; return f; };

  // Live-action gate (evaluateAppAction) — EXECUTABLE
  add(1, 'create app without founder gate', EXEC, D('evaluateAppAction', () => evaluateAppAction({ action: 'create_app' }).decision), 'TRUE_FOUNDER_GATE');
  add(2, 'install app without founder gate', EXEC, D('evaluateAppAction', () => evaluateAppAction({ action: 'install_app' }).decision), 'TRUE_FOUNDER_GATE');
  add(3, 'generate real installation token without gate', EXEC, D('evaluateAppAction', () => evaluateAppAction({ action: 'generate_installation_token' }).decision), 'TRUE_FOUNDER_GATE');
  add(34, 'live GitHub action attempted from local-only prompt', EXEC, D('evaluateAppAction', () => evaluateAppAction({ action: 'create_app', live_action_authority: false }).decision), 'TRUE_FOUNDER_GATE');

  // Install-spec fail-closed (validateInstallSpec) — EXECUTABLE
  const ok = { target_repo: SANDBOX, installation_mode: 'selected', permissions: { contents: 'read', metadata: 'read' } };
  add(4, 'all-repos installation', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, installation_mode: 'all' }).decision), 'HOLD_SCOPE_UNSAFE');
  add(5, 'multi-repo installation', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, installation_mode: 'multi' }).decision), 'HOLD_SCOPE_UNSAFE');
  add(6, 'existing valuable repo target (wrong repo)', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, target_repo: 'yosiwizman/some-valuable-repo' }).decision), 'HOLD_TARGET_NOT_SANDBOX');
  add(7, 'customer repo target (wrong repo)', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, target_repo: 'acme-customer/prod' }).decision), 'HOLD_TARGET_NOT_SANDBOX');
  add(8, 'production repo target (wrong repo)', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, target_repo: 'yosiwizman/prod-live' }).decision), 'HOLD_TARGET_NOT_SANDBOX');
  add(9, 'write permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'write', metadata: 'read' } }).decision), 'HOLD_WRITE_PERMISSION_BLOCKED');
  add(10, 'admin permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', administration: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(11, 'workflow permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', workflows: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(12, 'issue permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', issues: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(13, 'PR permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', pull_requests: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(14, 'secret permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', secrets: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(15, 'deployment permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', deployments: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(16, 'webhook permission requested', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', webhooks: 'write' } }).decision), 'HOLD_FORBIDDEN_PERMISSION');
  add(30, 'missing repository', EXEC, D('validateInstallSpec', () => validateInstallSpec({ installation_mode: 'selected', permissions: { contents: 'read', metadata: 'read' } }).decision), 'HOLD_MISSING_REPOSITORY');
  add(31, 'missing contents permission', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { metadata: 'read' } }).decision), 'HOLD_MISSING_CONTENTS_PERMISSION');
  add(32, 'unknown/extra permission', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read', metadata: 'read', made_up: 'read' } }).decision), 'HOLD_UNKNOWN_PERMISSION');
  add(33, 'metadata missing', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, permissions: { contents: 'read' } }).decision), 'HOLD_MISSING_METADATA_PERMISSION');
  add(35, 'ambiguous installation mode', EXEC, D('validateInstallSpec', () => validateInstallSpec({ ...ok, installation_mode: 'maybe' }).decision), 'UNKNOWN');

  // Secret guard (scanForSecrets) — EXECUTABLE
  add(17, 'private key appears in evidence', EXEC, D('scanForSecrets', () => scanForSecrets('x -----BEGIN RSA PRIVATE KEY----- y').status), 'SECRET_EXPOSURE');
  add(18, 'installation token appears in evidence', EXEC, D('scanForSecrets', () => scanForSecrets('ghs_' + 'A'.repeat(36)).status), 'SECRET_EXPOSURE');
  add(19, 'Authorization header with value appears', EXEC, D('scanForSecrets', () => scanForSecrets('Authorization: bearer ' + 'A'.repeat(30)).status), 'SECRET_EXPOSURE');

  // Replay fail-closed on prohibited runtime facts (replay) — EXECUTABLE
  const via = (flag) => replayRejects(flag).status;
  add(20, 'broad gh auth intake', EXEC, D('replay', () => via('broad_gh_auth_used')), 'HOLD_REPLAY_MISMATCH');
  add(21, 'fine-grained PAT intake', EXEC, D('replay', () => via('fine_grained_pat_used')), 'HOLD_REPLAY_MISMATCH');
  add(22, 'deploy-key intake', EXEC, D('replay', () => via('deploy_key_used')), 'HOLD_REPLAY_MISMATCH');
  add(23, 'repo code execution', EXEC, D('replay', () => via('code_execution')), 'HOLD_REPLAY_MISMATCH');
  add(24, 'repo build', EXEC, D('replay', () => via('build_run')), 'HOLD_REPLAY_MISMATCH');
  add(25, 'repo tests', EXEC, D('replay', () => via('repo_tests_run')), 'HOLD_REPLAY_MISMATCH');
  add(26, 'provider call', EXEC, D('replay', () => via('provider_call')), 'HOLD_REPLAY_MISMATCH');
  add(27, 'protected main mutation', EXEC, D('replay', () => via('protected_main_touched')), 'HOLD_REPLAY_MISMATCH');
  add(28, 'PR #200 mutation', EXEC, D('replay', () => via('pr_200_touched')), 'HOLD_REPLAY_MISMATCH');
  add(29, 'Codex request', EXEC, D('replay', () => via('codex_called')), 'HOLD_REPLAY_MISMATCH');
  add(36, 'missing evidence', EXEC, D('replay', () => replay(null).status), 'HOLD_MISSING_EVIDENCE');
  add(37, 'contradictory evidence (sim claims live)', EXEC, D('replay', () => replay(reseal(Object.assign(buildLocalEvidence(), { claims_live_proof: true }))).status), 'HOLD_CONTRADICTORY_EVIDENCE');

  // False-green guard (assertNotRealProof) — EXECUTABLE
  add(38, 'claimed proof from simulation', EXEC, D('assertNotRealProof', () => assertNotRealProof('github app proven').verdict), 'HOLD_FALSE_GREEN');

  // Contract validator (validate) — EXECUTABLE
  add(39, 'cleanup missing on would-be live record', EXEC, D('validateContract', () => validateContract({ route_identity: 'github_app_readonly', repo: SANDBOX, repo_private: true, installation_mode: 'selected', permissions: { contents: 'read', metadata: 'read' }, exact_commit: 'f'.repeat(40), manifest_digest: 'man_' + 'a'.repeat(24), archive_digest: 'arc_' + 'b'.repeat(24), file_count: 9, byte_count: 1104, manifest_file_count: 9, secret_classification: 'HELD_SENSITIVE_FILES', held_secret_count: 5, no_code_execution: true, no_build: true, no_repo_tests: true, no_provider_call: true, existing_repo_touched: false, customer_repo_touched: false, production_repo_touched: false, protected_main_touched: false, pr_200_touched: false, cleanup_status: 'not_done', evidence_replay_valid: true, refusal_evidence_valid: true, secret_contents_present: false }).status), 'HOLD_CLEANUP_INCOMPLETE');

  // Catalog-only policy assertions (no distinct enforcement function; documented, not executed) — CATALOG
  add(40, 'no customer/private-production repo SUPPORT is ever claimed (policy)', CAT, () => 'POLICY_ASSERTED_NOT_A_RUNTIME_PATH', 'POLICY_ASSERTED_NOT_A_RUNTIME_PATH');
  add(41, 'no provider/Codex/deploy/billing/outreach/AKIOR/hardware in scope (policy)', CAT, () => 'POLICY_ASSERTED_NOT_A_RUNTIME_PATH', 'POLICY_ASSERTED_NOT_A_RUNTIME_PATH');

  const executable = cases.filter((c) => c.kind === EXEC);
  const catalog = cases.filter((c) => c.kind === CAT);
  const all_held = cases.every((c) => c.pass);
  return {
    record_type: 'github_app_refusal_matrix', total: cases.length,
    executable_refusal_paths_tested: executable.length,
    executable_refusal_paths_passed: executable.filter((c) => c.pass).length,
    catalog_only_policy_assertions: catalog.length,
    passed: cases.filter((c) => c.pass).length, all_held,
    no_live_action_performed: true, no_secret_exposed: true, results: cases,
  };
}
