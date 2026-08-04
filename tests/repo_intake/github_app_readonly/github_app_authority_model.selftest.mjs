import { evaluateAppAction, routeStatus, REQUIRED_READONLY_SPEC } from '../../../src/repo_intake/github_app_readonly/github_app_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
ok(evaluateAppAction({action:'create_app'}).decision==='TRUE_FOUNDER_GATE','no app creation without founder gate');
ok(evaluateAppAction({action:'install_app'}).decision==='TRUE_FOUNDER_GATE','no installation without founder gate');
ok(evaluateAppAction({action:'generate_installation_token'}).decision==='TRUE_FOUNDER_GATE','no token generation without founder gate');
ok(evaluateAppAction({action:'spec',repository_selection:'all'}).decision==='HOLD_SCOPE_UNSAFE','no all-repos install');
ok(evaluateAppAction({action:'spec',repository_selection:'multi'}).decision==='HOLD_SCOPE_UNSAFE','no multi-repo install');
ok(evaluateAppAction({action:'spec',repository_selection:'selected',permissions:{contents:'write'}}).decision==='HOLD_WRITE_PERMISSION_BLOCKED','no write scope');
ok(evaluateAppAction({action:'spec',repository_selection:'selected',permissions:{administration:true}}).decision==='HOLD_ADMIN_PERMISSION_BLOCKED','no admin scope');
ok(evaluateAppAction({action:'spec',repository_selection:'selected',permissions:{workflows:true}}).decision==='HOLD_WORKFLOW_PERMISSION_BLOCKED','no workflow scope');
ok(evaluateAppAction({action:'spec',repository_selection:'selected',permissions:{contents:'read'},target_repo:SB}).decision==='ACCEPTED_READONLY_SPEC','sandbox-only contents-read accepted spec');
ok(evaluateAppAction({action:'spec',repository_selection:'selected',permissions:{contents:'read'},target_repo:'x/other'}).decision==='HOLD_TARGET_NOT_SANDBOX','non-sandbox target refused');
// creation WITH authority flag would be allowed only when a separate gate set it — proves the gate is the control
ok(evaluateAppAction({action:'create_app',live_action_authority:true}).decision!=='TRUE_FOUNDER_GATE','with founder-gate authority, creation is no longer auto-gated (control is the gate flag)');
ok(routeStatus({live_action_authority:false}).status==='TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED' && routeStatus().proven===false,'route status: gate required; never proven; no key/token seen');
ok(REQUIRED_READONLY_SPEC.proof_status==='LOCAL_ONLY_PREPARED','required spec is LOCAL_ONLY_PREPARED (never proven)');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
