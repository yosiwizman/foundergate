// Environment Integrity self-test — proof 24. LOCAL / DETERMINISTIC.
import { environmentIntegrity } from '../../src/environment_integrity/environment-integrity.mjs';
let p=0,f=0; const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 24 missing evidence → UNKNOWN (not sealed)
const miss = environmentIntegrity({ observations: { tools: null, drift: null, boundary: null, runtime_boundary: null, continuous: null } });
ok(miss.unknown >= 1 && miss.environment_seal.sealed === false && miss.environment_seal.status === 'HOLD_UNSEALED', '24 environment integrity marks missing evidence UNKNOWN + not sealed');
// all present → sealed local
const good = environmentIntegrity({});
ok(good.status === 'VERIFIED_LOCAL' && good.environment_seal.sealed === true && good.checks.find(c=>c.name==='network_verification').classification==='BLOCKED', 'all-good → SEALED_LOCAL; network=BLOCKED (no external call)');
// a violation → VIOLATION, not sealed
const viol = environmentIntegrity({ observations: { boundary: 'breached' } });
ok(viol.violations === 1 && viol.environment_seal.sealed === false, 'boundary breach → VIOLATION, not sealed');
console.log(f===0?`\nALL GREEN: ${p}/${p} environment-integrity proofs passed.`:`\nRED: ${f}/${p+f} failed.`);
process.exit(f===0?0:1);
