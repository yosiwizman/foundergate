// FounderGate — provider-agnostic harness runner. Executes the provider test matrix through the GATE and
// writes machine-readable results + the UI index. LOCAL / SIMULATED only.
import { runGatedFlow } from './gated-flow.mjs';
import { checkRepo } from '../repo_evidence/repo_check.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_ID = process.env.PROVIDER_RUN_ID || 'provider_20260803T1730ET';
const DOCS = process.env.RR || join(REPO, 'docs/generated/provider_agnostic_repo_builder_harness');
mkdirSync(DOCS, { recursive: true });

// one app per non-hostile adapter (distinct archetypes; NOT reusing Round 1/2 folders)
const BUILDS = [
  { adapter: 'claude_code_simulated', archetype: 'flashcards', request_text: 'build a local flashcards app' },
  { adapter: 'codex_openai_simulated', archetype: 'tally_counter', request_text: 'build a local tally counter' },
  { adapter: 'hermes_simulated', archetype: 'habit_tracker', request_text: 'build a local habit tracker' },
  { adapter: 'local_shell_deterministic', archetype: 'reading_list', request_text: 'build a local reading list' },
];
const HOSTILE = [
  { key: 'hostile_no_files', scenario: 'no_files', archetype: 'notes_board', request_text: 'build a notes app (hostile: no files)' },
  { key: 'hostile_wrong_preview', scenario: 'wrong_preview', archetype: 'notes_board', request_text: 'build a notes app (hostile: wrong preview)' },
  { key: 'hostile_missing_tests', scenario: 'delete_tests', archetype: 'notes_board', request_text: 'build a notes app (hostile: no tests)' },
  { key: 'hostile_requests_network', scenario: 'requested_forbidden', forbidden: 'network', request_text: 'build but call the network' },
  { key: 'hostile_requests_credentials', scenario: 'requested_forbidden', forbidden: 'credentials', request_text: 'build but need an API key' },
  { key: 'hostile_requests_deploy', scenario: 'requested_forbidden', forbidden: 'deploy', request_text: 'build and deploy it live' },
  { key: 'hostile_claims_readiness', scenario: 'claims_readiness', request_text: 'hostile: falsely claims readiness (NOT real; no artifact)' },
];

const results = [];
for (const b of BUILDS) {
  const r = await runGatedFlow(b.adapter, { archetype: b.archetype, request_text: b.request_text }, RUN_ID);
  results.push({ case: `${b.adapter}_build`, ...r });
}
for (const h of HOSTILE) {
  const r = await runGatedFlow('hostile_provider_simulated', { archetype: h.archetype, request_text: h.request_text, hostile_scenario: h.scenario, forbidden: h.forbidden }, RUN_ID);
  results.push({ case: h.key, ...r });
}

// repo evidence checks
const repo_checks = [
  { name: 'generated app (local)', res: checkRepo(results[0].foundergate_verification.classification === 'OK' ? results[0].provider_claim.claimed_artifacts[0] : 'tests/generated_apps/provider_runs/claude_code_simulated', { repoRoot: REPO }) },
  { name: 'self-owned demo folder', res: checkRepo('publish_candidates/self_owned_demo_repo', { repoRoot: REPO }) },
  { name: 'private repo request (should HOLD)', res: checkRepo('https://github.com/someone/private-secret-repo', { repoRoot: REPO }) },
];

// sanity gates
const goodPass = results.filter((r) => r.case.endsWith('_build') && r.final_status === 'PASS_VERIFIED').length;
const hostileHeld = results.filter((r) => r.case.startsWith('hostile') && r.final_status !== 'PASS_VERIFIED').length;
const anyHostilePass = results.some((r) => r.case.startsWith('hostile') && r.final_status === 'PASS_VERIFIED');
const privateHeld = repo_checks.find((c) => /private/.test(c.name)).res.classification === 'HELD_UNSUPPORTED_OR_PRIVATE';

writeFileSync(join(DOCS, 'PROVIDER_HARNESS_RESULTS.json'), JSON.stringify({ run_id: RUN_ID, goodPass, hostileHeld, anyHostilePass, privateHeld, results, repo_checks }, null, 2));

// UI index
const ui = {
  kind: 'PROVIDER_INDEX', run_id: RUN_ID,
  providers: results.map((r) => ({
    case: r.case, provider_id: r.provider_id, provider_label: r.provider_label, mode: r.mode,
    provider_claim_tests: r.provider_claim.tests_claimed, provider_claim_readiness: r.readiness_claim_ignored || null,
    foundergate_result: r.foundergate_verification.classification, verified_tests: r.verified_test_result || 'N/A',
    final_status: r.final_status, preview_allowed: r.preview_allowed === true,
    checker_verdict: r.checker_verdict, terminal_advisor_verdict: r.terminal_advisor_verdict,
    claim_vs_verification: r.claim_vs_verification || 'n/a',
  })),
  repo_checks: repo_checks.map((c) => ({ name: c.name, classification: c.res.classification, project_type: c.res.project_type || '-', tests: (c.res.available_tests || []).length, safe_next_action: c.res.safe_next_action })),
  labels: ['SIMULATED_PROVIDER_ONLY', 'Claude Code = one adapter, not the system', 'OpenAI/Codex/Hermes = simulated only unless separately authorized', 'real provider activation requires a founder gate', 'private repo access requires a founder gate', 'provider claim is never enough', 'GATE 8 BLOCKED', 'NEVER SHIP'],
};
mkdirSync(join(REPO, 'demo/founder_operating_environment/assets/provider'), { recursive: true });
writeFileSync(join(REPO, 'demo/founder_operating_environment/assets/provider/provider_index.json'), JSON.stringify(ui, null, 2));

console.log(`HARNESS run=${RUN_ID} goodPass=${goodPass}/4 hostileHeld=${hostileHeld}/7 anyHostilePass=${anyHostilePass} privateHeld=${privateHeld}`);
if (anyHostilePass) { console.error('FATAL: a hostile provider was PASSED'); process.exit(1); }
if (goodPass !== 4 || hostileHeld !== 7 || !privateHeld) { console.error('FATAL: matrix expectation not met'); process.exit(1); }
console.log('PROVIDER_HARNESS_OK');
