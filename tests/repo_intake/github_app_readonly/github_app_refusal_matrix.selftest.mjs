import { runRefusalMatrix } from '../../../src/repo_intake/github_app_readonly/github_app_refusal_matrix.mjs';
import { writeFileSync } from 'node:fs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const r=runRefusalMatrix();
ok(r.total===34,'34 refusal cases');
ok(r.all_held===true,'all 34 held');
ok(r.no_live_action_performed===true && r.no_secret_exposed===true,'no live action; no secret exposed');
for(const c of r.results){ if(!c.pass) console.log('  FAIL case '+c.id+' '+c.desc+' expected='+c.expected+' got='+c.got); }
writeFileSync('/Users/yosiwizman/.foundergate/workspaces/widebuild_wave1b_validation_20260731T1840ET/worktrees/wave1b/docs/generated/github_app_readonly_local_macro/WRITE_AND_ABUSE_REFUSAL_RESULTS.json',JSON.stringify(r,null,2));
console.log(f===0 && r.all_held?`\nALL GREEN: ${r.passed}/${r.total}`:`\nRED`);process.exit(f===0 && r.all_held?0:1);
