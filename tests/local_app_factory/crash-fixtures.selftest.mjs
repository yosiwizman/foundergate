// Crash fixtures test: verifies the recorded harness results AND independently re-classifies the persistent
// HOLD fixtures to confirm broken states stay broken (never green), and recovered fixtures retested to OK.
import { classifyApp } from '../../src/generated_app_runner/validate-app.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_ID = 'crash_20260803T1030ET';
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

const res = JSON.parse(readFileSync(join(REPO, 'docs/generated/local_app_factory_crash_recovery_gauntlet/CRASH_FIXTURE_RESULTS.json'), 'utf8'));
ok(res.total >= 8, `>=8 fixtures tested (${res.total})`);
ok(res.matched === res.total, `every fixture classified as expected (${res.matched}/${res.total})`);
ok(res.holds >= 5, `>=5 HOLD states (${res.holds})`);
ok(res.recovered >= 2, `>=2 recoveries (${res.recovered})`);
ok(res.anyGreenOnBroken === false, 'no broken fixture shown green');
ok(res.results.every((r) => r.preview_allowed === false), 'no broken fixture allowed a preview');
// recovered fixtures retested to OK
const rec = res.results.filter((r) => r.recovery.attempted && r.recovery.succeeded);
ok(rec.length >= 2, `at least 2 recoveries succeeded (${rec.length})`);
ok(rec.every((r) => r.recovery.after_classification === 'OK' && /PASS/.test(String(r.recovery.retested))), 'each recovery re-classified OK and retested PASS');

// independently re-classify the persistent-HOLD (non-recovered) fixtures — must still HOLD live
const persistent = ['F03_hash_mismatch', 'F05_test_failure', 'F07_stale_round1', 'F08_stale_round2', 'F09_unsupported', 'F12_post_checker_mutation'];
for (const fid of persistent) {
  const dir = join(REPO, 'tests/generated_apps/crash_fixtures', fid);
  const c = await classifyApp(dir, { currentRunId: RUN_ID });
  ok(c.classification.startsWith('HOLD') && c.preview_allowed === false, `${fid} still HOLD live (${c.classification}), no preview`);
}
const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} crash-fixtures check(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
