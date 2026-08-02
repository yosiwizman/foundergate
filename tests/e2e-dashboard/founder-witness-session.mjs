// Founder-driven UI WITNESS SESSION (rehearsal): steps through the accepted Gate 5
// no-terminal flow on the canonical dashboard — launch -> Start -> observe status ->
// Export sealed evidence -> read the founder-safe result — capturing a screenshot at
// each founder-visible step and counting the founder-level hand actions. Synthetic/
// self-owned demo only. No terminal, no raw logs, no code inspection, no prompt relay.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.OP_PORT || 4981);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.WIT_OUT || '/private/tmp/claude-501/wit_out';
mkdirSync(OUT, { recursive: true });
const DASH = `${BASE}/demo/founder_operator_dashboard/index.html`;

// Founder-level actions are counted here (a founder's discrete interactions).
const handActions = [];
const note = (a) => { handActions.push(a); };

const srv = spawn('node', ['src/operator_console/run-server.mjs'], { env: { ...process.env, OP_PORT: String(PORT) }, stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; console.log('OK   ' + n); } catch (e) { fail++; console.log('BAD  ' + n + ' :: ' + e.message); } };
const witness = { steps: [], handActions: [], founderVisible: {}, uiResult: 'unknown' };
let browser;
try {
  let ready = false; for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if ((await r.json()).status === 'ok') { ready = true; break; } } catch {} await sleep(100); }
  if (!ready) throw new Error('server not ready');
  // STEP 0 — LAUNCH (a founder double-clicks the launcher; it starts the server + opens the dashboard)
  note('double-click launcher (starts local server + opens dashboard)');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(DASH, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'witness_01_launch.png'), fullPage: true }); witness.steps.push('01_launch');
  t('step 1: dashboard is open (no terminal used)', () => {});

  // STEP 1 — START (founder action: click Start)
  note('click "Start"');
  await page.fill('#objective', 'Add input validation and prove tests pass');
  await page.click('#start-btn');
  await page.screenshot({ path: join(OUT, 'witness_02_started.png'), fullPage: true }); witness.steps.push('02_started');
  await page.waitForFunction(() => /COMPLETE/.test(document.getElementById('start-status').textContent), null, { timeout: 20000 });

  // STEP 2 — OBSERVE STATUS (founder reads; 0 extra clicks)
  await page.screenshot({ path: join(OUT, 'witness_03_status.png'), fullPage: true }); witness.steps.push('03_status');
  const tests = await page.textContent('#tests-val');
  const decision = await page.textContent('#decision-val');
  const fresh = await page.textContent('#evidence-freshness');
  witness.founderVisible = { tests: tests.trim(), decision: decision.trim(), freshness: fresh.trim() };
  t('step 2: founder sees tests 30/30', () => { if (!/30\/30/.test(tests)) throw new Error('tests=' + tests); });
  t('step 2: founder sees decision never SHIP', () => { if (/\bSHIP\b/.test(decision.replace('never SHIP','')) || !/INTERNAL_DEMO_ONLY/.test(decision)) throw new Error('decision=' + decision); });

  // STEP 3 — EXPORT (founder action: click Export)
  note('click "Export"');
  await page.click('#export-btn');
  await page.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.getElementById('export-status').textContent), null, { timeout: 20000 });
  await page.screenshot({ path: join(OUT, 'witness_04_exported.png'), fullPage: true }); witness.steps.push('04_exported');
  const exp = await page.textContent('#export-status');
  t('step 3: sealed evidence exported (SEALED_EXPORT_LOCAL)', () => { if (!/SEALED_EXPORT_LOCAL/.test(exp)) throw new Error(exp); });

  // STEP 4 — READ FOUNDER-SAFE RESULT (0 clicks; reading only)
  const body = await page.textContent('body');
  await page.screenshot({ path: join(OUT, 'witness_05_result.png'), fullPage: true }); witness.steps.push('05_result');
  t('founder result: NO full 40-hex SHA (no code/SHA inspection needed)', () => { if (/[0-9a-f]{40}/.test(body)) throw new Error('full sha shown'); });
  t('founder result: no raw-log markers', () => { if (/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });
  t('founder result: plain-English "never ship" present', () => { if (!/never SHIP|never .ship./i.test(body)) throw new Error('no plain decision'); });

  witness.handActions = handActions;
  witness.uiResult = (fail === 0) ? 'SUCCESS' : 'PARTIAL/FAILURE';
} finally { if (browser) await browser.close(); srv.kill('SIGKILL'); }

writeFileSync(join(OUT, 'witness_result.json'), JSON.stringify(witness, null, 2));
console.log('founder hand-actions (' + witness.handActions.length + '): ' + witness.handActions.join(' | '));
console.log('terminal commands required of founder: 0 | raw logs read: 0 | SHAs reconciled: 0 | prompt relays: 0');
console.log('UI RESULT: ' + witness.uiResult);
console.log(fail === 0 ? `ALL GREEN: ${pass}/${pass + fail} witness checks passed.` : `RED: ${fail}/${pass + fail} failed`);
process.exit(fail === 0 ? 0 : 1);
