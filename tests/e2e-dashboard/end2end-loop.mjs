// End-to-end local operator loop E2E: intake → safety classification → governed run → evidence,
// plus refusal/hold paths. Real backend for the green paths; unsafe cases are refused client-side.
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
const npage = async () => { const p = await b.newPage(); await p.setViewportSize({ width: 1360, height: 1100 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
const T = (p, sel) => p.textContent(sel);

// 1. DEFAULT safe source + default objective -> READY -> run passes -> export works
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /READY_LOCAL_DEMO/.test(document.querySelector('[data-testid="cls-elig"]').textContent), null, { timeout: 8000 });
  ok(/SAFE_LOCAL_DEMO/.test(await T(p,'[data-testid="cls-src"]')), 'intake: default source classified SAFE_LOCAL_DEMO');
  ok(/SAFE/.test(await T(p,'[data-testid="cls-obj"]')), 'intake: default objective classified SAFE');
  ok(/READY_LOCAL_DEMO/.test(await T(p,'[data-testid="cls-elig"]')), 'intake: eligibility READY_LOCAL_DEMO');
  ok(!(await p.isDisabled('[data-testid="run-btn"]')), 'intake: Run enabled when eligible');
  await shot(p, 'loop_01_intake_ready.png');
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  ok(/30\/30/.test(await T(p,'[data-testid="chip-tests"]')), 'default run: tests 30/30');
  ok(/INTERNAL_DEMO_ONLY/.test(await T(p,'[data-testid="chip-decision"]')) && /never SHIP/i.test(await T(p,'[data-testid="chip-decision"]')), 'default run: INTERNAL_DEMO_ONLY never SHIP');
  await shot(p, 'loop_02_run_complete.png');
  await p.click('[data-testid="nav-evidence"]');
  await p.click('[data-testid="export-btn2"]');
  await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  const rec = await T(p,'[data-testid="evi-receipt"]');
  ok(/Source:/.test(rec) && /Objective:/.test(rec) && /Safety classification:/.test(rec) && /What was NOT proven/.test(rec), 'evidence: receipt includes source/objective/classification/limitations');
  await shot(p, 'loop_03_evidence_sealed.png');
  await p.close();
}

// 2. CUSTOM SAFE objective -> still READY -> run passes
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.fill('[data-testid="obj-inp"]', 'Improve error handling and prove tests pass');
  await p.waitForFunction(() => /READY_LOCAL_DEMO/.test(document.querySelector('[data-testid="cls-elig"]').textContent), null, { timeout: 8000 });
  ok(/READY_LOCAL_DEMO/.test(await T(p,'[data-testid="cls-elig"]')), 'custom-safe-objective: eligible');
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  ok(/30\/30/.test(await T(p,'[data-testid="chip-tests"]')), 'custom-safe-objective: run passes');
  await p.close();
}

// 3. UNSAFE objective -> REFUSED, Run disabled
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.fill('[data-testid="obj-inp"]', 'deploy to production and bill the customer');
  await p.waitForFunction(() => /REFUSED/.test(document.querySelector('[data-testid="cls-obj"]').textContent), null, { timeout: 8000 });
  ok(/REFUSED/.test(await T(p,'[data-testid="cls-obj"]')), 'unsafe-objective: objective REFUSED');
  ok(/REFUSED/.test(await T(p,'[data-testid="cls-elig"]')), 'unsafe-objective: eligibility REFUSED');
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'unsafe-objective: Run disabled');
  await shot(p, 'loop_04_unsafe_objective_refused.png');
  await p.close();
}

// 4. UNKNOWN / private / customer / production source -> REFUSED/HOLD, Run disabled
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.selectOption('[data-testid="src-sel"]', 'unknown');
  await p.waitForFunction(() => /REFUSED|HOLD/.test(document.querySelector('[data-testid="cls-src"]').textContent), null, { timeout: 8000 });
  ok(/REFUSED|HOLD/.test(await T(p,'[data-testid="cls-src"]')), 'unknown-source: source REFUSED/HOLD');
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'unknown-source: Run disabled');
  await shot(p, 'loop_05_unknown_source_refused.png');
  await p.close();
}

// 5. CUSTOM PATH: safe demo path -> READY ; unsafe path -> HOLD
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.fill('[data-testid="src-path"]', 'publish_candidates/self_owned_demo_repo/tests/task-ledger.selftest.mjs');
  await p.waitForFunction(() => /SAFE_LOCAL_DEMO/.test(document.querySelector('[data-testid="cls-src"]').textContent), null, { timeout: 8000 });
  ok(/SAFE_LOCAL_DEMO/.test(await T(p,'[data-testid="cls-src"]')), 'custom-path-safe: classified SAFE_LOCAL_DEMO');
  await p.fill('[data-testid="src-path"]', '/Users/someone/customer/production_secrets.env');
  await p.waitForFunction(() => /HOLD/.test(document.querySelector('[data-testid="cls-src"]').textContent), null, { timeout: 8000 });
  ok(/HOLD/.test(await T(p,'[data-testid="cls-src"]')), 'custom-path-unsafe: HOLD_NEEDS_AUTHORIZATION');
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'custom-path-unsafe: Run disabled');
  await p.close();
}

// 6. EXPORT before run blocked
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-evidence"]');
  ok(await p.isDisabled('[data-testid="export-btn2"]'), 'export-before-run: disabled');
  await p.close();
}

// 7. REPEATED runs + repeated exports stable
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /READY_LOCAL_DEMO/.test(document.querySelector('[data-testid="cls-elig"]').textContent), null, { timeout: 8000 });
  let green = true, sealed = true;
  for (let i = 0; i < 3; i++) {
    await p.click('[data-testid="nav-truth"]'); await p.click('[data-testid="run-btn"]'); await waitTests(p);
    if (!/30\/30/.test(await T(p,'[data-testid="chip-tests"]'))) green = false;
    await p.click('[data-testid="nav-evidence"]'); await p.click('[data-testid="export-btn2"]');
    await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 }).catch(()=>{ sealed=false; });
  }
  ok(green, 'repeat: 3 runs each 30/30 (stable)');
  ok(sealed, 'repeat: 3 exports each SEALED (stable, no cross-run stale)');
  await p.close();
}

// 8. RELOAD does not fake green
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'reload: tests UNKNOWN (no fake prior green)');
  await p.close();
}

// 9. Panels consistent: Decisions view-only, Files display-only, Ask Guide static, no SHA/logs
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-decisions"]');
  ok(await p.isDisabled('[data-testid="dec-continue"]') && await p.isDisabled('[data-testid="dec-stop"]'), 'panels: Decisions view-only (disabled)');
  await p.click('[data-testid="nav-files"]');
  ok(/DISPLAY_ONLY|LOCAL_SYNTHETIC_ENFORCEMENT_DEMO/.test(await T(p,'[data-testid="panel-files"]')), 'panels: Files DISPLAY_ONLY');
  await p.click('[data-testid="nav-guide"]');
  ok(/What is live/.test(await T(p,'[data-testid="panel-guide"]')), 'panels: Ask Guide static');
  const founderText = await p.evaluate(() => ['truth','preview','evidence','decisions','guide','files'].map(n => document.getElementById('panel-'+n).innerText).join('\n'));
  ok(!/[0-9a-f]{40}/.test(founderText), 'panels: no full 40-hex SHA in founder view');
  ok(!/npm ERR!|node:internal|Traceback|\n\s+at /.test(founderText), 'panels: no raw-log markers');
  await p.close();
}

// 10. accessibility across panels
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','evidence','decisions','guide','files','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} end-to-end loop checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
