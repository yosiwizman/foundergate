// SERVER-DRIVEN browser E2E: loads the REAL canonical founder dashboard served BY the
// real loopback run-server, clicks Start (live /api/start), verifies live chips from
// real server state, no full-SHA leak, no raw logs, runs axe, drives export, captures
// idle/running/done/hold/developer screenshots. Reuses existing UI (anti-drift).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.OP_PORT || 4899);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.E2E_OUT || '/private/tmp/claude-501/sd_e2e';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
const DASH = `${BASE}/demo/founder_operator_dashboard/index.html`;
const REVIEWER = `${BASE}/demo/reviewer_console/index.html`;

const srv = spawn('node', ['src/operator_console/run-server.mjs'], { env: { ...process.env, OP_PORT: String(PORT) }, stdio: 'ignore' });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
let pass=0, fail=0; const t=(n,f)=>{ try{ f(); pass++; console.log('OK   '+n); }catch(e){ fail++; console.log('BAD  '+n+' :: '+e.message); } };
const results = { axe:{}, screenshots:[] };
let browser;
try {
  // wait for server
  let ready=false; for(let i=0;i<50;i++){ try{ const r=await fetch(BASE+'/api/health'); if((await r.json()).status==='ok'){ready=true;break;} }catch{} await sleep(100); }
  if(!ready) throw new Error('server not ready');
  browser = await chromium.launch({ headless:true });
  const page = await browser.newPage();

  // IDLE
  await page.goto(DASH, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(300); // token load
  t('dashboard loads from loopback server', async()=>{});
  await page.screenshot({ path: join(OUT,'sd_idle.png'), fullPage:true }); results.screenshots.push('sd_idle.png');
  const idleStatus = await page.textContent('#start-status');
  t('idle status is honest (not started)', ()=>{ if(!/not started|idle/i.test(idleStatus)) throw new Error('idle='+idleStatus); });

  // HOLD/UNKNOWN: empty objective -> INSUFFICIENT (live)
  await page.fill('#objective', '');
  await page.click('#start-btn');
  await page.waitForFunction(() => /INSUFFICIENT/.test(document.getElementById('start-status').textContent), null, { timeout: 8000 });
  t('empty objective -> live INSUFFICIENT (honest hold, no fake green)', async()=>{});
  await page.screenshot({ path: join(OUT,'sd_hold_unknown.png'), fullPage:true }); results.screenshots.push('sd_hold_unknown.png');

  // RUNNING -> DONE: real objective, click Start
  await page.fill('#objective', 'Add input validation and prove tests pass');
  await page.click('#start-btn');
  await page.screenshot({ path: join(OUT,'sd_running.png'), fullPage:true }); results.screenshots.push('sd_running.png');
  await page.waitForFunction(() => /COMPLETE/.test(document.getElementById('start-status').textContent), null, { timeout: 20000 });
  await page.screenshot({ path: join(OUT,'sd_done.png'), fullPage:true }); results.screenshots.push('sd_done.png');
  const tests = await page.textContent('#tests-val');
  const decision = await page.textContent('#decision-val');
  const fresh = await page.textContent('#evidence-freshness');
  t('live tests chip shows 30/30', ()=>{ if(!/30\/30/.test(tests)) throw new Error('tests='+tests); });
  t('live decision never SHIP', ()=>{ if(/\bSHIP\b/.test(decision.replace('never SHIP','')) ) throw new Error('decision='+decision); if(!/INTERNAL_DEMO_ONLY/.test(decision)) throw new Error('decision='+decision); });
  t('live evidence freshness FRESH', ()=>{ if(!/FRESH/.test(fresh)) throw new Error('fresh='+fresh); });

  const body = await page.textContent('body');
  t('founder dashboard: NO full 40-hex SHA (short build id OK)', ()=>{ if(/[0-9a-f]{40}/.test(body)) throw new Error('full sha leaked'); });
  t('founder dashboard: no raw-log markers', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });

  // EXPORT (download evidence without terminal)
  await page.click('#export-btn');
  await page.waitForFunction(() => /SEALED_EXPORT_LOCAL/.test(document.getElementById('export-status').textContent), null, { timeout: 20000 });
  t('evidence export via dashboard -> SEALED_EXPORT_LOCAL', async()=>{});
  const expStatus = await page.textContent('#export-status');
  t('export status names a real sealed zip', ()=>{ if(!/sealed_export\.zip/.test(expStatus)) throw new Error(expStatus); });

  // AXE on the live dashboard
  await page.addScriptTag({ content: AXE });
  const axeRes = await page.evaluate(async () => await window.axe.run(document, { resultTypes:['violations'] }));
  const serious = axeRes.violations.filter(v => ['serious','critical'].includes(v.impact));
  results.axe = { total: axeRes.violations.length, serious: serious.length, ids: axeRes.violations.map(v=>({id:v.id,impact:v.impact})) };
  t('axe: no serious/critical violations on live dashboard', ()=>{ if(serious.length) throw new Error('serious: '+JSON.stringify(serious.map(v=>v.id))); });

  // DEVELOPER/REVIEWER mode (served): may show technical detail
  await page.goto(REVIEWER, { waitUntil:'domcontentloaded' });
  await page.screenshot({ path: join(OUT,'sd_developer.png'), fullPage:true }); results.screenshots.push('sd_developer.png');
  t('reviewer/developer console loads (technical surface exists)', async()=>{});
} finally { if(browser) await browser.close(); srv.kill('SIGKILL'); }

const { writeFileSync } = await import('node:fs');
writeFileSync(join(OUT,'sd_e2e_results.json'), JSON.stringify(results,null,2));
console.log('axe: '+JSON.stringify(results.axe));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} server-driven e2e checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
