// Wave 11 E2E: Safety Check report viewer (3 samples) + dashboard Safety Check panel (display-only).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const VIEWER = `${BASE}/tests/sample_reports/safety_check_report_viewer/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const npage = async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1300 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, s) => p.textContent(s);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. REPORT VIEWER — three samples render correct verdicts
{
  const p = await npage(); await p.goto(VIEWER, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => /PASS_WITH_LIMITS/.test(document.querySelector('[data-testid="verdict"]').textContent), null, { timeout: 8000 });
  ok(/SAMPLE|SYNTHETIC/i.test(await T(p,'[data-testid="viewer-banner"]')), 'viewer: SAMPLE/SYNTHETIC banner');
  ok(/PASS_WITH_LIMITS/.test(await T(p,'[data-testid="verdict"]')) && /CONTINUE_LOCAL_ONLY/.test(await T(p,'[data-testid="owner-decision"]')), 'viewer: safe sample PASS_WITH_LIMITS / CONTINUE_LOCAL_ONLY');
  await shot(p, 'w11_02_viewer_safe.png');
  await p.click('[data-testid="tab-risky"]');
  await p.waitForFunction(() => /REPAIR|HOLD/.test(document.querySelector('[data-testid="verdict"]').textContent), null, { timeout: 8000 });
  ok(/REPAIR|HOLD/.test(await T(p,'[data-testid="verdict"]')) && /REPAIR_BEFORE_SHOWING/.test(await T(p,'[data-testid="owner-decision"]')), 'viewer: risky sample REPAIR / REPAIR_BEFORE_SHOWING');
  await shot(p, 'w11_03_viewer_risky.png');
  await p.click('[data-testid="tab-blocked"]');
  await p.waitForFunction(() => /REFUSED/.test(document.querySelector('[data-testid="verdict"]').textContent), null, { timeout: 8000 });
  ok(/REFUSED/.test(await T(p,'[data-testid="verdict"]')) && /STOP_NEEDS_FOUNDER_GATE/.test(await T(p,'[data-testid="owner-decision"]')), 'viewer: blocked sample REFUSED / STOP_NEEDS_FOUNDER_GATE');
  ok(/not production readiness|not a security certification/i.test(await T(p,'[data-testid="viewer-disclaimer"]')), 'viewer: disclaimer (not production / not security cert)');
  const body = await p.evaluate(() => document.body.innerText);
  ok(!/[0-9a-f]{40}/.test(body), 'viewer: no full 40-hex SHA');
  await shot(p, 'w11_04_viewer_blocked.png');
  await p.close();
}

// 2. DASHBOARD SAFETY CHECK PANEL — display-only
{
  const p = await npage(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-safety"]');
  ok(await p.isVisible('[data-testid="panel-safety"]'), 'panel: Safety Check panel visible');
  ok(/SAMPLE KIT ONLY/.test(await T(p,'[data-testid="safety-status"]')), 'panel: status SAMPLE KIT ONLY (not sold)');
  const samples = await T(p,'[data-testid="safety-samples"]');
  ok(/PASS_WITH_LIMITS/.test(samples) && /REPAIR/.test(samples) && /REFUSED/.test(samples), 'panel: three sample verdicts shown');
  // only actionable control is a LOCAL viewer link; no payment/deploy/outreach controls
  const btns = await p.$$('[data-testid="panel-safety"] button');
  ok(btns.length === 0, 'panel: no buttons (no payment/deploy/outreach controls)');
  const links = await p.$$eval('[data-testid="panel-safety"] a', els => els.map(e => e.getAttribute('href')));
  ok(links.length === 1 && /safety_check_report_viewer/.test(links[0]) && !/^https?:\/\//.test(links[0]), 'panel: only a LOCAL viewer link (no external/action links)');
  ok(/no outreach|no payment|no deploy|no customer data/i.test(await T(p,'[data-testid="safety-note"]')), 'panel: honest no-sell/no-deploy note');
  await shot(p, 'w11_01_dashboard_panel.png');
  await p.close();
}

// 3. Roadmap panel still intact + a11y across panels (incl safety)
{
  const p = await npage(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-roadmap"]'); ok(await p.isVisible('[data-testid="panel-roadmap"]'), 'roadmap panel still intact');
  await p.click('[data-testid="nav-truth"]'); await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','idea','realrepo','doctor','livegate','roadmap','safety','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave11 safety-check checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
