import { inventory, allGovernedObservations, PATHS } from '../../src/physical_containment/path-inventory.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(inventory(allGovernedObservations()).isolation_claim_status==='VERIFIED_PHYSICAL_PATHS_ABSENT','all governed → VERIFIED_PHYSICAL_PATHS_ABSENT');
// 5 ungoverned path blocks isolation
ok(inventory({...allGovernedObservations(),wifi:'PRESENT_UNGOVERNED'}).isolation_claim_status==='ALTERNATE_PATH_DETECTED','5 ungoverned path → ALTERNATE_PATH_DETECTED');
// 18 unknown radio blocks
ok(inventory({...allGovernedObservations(),cellular:'UNKNOWN'}).isolation_claim_status==='UNKNOWN','18 unknown path → UNKNOWN (no isolation claim)');
ok(inventory({}).unknown.length===PATHS.length,'no observations → all UNKNOWN');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
