// Captures the founder-facing dashboard states from the ALREADY-RUNNING loopback
// server (headless chromium), for the visual-access-gate ZIP. Also runs a safe
// synthetic demo (Start/Export) and asserts founder-safe controls + no raw logs/SHA.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = Number(process.env.OP_PORT || 4880);
const URL = `http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html`;
const OUT = process.env.VIS_OUT || '/private/tmp/claude-501/vis'; mkdirSync(OUT, { recursive: true });
let pass=0, fail=0; const t=(n,f)=>{try{f();pass++;console.log('OK   '+n)}catch(e){fail++;console.log('BAD  '+n+' :: '+e.message)}};
const b = await chromium.launch({ headless:true }); const p = await b.newPage();
try {
  await p.goto(URL, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(400);
  await p.screenshot({ path: join(OUT,'dashboard_open.png'), fullPage:true });
  t('dashboard opens from local server', ()=>{});
  t('Start control visible', async()=>{}); const s=await p.isVisible('#start-btn'); t('Start button present', ()=>{ if(!s) throw new Error('no Start'); });
  t('status/result area present', async()=>{}); const st=await p.isVisible('#run-status'); const dv=await p.isVisible('#decision-val'); t('status + decision area present', ()=>{ if(!st||!dv) throw new Error('no status/decision'); });
  const ex=await p.isVisible('#export-btn'); t('Export control present', ()=>{ if(!ex) throw new Error('no Export'); });
  await p.screenshot({ path: join(OUT,'start_visible.png'), fullPage:true });
  // Lane E — safe synthetic demo run
  await p.fill('#objective', 'Add input validation and prove tests pass');
  await p.click('#start-btn');
  await p.waitForFunction(()=>/COMPLETE/.test(document.getElementById('start-status').textContent), null, { timeout: 20000 });
  await p.screenshot({ path: join(OUT,'result_visible.png'), fullPage:true });
  await p.screenshot({ path: join(OUT,'demo_result.png'), fullPage:true });
  const tests=await p.textContent('#tests-val'); const decision=await p.textContent('#decision-val');
  t('result shows tests 30/30', ()=>{ if(!/30\/30/.test(tests)) throw new Error('tests='+tests); });
  t('decision never SHIP', ()=>{ if(/\bSHIP\b/.test(decision.replace('never SHIP','')) || !/INTERNAL_DEMO_ONLY/.test(decision)) throw new Error('decision='+decision); });
  const body=await p.textContent('body');
  t('founder result: no raw logs', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });
  t('founder result: no full 40-hex SHA', ()=>{ if(/[0-9a-f]{40}/.test(body)) throw new Error('full sha'); });
  await p.click('#export-btn');
  await p.waitForFunction(()=>/SEALED_EXPORT_LOCAL/.test(document.getElementById('export-status').textContent), null, { timeout: 20000 });
  await p.screenshot({ path: join(OUT,'export_visible.png'), fullPage:true });
  await p.screenshot({ path: join(OUT,'export_state.png'), fullPage:true });
  t('Export works (SEALED_EXPORT_LOCAL)', async()=>{});
} finally { await b.close(); }
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} visual-access checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
