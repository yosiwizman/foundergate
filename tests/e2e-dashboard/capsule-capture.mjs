import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs'; import { join } from 'node:path'; import { pathToFileURL } from 'node:url';
const PORT=Number(process.env.OP_PORT||4880); const OUT=process.env.CAP_OUT||'/private/tmp/claude-501/cap'; mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({headless:true}); const p=await b.newPage(); await p.setViewportSize({width:1360,height:900});
try{
  // LIVE Founder Mode (real backend) — open + run + export
  await p.goto(`http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(400);
  await p.screenshot({path:join(OUT,'LIVE_founder_mode_open.png'),fullPage:true});
  await p.click('#founder-run-btn'); await p.waitForFunction(()=>/COMPLETE/.test(document.getElementById('start-status').textContent),null,{timeout:20000}); await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'LIVE_founder_mode_result.png'),fullPage:true});
  await p.click('#founder-export-btn'); await p.waitForFunction(()=>/SEALED_EXPORT_LOCAL/.test(document.getElementById('export-status').textContent),null,{timeout:20000}); await p.waitForTimeout(300);
  await p.screenshot({path:join(OUT,'LIVE_founder_mode_exported.png'),fullPage:true});
  console.log('LIVE founder-mode captured (open/result/exported)');
  // DECK-style UX-direction mockups (DISPLAY_ONLY, no backend) — render the design-lane files
  const decks=[['DECK_direction_dashboard.png','docs/lanes/founder-design-v2/01_Dashboard.html'],['DECK_direction_preview_bay.png','docs/lanes/founder-design-v2/02_PreviewBay.html'],['DECK_direction_file_cabinet.png','docs/lanes/founder-design-v2/03_FileCabinet.html'],['DECK_direction_project_guide.png','docs/lanes/founder-design-v2/04_ProjectGuide.html']];
  for(const [name,rel] of decks){ try{ await p.goto(pathToFileURL(process.cwd()+'/'+rel).href,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(300); await p.screenshot({path:join(OUT,name),fullPage:true}); console.log('deck rendered: '+name);}catch(e){console.log('deck skip '+name+': '+e.message);} }
}finally{ await b.close(); }
