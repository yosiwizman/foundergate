import { resumeDecision } from "./resume-guard.mjs";
let p=0,f=0; const ok=(n,c)=>{c?p++:(f++,console.error("FAIL",n));};
ok("no state -> fresh",resumeDecision({}).decision==="START_FRESH");
ok("interrupted -> resume",resumeDecision({recoveryState:{run_id:"r",status:"INTERRUPTED",step:3}}).decision==="RESUME");
ok("completed -> refuse duplicate",resumeDecision({recoveryState:{run_id:"r",status:"COMPLETED"}}).decision==="REFUSE_DUPLICATE");
ok("run_id mismatch -> unknown",resumeDecision({recoveryState:{run_id:"a",status:"INTERRUPTED"},requestedRunId:"b"}).decision==="UNKNOWN");
ok("malformed -> unknown",resumeDecision({recoveryState:42}).decision==="UNKNOWN");
console.log(`resume-guard.selftest: ${p} passed, ${f} failed`); process.exit(f?1:0);
