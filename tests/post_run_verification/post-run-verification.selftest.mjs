import { postRunVerification } from '../../src/post_run_verification/post-run-verification.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// clean → verified within boundaries
ok(postRunVerification({evidence_completeness:'COMPLETE',violations:[],teardown_evidence:true}).status==='VERIFIED_WITHIN_BOUNDARIES','clean → VERIFIED_WITHIN_BOUNDARIES');
// 20 catches residual process record
ok(postRunVerification({evidence_completeness:'COMPLETE',violations:[],residual_process_record:true}).checks.find(c=>c.name==='no_residual_worker_process').ok===false,'20 residual process record caught');
// 21 catches incomplete evidence
ok(postRunVerification({evidence_completeness:'PARTIAL',violations:[]}).status==='EVIDENCE_INCOMPLETE','21 incomplete evidence → EVIDENCE_INCOMPLETE');
// violation stopped vs unconfirmed
ok(postRunVerification({evidence_completeness:'COMPLETE',violations:['tools'],stop_status:'STOP_CONFIRMED',teardown_evidence:true}).status==='BOUNDARY_VIOLATION_DETECTED_AND_STOPPED','violation+stop → DETECTED_AND_STOPPED');
ok(postRunVerification({evidence_completeness:'COMPLETE',violations:['tools'],stop_status:'STOP_UNCONFIRMED'}).status==='BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED','violation+no stop → STOP_UNCONFIRMED');
// 22 never secure
ok(postRunVerification({evidence_completeness:'COMPLETE',violations:[]}).never_secure===true && !/secure/i.test(postRunVerification({evidence_completeness:'COMPLETE',violations:[]}).status),'22 final status never says "secure"');
// 23 worker cannot self-certify
ok(postRunVerification({}).worker_can_self_certify===false,'23 worker cannot self-certify final status');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
