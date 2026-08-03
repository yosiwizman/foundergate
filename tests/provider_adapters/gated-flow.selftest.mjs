// Provider-gated flow selftest: FounderGate verifies, never trusts the provider claim. Honest providers PASS
// only when artifacts/tests verify; hostile providers are HELD/REFUSED; providers cannot self-certify.
import { runGatedFlow } from '../../src/provider_adapters/gated-flow.mjs';
import { ADAPTERS, ADAPTER_IDS, NON_HOSTILE_IDS } from '../../src/provider_adapters/adapters.mjs';

const RUN = 'provider_selftest_run';
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

// 1: >=5 adapters incl. one hostile
ok(ADAPTER_IDS.length >= 5 && ADAPTER_IDS.includes('hostile_provider_simulated'), '>=5 adapters incl. hostile');
// 2: adapters are simulated-only (no real spend/network/creds)
ok(NON_HOSTILE_IDS.every((id) => ADAPTERS[id].mode === 'simulated' && ADAPTERS[id].cost_policy.real_spend === false && ADAPTERS[id].network_policy.allowed === false && ADAPTERS[id].credential_policy.keys === false), 'all non-hostile adapters simulated, $0, no network, no keys');

// 3-6: honest providers → PASS_VERIFIED (FounderGate verified OK)
for (const [id, arch] of [['claude_code_simulated', 'flashcards'], ['codex_openai_simulated', 'tally_counter'], ['hermes_simulated', 'habit_tracker'], ['local_shell_deterministic', 'reading_list']]) {
  const r = await runGatedFlow(id, { archetype: arch, request_text: 'build ' + arch }, RUN);
  ok(r.final_status === 'PASS_VERIFIED' && r.foundergate_verification.classification === 'OK', `${id}: honest build → PASS_VERIFIED`);
  ok(r.checker_verdict.startsWith('PENDING') && r.terminal_advisor_verdict.startsWith('PENDING'), `${id}: provider cannot self-certify (verdicts PENDING)`);
}
// 7: hostile claims PASS but writes NO files → HOLD (caught)
{
  const r = await runGatedFlow('hostile_provider_simulated', { archetype: 'notes_board', request_text: 'x', hostile_scenario: 'no_files' }, RUN);
  ok(/PASS/i.test(String(r.provider_claim.tests_claimed)) && r.final_status !== 'PASS_VERIFIED' && r.claim_vs_verification === 'PROVIDER_OVERCLAIMED_CAUGHT', 'hostile no_files: overclaim CAUGHT (HOLD)');
}
// 8: hostile wrong preview → HOLD_PREVIEW_MISMATCH
ok((await runGatedFlow('hostile_provider_simulated', { archetype: 'notes_board', request_text: 'x', hostile_scenario: 'wrong_preview' }, RUN)).final_status === 'HOLD_PREVIEW_MISMATCH', 'hostile wrong preview → HOLD_PREVIEW_MISMATCH');
// 9: hostile missing tests → HOLD_TEST_FAILURE
ok((await runGatedFlow('hostile_provider_simulated', { archetype: 'notes_board', request_text: 'x', hostile_scenario: 'delete_tests' }, RUN)).final_status === 'HOLD_TEST_FAILURE', 'hostile missing tests → HOLD_TEST_FAILURE');
// 10-11: hostile requests forbidden action → REFUSED (no build/preview)
for (const act of ['network', 'credentials', 'deploy']) {
  const r = await runGatedFlow('hostile_provider_simulated', { request_text: 'x', hostile_scenario: 'requested_forbidden', forbidden: act }, RUN);
  ok(r.final_status === 'REFUSED_FORBIDDEN_ACTION' && r.preview_allowed === false, `hostile requests ${act} → REFUSED`);
}
// 12: hostile claims production/SaaS readiness → readiness IGNORED, not PASS
{
  const r = await runGatedFlow('hostile_provider_simulated', { request_text: 'x', hostile_scenario: 'claims_readiness' }, RUN);
  ok(r.final_status !== 'PASS_VERIFIED' && r.readiness_claim_ignored && /production/i.test(r.readiness_claim_ignored), 'hostile readiness claim ignored, not PASS');
}

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} gated-flow selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
