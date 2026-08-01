import assert from 'node:assert/strict';
import { CAPABILITIES, assertReadOnly } from '../../demo/reviewer_console/readonly-model.mjs';
let pass=0,fail=0; const t=(n,f)=>{try{f();pass++}catch(e){fail++;console.error('FAIL',n,e.message)}};
t('no mutation capabilities enabled', ()=>{ for(const k of ['mutate','merge','mark_pr_ready','edit_files','delete','approve_gate']) assert.equal(CAPABILITIES[k],false); });
t('view capabilities enabled', ()=>{ for(const k of ['view_commit','view_diff','view_test_log','view_checker','view_advisor']) assert.equal(CAPABILITIES[k],true); });
t('assertReadOnly passes for the model', ()=>{ assert.equal(assertReadOnly(CAPABILITIES),true); });
t('assertReadOnly rejects a mutation cap', ()=>{ assert.throws(()=>assertReadOnly({...CAPABILITIES,merge:true})); });
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} self-test(s) passed.`:`RED: ${fail} failed`);
process.exit(fail===0?0:1);
