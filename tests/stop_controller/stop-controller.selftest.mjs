import { decideStop, proveStopWithRealChild } from '../../src/stop_controller/stop-controller.mjs';
import { spawn } from 'node:child_process';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 18 persists evidence before stop (no pre-seal → HOLD_NO_STOP_EVIDENCE)
ok(decideStop({worker_stopped:true,descendants_terminated:true,verified_stopped:true,pre_stop_evidence_sealed:false}).status==='HOLD_NO_STOP_EVIDENCE','18 stop requires evidence sealed first');
// 19 process-tree stop proof required (missing descendants terminated → STOP_UNCONFIRMED)
ok(decideStop({pre_stop_evidence_sealed:true,worker_stopped:true,descendants_terminated:false,verified_stopped:false}).status==='STOP_UNCONFIRMED','19 no process-tree proof → STOP_UNCONFIRMED');
ok(decideStop({pre_stop_evidence_sealed:true,worker_stopped:true,descendants_terminated:true,verified_stopped:true}).status==='STOP_CONFIRMED','19b full teardown → STOP_CONFIRMED');
// REAL harmless child teardown proof
const r=await proveStopWithRealChild({spawn});
ok(r.spawned===true && r.was_alive===true && r.still_alive_after_stop===false && r.decision.status==='STOP_CONFIRMED','REAL child spawned+killed → STOP_CONFIRMED (verified not alive)');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
