// Real browser E2E + axe accessibility for the founder-operator panel.
// Loads generated HTML in headless chromium (playwright, local cached browser),
// asserts founder-mode content + NO full-SHA leak, runs axe, checks developer mode.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { founderHtml, developerHtml } from '../../src/ui/founder-operator-panel/render-html.mjs';

const OUT = process.env.E2E_OUT || '/private/tmp/claude-501/e2e_out';
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
const FULL_SHA = '8c85d391125aff4ad9e83ab3198b6a29a64ded1c';

const greenSnap = {
  evidenceFreshness:'fresh', tests:{passed:14,total:14}, checker:'clean', gate:'ready',
  acceptedBeta:{label:'foundergate-beta-freeze-1',status:'accepted with limits'},
  proves:['Public demo runs 30/30 from a clean clone','Cross-account portability proven'],
  notProves:['Not production','Not secure/compliant','Not a customer/SaaS product'],
  nextAction:'Founder review of the sealed evidence — no terminal needed.',
  founderGated:['Public/customer beta launch','Provider use & spend','Deployment','PR #200 changes'],
  evidenceZip:{available:true,label:'Download evidence ZIP'},
  buildLabel:'verified build 8c85d3', headSha:FULL_SHA, branch:'run/three-hour-safe-macro-batch-20260802T0845ET',
  guardOutputs:{finalHead:'PASS',receiptConsistency:'PASS'},
};
const unknownSnap = { blockedReason:'Local run-server is not running — nothing is being guessed.' };

let pass=0, fail=0; const t=(n,f)=>{ try{ f(); pass++; console.log('OK   '+n); }catch(e){ fail++; console.log('BAD  '+n+' :: '+e.message); } };
const results = { checks:[], axe:{}, screenshots:[] };

const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage();

  // ---- FOUNDER MODE (green) ----
  const fFile = join(OUT, 'founder_green.html'); writeFileSync(fFile, founderHtml(greenSnap));
  await page.goto(pathToFileURL(fFile).href);
  const seen = {};
  for (const [name, sel] of [['status-line','#status-line'],['chips','#chips'],['proves','#proves'],['not-proves','#not-proves'],['next-action','#next-action'],['founder-gated','#founder-gated'],['download','#download-evidence']]) {
    const vis = await page.isVisible(sel); seen[name]=vis; t('founder page: '+name+' visible', ()=>{ if(!vis) throw new Error(sel+' not visible'); });
  }
  const body = await page.textContent('body');
  t('founder page: NO full 40-hex SHA in body', ()=>{ if(/[0-9a-f]{40}/.test(body)) throw new Error('sha leaked'); });
  t('founder page: NO 64-hex sha256 in body', ()=>{ if(/[0-9a-f]{64}/.test(body)) throw new Error('sha256 leaked'); });
  t('founder page: no raw-log markers', ()=>{ if(/at Object\.<anonymous>|stacktrace|Traceback/i.test(body)) throw new Error('raw log'); });
  t('founder page: shows FRESH/CLEAN/READY chips', ()=>{ for (const w of ['FRESH','CLEAN','READY','14/14']) if(!body.includes(w)) throw new Error('missing '+w); });
  await page.screenshot({ path: join(OUT,'founder_green.png'), fullPage:true }); results.screenshots.push('founder_green.png');

  // axe on founder page
  await page.addScriptTag({ content: AXE });
  const axeRes = await page.evaluate(async () => await window.axe.run(document, { resultTypes:['violations'] }));
  const serious = axeRes.violations.filter(v => ['serious','critical'].includes(v.impact));
  results.axe = { total:axeRes.violations.length, serious:serious.length, ids:axeRes.violations.map(v=>({id:v.id,impact:v.impact})) };
  t('axe: no serious/critical violations', ()=>{ if(serious.length) throw new Error('serious axe: '+JSON.stringify(serious.map(v=>v.id))); });

  // ---- FOUNDER MODE (UNKNOWN) ----
  const uFile = join(OUT,'founder_unknown.html'); writeFileSync(uFile, founderHtml(unknownSnap));
  await page.goto(pathToFileURL(uFile).href);
  const ubody = await page.textContent('body');
  t('UNKNOWN page: shows UNKNOWN not fake green', ()=>{ if(!ubody.includes('UNKNOWN')) throw new Error('no UNKNOWN'); if(/\bREADY\b|\bFRESH\b/.test(ubody)) throw new Error('fake green'); });
  const uDisabled = await page.getAttribute('#download-evidence','disabled');
  t('UNKNOWN page: export button honestly disabled', ()=>{ if(uDisabled===null) throw new Error('export not disabled when unavailable'); });
  await page.screenshot({ path: join(OUT,'founder_unknown.png'), fullPage:true }); results.screenshots.push('founder_unknown.png');

  // ---- DEVELOPER MODE ----
  const dFile = join(OUT,'developer.html'); writeFileSync(dFile, developerHtml(greenSnap));
  await page.goto(pathToFileURL(dFile).href);
  const dbody = await page.textContent('body');
  t('developer page: MAY contain head sha', ()=>{ if(!dbody.includes(FULL_SHA)) throw new Error('dev missing sha'); });
  await page.screenshot({ path: join(OUT,'developer.png'), fullPage:true }); results.screenshots.push('developer.png');

  results.checks.push({ founderVisible: seen });
} finally { await browser.close(); }

writeFileSync(join(OUT,'e2e_results.json'), JSON.stringify(results,null,2));
console.log('axe: '+JSON.stringify(results.axe));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} e2e checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
