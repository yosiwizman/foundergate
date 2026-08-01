import assert from 'node:assert/strict';
import { validateObjective, validateTarget, handleStart, handleExport, ALLOWLIST_TARGETS } from '../../src/operator_console/server-core.mjs';
let p=0,f=0; const t=(n,fn)=>{try{fn();p++}catch(e){f++;console.error('FAIL',n,e.message)}};
// validation
t('empty objective -> INSUFFICIENT', ()=>assert.equal(validateObjective('').code,'INSUFFICIENT'));
t('whitespace objective -> INSUFFICIENT', ()=>assert.equal(validateObjective('   ').code,'INSUFFICIENT'));
t('too-long objective -> REFUSED', ()=>assert.equal(validateObjective('x'.repeat(500)).code,'REFUSED'));
t('valid objective ok', ()=>assert.equal(validateObjective('add validation').ok,true));
t('allowlisted target ok', ()=>assert.equal(validateTarget('self-owned demo target').ok,true));
t('path-traversal target REFUSED', ()=>assert.equal(validateTarget('../../etc/passwd').code,'REFUSED'));
t('external url target REFUSED', ()=>assert.equal(validateTarget('http://evil.example/x').code,'REFUSED'));
t('file url target REFUSED', ()=>assert.equal(validateTarget('file:///etc/hosts').code,'REFUSED'));
t('unknown raw path REFUSED', ()=>assert.equal(validateTarget('publish_candidates/x').code,'REFUSED'));
// handleStart: real run
const ok = handleStart({ target:'self-owned demo target', objective:'server probe' });
t('handleStart real run -> complete', ()=>assert.equal(ok.status,'complete'));
t('handleStart binds real 40-hex commit', ()=>assert.match(ok.run.commit,/^[0-9a-f]{40}$/));
t('handleStart real tests 30/30', ()=>{ assert.equal(ok.run.tests.total,30); assert.equal(ok.run.tests.passed,30); });
t('handleStart decision INTERNAL_DEMO_ONLY, never SHIP', ()=>{ assert.equal(ok.run.decision,'INTERNAL_DEMO_ONLY'); assert.notEqual(ok.run.decision,'SHIP'); });
// refusals
t('handleStart empty objective -> INSUFFICIENT', ()=>assert.equal(handleStart({target:'self-owned demo target',objective:''}).status,'INSUFFICIENT'));
t('handleStart disallowed target -> REFUSED', ()=>assert.equal(handleStart({target:'../../evil',objective:'x'}).status,'REFUSED'));
t('shell metacharacters in objective are inert (no injection)', ()=>{ const r=handleStart({target:'self-owned demo target',objective:'x; rm -rf / && echo pwned'}); assert.equal(r.status,'complete'); assert.equal(r.run.decision,'INTERNAL_DEMO_ONLY'); });
// export
const ex = handleExport();
t('handleExport -> complete + unzip_ok', ()=>{ assert.equal(ex.status,'complete'); assert.equal(ex.unzip_ok,true); });
console.log(f===0?`ALL GREEN: ${p}/${p+f} self-test(s) passed.`:`RED: ${f} failed`);
process.exit(f===0?0:1);
