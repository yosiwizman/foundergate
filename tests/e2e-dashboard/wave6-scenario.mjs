// Wave 6 E2E: synthetic scenario runner (calendar/task/crud/static), synthetic calendar preview
// (no real account/data), scenario+fixture batch aggregate, refusals, evidence replay, and a 75-run
// matrix. Real backend; isolated storage.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const URL = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const npage = async () => { const ctx = await b.newContext({ acceptDownloads:true }); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
const waitBatch = (p) => p.waitForFunction(() => /never SHIP/.test(document.querySelector('[data-testid="batch-aggregate"]').textContent), null, { timeout: 180000 });
const runScn = async (p, key, want) => { await p.selectOption('[data-testid="scn-sel"]', key); await p.click('[data-testid="scn-run-btn"]');
  await p.waitForFunction(w => document.querySelector('[data-testid="scn-result"]').textContent.includes(w), want, { timeout: 30000 }); return T(p,'[data-testid="scn-result"]'); };

// 1. SCENARIO MATRIX via UI (selected scenario each -> expected status)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]');
  for (const [k, st] of [['calendar-app-pass','SCENARIO_PASS'],['calendar-app-fail','SCENARIO_FAIL'],['task-app-pass','SCENARIO_PASS'],['crud-api-pass','SCENARIO_PASS'],['static-site-pass','SCENARIO_PASS'],['static-site-broken','BROKEN_SCENARIO'],['no-test-scenario','NO_TESTS_FOUND'],['dependency-missing-scenario','HOLD_DEPENDENCIES_NOT_INSTALLED'],['unsafe-customer-calendar-scenario','UNSAFE_SCENARIO_REFUSED'],['unsafe-production-api-scenario','UNSAFE_SCENARIO_REFUSED']]) {
    const r = await runScn(p, k, st); ok(r.includes(st), `scenario: ${k} -> ${st}`);
  }
  await shot(p, 'w6_01_scenario_matrix.png');
  await p.close();
}

// 2. SYNTHETIC CALENDAR PREVIEW (no real account/data)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await runScn(p, 'calendar-app-pass', 'SCENARIO_PASS');
  await p.click('[data-testid="nav-preview"]');
  const prev = await T(p,'[data-testid="scn-preview"]');
  ok(/SYNTHETIC_CALENDAR/.test(prev) && /Synthetic standup/.test(prev), 'calendar preview shows synthetic events');
  ok(/no real account/.test(prev) && /no invites/.test(prev), 'calendar preview labels: no real account / no invites');
  const panel = await T(p,'[data-testid="panel-preview"]');
  ok(!/connected to|signed in|syncing|oauth|access token|api key/i.test(panel), 'preview: no real provider CONNECTION claimed (synthetic only)');
  await shot(p, 'w6_02_calendar_preview.png');
  await p.close();
}

// 3. SCENARIO + FIXTURE BATCH -> aggregate scenario evidence -> viewer replay
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]'); await waitBatch(p);
  const body = await T(p,'[data-testid="batch-body"]');
  ok(/scenario:calendar-app-pass[\s\S]*SCENARIO_PASS/.test(body) || (body.includes('scenario:calendar-app-pass') && body.includes('SCENARIO_PASS')), 'batch: scenario rows present + passing');
  ok(/UNSAFE_SCENARIO_REFUSED/.test(body), 'batch: unsafe scenarios refused in matrix');
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /aggregated batch/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  ok(/aggregated batch/.test(await T(p,'[data-testid="evi-state"]')), 'aggregate scenario evidence sealed');
  await p.click('[data-testid="nav-viewer"]'); await p.click('[data-testid="viewer-load-btn"]');
  await p.waitForFunction(() => /aggregate/i.test(document.querySelector('[data-testid="viewer-body"]').textContent), null, { timeout: 15000 });
  const v = await T(p,'[data-testid="viewer-body"]');
  ok(/never SHIP/i.test(v) && /verified/i.test(v) && !/[0-9a-f]{40}/.test(v), 'viewer: replays sealed scenario aggregate (never SHIP, verified, no SHA)');
  await shot(p, 'w6_03_scenario_evidence.png');
  await p.close();
}

// 4. HISTORY records scenario fields + no SHIP
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await runScn(p, 'calendar-app-pass', 'SCENARIO_PASS');
  await p.click('[data-testid="nav-history"]');
  const h = await T(p,'[data-testid="hist-body"]');
  ok(/scenario: calendar-app-pass/.test(h), 'history: records scenario field');
  ok(!/\bSHIP\b(?!\/)/.test(h.replace(/never SHIP/g,'')), 'history: no SHIP');
  await p.close();
}

// 5. LONG SCENARIO MATRIX: 75 governed checks (mix of governed run + scenarios)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let green = 0, scn = 0;
  for (let i = 0; i < 50; i++) { await p.click('[data-testid="nav-truth"]'); await p.click('[data-testid="run-btn"]'); await waitTests(p); if (/30\/30/.test(await T(p,'[data-testid="chip-tests"]'))) green++; }
  await p.click('[data-testid="nav-batch"]');
  const scnSeq = ['calendar-app-pass','task-app-pass','crud-api-pass','static-site-pass','calendar-app-fail','task-app-fail','crud-api-fail','no-test-scenario','dependency-missing-scenario','unsafe-customer-calendar-scenario','unsafe-production-api-scenario','static-site-broken','calendar-app-pass','task-app-pass','crud-api-pass','static-site-pass','calendar-app-pass','task-app-pass','crud-api-pass','static-site-pass','calendar-app-pass','task-app-pass','crud-api-pass','static-site-pass','calendar-app-pass'];
  for (const k of scnSeq) { await p.selectOption('[data-testid="scn-sel"]', k); await p.click('[data-testid="scn-run-btn"]');
    await p.waitForFunction(() => !/^—$|Running/.test(document.querySelector('[data-testid="scn-result"]').textContent), null, { timeout: 30000 }); scn++; }
  ok(green === 50, `soak: 50/50 governed runs 30/30 (got ${green})`);
  ok(scn === 25, `soak: 25/25 scenario runs (total 75 governed local checks)`);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'soak: reload -> UNKNOWN (no stale green)');
  await p.close();
}

// 6. accessibility across all panels
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave6 scenario checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
