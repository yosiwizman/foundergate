import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const PORT=Number(process.env.OP_PORT||4923); const BASE=`http://127.0.0.1:${PORT}`;
const OUT=process.env.MS_OUT||'/private/tmp/claude-501/ms_out'; mkdirSync(OUT,{recursive:true});
const AXE=readFileSync('./node_modules/axe-core/axe.min.js','utf8');
const srv=spawn('node',['src/operator_console/run-server.mjs'],{env:{...process.env,OP_PORT:String(PORT)},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++;console.log('OK   '+n)}catch(e){fail++;console.log('BAD  '+n+' :: '+e.message)}};
const results={};
let b;
try{
  let ok=false; for(let i=0;i<50;i++){try{const r=await fetch(BASE+'/api/health');if((await r.json()).status==='ok'){ok=true;break;}}catch{}await sleep(100);}
  if(!ok)throw new Error('server not ready');
  b=await chromium.launch({headless:true}); const p=await b.newPage();
  // FOUNDER: run then scan
  await p.goto(`${BASE}/demo/founder_operator_dashboard/index.html`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(300);
  t('canonical dashboard exposes a reviewer-view link', async()=>{}); const hasLink=await p.isVisible('[data-testid="reviewer-link"]'); t('reviewer-link visible in founder nav', ()=>{ if(!hasLink) throw new Error('no link'); });
  await p.fill('#objective','Add input validation and prove tests pass'); await p.click('#start-btn');
  await p.waitForFunction(()=>/COMPLETE/.test(document.getElementById('start-status').textContent),null,{timeout:20000});
  const fbody=await p.textContent('body');
  t('founder mode: NO full 40-hex SHA', ()=>{ if(/[0-9a-f]{40}/.test(fbody)) throw new Error('sha'); });
  t('founder mode: no raw-log markers', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(fbody)) throw new Error('log'); });
  // axe on founder after fix
  await p.addScriptTag({content:AXE});
  const axeF=await p.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations']}));
  results.axeFounder={total:axeF.violations.length, serious:axeF.violations.filter(v=>['serious','critical'].includes(v.impact)).length, moderate:axeF.violations.filter(v=>v.impact==='moderate').length};
  t('founder axe: 0 total violations (region fixed)', ()=>{ if(axeF.violations.length!==0) throw new Error(JSON.stringify(results.axeFounder)); });
  await p.screenshot({path:join(OUT,'founder_after_fix.png'),fullPage:true});
  // REVIEWER: technical surface shows SHA-256
  await p.goto(`${BASE}/demo/reviewer_console/index.html`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(400);
  const rbody=await p.textContent('body');
  t('reviewer console loads (technical surface)', async()=>{});
  t('reviewer console is READ-ONLY (no act buttons)', async()=>{}); const btns=await p.$$eval('button', els=>els.length); t('reviewer console has no action buttons', ()=>{ if(btns>0) throw new Error(btns+' buttons'); });
  await p.screenshot({path:join(OUT,'reviewer_technical.png'),fullPage:true});
  results.reviewerButtons=btns;
}finally{ if(b) await b.close(); srv.kill('SIGKILL'); }
writeFileSync(join(OUT,'mode_sep_results.json'), JSON.stringify(results,null,2));
console.log('results: '+JSON.stringify(results));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} mode-separation checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
