import { createEvidencePlane, appendEvent, recordStreams, sealEvidencePlane, classifyCompleteness, verifyChain } from '../../src/evidence_plane/evidence-plane.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 11 append-only + outside worker control
const pl=createEvidencePlane({run_id:'x'}); ok(pl.worker_writable===false,'11 evidence plane worker_writable=false (outside worker)');
appendEvent(pl,'a','1'); const d1=sealEvidencePlane(pl).evidence_plane_digest; appendEvent(pl,'b','2'); const d2=sealEvidencePlane(pl).evidence_plane_digest;
ok(d1!==d2,'11b append-only chain digest changes on each append');
ok(verifyChain(pl,d2)===true && verifyChain(pl,d1)===false,'11c tampered/old digest rejected by chain verify');
// 12 completeness states
recordStreams(pl,{contract_digest:'c',runtime_digest:'r',worker_identity:'w',pre_run_attestation:'a',challenge_results:'ch',monitor_health:'ok',post_run_verification:'pv'});
ok(sealEvidencePlane(pl).completeness==='COMPLETE','12a all required streams → COMPLETE');
ok(classifyCompleteness(pl,{monitoring_lost:true})==='MONITORING_LOST','12b monitoring lost → MONITORING_LOST');
ok(classifyCompleteness(pl,{gap_detected:true})==='INCOMPLETE','12c gap → INCOMPLETE');
const empty=createEvidencePlane({}); ok(classifyCompleteness(empty)==='UNKNOWN','12d no streams → UNKNOWN');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
