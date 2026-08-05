import { runRefusalMatrix } from '../../../src/repo_intake/github_app_readonly/github_app_refusal_matrix.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const r=runRefusalMatrix();
ok(r.all_held===true,`all ${r.total} refusal cases held`);
for(const c of r.results){ if(!c.pass) console.log('  FAIL '+c.id+' ['+c.kind+'] '+c.desc+' expected='+c.expected+' got='+c.got); }
ok(r.executable_refusal_paths_tested>=35,`>=35 EXECUTABLE refusal paths (actually ${r.executable_refusal_paths_tested})`);
ok(r.executable_refusal_paths_passed===r.executable_refusal_paths_tested,'all executable refusal paths pass');
ok(r.catalog_only_policy_assertions>=1,`catalog-only policy assertions counted separately (${r.catalog_only_policy_assertions})`);
ok(r.executable_refusal_paths_tested+r.catalog_only_policy_assertions===r.total,'executable + catalog = total (no double counting)');
// every EXECUTABLE case must name a real enforcement function
const execCases=r.results.filter(c=>c.kind==='EXECUTABLE_REFUSAL_PATH');
ok(execCases.every(c=>c.enforcement_fn && ['evaluateAppAction','validateInstallSpec','scanForSecrets','replay','assertNotRealProof','validateContract'].includes(c.enforcement_fn)),'every executable case invokes a real enforcement function');
// no THREW
ok(r.results.every(c=>!String(c.got).startsWith('THREW:')),'no case threw an exception');
ok(r.no_live_action_performed===true && r.no_secret_exposed===true,'no live action; no secret exposed');
console.log(f===0 && r.all_held?`\nALL GREEN: ${r.passed}/${r.total} (executable ${r.executable_refusal_paths_tested}, catalog ${r.catalog_only_policy_assertions})`:`\nRED`);
process.exit(f===0 && r.all_held?0:1);
