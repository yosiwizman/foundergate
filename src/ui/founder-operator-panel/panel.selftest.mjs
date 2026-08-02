import assert from 'node:assert/strict';
import { buildPanel, renderFounderText, renderDeveloperText, UNKNOWN } from './panel.mjs';
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++}catch(e){fail++;console.error('FAIL',n,e.message)}};

const FULL_SHA='4c4256f387706e9f4a41026d0d80e4ef363f39e5';
const clean={
  evidenceFreshness:'fresh', tests:{passed:30,total:30}, checker:'clean', gate:'ready',
  acceptedBeta:{label:'foundergate-beta-freeze-1',status:'accepted with limits'},
  proves:['public demo runs 30/30'], notProves:['not production','not a SaaS'],
  nextAction:'founder review', founderGated:['public beta','provider'],
  evidenceZip:{available:true,label:'Download evidence ZIP'},
  buildLabel:'verified build 4c4256', headSha:FULL_SHA, branch:'run/x', guardOutputs:{finalHead:'PASS'},
};

t('clean snapshot -> ready green', ()=>{ const vm=buildPanel(clean); assert.equal(vm.ready,true); assert.equal(vm.chips.freshness,'FRESH'); assert.equal(vm.chips.tests,'30/30'); assert.equal(vm.chips.checker,'CLEAN'); assert.equal(vm.chips.gate,'READY'); });
t('empty snapshot -> all UNKNOWN, NOT ready (no invented state)', ()=>{ const vm=buildPanel({}); assert.equal(vm.ready,false); assert.equal(vm.chips.freshness,UNKNOWN); assert.equal(vm.chips.tests,UNKNOWN); assert.equal(vm.chips.checker,UNKNOWN); assert.equal(vm.chips.gate,UNKNOWN); assert.ok(vm.unknowns.length>=4); });
t('stale freshness -> NOT ready', ()=>assert.equal(buildPanel({...clean,evidenceFreshness:'stale'}).ready,false));
t('checker findings -> NOT ready', ()=>assert.equal(buildPanel({...clean,checker:'findings'}).ready,false));
t('gate hold -> NOT ready', ()=>assert.equal(buildPanel({...clean,gate:'hold'}).ready,false));
t('failing tests (29/30) -> NOT ready', ()=>assert.equal(buildPanel({...clean,tests:{passed:29,total:30}}).ready,false));
t('invalid tests (passed>total) -> UNKNOWN', ()=>assert.equal(buildPanel({...clean,tests:{passed:31,total:30}}).chips.tests,UNKNOWN));
t('garbage freshness value -> UNKNOWN not fake', ()=>assert.equal(buildPanel({...clean,evidenceFreshness:'green'}).chips.freshness,UNKNOWN));
t('founder text contains NO full sha even when snapshot has headSha', ()=>{ const txt=renderFounderText(buildPanel(clean)); assert.ok(!/[0-9a-f]{40}/.test(txt)); assert.ok(!/[0-9a-f]{64}/.test(txt)); });
t('founder text shows plain chips + panels', ()=>{ const txt=renderFounderText(buildPanel(clean)); for(const s of ['Evidence freshness','Tests','Independent Checker','Gate Advisor','What this proves','does NOT prove','Next safe action','founder-gated','Download evidence']) assert.ok(txt.includes(s),'missing '+s); });
t('buildLabel that is a full sha is rejected to UNKNOWN', ()=>assert.equal(buildPanel({...clean,buildLabel:FULL_SHA}).chips.buildLabel,UNKNOWN));
t('developer text MAY contain the head sha', ()=>{ const txt=renderDeveloperText(buildPanel(clean)); assert.ok(txt.includes(FULL_SHA)); });
t('evidence zip unavailable shows honest reason', ()=>{ const vm=buildPanel({...clean,evidenceZip:{available:false,reason:'server off'}}); assert.equal(vm.evidenceZip.available,false); assert.ok(renderFounderText(vm).includes('unavailable')); });
t('founder text never contains the word stacktrace/raw log markers', ()=>{ const txt=renderFounderText(buildPanel(clean)).toLowerCase(); assert.ok(!txt.includes('stacktrace')); assert.ok(!txt.includes('at object.<anonymous>')); });

console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} self-test(s) passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
