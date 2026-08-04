import { runOuterController } from '../../src/outer_controller/outer-controller.mjs';
import { FIXTURES } from './fixtures/fixtures.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const fx=Object.fromEntries(FIXTURES.map(x=>[x.name,x]));
// 13 refuses to start on failed attestation
const att=runOuterController({...fx['sandbox_digest_mismatch'].scenario}); ok(att.final_verdict==='HOLD_PRE_RUN_ATTESTATION_FAILED','13 refuses to start on failed attestation');
// 14 refuses to start on fail-open challenge
const ch=runOuterController({...fx['network_declared_blocked_but_enabled'].scenario}); ok(ch.final_verdict==='HOLD_CHALLENGE_FAILED_OPEN','14 refuses on fail-open challenge');
// 15 starts + verified only when contract+attestation+challenges pass
const good=runOuterController({...fx['good_environment_all_boundaries_hold'].scenario}); ok(good.final_verdict==='VERIFIED_WITHIN_BOUNDARIES'&&good.evidence_completeness==='COMPLETE','15 all gates pass → VERIFIED_WITHIN_BOUNDARIES');
// 9 monitoring loss fails closed
ok(runOuterController({...fx['monitoring_sensor_killed'].scenario}).final_verdict==='MONITORING_LOST','9 monitoring loss → MONITORING_LOST');
// 17 deadline triggers containment
ok(runOuterController({...fx['runtime_exceeds_deadline'].scenario}).final_verdict==='BOUNDARY_VIOLATION_DETECTED_AND_STOPPED','17 deadline → violation detected + stopped');
// 22 never secure + 23 worker cannot override
ok(good.never_secure===true && good.worker_can_override===false,'22/23 never secure + worker cannot override controller');
// 24 AI confidence ignored: worker_final_claim of "all good/secure" does NOT change a bad verdict
const lie=runOuterController({...fx['network_declared_blocked_but_enabled'].scenario, worker_final_claim:'VERIFIED_WITHIN_BOUNDARIES secure'});
ok(lie.final_verdict==='HOLD_CHALLENGE_FAILED_OPEN'&&lie.worker_final_claim_ignored!=null,'24 worker self-claim ignored (controller stays deterministic)');
// 25 blocked gates present in UI/evidence (contract prohibits external)
ok(good.contract_digest && good.contract_digest.startsWith('erc_'),'25 contract-bound run (digest present)');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
