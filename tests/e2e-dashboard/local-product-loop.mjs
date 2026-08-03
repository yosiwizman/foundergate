// Local product loop E2E (Wave 4 behavior): real per-fixture batch, aggregated export, run history
// (persistent + clearable), local decision ledger, synthetic protected-files demo. Isolated storage.
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
const npage = async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1150 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
const OKSTATUS = /PASS|FAIL|NO_TESTS_FOUND|BROKEN_PROJECT|UNSAFE_SOURCE_REFUSED|HOLD_REFUSED|HOLD_DEPENDENCIES_NOT_INSTALLED|REFUSED_NEEDS_AUTHORIZATION|UNKNOWN_RUNTIME_MISSING|UNKNOWN/;

// 1. BATCH: real per-fixture execution -> aggregate export
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await shot(p, 'lpl_01_batch_before.png');
  await p.click('[data-testid="batch-run-btn"]');
  await p.waitForFunction(() => /never SHIP/.test(document.querySelector('[data-testid="batch-aggregate"]').textContent), null, { timeout: 120000 });
  const rows = await p.$$eval('[data-testid="batch-body"] tr', trs => trs.map(t => t.innerText));
  ok(rows.length >= 6, 'batch: ran multiple real fixtures (' + rows.length + ' rows)');
  ok(rows.every(r => OKSTATUS.test(r)), 'batch: each row an honest normalized status');
  ok(rows.some(r => /PASS/.test(r)) && rows.some(r => /FAIL/.test(r)) && rows.some(r => /REFUSED/.test(r)), 'batch: shows PASS + FAIL + REFUSED (real adapters)');
  ok(/never SHIP/.test(await T(p,'[data-testid="batch-aggregate"]')), 'batch: aggregate conclusion never SHIP');
  ok(!(await p.isDisabled('[data-testid="batch-export-btn"]')), 'batch: aggregate export enabled');
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  ok(/aggregated batch/.test(await T(p,'[data-testid="evi-state"]')), 'batch: one real sealed AGGREGATE export');
  await shot(p, 'lpl_02_batch_after.png');
  await p.close();
}

// 2. RUN HISTORY: persistent across reload + clearable
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.click('[data-testid="nav-history"]');
  let rows = await p.$$eval('[data-testid="hist-body"] tr', trs => trs.map(t => t.innerText));
  ok(rows.length >= 2, 'history: records runs (' + rows.length + ')');
  ok(rows.every(r => !/\bSHIP\b(?!\/)/.test(r.replace(/never SHIP/g,''))), 'history: no SHIP decision');
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.click('[data-testid="nav-history"]');
  rows = await p.$$eval('[data-testid="hist-body"] tr', trs => trs.map(t => t.innerText).filter(x=>x.trim()));
  ok(rows.length >= 2 && !/No runs yet/.test(rows.join('')), 'history: persists across reload (opt-in local)');
  await p.click('[data-testid="hist-clear-btn"]');
  ok(/No runs yet/.test(await T(p,'[data-testid="hist-body"]')), 'history: Clear empties it');
  await shot(p, 'lpl_03_history.png');
  await p.close();
}

// 3. LOCAL DECISION LEDGER + persistence + clear
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-decisions"]');
  ok(await p.isDisabled('[data-testid="dec-continue"]'), 'ledger: real-world action buttons disabled');
  ok(/No real-world action is authorized/.test(await T(p,'[data-testid="dec-notice"]')), 'ledger: notice no real-world action');
  await p.click('[data-testid="led-continue"]'); await p.click('[data-testid="led-hold"]');
  let led = await T(p,'[data-testid="dec-ledger"]');
  ok(/CONTINUE_DEMO/.test(led) && /HOLD/.test(led), 'ledger: records safe local statuses');
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.click('[data-testid="nav-decisions"]');
  ok(/CONTINUE_DEMO/.test(await T(p,'[data-testid="dec-ledger"]')), 'ledger: persists across reload');
  await p.click('[data-testid="led-clear-btn"]');
  ok(/No local notes yet/.test(await T(p,'[data-testid="dec-ledger"]')), 'ledger: Clear empties it');
  await shot(p, 'lpl_04_ledger.png');
  await p.close();
}

// 4. PROTECTED FILES synthetic enforcement demo + batch classify
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-files"]');
  ok(/LOCAL_SYNTHETIC_ENFORCEMENT_DEMO/.test(await T(p,'[data-testid="panel-files"]')), 'pf: labeled LOCAL_SYNTHETIC_ENFORCEMENT_DEMO');
  await p.fill('[data-testid="pf-input"]', 'demo/notes/todo.txt'); await p.click('[data-testid="pf-check-btn"]');
  ok(/ALLOWED/.test(await T(p,'[data-testid="pf-result"]')), 'pf: safe name -> ALLOWED');
  await p.fill('[data-testid="pf-input"]', 'customer/production/secrets.env'); await p.click('[data-testid="pf-check-btn"]');
  ok(/BLOCKED/.test(await T(p,'[data-testid="pf-result"]')), 'pf: unsafe name -> BLOCKED');
  await p.click('[data-testid="pf-batch-btn"]');
  const bt = await T(p,'[data-testid="pf-batch-body"]');
  ok(/ALLOWED/.test(bt) && /BLOCKED/.test(bt) && /HOLD/.test(bt), 'pf: batch classify shows ALLOWED/BLOCKED/HOLD');
  await shot(p, 'lpl_05_protected_files_demo.png');
  await p.close();
}

// 5. accessibility across all panels (incl. viewer)
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
  ok(serious === 0, 'a11y: axe 0 serious/critical across all 10 panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} local-product-loop checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
