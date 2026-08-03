// E2E: natural-language task_planner matcher correction (founder-blind gap "to do app").
// Proves on the LIVE UI that founder-natural task/list wording binds to task_planner (real 13/13 + planner
// preview), unsafe real-integration wording stays HELD/REFUSED, calculator still binds to calculator, and
// unrelated ideas stay UNSUPPORTED — with no false-green anywhere.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const np = async () => { const c = await b.newContext(); const p = await c.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const T = (p, s) => p.textContent(s);
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });

async function run(p, text) {
  await p.click('[data-testid="nav-idea"]');
  await p.fill('[data-testid="idea-input"]', text);
  await p.click('[data-testid="idea-classify-btn"]');
  await p.click('[data-testid="idea-load-btn"]');
  await p.waitForFunction(() => !/Loading bound build/.test(document.querySelector('[data-testid="idea-body"]').textContent), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(250);
}

// 1. "build to do app" → task_planner, PASS 13/13, preview → planner  (THE regression)
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await run(p, 'build to do app');
  ok(/Supported local template selected: task_planner/.test(await T(p, '[data-testid="idea-class"]')),
    'FOUNDER_BLIND_REGRESSION_TO_DO_APP_MUST_BIND_TO_TASK_PLANNER (UI)');
  ok(/PASS 13\/13/.test(await T(p, '[data-testid="idea-body"]')), '"to do app": PASS 13/13 (bound task planner)');
  const href = await p.getAttribute('[data-testid="idea-preview-link"]', 'href');
  ok(/wave9_appointment_task_planner/.test(href), '"to do app": preview bound to task planner (from manifest)');
  await shot(p, 'to_do_app_status_bound_to_task_planner.png');
  const p2 = await np(); await p2.goto(new URL(href, DASH).href, { waitUntil: 'domcontentloaded' });
  ok(/Appointment \/ Task Planner/.test(await T(p2, 'h1')), '"to do app": preview opens the Task Planner');
  await shot(p2, 'to_do_app_preview_task_planner.png');
  await p2.close(); await p.close();
}
// 2. unsafe real reminders + Google Calendar → HELD/REFUSED (no build, no preview)
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await run(p, 'build a real reminders app connected to Google Calendar');
  const cls = await T(p, '[data-testid="idea-class"]');
  ok(/UNSUPPORTED_LOCAL_TEMPLATE|HELD_REQUIRES_FOUNDER_GATE/.test(cls) && !/task_planner/.test(cls),
    'unsafe real reminders + calendar → held/refused (not task_planner)');
  const body = await T(p, '[data-testid="idea-body"]');
  ok(!/PASS \d+\/\d+/.test(body) && !/\bDONE\b/.test(body), 'unsafe reminders: no DONE/PASS');
  ok((await p.getAttribute('[data-testid="idea-preview-link"]', 'aria-disabled')) === 'true', 'unsafe reminders: preview disabled');
  await shot(p, 'unsafe_real_reminders_held.png');
  await p.close();
}
// 3. calculator still calculator
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await run(p, 'Build a simple calculator app.');
  ok(/Supported local template selected: calculator/.test(await T(p, '[data-testid="idea-class"]')), 'calculator still → calculator');
  ok(/PASS 12\/12/.test(await T(p, '[data-testid="idea-body"]')), 'calculator still PASS 12/12');
  await shot(p, 'calculator_still_calculator.png');
  await p.close();
}
// 4. unrelated idea still unsupported (no false-green)
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await run(p, 'build a social network platform');
  ok(/UNSUPPORTED_LOCAL_TEMPLATE/.test(await T(p, '[data-testid="idea-class"]')), 'unrelated idea → UNSUPPORTED');
  const body = await T(p, '[data-testid="idea-body"]');
  ok(!/PASS \d+\/\d+/.test(body) && !/\bDONE\b/.test(body), 'unrelated idea: no DONE/PASS');
  await shot(p, 'unsupported_still_unsupported.png');
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} nl-matcher checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
