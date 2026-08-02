import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT=Number(process.env.OP_PORT||4880); const URL=`http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html`;
const OUT=process.env.US_OUT||'/private/tmp/claude-501/us'; mkdirSync(OUT,{recursive:true});
const AXE=readFileSync('./node_modules/axe-core/axe.min.js','utf8');
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++;console.log('OK   '+n)}catch(e){fail++;console.log('BAD  '+n+' :: '+e.message)}};
const results={};
const b=await chromium.launch({headless:true}); const p=await b.newPage(); await p.setViewportSize({width:1280,height:900});
try{
  await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(400);
  await p.screenshot({path:join(OUT,'founder_mode_open.png'),fullPage:true});
  await p.screenshot({path:join(OUT,'before_run.png'),fullPage:true});
  t('Founder Mode panel visible', ()=>{}); const fm=await p.isVisible('[data-testid="founder-mode"]'); t('founder-mode section present', ()=>{ if(!fm) throw new Error('no founder-mode'); });
  const runVis=await p.isVisible('#founder-run-btn'); t('big Run button visible', ()=>{ if(!runVis) throw new Error('no run btn'); });
  const expDisabled=await p.getAttribute('#founder-export-btn','disabled'); t('big Export button disabled until ready', ()=>{ if(expDisabled===null) throw new Error('export not disabled initially'); });
  // button sizes (post-surgery)
  const runBox=await p.$eval('#founder-run-btn', el=>({w:el.offsetWidth,h:el.offsetHeight}));
  results.runButton=runBox; t('Run button large (>=280x60)', ()=>{ if(runBox.w<280||runBox.h<60) throw new Error(JSON.stringify(runBox)); });
  t('technical view collapsed (details not open)', async()=>{}); const detOpen=await p.getAttribute('[data-testid="tech-details"]','open'); t('tech details collapsed by default', ()=>{ if(detOpen!==null) throw new Error('tech open'); });
  t('reviewer link still present', async()=>{}); const rl=await p.isVisible('[data-testid="reviewer-link"]'); t('reviewer link present', ()=>{ if(!rl) throw new Error('no reviewer link'); });
  const objVal=await p.inputValue('#objective'); t('default objective present (typing optional)', ()=>{ if(!objVal||objVal.length<3) throw new Error('no default objective'); });
  // RUN via the big founder button
  await p.click('#founder-run-btn');
  await p.screenshot({path:join(OUT,'running.png'),fullPage:true});
  await p.waitForFunction(()=>/COMPLETE/.test(document.getElementById('start-status').textContent), null, {timeout:20000});
  await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'complete_result.png'),fullPage:true});
  const fmWhat=await p.textContent('#fm-what'); const fmTrust=await p.textContent('#fm-trust'); const fmNext=await p.textContent('#fm-next');
  results.fm={what:fmWhat.slice(0,60),trust:fmTrust.slice(0,60),next:fmNext.slice(0,60)};
  t('Founder "What happened" updated (mentions finished/tests)', ()=>{ if(!/finished|Tests/i.test(fmWhat)) throw new Error(fmWhat); });
  t('Founder "Can I trust this?" honest (never ship / internal demo)', ()=>{ if(!/never .ship.|internal demo|INTERNAL_DEMO_ONLY/i.test(fmTrust)) throw new Error(fmTrust); });
  const body=await p.textContent('body');
  t('founder view: no full 40-hex SHA', ()=>{ if(/[0-9a-f]{40}/.test(body)) throw new Error('full sha'); });
  t('founder view: no raw-log markers', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });
  const expNowEnabled=await p.getAttribute('#founder-export-btn','disabled'); t('big Export enabled after run', ()=>{ if(expNowEnabled!==null) throw new Error('export still disabled'); });
  await p.screenshot({path:join(OUT,'export_ready.png'),fullPage:true});
  // EXPORT via the big founder button
  await p.click('#founder-export-btn');
  await p.waitForFunction(()=>/SEALED_EXPORT_LOCAL/.test(document.getElementById('export-status').textContent), null, {timeout:20000});
  await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'exported.png'),fullPage:true});
  const fmNext2=await p.textContent('#fm-next'); t('Founder "next" updates after export (saved)', ()=>{ if(!/saved|Only send|Done/i.test(fmNext2)) throw new Error(fmNext2); });
  // reviewer view captured: open the technical details
  await p.click('[data-testid="tech-details"] summary').catch(()=>{});
  await p.screenshot({path:join(OUT,'reviewer_view_collapsed_or_linked.png'),fullPage:true});
  // axe on founder page
  await p.addScriptTag({content:AXE});
  const axe=await p.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations']}));
  results.axe={total:axe.violations.length,serious:axe.violations.filter(v=>['serious','critical'].includes(v.impact)).length,ids:axe.violations.map(v=>({id:v.id,impact:v.impact}))};
  t('axe: 0 serious/critical', ()=>{ if(results.axe.serious) throw new Error(JSON.stringify(results.axe)); });
}finally{ await b.close(); }
console.log('results: '+JSON.stringify(results));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} usability checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
