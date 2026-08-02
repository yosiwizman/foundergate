// Wave 2 E2E: deck-style Founder operating environment, multi-panel, real backend.
// Navigates every panel, drives a REAL run + export, captures screenshots, runs axe per panel.
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
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });

const b = await chromium.launch({ headless: true });
const p = await b.newPage(); await p.setViewportSize({ width: 1360, height: 1000 });
await p.goto(URL, { waitUntil: 'domcontentloaded' });

// deck visual identity
const shellDisplay = await p.$eval('.shell', el => getComputedStyle(el).display);
const bodyBg = await p.$eval('body', el => getComputedStyle(el).backgroundColor);
ok(shellDisplay === 'grid', 'deck shell grid preserved (' + shellDisplay + ')');
ok(bodyBg === 'rgb(13, 17, 23)', 'deck dark background rgb(13,17,23) (' + bodyBg + ')');

// truth before run
ok(await p.isVisible('[data-testid="panel-truth"]'), 'Truth Dashboard visible on load');
ok((await p.textContent('[data-testid="chip-tests"]')).includes('UNKNOWN'), 'tests UNKNOWN before run');
ok((await p.textContent('[data-testid="chip-decision"]')).includes('UNKNOWN'), 'decision UNKNOWN before run');
ok(await p.isDisabled('[data-testid="export-btn"]'), 'Export disabled before run');
await shot(p, '01_truth_dashboard_before_run.png');

// navigation works -> preview
await p.click('[data-testid="nav-preview"]');
ok(await p.isVisible('[data-testid="panel-preview"]'), 'nav switches to Preview');
ok(!(await p.isVisible('[data-testid="panel-truth"]')), 'Truth hidden when Preview active');
ok((await p.textContent('[data-testid="panel-preview"]')).includes('NO SENDS'), 'Preview labeled NO SENDS/NO PAYMENTS/NO DEPLOY');
await shot(p, '02_preview_panel_before_run.png');

// run (real /api/start) from Truth
await p.click('[data-testid="nav-truth"]');
await p.click('[data-testid="run-btn"]');
await shot(p, '03_run_started.png');
await p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
const tests = await p.textContent('[data-testid="chip-tests"]');
const decision = await p.textContent('[data-testid="chip-decision"]');
ok(/\d+\/\d+/.test(tests), 'tests real result after run (' + tests.trim() + ')');
ok(/INTERNAL_DEMO_ONLY/.test(decision) && /never SHIP/i.test(decision), 'decision INTERNAL_DEMO_ONLY + never SHIP (' + decision.trim() + ')');
ok(!/\bSHIP\b(?!\))/.test(decision.replace(/never SHIP/gi, '')), 'no achievable SHIP surfaced');
await shot(p, '04_truth_dashboard_after_run.png');

// preview after run reflects same real state
await p.click('[data-testid="nav-preview"]');
const pr = await p.textContent('[data-testid="preview-result"]');
ok(/\d+\/\d+/.test(pr) && /never SHIP/i.test(pr), 'Preview shows same real run state');
await shot(p, '05_preview_panel_after_run.png');

// evidence ready -> export enabled
await p.click('[data-testid="nav-evidence"]');
ok(!(await p.isDisabled('[data-testid="export-btn2"]')), 'Evidence export enabled after run');
await shot(p, '06_evidence_ready.png');
await p.click('[data-testid="export-btn2"]');
await p.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
ok((await p.textContent('[data-testid="evi-state"]')).includes('SEALED_EXPORT_LOCAL'), 'real SEALED_EXPORT_LOCAL after export');
ok((await p.textContent('[data-testid="chip-evidence"]')).includes('SEALED_EXPORT_LOCAL'), 'evidence chip fresh only after real export');
await shot(p, '07_export_complete.png');

// decisions view-only
await p.click('[data-testid="nav-decisions"]');
ok(await p.isDisabled('[data-testid="dec-continue"]') && await p.isDisabled('[data-testid="dec-stop"]'), 'Decisions buttons disabled (view only)');
ok((await p.textContent('[data-testid="dec-notice"]')).includes('No real-world action is authorized'), 'Decisions notice: no real-world action');
await shot(p, '08_decisions_view_only.png');

// ask guide
await p.click('[data-testid="nav-guide"]');
const guide = await p.textContent('[data-testid="panel-guide"]');
ok(/What is live/.test(guide) && /INTERNAL_DEMO_ONLY/.test(guide), 'Ask Guide static limits present');
await shot(p, '09_ask_guide_limits.png');

// files display-only
await p.click('[data-testid="nav-files"]');
ok((await p.textContent('[data-testid="panel-files"]')).includes('DISPLAY_ONLY'), 'Files DISPLAY_ONLY labeled (no live enforcement)');
await shot(p, '10_files_display_only.png');

// no raw logs / no full SHA in founder-facing panels
const founderText = await p.evaluate(() => ['truth','preview','evidence','decisions','guide','files']
  .map(n => document.getElementById('panel-'+n).innerText).join('\n'));
ok(!/[0-9a-f]{40}/.test(founderText), 'no full 40-hex SHA in founder-facing panels');
ok(!/npm ERR!|at Object\.<anonymous>|node:internal|Traceback|\n\s+at /.test(founderText), 'no raw-log markers in founder view');

// founder mode fallback still available
const fallbackHref = await p.getAttribute('a[href*="founder_operator_dashboard"]', 'href');
ok(!!fallbackHref, 'Founder Mode fallback link present (not removed)');
await p.goto(`http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html`, { waitUntil: 'domcontentloaded' }).catch(()=>{});
await shot(p, '11_founder_mode_fallback.png');
await p.goBack({ waitUntil: 'domcontentloaded' }).catch(()=>{});

// axe per panel (contrast + a11y with each panel visible)
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.click('[data-testid="run-btn"]');
await p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
await p.addScriptTag({ content: AXE });
let axeTotal = 0, axeSerious = 0; const axeIds = new Set();
for (const n of ['truth','preview','evidence','decisions','guide','files','tech']) {
  await p.click(`[data-testid="nav-${n}"]`);
  const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
  for (const v of res.violations) { axeTotal += v.nodes.length; if (v.impact==='serious'||v.impact==='critical'){ axeSerious += v.nodes.length; axeIds.add(v.id);} }
}
ok(axeSerious === 0, 'axe: 0 serious/critical across all panels :: ' + JSON.stringify({ total: axeTotal, serious: axeSerious, ids: [...axeIds] }));

await b.close();
console.log('\nresults:', JSON.stringify({ tests: tests.trim(), decision: decision.trim(), axe: { serious: axeSerious } }));
console.log(fail === 0 ? `ALL GREEN: ${pass}/${pass} wave2 checks passed.` : `RED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
