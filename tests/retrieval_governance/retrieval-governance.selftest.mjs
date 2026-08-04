import * as R from '../../src/retrieval_governance/retrieval-governance.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(R.freshness({age_index:9,max_age:3}).status==='STALE'&&R.freshness({age_index:9,max_age:3}).passes_as_fresh===false,'stale retrieval cannot pass as fresh');
ok(R.sourceVersion({}).status==='HOLD_UNVERSIONED_SOURCE','unversioned knowledge source cannot pass');
ok(R.cacheGovernance({}).status==='HOLD_CACHE_WITHOUT_INVALIDATION','cache without invalidation cannot pass');
ok(R.cacheInvalidation({}).status==='HOLD_NO_INVALIDATION_RULE','no invalidation rule held');
ok(R.provenance({source:'x'}).status==='OK'&&R.sourceVersion({version:'v1'}).status==='OK','valid inputs pass');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
