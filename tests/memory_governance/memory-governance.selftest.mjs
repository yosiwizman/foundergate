import * as M from '../../src/memory_governance/memory-governance.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(M.classify({}).status==='HOLD_UNCLASSIFIED_MEMORY','persistent/any memory without classification cannot pass');
ok(M.classify({class:'persistent'}).status==='OK','classified memory ok');
ok(M.compression({}).status==='HOLD_COMPRESSED_WITHOUT_PROVENANCE','compressed memory without provenance cannot pass');
ok(M.expiration({}).status==='HOLD_NO_EXPIRATION'&&M.freshness({age_index:9,max_age:3}).status==='STALE','no expiration held; stale detected');
ok(M.CLASSES.length===4,'4 memory classes');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
