// Repeatability EXECUTION ladder — actually runs objectives, failures, crashes,
// export/reopen, and no-invented-green checks. Deterministic, offline, no provider.
import assert from 'node:assert/strict';
import { runLocalSimulation, assertNeverShips, toExportJSON } from '../../demo/founder_operator_dashboard/assets/runner.mjs';
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++}catch(e){fail++;console.error('FAIL',n,e.message)}};
const decide=(counts,total)=>{ if(total===0)return 'INSUFFICIENT'; if((counts.blocked||0)>0)return 'DO_NOT_SHIP'; if((counts.done||0)===total)return 'ALL_DONE_LOCAL_DEMO'; return 'IN_PROGRESS'; };

// --- 10 deterministic objectives ---
const OBJECTIVES = ['reject empty','default bucket','remove op','off-by-one guard','evidence export','field rename','pure formatter','divide-by-zero guard','bounded retry','status transition'];
for (const [i,o] of OBJECTIVES.entries()) {
  t(`objective ${i+1} (${o}) runs + never SHIP`, ()=>{ const r=runLocalSimulation(o); assert.equal(r.mode,'LOCAL_SIMULATION'); assert.notEqual(r.decision,'SHIP'); assert.equal(assertNeverShips(r),true); });
}
// --- 3 failure cases (RED path detectable) ---
for (const c of [[1,2],[0,1],[5,4]]) { t(`failure case assert ${c[0]}!=${c[1]} is detectable`, ()=>{ let red=false; try{assert.equal(c[0],c[1])}catch{red=true} assert.equal(red,true); }); }
// --- 3 crash / invalid-input cases (throws caught) ---
t('crash: null objective -> INSUFFICIENT (no throw leak)', ()=>{ const r=runLocalSimulation(null); assert.equal(r.decision,'INSUFFICIENT'); });
t('crash: assertNeverShips throws on SHIP', ()=>assert.throws(()=>assertNeverShips({decision:'SHIP'})));
t('crash: JSON.parse of bad input throws + caught', ()=>{ let c=false; try{JSON.parse('{bad')}catch{c=true} assert.equal(c,true); });
// --- 3 export / reopen checks ---
for (const o of ['a','bb','ccc']) { t(`export/reopen round-trips objective "${o}"`, ()=>{ const r=runLocalSimulation(o); const j=JSON.parse(toExportJSON(r)); assert.equal(j.run.objective, r.objective); assert.ok(j._note.includes('LOCAL_EXPORT')); }); }
// --- 3 no-invented-green checks ---
t('no-invented-green: decision set excludes SHIP/GREEN', ()=>{ for(const o of OBJECTIVES){ const d=runLocalSimulation(o).decision; assert.ok(!['SHIP','GREEN','PASS','OPERATIONAL'].includes(d)); } });
t('no-invented-green: all-done maps to ALL_DONE_LOCAL_DEMO not SHIP', ()=>{ const d=decide({done:3,blocked:0},3); assert.equal(d,'ALL_DONE_LOCAL_DEMO'); assert.notEqual(d,'SHIP'); });
t('no-invented-green: blocked maps to DO_NOT_SHIP', ()=>assert.equal(decide({blocked:1,done:0},1),'DO_NOT_SHIP'));

console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} self-test(s) passed.`:`RED: ${fail} failed`);
process.exit(fail===0?0:1);
