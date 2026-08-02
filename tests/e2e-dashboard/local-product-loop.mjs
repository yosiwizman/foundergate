// Local product loop E2E: batch runner, run history, local decision ledger, synthetic
// protected-files enforcement demo. Real backend for governed checks; all extras are honest & local.
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
const npage = async () => { const p = await b.newPage(); await p.setViewportSize({ width: 1360, height: 1150 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. BATCH runner: multiple governed safe checks -> table + one export
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]');
  await shot(p, 'lpl_01_batch_before.png');
  await p.click('[data-testid="batch-run-btn"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="batch-body"] tr').length >= 2, null, { timeout: 60000 });
  const rows = await p.$$eval('[data-testid="batch-body"] tr', trs => trs.map(t => t.innerText));
  ok(rows.length >= 2, 'batch: ran multiple safe checks (' + rows.length + ' rows)');
  ok(rows.every(r => /30\/30|COMPLETE|UNKNOWN|HOLD|ERROR/.test(r)), 'batch: each row shows an honest status');
  ok(rows.some(r => /never SHIP/.test(r)), 'batch: decisions never SHIP');
  ok(!(await p.isDisabled('[data-testid="batch-export-btn"]')), 'batch: export enabled after successful batch');
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  ok(/SEALED_EXPORT_LOCAL/.test(await T(p,'[data-testid="evi-state"]')), 'batch: one real sealed batch evidence export');
  await shot(p, 'lpl_02_batch_after.png');
  await p.close();
}

// 2. RUN HISTORY records runs honestly (this session)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.click('[data-testid="nav-history"]');
  const rows = await p.$$eval('[data-testid="hist-body"] tr', trs => trs.map(t => t.innerText));
  ok(rows.length >= 2, 'history: records this session runs (' + rows.length + ')');
  ok(rows.every(r => !/\bSHIP\b(?!\/)/.test(r.replace(/never SHIP/g,'')) ), 'history: no SHIP decision');
  ok(rows.some(r => /30\/30/.test(r)), 'history: shows real test results');
  await shot(p, 'lpl_03_history.png');
  // reload clears history (nothing persisted as proof)
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-history"]');
  ok(/No runs yet/.test(await T(p,'[data-testid="hist-body"]')), 'history: cleared on reload (not faked/persisted)');
  await p.close();
}

// 3. LOCAL DECISION LEDGER: safe local statuses only; no real-world action
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-decisions"]');
  ok(await p.isDisabled('[data-testid="dec-continue"]'), 'ledger: real-world action buttons remain disabled');
  ok(/No real-world action is authorized/.test(await T(p,'[data-testid="dec-notice"]')), 'ledger: notice no real-world action');
  await p.click('[data-testid="led-continue"]');
  await p.click('[data-testid="led-hold"]');
  const led = await T(p,'[data-testid="dec-ledger"]');
  ok(/CONTINUE_DEMO/.test(led) && /HOLD/.test(led), 'ledger: records safe local statuses');
  ok(!/SHIP|MERGE|DEPLOY|BILL|SEND/.test(led.replace(/never SHIP\/MERGE\/DEPLOY\/BILL\/SEND/g,'')), 'ledger: no forbidden statuses recorded');
  await shot(p, 'lpl_04_ledger.png');
  await p.close();
}

// 4. PROTECTED FILES synthetic enforcement demo (no real fs)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-files"]');
  ok(/LOCAL_SYNTHETIC_ENFORCEMENT_DEMO/.test(await T(p,'[data-testid="panel-files"]')), 'pf: labeled LOCAL_SYNTHETIC_ENFORCEMENT_DEMO (not production)');
  await p.fill('[data-testid="pf-input"]', 'demo/notes/todo.txt'); await p.click('[data-testid="pf-check-btn"]');
  ok(/ALLOWED/.test(await T(p,'[data-testid="pf-result"]')), 'pf: safe sample name -> ALLOWED');
  await p.fill('[data-testid="pf-input"]', 'customer/production/secrets.env'); await p.click('[data-testid="pf-check-btn"]');
  ok(/BLOCKED/.test(await T(p,'[data-testid="pf-result"]')), 'pf: unsafe synthetic name -> BLOCKED for safety');
  await p.fill('[data-testid="pf-input"]', 'random/unknown/file.bin'); await p.click('[data-testid="pf-check-btn"]');
  ok(/HOLD/.test(await T(p,'[data-testid="pf-result"]')), 'pf: unknown name -> HOLD (not on allowlist)');
  await shot(p, 'lpl_05_protected_files_demo.png');
  await p.close();
}

// 5. accessibility across all panels (incl. new ones)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','history','decisions','guide','files','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all 9 panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} local-product-loop checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
