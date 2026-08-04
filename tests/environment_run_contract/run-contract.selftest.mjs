import { makeRunContract, validateRunContract } from '../../src/environment_run_contract/run-contract.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 1 validates only with required fields
const c=makeRunContract({}); ok(validateRunContract(c).valid===true,'1 full contract validates');
const bad={...c}; delete bad.evidence_destination; ok(validateRunContract(bad).valid===false,'1b missing field → invalid');
ok(validateRunContract(null).status==='HOLD_NO_CONTRACT','1c no contract → HOLD');
// 2 digest changes on material change
const c2=makeRunContract({allowed_network_state:'partial'}); ok(c.contract_digest!==c2.contract_digest,'2 digest changes on material change');
// tamper → digest mismatch
const t={...c,allowed_network_state:'open'}; ok(validateRunContract(t).status==='HOLD_DIGEST_MISMATCH','2b tampered contract → digest mismatch');
// evidence inside worker → held
const ins=makeRunContract({evidence_destination:'worker://local'}); ok(validateRunContract(ins).status==='HOLD_EVIDENCE_INSIDE_WORKER','evidence must be outside worker');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
