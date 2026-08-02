import assert from 'node:assert/strict';
import { verifyFinalHead } from '../../src/evidence_finalizer/final-head-guard.mjs';
const HEAD='aaaaaaaaaaaa111111111111111111111111aaaa', EARLIER='bbbbbbbbbbbb222222222222222222222222bbbb';
let p=0,f=0; const t=(n,fn)=>{try{fn();p++}catch(e){f++;console.error('FAIL',n,e.message)}};
const good=verifyFinalHead('fixtures/evidence_binding/good',HEAD,{earlierCandidate:EARLIER});
t('good receipt passes all checks', ()=>assert.equal(good.allPass,true));
t('good has 7 checks', ()=>assert.equal(good.checks.length,7));
const stale=verifyFinalHead('fixtures/evidence_binding/stale',HEAD,{earlierCandidate:EARLIER});
t('stale receipt is caught (allPass false)', ()=>assert.equal(stale.allPass,false));
t('stale fails head binding', ()=>assert.equal(stale.checks.find(c=>c.name.startsWith('2')).pass,false));
t('stale fails final_head', ()=>assert.equal(stale.checks.find(c=>c.name.startsWith('3')).pass,false));
t('stale flags frozen-candidate-labeled-final', ()=>assert.equal(stale.checks.find(c=>c.name.startsWith('7')).pass,false));
// verify against the REAL corrected CTO receipt (final head 80ce45b)
const cto=verifyFinalHead('/Users/yosiwizman/.foundergate/workspaces/cto_aligned_autonomous_macro_run_20260801T1815ET/receipt','80ce45b2208f786b524ec50b953599a779c7df89',{earlierCandidate:'0381aea0e75e8b492138d6da0a4117e182f3bd62'});
t('real corrected CTO receipt passes the guard', ()=>assert.equal(cto.allPass,true));
console.log(f===0?`ALL GREEN: ${p}/${p+f} self-test(s) passed.`:`RED: ${f} failed`);
process.exit(f===0?0:1);
