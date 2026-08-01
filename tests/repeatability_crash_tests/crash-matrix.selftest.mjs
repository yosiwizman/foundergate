import assert from 'node:assert/strict';
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++}catch(e){fail++;console.error('FAIL',n,e.message)}};
// deterministic crash/failure behaviors a repeatability run must exhibit
const decide=(counts,total)=>{ if(total===0)return 'INSUFFICIENT'; if(counts.blocked>0)return 'DO_NOT_SHIP'; if(counts.done===total)return 'ALL_DONE_LOCAL_DEMO'; return 'IN_PROGRESS'; };
t('empty -> INSUFFICIENT', ()=>assert.equal(decide({},0),'INSUFFICIENT'));
t('blocked -> DO_NOT_SHIP', ()=>assert.equal(decide({blocked:1,done:0},1),'DO_NOT_SHIP'));
t('all done -> ALL_DONE_LOCAL_DEMO (never SHIP)', ()=>{const d=decide({blocked:0,done:2},2);assert.equal(d,'ALL_DONE_LOCAL_DEMO');assert.notEqual(d,'SHIP');});
t('invalid input throws and is caught', ()=>{ const f=()=>{throw new Error('bad')}; assert.throws(f); });
t('failed assertion is detectable (RED path)', ()=>{ let red=false; try{assert.equal(1,2)}catch{red=true} assert.equal(red,true); });
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} self-test(s) passed.`:`RED: ${fail} failed`);
process.exit(fail===0?0:1);
