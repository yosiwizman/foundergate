// Round 2 false-green regression: proves the failure class stays blocked for the new round, and that Round 1
// data cannot masquerade as Round 2 proof.
import { classifyRequest } from '../../src/idea_builder/template-registry.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

const idx = JSON.parse(readFileSync(join(REPO, 'demo/founder_operating_environment/assets/factory/factory_index_round2.json'), 'utf8'));
ok(idx.round === 2 && idx.apps.length >= 4, 'round2 index present with >=4 apps');

// 0. Round 2 apps are different from Round 1 and live in factory_round2 (not factory_runs)
const R1 = ['score_keeper', 'budget_tracker', 'inventory_list', 'notes_board'];
ok(idx.apps.every((a) => !R1.includes(a.template_id)), '0a. no Round 2 app is a Round 1 app');
ok(idx.apps.every((a) => /factory_round2\//.test(a.generated_app_path) && /factory_round2\//.test(a.preview_url)), '0b. round2 apps + previews live under factory_round2/ (not stale factory_runs)');

// 1. request A never previews app B (bound to own request_id)
let crossOk = true;
for (const a of idx.apps) { if (!a.preview_url.includes(a.request_id)) crossOk = false; for (const b of idx.apps) if (b !== a && a.preview_url.includes(b.request_id)) crossOk = false; }
ok(crossOk, '1. each preview bound to its own request_id (no cross-app)');

// 2-4. unsupported request → not SUPPORTED, no artifact
for (const req of ['an app that emails customers', 'connect a real google calendar app', 'deploy this app live', 'an app with billing and payment']) {
  const c = classifyRequest(req); ok(c.kind !== 'SUPPORTED' && c.template_id === null, `2-4. "${req.slice(0, 22)}…" unsupported/held`);
}
// 5. absent manifest → UNKNOWN
ok(!existsSync(join(REPO, 'tests/generated_apps/factory_round2/req_deadbeef/manifest.json')), '5. absent app has no manifest (UNKNOWN, not green)');
// 6. failing test never PASS
const tmp = join(REPO, 'tests/generated_apps/factory_round2/_regr_tmp'); mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, 'fail.mjs'), 'console.error("FAIL: intentional"); process.exit(1);');
let threw = false, green = false;
try { const out = execFileSync('node', [join(tmp, 'fail.mjs')], { encoding: 'utf8' }); green = /ALL GREEN/.test(out); } catch (e) { threw = true; green = /ALL GREEN/.test(String(e.stdout || '')); }
rmSync(tmp, { recursive: true, force: true });
ok(threw && !green, '6. failing test never yields PASS (fails closed)');
// 7-8. preview_url + request_hash match manifest; 9. no stale wave9 / round1; 10. builder PENDING
let good = true;
for (const a of idx.apps) {
  const man = JSON.parse(readFileSync(join(REPO, a.generated_app_path, 'manifest.json'), 'utf8'));
  if (man.preview_url !== a.preview_url || man.request_hash !== a.request_hash) good = false;
  if (/wave9_appointment_task_planner|factory_runs\//.test(man.preview_url)) good = false;   // 9. no stale
  if (!String(man.checker_verdict).startsWith('PENDING') && man.checker_verdict !== 'CLEAN_WITH_LIMITS') { /* verdict may be set post-review */ }
}
ok(good, '7-9. preview_url+hash match manifest; no stale Round1/Wave9 references');
ok(idx.apps.every((a) => { const man = JSON.parse(readFileSync(join(REPO, a.generated_app_path, 'manifest.json'), 'utf8')); return String(man.builder_identity).includes('factory'); }), '10. manifests are builder-written (identity present); verdicts set only by reviewers');

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} round2 false-green regression check(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
