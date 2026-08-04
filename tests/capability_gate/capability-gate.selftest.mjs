import { issueCapability, validateCapability } from '../../src/capability_gate/capability-gate.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const g=issueCapability({allowed_destinations:['ev'],nonce:'n1',expires_at:100});
const ctx={now:10,capability:g.capability,destination:'ev',execution_machine_id:g.execution_machine_id,execution_image_digest:g.execution_image_digest};
ok(validateCapability(g,ctx,new Set()).valid===true,'valid grant → VERIFIED_HARDWARE_GATED_CAPABILITY');
// 10 changes invalidate
ok(validateCapability(g,{...ctx,destination:'evil'},new Set()).status==='AUTHORIZATION_INVALID','10a wrong destination invalidates');
ok(validateCapability(g,{...ctx,execution_machine_id:'x'},new Set()).status==='AUTHORIZATION_INVALID','10b wrong machine invalidates');
ok(validateCapability(g,{...ctx,execution_image_digest:'x'},new Set()).status==='AUTHORIZATION_INVALID','10c wrong image invalidates');
ok(validateCapability({...g,capability:'root'},ctx,new Set()).status==='AUTHORIZATION_INVALID','10d tampered capability (digest mismatch) invalid');
// 11 expired
ok(validateCapability(g,{...ctx,now:999},new Set()).status==='AUTHORIZATION_EXPIRED','11 expired grant rejected');
// 12 reused nonce
ok(validateCapability(g,ctx,new Set(['n1'])).status==='AUTHORIZATION_INVALID','12 reused nonce rejected');
// 13 execution env cannot self-authorize
ok(validateCapability(g,{...ctx,requested_by:'execution_environment',self_authorized:true},new Set()).status==='AUTHORIZATION_INVALID','13 execution env cannot self-authorize');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
