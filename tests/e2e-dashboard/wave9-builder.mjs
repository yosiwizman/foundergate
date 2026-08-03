// Wave 9 E2E: generated local app preview (add/complete/filter/reject-empty) + Idea Builder panel
// (classify safe idea + refuse unsafe ideas) + build-status load. Real backend serves static files.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const APP = `${BASE}/tests/generated_apps/wave9_appointment_task_planner/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const npage = async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, s) => p.textContent(s);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });

// 1. GENERATED APP PREVIEW — real behavior
{
  const p = await npage(); await p.goto(APP, { waitUntil: 'domcontentloaded' });
  ok(/LOCAL SYNTHETIC DEMO/.test(await T(p,'[data-testid="app-banner"]')), 'app: local synthetic banner');
  ok(/no real calendar|no account|no deploy/i.test(await T(p,'[data-testid="app-banner"]')), 'app: no calendar/account/deploy labels');
  await shot(p, 'w9_01_app_initial.png');
  await p.fill('[data-testid="title"]', 'Dentist appointment'); await p.fill('[data-testid="when"]', 'Mon 09:00'); await p.click('[data-testid="add"]');
  ok(/Dentist appointment/.test(await T(p,'[data-testid="list"]')), 'app: add item appears in list');
  await p.fill('[data-testid="title"]', 'Buy groceries'); await p.click('[data-testid="add"]');
  ok((await p.$$('[data-testid="list"] li')).length >= 2, 'app: second item added');
  await p.click('[data-testid="list"] li [data-complete]');   // complete first
  ok((await p.$$('[data-testid="list"] li.done')).length >= 1, 'app: complete marks item done');
  await p.selectOption('[data-testid="filter"]', 'completed');
  ok((await p.$$('[data-testid="list"] li.done')).length >= 1, 'app: filter completed shows done item');
  await p.selectOption('[data-testid="filter"]', 'active');
  ok((await p.$$('[data-testid="list"] li.done')).length === 0, 'app: filter active hides completed (0 done shown)');
  // reject empty
  await p.selectOption('[data-testid="filter"]', 'all');
  const before = (await p.$$('[data-testid="list"] li')).length;
  await p.fill('[data-testid="title"]', '   '); await p.click('[data-testid="add"]');
  ok((await p.$$('[data-testid="list"] li')).length === before, 'app: empty item rejected (no new row)');
  await shot(p, 'w9_02_app_used.png');
  await p.close();
}

// 2. IDEA BUILDER panel: classify safe + refuse unsafe + load build status
{
  const p = await npage(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-idea"]');
  await p.click('[data-testid="idea-classify-btn"]');
  ok(/SAFE_LOCAL_SYNTHETIC/.test(await T(p,'[data-testid="idea-class"]')), 'idea: default idea classified SAFE_LOCAL_SYNTHETIC');
  for (const [text, want] of [
    ['deploy this app to production','HOLD_PROTECTED_GATE'],
    ['connect my Google Calendar and sync events','REFUSED_NEEDS_AUTHORIZATION'],
    ['email customers about their appointments','REFUSED_NEEDS_AUTHORIZATION'],
    ['charge users a monthly subscription','REFUSED_NEEDS_AUTHORIZATION'],
    ['use production data from real users','REFUSED_NEEDS_AUTHORIZATION'],
    ['merge this to main','HOLD_PROTECTED_GATE'],
    ['edit PR #200','HOLD_PROTECTED_GATE'],
    ['claim it is SOC2 secure and SaaS ready','REFUSED_NEEDS_AUTHORIZATION'],
  ]) {
    await p.fill('[data-testid="idea-input"]', text);
    await p.waitForFunction(w => document.querySelector('[data-testid="idea-class"]').textContent.includes(w), want, { timeout: 5000 });
    ok((await T(p,'[data-testid="idea-class"]')).includes(want), `idea-refusal: "${text.slice(0,28)}…" -> ${want}`);
  }
  await p.click('[data-testid="idea-load-btn"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="idea-body"] tr').length >= 5, null, { timeout: 8000 });
  const body = await T(p,'[data-testid="idea-body"]');
  ok(/PASS 13\/13/.test(body), 'idea: build status shows generated tests PASS 13/13');
  ok(/AVAILABLE|local synthetic/i.test(body), 'idea: preview available');
  ok(!!(await p.getAttribute('[data-testid="idea-preview-link"]','href')), 'idea: preview link present');
  await shot(p, 'w9_03_idea_builder.png');
  await p.close();
}

// 3. accessibility across panels (incl idea)
{
  const p = await npage(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','idea','realrepo','doctor','livegate','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave9 builder checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
