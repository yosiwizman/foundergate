// E2E: Idea Builder request→artifact binding (false-green correction). Proves a calculator request opens
// the calculator (not the task planner), the task planner still works, and unsupported ideas are refused
// with no DONE/PASS and no preview. Includes the named regression:
//   FALSE_GREEN_REGRESSION_CALCULATOR_REQUEST_MUST_NOT_OPEN_TASK_PLANNER
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const np = async () => { const c = await b.newContext(); const p = await c.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const T = (p, s) => p.textContent(s);
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });

async function classifyAndLoad(p, text) {
  await p.click('[data-testid="nav-idea"]');
  await p.fill('[data-testid="idea-input"]', text);
  await p.click('[data-testid="idea-classify-btn"]');
  await p.click('[data-testid="idea-load-btn"]');
  await p.waitForFunction(() => !/Loading bound build/.test(document.querySelector('[data-testid="idea-body"]').textContent), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(200);
}

// 1. CALCULATOR request → calculator template, PASS 12/12, preview bound to calculator
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await classifyAndLoad(p, 'Build a simple calculator app.');
  ok(/Supported local template selected: calculator/.test(await T(p, '[data-testid="idea-class"]')), 'calc: classified as calculator template');
  const body = await T(p, '[data-testid="idea-body"]');
  ok(/PASS 12\/12/.test(body), 'calc: status shows calculator PASS 12/12 (bound to calculator, not 13/13)');
  ok(!/13\/13/.test(body), 'calc: does NOT show the task-planner 13/13');
  const href = await p.getAttribute('[data-testid="idea-preview-link"]', 'href');
  ok(/tests\/generated_apps\/calculator\/index\.html/.test(href), 'calc: preview link bound to calculator app');
  ok(!/wave9_appointment_task_planner/.test(href), 'FALSE_GREEN_REGRESSION_CALCULATOR_REQUEST_MUST_NOT_OPEN_TASK_PLANNER (href)');
  // preview URL equals manifest preview_url
  const man = await (await fetch(`${BASE}/demo/founder_operating_environment/assets/binding/calculator_manifest.json`)).json();
  ok(new URL(href, DASH).href === new URL(man.preview_url, DASH).href, 'calc: preview href == manifest.preview_url');
  await shot(p, 'fg_calc_request_status.png');
  // follow the preview → must be the calculator
  const p2 = await np(); await p2.goto(new URL(href, DASH).href, { waitUntil: 'domcontentloaded' });
  const h1 = await T(p2, 'h1');
  ok(/Calculator/.test(h1) && !/Appointment|Planner/.test(h1), 'FALSE_GREEN_REGRESSION: calculator preview opens Calculator, NOT the task planner');
  await shot(p2, 'fg_calc_preview.png');
  await p2.close(); await p.close();
}

// 2. TASK PLANNER request → task_planner, PASS 13/13, preview bound to planner
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await classifyAndLoad(p, 'Build a simple appointment/task planner.');
  ok(/Supported local template selected: task_planner/.test(await T(p, '[data-testid="idea-class"]')), 'planner: classified as task_planner');
  ok(/PASS 13\/13/.test(await T(p, '[data-testid="idea-body"]')), 'planner: status shows PASS 13/13');
  const href = await p.getAttribute('[data-testid="idea-preview-link"]', 'href');
  ok(/wave9_appointment_task_planner/.test(href), 'planner: preview link bound to task planner');
  await shot(p, 'fg_task_planner_request_status.png');
  const p2 = await np(); await p2.goto(new URL(href, DASH).href, { waitUntil: 'domcontentloaded' });
  ok(/Appointment \/ Task Planner/.test(await T(p2, 'h1')), 'planner: preview opens Appointment / Task Planner');
  await shot(p2, 'fg_task_planner_preview.png');
  await p2.close(); await p.close();
}

// 3. UNSUPPORTED request → refused honestly, NO DONE/PASS, NO preview
{
  const p = await np(); await p.goto(DASH, { waitUntil: 'domcontentloaded' });
  await classifyAndLoad(p, 'Build a CRM for my sales team with real customer data.');
  ok(/UNSUPPORTED_LOCAL_TEMPLATE/.test(await T(p, '[data-testid="idea-class"]')), 'unsupported: classified UNSUPPORTED_LOCAL_TEMPLATE');
  const body = await T(p, '[data-testid="idea-body"]');
  ok(/not built/.test(body), 'unsupported: status says not built');
  ok(!/PASS \d+\/\d+/.test(body) && !/\bDONE\b/.test(body), 'unsupported: shows NO PASS and NO DONE');
  const disabled = await p.getAttribute('[data-testid="idea-preview-link"]', 'aria-disabled');
  const href = await p.getAttribute('[data-testid="idea-preview-link"]', 'href');
  ok(disabled === 'true' && (href === '#' || href.endsWith('#')), 'unsupported: preview link disabled (no artifact)');
  await shot(p, 'fg_unsupported_request_status.png');
  // binding evidence shot: show the idea panel with request hash row
  ok(/req [0-9a-f]{8}/.test(body), 'unsupported: request_hash shown (binding evidence)');
  await shot(p, 'fg_idea_builder_binding_evidence.png');
  // a11y on the idea panel
  await p.addScriptTag({ content: AXE });
  const res = await p.evaluate(async () => await window.axe.run(document.querySelector('#panel-idea'), { runOnly: ['wcag2a', 'wcag2aa'] }));
  const serious = res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  ok(serious.length === 0, 'a11y: idea panel 0 serious/critical :: ' + JSON.stringify(serious.map(v => v.id)));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} falsegreen-binding checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
