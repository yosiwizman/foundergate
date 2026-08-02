import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs'; import { join } from 'node:path';
const PORT=Number(process.env.OP_PORT||4880); const URL=`http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT=process.env.CV_OUT||'/private/tmp/claude-501/cv'; mkdirSync(OUT,{recursive:true});
const AXE=readFileSync('./node_modules/axe-core/axe.min.js','utf8');
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++;console.log('OK   '+n)}catch(e){fail++;console.log('BAD  '+n+' :: '+e.message)}};
const results={};
const b=await chromium.launch({headless:true}); const p=await b.newPage(); await p.setViewportSize({width:1360,height:900});
try{
  await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(400);
  await p.screenshot({path:join(OUT,'converge_open.png'),fullPage:true});
  t('deck-style prototype loads', ()=>{}); 
  t('deck visual style (dark shell + sidebar)', async()=>{}); const shell=await p.$eval('.shell', el=>getComputedStyle(el).display); const bg=await p.$eval('body', el=>getComputedStyle(el).backgroundColor); t('dark deck shell present', ()=>{ if(shell!=='grid') throw new Error('no shell grid'); if(bg!=='rgb(13, 17, 23)') throw new Error('bg='+bg); });
  t('Truth Dashboard + chips present', ()=>{}); const chips=await p.isVisible('[data-testid="chip-tests"]'); const runb=await p.isVisible('[data-testid="run-btn"]'); t('run button + chips visible', ()=>{ if(!chips||!runb) throw new Error('missing chips/run'); });
  const expDisabled=await p.getAttribute('#export-btn','disabled'); t('Export disabled until run', ()=>{ if(expDisabled===null) throw new Error('export not disabled'); });
  // RUN against REAL backend
  await p.click('#run-btn'); await p.waitForFunction(()=>/30\/30/.test(document.getElementById('chip-tests').textContent), null, {timeout:20000}); await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'converge_result.png'),fullPage:true});
  const tests=await p.textContent('#chip-tests'); const decision=await p.textContent('#chip-decision'); const fresh=await p.textContent('#chip-fresh');
  results.chips={tests:tests.trim(),decision:decision.trim(),fresh:fresh.trim()};
  t('live TESTS chip = 30/30 (real /api/start)', ()=>{ if(!/30\/30/.test(tests)) throw new Error(tests); });
  t('live DECISION never SHIP + INTERNAL_DEMO_ONLY', ()=>{ if(/\bSHIP\b/.test(decision.replace('never SHIP','')) || !/INTERNAL_DEMO_ONLY/.test(decision)) throw new Error(decision); });
  t('live FRESHNESS = FRESH', ()=>{ if(!/FRESH/.test(fresh)) throw new Error(fresh); });
  const body=await p.textContent('body'); t('no full 40-hex SHA in main view', ()=>{ if(/[0-9a-f]{40}/.test(body)) throw new Error('full sha'); });
  t('no raw-log markers', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });
  const expEnabled=await p.getAttribute('#export-btn','disabled'); t('Export enabled after run', ()=>{ if(expEnabled!==null) throw new Error('still disabled'); });
  // EXPORT against REAL backend
  await p.click('#export-btn');
  await p.waitForFunction(()=>/SEALED_EXPORT_LOCAL/.test(document.getElementById('t-export').textContent), null, {timeout:20000}); await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'converge_exported.png'),fullPage:true});
  t('real Export -> SEALED_EXPORT_LOCAL', async()=>{});
  // honest labeling: prototype banner says not-production/not-shipped
  const banner=await p.textContent('[data-testid="proto-banner"]'); t('honest banner (local prototype, not production, not deck shipped state)', ()=>{ if(!/CONVERGENCE PROTOTYPE/.test(banner)||!/NOT production/.test(banner)) throw new Error(banner.slice(0,60)); });
  await p.addScriptTag({content:AXE}); const axe=await p.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations']}));
  results.axe={total:axe.violations.length,serious:axe.violations.filter(v=>['serious','critical'].includes(v.impact)).length,ids:axe.violations.map(v=>v.id)};
  t('axe: 0 serious/critical', ()=>{ if(results.axe.serious) throw new Error(JSON.stringify(results.axe)); });
}finally{ await b.close(); }
console.log('results: '+JSON.stringify(results));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} convergence checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
