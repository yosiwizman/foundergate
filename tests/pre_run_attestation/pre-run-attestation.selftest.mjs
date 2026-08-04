import { makeRunContract } from '../../src/environment_run_contract/run-contract.mjs';
import { preRunAttestation, goodFacts } from '../../src/pre_run_attestation/pre-run-attestation.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const c=makeRunContract({});
// 4 passes only when all required predicates proven
ok(preRunAttestation(c,goodFacts(c)).verdict==='PASS','4 all predicates proven → PASS');
// 3 fails closed on missing critical evidence → HOLD/UNKNOWN
const miss={...goodFacts(c)}; delete miss.network_policy; ok(preRunAttestation(c,miss).verdict==='HOLD','3 missing critical evidence → HOLD (not PASS)');
// present-but-false critical → FAIL
const bad={...goodFacts(c), denied_tools_absent:false}; ok(preRunAttestation(c,bad).verdict==='FAIL','3b denied tool present → FAIL');
// 10 runtime digest mismatch blocks
const dm={...goodFacts(c), observed_runtime_digest:'WRONG'}; ok(preRunAttestation(c,dm).verdict==='FAIL','10 runtime digest mismatch → FAIL');
// evidence not outside worker → not PASS
const ev={...goodFacts(c), evidence_outside_worker:false}; ok(preRunAttestation(c,ev).verdict!=='PASS','evidence not outside worker → not PASS');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
