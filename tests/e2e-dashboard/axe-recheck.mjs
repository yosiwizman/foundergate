import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const PORT=Number(process.env.OP_PORT||4921); const BASE=`http://127.0.0.1:${PORT}`;
const AXE=readFileSync('./node_modules/axe-core/axe.min.js','utf8');
const srv=spawn('node',['src/operator_console/run-server.mjs'],{env:{...process.env,OP_PORT:String(PORT)},stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  let ok=false; for(let i=0;i<50;i++){try{const r=await fetch(BASE+'/api/health');if((await r.json()).status==='ok'){ok=true;break;}}catch{}await sleep(100);}
  if(!ok)throw new Error('server not ready');
  const b=await chromium.launch({headless:true}); const p=await b.newPage();
  await p.goto(`${BASE}/demo/founder_operator_dashboard/index.html`,{waitUntil:'domcontentloaded'});
  await p.addScriptTag({content:AXE});
  const res=await p.evaluate(async()=>await window.axe.run(document,{resultTypes:['violations']}));
  const byImpact={}; res.violations.forEach(v=>{byImpact[v.impact]=(byImpact[v.impact]||0)+1;});
  const out={total:res.violations.length, byImpact, ids:res.violations.map(v=>({id:v.id,impact:v.impact}))};
  if(process.env.AXE_JSON) writeFileSync(process.env.AXE_JSON, JSON.stringify(out,null,2));
  console.log('AXE '+JSON.stringify(out));
  await b.close();
}finally{srv.kill('SIGKILL');}
