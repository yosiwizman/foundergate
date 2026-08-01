import assert from 'node:assert/strict';
let p=0,f=0; const t=(n,fn)=>{try{fn();p++}catch(e){f++;console.error('FAIL',n,e.message)}};
t('fixture arithmetic', ()=>assert.equal(2+2,4));
t('fixture string', ()=>assert.equal('a'+'b','ab'));
console.log(f===0?`ALL GREEN: ${p}/${p+f} self-test(s) passed.`:`RED: ${f} failed`);
process.exit(f===0?0:1);
