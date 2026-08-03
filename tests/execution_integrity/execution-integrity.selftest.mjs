// Execution Integrity self-test — proof 25 (fails closed without evidence). LOCAL / DETERMINISTIC.
import { executionIntegrity } from '../../src/execution_integrity/execution-integrity.mjs';
let p=0,f=0; const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 25 fails closed without evidence
const none = executionIntegrity({ observations: {} });
ok(none.unknown === 10 && none.fails_closed === true && none.status === 'HOLD_MISSING_EVIDENCE', '25 execution integrity fails closed without evidence (all UNKNOWN)');
// all good → verified local
const good = executionIntegrity({ observations: { process_integrity:'intact', process_ownership:'self_owned', runtime_capability:'local_only', runtime_permission:'least_privilege', credentials:'none_present', secrets:'no_secrets', filesystem:'intact', mounts:'expected_mounts', container:'known', sandbox:'local_synthetic_only' } });
ok(good.status === 'VERIFIED_LOCAL' && good.violations === 0 && /NOT a proof of real sandbox/.test(good.limit), 'all-good → VERIFIED_LOCAL with honest sandbox limit');
// a credential present → VIOLATION
const viol = executionIntegrity({ observations: { credentials:'API_KEY_FOUND' } });
ok(viol.violations >= 1 && viol.fails_closed === true, 'credential present → VIOLATION, fails closed');
console.log(f===0?`\nALL GREEN: ${p}/${p} execution-integrity proofs passed.`:`\nRED: ${f}/${p+f} failed.`);
process.exit(f===0?0:1);
