// Wave 3 hardening E2E: exercises real-world local failure modes and proves honest behavior.
// Real backend stays up; failures are simulated per-page via route interception (non-destructive).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const URL = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
const JSONH = { status: 200, contentType: 'application/json' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };

const b = await chromium.launch({ headless: true });
const npage = async () => { const p = await b.newPage(); await p.setViewportSize({ width: 1360, height: 1000 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// ---------- 1. NORMAL: run + export (real backend) ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await shot(p, 'w3_01_before_run.png');
  ok(!(await p.isDisabled('[data-testid="run-btn"]')), 'normal: Run enabled when backend healthy');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'normal: Export disabled before run');
  await p.click('[data-testid="run-btn"]'); await shot(p, 'w3_02_running.png');
  await waitTests(p);
  ok(/30\/30/.test(await p.textContent('[data-testid="chip-tests"]')), 'normal: tests 30/30 after real run');
  ok(/INTERNAL_DEMO_ONLY/.test(await p.textContent('[data-testid="chip-decision"]')) && /never SHIP/i.test(await p.textContent('[data-testid="chip-decision"]')), 'normal: decision INTERNAL_DEMO_ONLY never SHIP');
  await shot(p, 'w3_03_complete.png');
  await p.click('[data-testid="nav-evidence"]');
  await p.click('[data-testid="export-btn2"]');
  await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  ok(/SEALED_EXPORT_LOCAL/.test(await p.textContent('[data-testid="chip-evidence"]')), 'normal: real SEALED_EXPORT_LOCAL after export');
  await shot(p, 'w3_04_export_complete.png');
  await p.close();
}

// ---------- 2. SERVER OFF -> UNKNOWN, Run disabled, no fake green ----------
{
  const p = await npage();
  await p.route('**/api/health', r => r.abort());
  await p.route('**/api/session', r => r.abort());
  await p.route('**/api/start', r => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /UNAVAILABLE|UNKNOWN/.test(document.querySelector('[data-testid="chip-status"]').textContent), null, { timeout: 8000 }).catch(()=>{});
  ok(/UNAVAILABLE|UNKNOWN/.test(await p.textContent('[data-testid="chip-status"]')), 'server-off: backend UNAVAILABLE (UNKNOWN)');
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'server-off: Run disabled');
  ok(/UNKNOWN/.test(await p.textContent('[data-testid="chip-tests"]')), 'server-off: tests UNKNOWN (no fake green)');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'server-off: Export disabled');
  await shot(p, 'w3_05_server_unavailable_unknown.png');
  await p.close();
}

// ---------- 3. EXPORT BEFORE RUN -> disabled / UNKNOWN ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-evidence"]');
  ok(await p.isDisabled('[data-testid="export-btn2"]'), 'export-before-run: Evidence export disabled');
  ok(/UNKNOWN/.test(await p.textContent('[data-testid="evi-state"]')), 'export-before-run: Evidence UNKNOWN');
  await shot(p, 'w3_06_export_before_run.png');
  await p.close();
}

// ---------- 4. RUN FAILURE (ERROR) -> HOLD/ERROR, export stays disabled, decision UNKNOWN ----------
{
  const p = await npage();
  await p.route('**/api/start', r => r.fulfill({ ...JSONH, body: JSON.stringify({ status: 'ERROR', reason: 'run failed' }) }));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]');
  await p.waitForFunction(() => /ERROR/.test(document.querySelector('[data-testid="alive-text"]').textContent), null, { timeout: 15000 });
  ok(/ERROR/.test(await p.textContent('[data-testid="alive-text"]')), 'run-failure: shows ERROR');
  ok(/UNKNOWN/.test(await p.textContent('[data-testid="chip-decision"]')), 'run-failure: decision stays UNKNOWN');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'run-failure: Export stays disabled');
  await shot(p, 'w3_07_run_failure_hold.png');
  await p.close();
}

// ---------- 5. RUN REFUSED -> HOLD ----------
{
  const p = await npage();
  await p.route('**/api/start', r => r.fulfill({ ...JSONH, body: JSON.stringify({ status: 'REFUSED', reason: 'target not in allowlist' }) }));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]');
  await p.waitForFunction(() => /HOLD|REFUSED/.test(document.querySelector('[data-testid="alive-text"]').textContent), null, { timeout: 15000 });
  ok(/HOLD|REFUSED/.test(await p.textContent('[data-testid="alive-text"]')), 'run-refused: shows HOLD/REFUSED');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'run-refused: Export stays disabled');
  await p.close();
}

// ---------- 6. RUN TIMEOUT -> HOLD (safe stop) ----------
{
  const p = await npage();
  await p.addInitScript(() => { window.__FG_RUN_TIMEOUT_MS = 400; });
  await p.route('**/api/start', async r => { await new Promise(res => setTimeout(res, 3000)); r.fulfill({ ...JSONH, body: JSON.stringify({ status: 'complete', run: { tests: { result: '30/30' }, decision: 'INTERNAL_DEMO_ONLY', commit: 'x', commit_short: 'xxxxxxxxxxxx' } }) }); });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]');
  await p.waitForFunction(() => /timeout|too long/i.test(document.querySelector('[data-testid="alive-text"]').textContent), null, { timeout: 15000 });
  ok(/timeout|too long/i.test(await p.textContent('[data-testid="alive-text"]')), 'run-timeout: safe HOLD on timeout');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'run-timeout: Export stays disabled');
  await p.close();
}

// ---------- 7. EXPORT FAILURE -> EXPORT_FAILED, chip not SEALED ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);          // real run first
  await p.route('**/api/export', r => r.fulfill({ ...JSONH, body: JSON.stringify({ status: 'EXPORT_FAILED', reason: 'unzip -t failed' }) }));
  await p.click('[data-testid="nav-evidence"]');
  await p.click('[data-testid="export-btn2"]');
  await p.waitForFunction(() => /EXPORT_FAILED/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 15000 });
  ok(/EXPORT_FAILED/.test(await p.textContent('[data-testid="evi-state"]')), 'export-failure: shows EXPORT_FAILED (HOLD)');
  ok(!/SEALED_EXPORT_LOCAL/.test(await p.textContent('[data-testid="chip-evidence"]')), 'export-failure: chip NOT SEALED (no fake)');
  await p.close();
}

// ---------- 8. BROWSER RELOAD -> fresh UNKNOWN (no fake prior green) ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await p.textContent('[data-testid="chip-tests"]')), 'reload: tests UNKNOWN after reload (no faked prior green)');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'reload: Export disabled again after reload');
  await p.close();
}

// ---------- 9. STALE-GREEN GUARD: success then failing run resets to UNKNOWN ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);           // success -> 30/30
  await p.route('**/api/start', r => r.fulfill({ ...JSONH, body: JSON.stringify({ status: 'ERROR', reason: 'run failed' }) }));
  await p.click('[data-testid="run-btn"]');
  await p.waitForFunction(() => /ERROR/.test(document.querySelector('[data-testid="alive-text"]').textContent), null, { timeout: 15000 });
  ok(/UNKNOWN/.test(await p.textContent('[data-testid="chip-tests"]')), 'stale-green: prior 30/30 cleared to UNKNOWN on new failing run');
  ok(await p.isDisabled('[data-testid="export-btn"]'), 'stale-green: Export disabled after failing re-run');
  await p.close();
}

// ---------- 10. MULTI-RUN repeatability (5 real runs) ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let allGreen = true;
  for (let i = 0; i < 5; i++) {
    await p.click('[data-testid="run-btn"]'); await waitTests(p);
    if (!/30\/30/.test(await p.textContent('[data-testid="chip-tests"]'))) allGreen = false;
  }
  ok(allGreen, 'multi-run: 5 real runs each honest 30/30 (no deadlock, no false green)');
  await p.close();
}

// ---------- 11. NAVIGATION MISUSE + no-op decisions + display-only files ----------
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-preview"]');
  ok(/No result yet/.test(await p.textContent('[data-testid="preview-result"]')), 'misuse: Preview before run shows no result (honest)');
  await p.click('[data-testid="nav-decisions"]');
  ok(await p.isDisabled('[data-testid="dec-continue"]') && await p.isDisabled('[data-testid="dec-stop"]'), 'misuse: Decisions buttons remain no-op (disabled)');
  await shot(p, 'w3_08_decisions_view_only.png');
  await p.click('[data-testid="nav-files"]');
  ok(/DISPLAY_ONLY|LOCAL_SYNTHETIC_ENFORCEMENT_DEMO/.test(await p.textContent('[data-testid="panel-files"]')), 'misuse: Files remains DISPLAY_ONLY');
  await shot(p, 'w3_09_files_display_only.png');
  await p.click('[data-testid="nav-guide"]');
  ok(/What is live/.test(await p.textContent('[data-testid="panel-guide"]')), 'misuse: Ask Guide stays static');
  await shot(p, 'w3_10_ask_guide_static.png');
  // no raw logs / no full SHA across founder panels
  const founderText = await p.evaluate(() => ['truth','preview','evidence','decisions','guide','files'].map(n => document.getElementById('panel-'+n).innerText).join('\n'));
  ok(!/[0-9a-f]{40}/.test(founderText), 'misuse: no full 40-hex SHA in founder view');
  ok(!/npm ERR!|node:internal|Traceback|\n\s+at /.test(founderText), 'misuse: no raw-log markers in founder view');
  await p.close();
}

// ---------- 12. accessibility regression: axe 0 serious/critical across panels ----------
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
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave3 hardening checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
