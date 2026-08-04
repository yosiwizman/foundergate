import { makeRegister } from '../../src/physical_containment/physical-assumption-register.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const r=makeRegister({});
ok(r.declared===12&&r.verified===12&&r.violated===0&&r.all_clear===true,'12 assumptions verified, all clear');
ok(makeRegister({PA01:{observed:'violated'}}).register_action==='QUARANTINE','violated assumption → QUARANTINE');
ok(makeRegister({PA02:{observed:null}}).register_action==='PAUSE','unknown assumption → PAUSE');
ok(r.items[0].continuous_monitoring_required===true&&r.items[0].violation_response,'each assumption has monitoring + violation response');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
