// Wave 8 E2E: Real Repo Proof panel (public self-owned multi-repo results, founder-safe, read-only).
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
const npage = async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. Real Repo Proof panel loads real multi-repo results
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-realrepo"]'); await p.click('[data-testid="realrepo-btn"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="realrepo-body"] tr').length >= 5, null, { timeout: 10000 });
  const body = await T(p, '[data-testid="realrepo-body"]');
  ok(/task-ledger-demo[\s\S]*PASS 30\/30/.test(body) || (body.includes('task-ledger-demo') && body.includes('PASS 30/30')), 'realrepo: baseline task-ledger-demo PASS 30/30');
  ok(/task-ledger-demo-reviewer-proof/.test(body) && body.includes('PASS 30/30'), 'realrepo: cross-account reviewer-proof PASS 30/30');
  ok(/akior-health-check/.test(body) && /python/.test(body), 'realrepo: python repo proven');
  ok(/NO_TESTS_FOUND/.test(body), 'realrepo: dependency/no-test repos honestly NO_TESTS_FOUND (not run)');
  ok(!/[0-9a-f]{40}/.test(body), 'realrepo: no full 40-hex SHA in founder view (short builds only)');
  ok(/read-only.*no install.*no private data|no install/i.test(await T(p,'[data-testid="realrepo-note"]')), 'realrepo: honest no-install / no-private-data note');
  await shot(p, 'w8_01_real_repo_proof.png');
  await p.close();
}

// 2. accessibility across panels (incl. realrepo)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','realrepo','doctor','livegate','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave8 multirepo checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
