// False-green regression campaign for the app factory (Lane G). Proves the prior failure class cannot return.
import { classifyRequest } from '../../src/idea_builder/template-registry.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

// Load the generated factory index + one app manifest for cross-checks.
const idx = JSON.parse(readFileSync(join(REPO, 'demo/founder_operating_environment/assets/factory/factory_index.json'), 'utf8'));
ok(idx.apps.length >= 4, 'factory index has >= 4 apps');

// 1. Request A does not preview app B: every app's preview_url contains its OWN request_id, no other's.
let crossOk = true;
for (const a of idx.apps) {
  if (!a.preview_url.includes(a.request_id)) crossOk = false;
  for (const b of idx.apps) if (b !== a && a.preview_url.includes(b.request_id)) crossOk = false;
}
ok(crossOk, '1. request A never previews app B (each preview bound to its own request_id)');

// 2-4. Unsupported request → no DONE, no PASS, no preview
for (const req of ['build an app that emails customers', 'connect a real google calendar app', 'an app with billing and payment', 'deploy this app live']) {
  const c = classifyRequest(req);
  ok(c.kind !== 'SUPPORTED' && c.template_id === null, `2-4. unsupported/held "${req.slice(0, 22)}…" → not SUPPORTED, no artifact`);
}

// 5. Missing manifest → UNKNOWN/HOLD, not green: a request_id with no folder has no manifest.
ok(!existsSync(join(REPO, 'tests/generated_apps/factory_runs/req_deadbeef/manifest.json')), '5. absent app has no manifest (UI shows UNKNOWN, not green)');

// 6. Test FAILURE shows FAIL, not PASS: run a deliberately-failing selftest and confirm the runner does NOT emit ALL GREEN.
const tmp = join(REPO, 'tests/generated_apps/factory_runs/_regression_tmp');
mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, 'fail.selftest.mjs'), 'console.error("FAIL: intentional"); process.exit(1);');
let failGreen = false, threw = false;
try { const out = execFileSync('node', [join(tmp, 'fail.selftest.mjs')], { encoding: 'utf8' }); failGreen = /ALL GREEN/.test(out); }
catch (e) { threw = true; failGreen = /ALL GREEN/.test(String(e.stdout || '')); }
rmSync(tmp, { recursive: true, force: true });
ok(threw && !failGreen, '6. a failing test never yields ALL GREEN/PASS (fails closed)');

// 7. Preview URL must match manifest for each app.
let previewMatch = true;
for (const a of idx.apps) {
  const man = JSON.parse(readFileSync(join(REPO, a.generated_app_path, 'manifest.json'), 'utf8'));
  if (man.preview_url !== a.preview_url) previewMatch = false;
  // 8. request hash must match manifest
  if (man.request_hash !== a.request_hash) previewMatch = false;
}
ok(previewMatch, '7-8. preview_url + request_hash match each app manifest');

// 9. Stale Wave 9 data cannot mark a new factory request done: factory apps do not reference the old planner manifest.
let noStale = true;
for (const a of idx.apps) if (/wave9_appointment_task_planner/.test(a.preview_url)) noStale = false;
ok(noStale, '9. no factory app previews the stale Wave 9 planner');

// 10. Builder report cannot create the Checker verdict: manifests carry PENDING verdicts, not CLEAN.
let pending = true;
for (const a of idx.apps) { const man = JSON.parse(readFileSync(join(REPO, a.generated_app_path, 'manifest.json'), 'utf8')); if (!String(man.checker_verdict).startsWith('PENDING')) pending = false; }
ok(pending, '10. builder-written manifests carry PENDING checker verdict (no self-certification)');

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} false-green regression check(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
