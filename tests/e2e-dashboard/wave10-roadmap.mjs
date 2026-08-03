import { chromium } from 'playwright'; import { readFileSync, mkdirSync } from 'node:fs'; import { join } from 'node:path';
const PORT=process.env.OP_PORT||4880; const URL=`http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT=process.env.CV_OUT||'./screenshots'; mkdirSync(OUT,{recursive:true}); const AXE=readFileSync('./node_modules/axe-core/axe.min.js','utf8');
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('OK   '+m);}else{fail++;console.log('BAD  '+m);} };
const b=await chromium.launch({headless:true}); const npage=async()=>{const ctx=await b.newContext();const p=await ctx.newPage();await p.setViewportSize({width:1360,height:1250});return p;};
const T=(p,s)=>p.textContent(s); const waitTests=(p)=>p.waitForFunction(()=>/\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent),null,{timeout:60000});
{ const p=await npage(); await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.click('[data-testid="nav-roadmap"]');
  ok(await p.isVisible('[data-testid="panel-roadmap"]'),'roadmap: panel visible');
  ok((await p.$$('[data-testid="roadmap-products"] tr')).length===5,'roadmap: 5 products listed');
  ok(/Safety Check SAMPLE report/.test(await T(p,'[data-testid="roadmap-next"]')),'roadmap: next step = Safety Check sample report');
  ok((await p.$$('[data-testid="panel-roadmap"] button, [data-testid="panel-roadmap"] a')).length===0,'roadmap: 0 actionable controls (display-only)');
  ok(/DISPLAY ONLY/.test(await T(p,'[data-testid="roadmap-note"]')),'roadmap: display-only note; gates blocked');
  await p.screenshot({path:join(OUT,'w10_01_roadmap.png'),fullPage:true});
  await p.close(); }
{ const p=await npage(); await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({content:AXE}); let serious=0; const ids=new Set();
  for(const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','idea','realrepo','doctor','livegate','roadmap','tech']){
    await p.click(`[data-testid="nav-${n}"]`); const res=await p.evaluate(async()=>await window.axe.run(document,{runOnly:['wcag2a','wcag2aa']}));
    for(const v of res.violations) if(v.impact==='serious'||v.impact==='critical'){serious+=v.nodes.length;ids.add(v.id);} }
  ok(serious===0,'a11y: axe 0 serious/critical across all panels :: '+JSON.stringify([...ids])); await p.close(); }
await b.close(); console.log(fail===0?`\nALL GREEN: ${pass}/${pass} wave10 roadmap checks passed.`:`\nRED: ${fail}/${pass+fail} failed.`); process.exit(fail===0?0:1);
