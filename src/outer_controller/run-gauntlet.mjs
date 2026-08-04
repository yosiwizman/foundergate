// Lane L — Gauntlet runner. Runs all 16 fixtures through the always-on outer controller, checks each against its
// allowed verdicts, asserts zero false-green + zero "secure", writes results JSON + report + UI data. LOCAL.
import { runOuterController } from './outer-controller.mjs';
import { FIXTURES } from '../../tests/outer_controller/fixtures/fixtures.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(REPO, 'docs/generated/p0_outer_controller_env_challenge_gauntlet');
mkdirSync(DOCS, { recursive: true });

const FOUNDER_OF = {
  VERIFIED_WITHIN_BOUNDARIES: 'continue', HOLD_CHALLENGE_FAILED_OPEN: 'stop', HOLD_PRE_RUN_ATTESTATION_FAILED: 'hold',
  MONITORING_LOST: 'stop', BOUNDARY_VIOLATION_DETECTED_AND_STOPPED: 'stop', BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED: 'quarantine', UNKNOWN: 'unknown',
};

const results = FIXTURES.map((fx) => {
  const r = runOuterController({ ...fx.scenario, run_id: fx.id });
  const verdict = r.final_verdict;
  const expected_ok = fx.allowed.includes(verdict);
  const is_good = fx.name.startsWith('good_');
  const false_green = !is_good && verdict === 'VERIFIED_WITHIN_BOUNDARIES';
  // "secure" must never appear in the final VERDICT word (not the guard-field names like never_secure).
  const says_secure = /secure/i.test(String(verdict));
  return { id: fx.id, name: fx.name, expected: fx.allowed, verdict, founder_expected: fx.founder, founder_actual: FOUNDER_OF[verdict] || 'unknown', expected_ok, false_green, says_secure, evidence_completeness: r.evidence_completeness, stop_status: r.stop_status, post_run_status: r.post_run_status };
});

const false_green_count = results.filter((r) => r.false_green).length;
const secure_count = results.filter((r) => r.says_secure).length;
const mismatches = results.filter((r) => !r.expected_ok);
const good_verified = results.find((r) => r.name.startsWith('good_'))?.verdict === 'VERIFIED_WITHIN_BOUNDARIES';
const bad_all_held = results.filter((r) => !r.name.startsWith('good_')).every((r) => r.verdict !== 'VERIFIED_WITHIN_BOUNDARIES');

const summary = { run_id: 'p0_outer_controller_env_challenge_gauntlet_20260803T1945ET', total: results.length, good_verified, bad_all_held, false_green_count, secure_count, mismatches: mismatches.map((m) => ({ id: m.id, verdict: m.verdict, expected: m.expected })), results };
writeFileSync(join(DOCS, 'GAUNTLET_RESULTS.json'), JSON.stringify(summary, null, 2));

// UI data
const ui = {
  kind: 'BOUNDARY_ASSURANCE', run_id: summary.run_id,
  contract_digest: runOuterController({ ...FIXTURES[0].scenario, run_id: 'digest' }).contract_digest,
  gauntlet: { total: results.length, good_verified, bad_all_held, false_green_count, secure_count },
  fixtures: results.map((r) => ({ id: r.id, name: r.name, verdict: r.verdict, founder: r.founder_actual, ok: r.expected_ok })),
  blocked: { real_provider: 'BLOCKED', private_repo: 'BLOCKED', gate_8: 'BLOCKED', deploy: 'BLOCKED', bill: 'BLOCKED', contact: 'BLOCKED', merge: 'BLOCKED', external_network: 'BLOCKED' },
  labels: ['LOCAL_SYNTHETIC_ONLY', 'NOT real sandbox security', 'NOT production isolation', 'NOT security certification', 'the worker cannot override the controller', 'evidence plane is outside the worker', 'never emits "secure"', 'NEVER SHIP'],
};
const ASSETS = join(REPO, 'demo/founder_operating_environment/assets/boundary');
mkdirSync(ASSETS, { recursive: true });
writeFileSync(join(ASSETS, 'boundary_index.json'), JSON.stringify(ui, null, 2));

// report
let md = `# Environment Integrity Challenge Gauntlet — Report\n\n`;
md += `Run all ${results.length} fixtures through the always-on outer controller. **Good fixture → VERIFIED_WITHIN_BOUNDARIES; every bad fixture → HOLD/STOP/QUARANTINE/MONITORING_LOST/BOUNDARY_VIOLATION (never VERIFIED, never "secure").**\n\n`;
md += `- good fixture verified: **${good_verified}**\n- all bad fixtures held (no false green): **${bad_all_held}**\n- false-green count: **${false_green_count}**\n- "secure" verdicts: **${secure_count}**\n- verdict/expected mismatches: **${mismatches.length}**\n\n`;
md += `| Fixture | Final verdict | Founder response | Matches expected |\n| --- | --- | --- | :---: |\n`;
for (const r of results) md += `| ${r.id} ${r.name} | ${r.verdict} | ${r.founder_actual} | ${r.expected_ok ? '✅' : '❌ (expected ' + r.expected.join('/') + ')'} |\n`;
writeFileSync(join(DOCS, 'GAUNTLET_REPORT.md'), md);

const okAll = good_verified && bad_all_held && false_green_count === 0 && secure_count === 0 && mismatches.length === 0;
console.log(`GAUNTLET total=${results.length} good_verified=${good_verified} bad_all_held=${bad_all_held} false_green=${false_green_count} secure=${secure_count} mismatches=${mismatches.length}`);
if (!okAll) { console.error('GAUNTLET_FAIL', JSON.stringify(mismatches)); process.exit(1); }
console.log('GAUNTLET_OK');
