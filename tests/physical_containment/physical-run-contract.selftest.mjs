import { makePhysicalRunContract, validatePhysicalRunContract } from '../../src/physical_containment/physical-run-contract.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const c=makePhysicalRunContract({});
// 4 missing physical evidence → UNKNOWN/NOT_PASSED never PASS
ok(validatePhysicalRunContract(c,{}).status==='UNKNOWN','4 missing physical evidence → UNKNOWN (never PASS)');
ok(validatePhysicalRunContract(c,{relay_state:'open',power_state:'ind',path_inventory:'full',evidence_channel:'one_way',measured_boot:'rec'}).valid===true,'full evidence → VERIFIED_WITHIN_DECLARED_BOUNDARIES');
const bad={...c}; delete bad.relay_policy; ok(validatePhysicalRunContract(bad,{}).status==='NOT_PASSED','missing contract field → NOT_PASSED');
ok(c.contract_digest.startsWith('prc_'),'contract digest present');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
