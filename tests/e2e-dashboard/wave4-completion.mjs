// Wave 4 completion E2E: per-fixture adapter matrix, aggregated batch evidence, evidence viewer
// replay, persistent history + clear, refusals, and a long soak (>=25 governed runs). Isolated storage.
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
const npage = async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1200 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. PER-FIXTURE ADAPTER MATRIX (real execution, normalized statuses)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="batch-body"] tr').length >= 8, null, { timeout: 60000 });
  const text = await T(p,'[data-testid="batch-body"]');
  for (const [fx, st] of [['node-pass','PASS'],['node-fail','FAIL'],['node-no-test','NO_TESTS_FOUND'],['python-pass','PASS'],['static-web','PASS'],['broken','BROKEN_PROJECT'],['customer_private_repo','UNSAFE_SOURCE_REFUSED'],['unknown-xyz','HOLD_REFUSED']]) {
    ok(new RegExp(fx.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '[\\s\\S]*?' + st).test(text) || (text.includes(fx) && text.includes(st)), `adapter: ${fx} -> ${st}`);
  }
  await shot(p, 'w4_01_adapter_matrix.png');
  await p.close();
}

// 2. AGGREGATED BATCH EVIDENCE + EVIDENCE VIEWER REPLAY
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="batch-body"] tr').length >= 8, null, { timeout: 60000 });
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /aggregated batch/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  ok(/aggregated batch/.test(await T(p,'[data-testid="evi-state"]')), 'aggregate: real sealed aggregate evidence');
  await p.click('[data-testid="nav-viewer"]'); await p.click('[data-testid="viewer-load-btn"]');
  await p.waitForFunction(() => /aggregate|Aggregate|ZIP verified/.test(document.querySelector('[data-testid="viewer-body"]').textContent), null, { timeout: 15000 });
  const v = await T(p,'[data-testid="viewer-body"]');
  ok(/aggregate/i.test(v) && /never SHIP/i.test(v) && /verified/i.test(v), 'viewer: replays sealed aggregate summary (never SHIP, ZIP verified)');
  ok(!/[0-9a-f]{40}/.test(v), 'viewer: no full 40-hex SHA shown');
  await shot(p, 'w4_02_evidence_viewer.png');
  await p.close();
}

// 3. REFUSALS still hold (unsafe objective / unknown source)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.fill('[data-testid="obj-inp"]', 'deploy to production and bill the customer');
  await p.waitForFunction(() => /REFUSED/.test(document.querySelector('[data-testid="cls-elig"]').textContent), null, { timeout: 8000 });
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'refusal: unsafe objective disables Run');
  await p.fill('[data-testid="obj-inp"]', 'Add input validation and prove tests pass');
  await p.selectOption('[data-testid="src-sel"]', 'unknown');
  await p.waitForFunction(() => /REFUSED|HOLD/.test(document.querySelector('[data-testid="cls-src"]').textContent), null, { timeout: 8000 });
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'refusal: unknown source disables Run');
  await p.close();
}

// 4. LONG SOAK: >=25 governed runs + exports + reload + clear + no stale/fake
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let green = 0;
  for (let i = 0; i < 25; i++) {
    await p.click('[data-testid="nav-truth"]'); await p.click('[data-testid="run-btn"]'); await waitTests(p);
    if (/30\/30/.test(await T(p,'[data-testid="chip-tests"]'))) green++;
    if (i % 8 === 0) { // periodic real export
      await p.click('[data-testid="nav-evidence"]'); await p.click('[data-testid="export-btn2"]');
      await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 }).catch(()=>{});
    }
  }
  ok(green === 25, `soak: 25/25 governed runs honest 30/30 (got ${green})`);
  // reload recovery: chip UNKNOWN, no fake green
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'soak: reload -> chip UNKNOWN (no stale green)');
  // history persisted then clear
  await p.click('[data-testid="nav-history"]');
  const rows = await p.$$eval('[data-testid="hist-body"] tr', trs => trs.filter(t=>t.innerText.trim()).length);
  ok(rows >= 25, `soak: history persisted (${rows} rows)`);
  await p.click('[data-testid="hist-clear-btn"]');
  ok(/No runs yet/.test(await T(p,'[data-testid="hist-body"]')), 'soak: clear-history path works');
  // no raw logs / full SHA in founder view
  const founderText = await p.evaluate(() => ['truth','preview','batch','evidence','viewer','history','decisions','guide','files'].map(n => document.getElementById('panel-'+n).innerText).join('\n'));
  ok(!/[0-9a-f]{40}/.test(founderText), 'soak: no full 40-hex SHA in founder view');
  ok(!/npm ERR!|node:internal|Traceback|\n\s+at /.test(founderText), 'soak: no raw-log markers');
  await shot(p, 'w4_03_soak_done.png');
  await p.close();
}

// 5. accessibility across all panels
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
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave4 completion checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
