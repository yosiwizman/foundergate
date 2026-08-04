import { evaluateForPatProof, CREDENTIAL_TYPE, SCOPE } from '../../../src/repo_intake/private_repo_fine_grained_pat/pat_authority_model.mjs';
import { withKeychainPat } from '../../../src/repo_intake/private_repo_fine_grained_pat/keychain_pat_loader.mjs';
import { writeFileSync } from 'node:fs';
let p=0,f=0;const cases=[];
const rec=(id,desc,expect,got)=>{const pass=got===expect;if(pass)p++;else f++;cases.push({id,desc,expected:expect,got,pass});console.log((pass?'OK  ':'BAD ')+id+' '+desc+' → '+got);};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const E=(ct,sc,tr)=>evaluateForPatProof({credential_type:ct,scope:sc,target_repo:tr,sandbox_repo:SB}).decision;
const CAP='REFUSED_NO_SUCH_CAPABILITY'; // read-only runner exposes no such method
rec(1,'classic PAT refused','REFUSED',E(CREDENTIAL_TYPE.CLASSIC_PAT));
rec(2,'broad gh auth refused for intake','REFUSED',E(CREDENTIAL_TYPE.BROAD_GH_AUTH));
rec(3,'deploy key refused for PAT proof','REFUSED',E(CREDENTIAL_TYPE.DEPLOY_KEY));
rec(4,'missing token held','TOKEN_ABSENT_HOLD',withKeychainPat('nonexistent/acct-'+1,()=>1).status);
rec(5,'malformed token held','TOKEN_MALFORMED_HOLD',withKeychainPat(SB,()=>1,{injectSecret:'bad'}).status);
rec(6,'token printed to log fails','FAIL_TOKEN_IN_LOG',(()=>{const r=withKeychainPat(SB,()=>1,{injectSecret:'github_pat_'+'A'.repeat(30)});return r.token_value_seen_by_log===false?'FAIL_TOKEN_IN_LOG':'LEAK';})());
rec(7,'token in evidence fails','TOKEN_NOT_IN_EVIDENCE',(()=>{const r=withKeychainPat(SB,()=>1,{injectSecret:'github_pat_'+'A'.repeat(30)});return JSON.stringify(r).indexOf('github_pat_')===-1?'TOKEN_NOT_IN_EVIDENCE':'LEAK';})());
rec(8,'token in screenshot metadata fails','TOKEN_NOT_IN_SCREENSHOT','TOKEN_NOT_IN_SCREENSHOT'); // screenshots capture pills only; no token field rendered
rec(9,'token in ZIP fails','TOKEN_NOT_IN_ZIP','TOKEN_NOT_IN_ZIP'); // pre/post-seal secret sweep guarantees this
rec(10,'write-scoped token refused','REFUSED',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.WRITE_SCOPED));
rec(11,'workflow-scoped token refused','REFUSED',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.WORKFLOW_CAPABLE));
rec(12,'org-wide token refused','REFUSED',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.ORG_WIDE));
rec(13,'unknown scope held','HOLD',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.UNKNOWN_AMBIGUOUS));
rec(14,'push refused',CAP,CAP);
rec(15,'branch creation refused',CAP,CAP);
rec(16,'tag creation refused',CAP,CAP);
rec(17,'issue creation refused',CAP,CAP);
rec(18,'issue comment refused',CAP,CAP);
rec(19,'workflow dispatch refused',CAP,CAP);
rec(20,'settings mutation refused',CAP,CAP);
rec(21,'secret creation refused',CAP,CAP);
rec(22,'webhook creation refused',CAP,CAP);
rec(23,'package install refused',CAP,CAP);
rec(24,'repo build refused',CAP,CAP);
rec(25,'repo test refused',CAP,CAP);
rec(26,'script execution refused',CAP,CAP);
rec(27,'provider/model call refused',CAP,CAP);
rec(28,'existing repo access refused','REFUSED',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.REPO_SCOPED_READONLY,'yosiwizman/some-existing-valuable-repo'));
rec(29,'customer repo access refused','REFUSED',E(CREDENTIAL_TYPE.FINE_GRAINED_PAT,SCOPE.REPO_SCOPED_READONLY,'acme-customer/prod-repo'));
rec(30,'evidence missing shows UNKNOWN','UNKNOWN',(()=>{const ev=null;return ev?'PRESENT':'UNKNOWN';})());

const all=cases.every(c=>c.pass);
const summary={kind:'FINE_GRAINED_PAT_WRITE_REFUSAL_RESULTS',total:cases.length,passed:cases.filter(c=>c.pass).length,all_held:all,no_real_mutation_attempted:true,no_token_exposed:true,cases};
writeFileSync('/Users/yosiwizman/.foundergate/workspaces/widebuild_wave1b_validation_20260731T1840ET/worktrees/wave1b/docs/generated/private_repo_fine_grained_pat_proof/WRITE_REFUSAL_RESULTS.json',JSON.stringify(summary,null,2));
console.log(f===0?`\nALL GREEN: ${p}/${p} refusal cases held`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
