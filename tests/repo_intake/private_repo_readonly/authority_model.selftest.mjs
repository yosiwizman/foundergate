import * as A from '../../../src/repo_intake/private_repo_readonly/private_repo_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(Object.keys(A.PROOF_LEVELS).length===6,'6 distinct proof levels');
ok(A.readinessProof().accesses_real_private===false && A.readinessProof().claims_actual_access===false,'readiness proof does NOT claim actual access');
ok(A.classifyProof({claimed_level:'PRIVATE_REPO_READINESS_PROOF',claims_actual_access:true}).status==='HOLD_NOT_SUPPORTED','readiness claiming actual access → HOLD');
ok(A.classifyProof({claimed_level:'PRIVATE_REPO_READONLY_PROOF'}).status==='HOLD_NOT_SUPPORTED','actual read-only w/o requirements → HOLD');
ok(A.classifyProof({claimed_level:'PRIVATE_REPO_READONLY_PROOF',exact_repo_identifier:true,exact_credential_source:true,exact_scope:true,founder_phrase:true,no_code_execution:true,no_writes:true,no_merge:true,no_deploy:true}).status==='OK','actual read-only WITH all requirements+founder phrase → OK');
ok(A.classifyProof({claimed_level:'PRIVATE_REPO_WRITE_PROOF',founder_phrase:false}).status==='HOLD_NOT_SUPPORTED','write proof w/o founder phrase → HOLD');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
