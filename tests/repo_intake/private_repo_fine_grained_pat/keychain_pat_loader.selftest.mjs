import { withKeychainPat } from '../../../src/repo_intake/private_repo_fine_grained_pat/keychain_pat_loader.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
// injected valid fine-grained PAT (synthetic; built at runtime so no token literal is in source)
const fakePat='github_pat_'+'A'.repeat(30);
let sawToken=null;
const r=withKeychainPat(SB,(tok)=>{sawToken=tok;return {ok:true};},{injectSecret:fakePat});
ok(r.present===true && r.status==='TOKEN_LOADED_INTO_MEMORY','valid token loads into memory');
ok(r.token_value_seen_by_log===false && r.token_printed===false && r.token_packaged===false,'safety flags: token not logged/printed/packaged');
ok(/^fgpat_[0-9a-f]{16}$/.test(r.fingerprint_redacted),'redacted deterministic fingerprint only');
ok(JSON.stringify(r).indexOf(fakePat)===-1,'token value NOT present anywhere in returned object');
ok(sawToken===fakePat,'callback DID receive the token in memory (used, not exposed)');
const r2=withKeychainPat(SB,()=>1,{injectSecret:'not_a_pat'});
ok(r2.status==='TOKEN_MALFORMED_HOLD' && r2.fingerprint_redacted===null,'malformed token → controlled hold, no fingerprint');
// absent path via a definitely-missing account
const r3=withKeychainPat('nonexistent/'+Math.floor(1),()=>1); // real keychain miss
ok(r3.present===false && r3.status==='TOKEN_ABSENT_HOLD','absent token → controlled hold');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
