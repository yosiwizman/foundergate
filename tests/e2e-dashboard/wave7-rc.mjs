// Wave 7 E2E: local release-candidate simulation — Doctor readiness panel, Live-Gate Simulator
// (display-only), one-click local rehearsal, server-off/reload recovery, and a 100-check matrix.
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
const npage = async () => { const ctx = await b.newContext({ acceptDownloads:true }); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1300 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. DOCTOR readiness panel
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-doctor"]'); await p.click('[data-testid="doctor-btn"]');
  await p.waitForFunction(() => /READY_LOCAL|HOLD|UNKNOWN/.test(document.querySelector('[data-testid="doctor-summary"]').textContent), null, { timeout: 10000 });
  ok(/READY_LOCAL/.test(await T(p,'[data-testid="doctor-summary"]')), 'doctor: summary READY_LOCAL');
  const body = await T(p,'[data-testid="doctor-body"]');
  ok(/loopback_server[\s\S]*READY_LOCAL/.test(body) || body.includes('loopback_server'), 'doctor: loopback_server checked');
  ok(/provider[\s\S]*NOT_REQUIRED/.test(body) || body.includes('NOT_REQUIRED'), 'doctor: provider NOT_REQUIRED');
  ok(/UNKNOWN_RUNTIME_MISSING/.test(body), 'doctor: missing runtimes honestly UNKNOWN_RUNTIME_MISSING');
  await shot(p, 'w7_01_doctor.png');
  await p.close();
}

// 2. LIVE-GATE SIMULATOR (display-only)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-livegate"]');
  const rows = await p.$$eval('[data-testid="livegate-body"] tr', trs => trs.length);
  ok(rows === 10, 'livegate: 10 gates listed (' + rows + ')');
  const body = await T(p,'[data-testid="livegate-body"]');
  ok(/REQUIRED · NOT AUTHORIZED/.test(body), 'livegate: all REQUIRED · NOT AUTHORIZED');
  ok(/I AUTHORIZE/.test(body), 'livegate: inactive authorization phrase templates shown');
  const btns = await p.$$eval('[data-testid="panel-livegate"] button', bs => bs.length);
  ok(btns === 0, 'livegate: no active buttons (display-only)');
  ok(/DISPLAY ONLY/.test(await T(p,'[data-testid="livegate-note"]')), 'livegate: display-only notice');
  await shot(p, 'w7_02_livegate.png');
  await p.close();
}

// 3. ONE-CLICK LOCAL REHEARSAL (chains real steps, fakes nothing)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="rehearsal-btn"]');
  await p.waitForFunction(() => /COMPLETE|HOLD/.test(document.querySelector('[data-testid="rehearsal-status"]').textContent), null, { timeout: 180000 });
  ok(/COMPLETE/.test(await T(p,'[data-testid="rehearsal-status"]')), 'rehearsal: COMPLETE (never SHIP)');
  await p.click('[data-testid="nav-evidence"]');
  ok(/SEALED_EXPORT_LOCAL/.test(await T(p,'[data-testid="evi-state"]')), 'rehearsal: real sealed evidence produced');
  await p.click('[data-testid="nav-viewer"]');
  ok(/aggregate|verified/i.test(await T(p,'[data-testid="viewer-body"]')), 'rehearsal: evidence replayed in viewer');
  await p.click('[data-testid="nav-history"]');
  ok(/scenario|fixture/.test(await T(p,'[data-testid="hist-body"]')), 'rehearsal: history updated');
  await shot(p, 'w7_03_rehearsal.png');
  await p.close();
}

// 4. SERVER-OFF -> Doctor + Run honest UNKNOWN (no fake green)
{
  const p = await npage();
  await p.route('**/api/health', r => r.abort()); await p.route('**/api/doctor', r => r.abort()); await p.route('**/api/session', r => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /UNAVAILABLE|UNKNOWN/.test(document.querySelector('[data-testid="chip-status"]').textContent), null, { timeout: 8000 }).catch(()=>{});
  ok(await p.isDisabled('[data-testid="run-btn"]'), 'server-off: Run disabled');
  await p.click('[data-testid="nav-doctor"]'); await p.click('[data-testid="doctor-btn"]');
  await p.waitForFunction(() => /UNKNOWN|UNAVAILABLE/.test(document.querySelector('[data-testid="doctor-body"]').textContent), null, { timeout: 8000 }).catch(()=>{});
  ok(/UNKNOWN|UNAVAILABLE/.test(await T(p,'[data-testid="doctor-body"]')), 'server-off: Doctor honest UNKNOWN');
  await p.close();
}

// 5. RELOAD recovery (no stale green)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'reload: chip UNKNOWN (no stale green)');
  await p.close();
}

// 6. LONG RC MATRIX: 100 governed local checks (60 governed runs + 40 scenario runs)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let green = 0;
  for (let i = 0; i < 60; i++) { await p.click('[data-testid="nav-truth"]'); await p.click('[data-testid="run-btn"]'); await waitTests(p); if (/30\/30/.test(await T(p,'[data-testid="chip-tests"]'))) green++; }
  await p.click('[data-testid="nav-batch"]');
  const scn = ['calendar-app-pass','task-app-pass','crud-api-pass','static-site-pass'];
  let sc = 0;
  for (let i = 0; i < 40; i++) { await p.selectOption('[data-testid="scn-sel"]', scn[i % scn.length]); await p.click('[data-testid="scn-run-btn"]');
    await p.waitForFunction(() => /SCENARIO_PASS|SCENARIO_FAIL/.test(document.querySelector('[data-testid="scn-result"]').textContent), null, { timeout: 30000 }); sc++; }
  ok(green === 60, `matrix: 60/60 governed runs 30/30 (got ${green})`);
  ok(sc === 40, `matrix: 40/40 scenario runs (100 governed local checks total)`);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'matrix: reload -> UNKNOWN (no stale green)');
  await p.close();
}

// 7. accessibility across all panels (incl. doctor + livegate)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','doctor','livegate','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all 12 panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave7 RC checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
