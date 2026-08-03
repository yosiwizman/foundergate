// Founder Drive Mode + Reviewer Readiness UI test (assertions + a11y + regression + no-overclaim/no-danger).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const PORT = process.env.OP_PORT || 4880;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const T = (p, s) => p.textContent(s);
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1360, height: 1300 });
await p.goto(DASH, { waitUntil: 'domcontentloaded' });

// ---- Founder Drive Mode ----
await p.click('[data-testid="nav-drive"]');
await p.click('[data-testid="drive-refresh-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
const labels = await T(p, '[data-testid="drive-labels"]');
for (const req of ['LOCAL SYNTHETIC ONLY', 'NOT PRODUCTION', 'NOT SAAS READY', 'NOT CUSTOMER READY', 'NOT SECURITY CERTIFIED', 'GATE 8 BLOCKED', 'DECISION NEVER SHIP'])
  ok(labels.includes(req), `drive label present: ${req}`);
ok((await p.$$('[data-testid="drive-cards"] .fg-card')).length >= 8, 'drive: >=8 status cards');
const nextTxt = await T(p, '[data-testid="drive-next"]');
ok(!/\bship\b/i.test(nextTxt), 'drive: "what next" never says ship');
ok(/blocked/i.test(await T(p, '[data-testid="drive-blocked"]')) || (await T(p, '[data-testid="drive-blocked"]')).length > 3, 'drive: blocked list shown');
ok(/broke 12 things/i.test(await T(p, '[data-testid="drive-crash-summary"]')), 'drive: founder-friendly crash summary present');
// technical view link exists and works (preserves technical panels)
await p.click('[data-testid="drive-tech-btn"]');
ok(await p.isVisible('[data-testid="panel-truth"]'), 'drive: Technical view opens the Truth Dashboard (evidence preserved)');

// ---- Reviewer Readiness ----
await p.click('[data-testid="nav-reviewer"]');
await p.click('[data-testid="reviewer-load-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="reviewer-timeline"] tr').length >= 4, null, { timeout: 8000 });
ok((await p.$$('[data-testid="reviewer-timeline"] tr')).length >= 4, 'reviewer: proof timeline >=4 steps');
ok((await p.$$('[data-testid="reviewer-evidence"] tr')).length >= 5, 'reviewer: evidence index >=5 items');
ok(/Round 1/.test(await T(p, '[data-testid="reviewer-evidence"]')) && /Crash Recovery/.test(await T(p, '[data-testid="reviewer-evidence"]')), 'reviewer: evidence lists Round1..Crash');
ok(/Gate 8 and is NOT authorized/i.test(await T(p, '[data-testid="reviewer-gate8"]')), 'reviewer: Gate 8 explicitly NOT authorized');
ok(/false-green/i.test(await T(p, '[data-testid="reviewer-false-green"]')), 'reviewer: false-green history preserved (not hidden)');

// ---- no overclaim / no dangerous actions in the two new panels ----
for (const panel of ['#panel-drive', '#panel-reviewer']) {
  const txt = await p.textContent(panel);
  // strip negated/disclaimer clauses (NOT ... / not ...) before checking for POSITIVE readiness claims
  const clean = txt.replace(/\bnot\b[^.,;\n]*/gi, ' ').replace(/BLOCKED|NOT READY|NOT STARTED/gi, ' ');
  ok(!/\b(production|saas|customer)[ -]?ready\b|commercially (ready|validated)|security certified/i.test(clean), `${panel}: no positive readiness overclaim`);
  const links = await p.$$eval(`${panel} a`, els => els.map(e => e.getAttribute('href') || ''));
  ok(links.every(h => !/^https?:\/\//.test(h)), `${panel}: no external links`);
  const danger = await p.$$eval(`${panel} button, ${panel} a`, els => els.map(e => (e.textContent || '').toLowerCase()).join('|'));
  ok(!/deploy|bill|payment|checkout|buy now|outreach|send email|merge|pr #200/.test(danger), `${panel}: no deploy/bill/outreach/merge controls`);
}

// ---- regression: factory / round2 / crash panels still load ----
await p.click('[data-testid="nav-factory"]'); await p.click('[data-testid="factory-load-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="factory-body"] tr[data-app]').length >= 4, null, { timeout: 8000 });
ok(true, 'regression: Factory Proof panel still loads (>=4 apps)');
await p.click('[data-testid="nav-factory2"]'); await p.click('[data-testid="factory2-load-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="factory2-body"] tr[data-app]').length >= 4, null, { timeout: 8000 });
ok(true, 'regression: Factory Round 2 panel still loads');
await p.click('[data-testid="nav-crash"]'); await p.click('[data-testid="crash-load-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="crash-body"] tr[data-fixture]').length >= 5, null, { timeout: 8000 });
ok(true, 'regression: Crash Test panel still loads');

// ---- a11y on the two new panels ----
await p.addScriptTag({ content: AXE });
let serious = 0; const ids = new Set();
for (const n of ['drive', 'reviewer']) {
  await p.click(`[data-testid="nav-${n}"]`);
  const res = await p.evaluate(async () => await window.axe.run(document.querySelector('.panel.on'), { runOnly: ['wcag2a', 'wcag2aa'] }));
  for (const v of res.violations) if (v.impact === 'serious' || v.impact === 'critical') { serious += v.nodes.length; ids.add(v.id); }
}
ok(serious === 0, 'a11y: 0 serious/critical on drive+reviewer :: ' + JSON.stringify([...ids]));

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} drive/reviewer UI checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
