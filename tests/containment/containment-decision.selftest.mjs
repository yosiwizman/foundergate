// Containment self-test — proof 27 (requires evidence before shutdown). LOCAL / DETERMINISTIC.
import { containmentDecision } from '../../src/containment/containment-decision.mjs';
let p=0,f=0; const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// clean → CONTINUE
ok(containmentDecision({ assumption_action:'CONTINUE', environment_status:'VERIFIED_LOCAL', execution_status:'VERIFIED_LOCAL', boundary_action:'CONTINUE' }).decision === 'CONTINUE', 'clean inputs → CONTINUE');
// unknown → PAUSE (fail closed)
ok(containmentDecision({ environment_status:'UNKNOWN', execution_status:'VERIFIED_LOCAL' }).decision === 'PAUSE', 'unknown env → PAUSE (fail closed)');
// violation → QUARANTINE, but 27: shutdown requires evidence first
const noEv = containmentDecision({ environment_status:'VIOLATION' });
ok(noEv.decision === 'QUARANTINE' && noEv.status === 'HOLD_SHUTDOWN_WITHOUT_EVIDENCE', '27 containment requires evidence before shutdown');
const withEv = containmentDecision({ environment_status:'VIOLATION', pre_shutdown_evidence:'captured' });
ok(withEv.decision === 'QUARANTINE' && withEv.status === 'QUARANTINE', 'with pre-shutdown evidence → QUARANTINE proceeds');
console.log(f===0?`\nALL GREEN: ${p}/${p} containment proofs passed.`:`\nRED: ${f}/${p+f} failed.`);
process.exit(f===0?0:1);
