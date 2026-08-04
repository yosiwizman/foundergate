import { compareRuntime } from '../../src/runtime_reality/runtime-reality.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const exp={tools:['a'],processes:['w'],destinations:[],filesystem_writes:['x'],duration:60,evidence_stream:'ok',stop_state:'not_required'};
// 16 match
ok(compareRuntime(exp,{...exp,duration:10}).overall==='MATCH','16a expected==observed → MATCH');
// drift/violation detected
ok(compareRuntime(exp,{...exp,tools:['a','curl'],duration:10}).overall==='VIOLATION','16b unexpected tool → VIOLATION');
ok(compareRuntime(exp,{...exp,destinations:['evil'],duration:10}).overall==='VIOLATION','16c unexpected destination → VIOLATION');
// 17 deadline
ok(compareRuntime(exp,{...exp,duration:120}).overall==='VIOLATION','17 duration beyond deadline → VIOLATION');
// unknown when unobserved
ok(compareRuntime(exp,{}).overall==='UNKNOWN','unobserved → UNKNOWN');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
