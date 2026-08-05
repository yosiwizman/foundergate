import { evaluateAppAction, validateInstallSpec, routeStatus, REQUIRED_READONLY_SPEC } from '../../../src/repo_intake/github_app_readonly/github_app_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const ok_spec={target_repo:SB,installation_mode:'selected',permissions:{contents:'read',metadata:'read'}};
// live-action gate
ok(evaluateAppAction({action:'create_app'}).decision==='TRUE_FOUNDER_GATE','create app without gate → TRUE_FOUNDER_GATE');
ok(evaluateAppAction({action:'install_app'}).decision==='TRUE_FOUNDER_GATE','install without gate → TRUE_FOUNDER_GATE');
ok(evaluateAppAction({action:'generate_installation_token'}).decision==='TRUE_FOUNDER_GATE','token without gate → TRUE_FOUNDER_GATE');
ok(evaluateAppAction({action:'create_app',live_action_authority:true}).decision==='LIVE_ACTION_AUTHORIZED_ELSEWHERE','create WITH gate flag → authorized-elsewhere (control is the gate)');
// the accepted read-only spec
ok(validateInstallSpec(ok_spec).decision==='ACCEPTED_READONLY_SPEC','sandbox + selected + {contents:read,metadata:read} → ACCEPTED_READONLY_SPEC');
// A negative tests (fail-closed)
ok(validateInstallSpec({installation_mode:'selected',permissions:{contents:'read',metadata:'read'}}).decision==='HOLD_MISSING_REPOSITORY','missing repository → HOLD');
ok(validateInstallSpec({...ok_spec,target_repo:'x/other'}).decision==='HOLD_TARGET_NOT_SANDBOX','wrong repository → HOLD');
ok(validateInstallSpec({...ok_spec,target_repo:'notarepo'}).decision==='HOLD_MALFORMED','malformed repository → HOLD_MALFORMED');
ok(validateInstallSpec({...ok_spec,installation_mode:'all'}).decision==='HOLD_SCOPE_UNSAFE','all-repositories install → HOLD_SCOPE_UNSAFE');
ok(validateInstallSpec({...ok_spec,installation_mode:'multi'}).decision==='HOLD_SCOPE_UNSAFE','multi-repo install → HOLD_SCOPE_UNSAFE');
ok(validateInstallSpec({...ok_spec,installation_mode:'maybe'}).decision==='UNKNOWN','ambiguous install mode → UNKNOWN');
ok(validateInstallSpec({...ok_spec,installation_mode:undefined}).decision==='HOLD_MISSING_INSTALL_MODE','missing install mode → HOLD');
ok(validateInstallSpec({...ok_spec,permissions:{metadata:'read'}}).decision==='HOLD_MISSING_CONTENTS_PERMISSION','missing contents permission → HOLD');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'write',metadata:'read'}}).decision==='HOLD_WRITE_PERMISSION_BLOCKED','contents write → HOLD_WRITE_PERMISSION_BLOCKED');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read'}}).decision==='HOLD_MISSING_METADATA_PERMISSION','metadata missing → HOLD');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read',metadata:'read',made_up:'read'}}).decision==='HOLD_UNKNOWN_PERMISSION','unknown permission → HOLD_UNKNOWN_PERMISSION');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read',metadata:'read',actions:'write'}}).decision==='HOLD_FORBIDDEN_PERMISSION','actions write → HOLD_FORBIDDEN_PERMISSION');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read',metadata:'read',issues:'write'}}).decision==='HOLD_FORBIDDEN_PERMISSION','issues write → HOLD_FORBIDDEN_PERMISSION');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read',metadata:'read',pull_requests:'write'}}).decision==='HOLD_FORBIDDEN_PERMISSION','pull requests write → HOLD_FORBIDDEN_PERMISSION');
ok(validateInstallSpec({...ok_spec,permissions:{contents:'read',metadata:'read',administration:'write'}}).decision==='HOLD_FORBIDDEN_PERMISSION','additional unexpected permission (admin) → HOLD_FORBIDDEN_PERMISSION');
ok(validateInstallSpec({...ok_spec,permissions:'nope'}).decision==='HOLD_MALFORMED','malformed permission object → HOLD_MALFORMED');
ok(validateInstallSpec({...ok_spec,permissions:undefined}).decision==='HOLD_MISSING_PERMISSIONS','missing permissions → HOLD');
ok(validateInstallSpec(null).decision==='HOLD_MALFORMED','null spec → HOLD_MALFORMED');
// route status + spec
ok(routeStatus().status==='TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED' && routeStatus().proven===false,'route status gated; never proven');
ok(REQUIRED_READONLY_SPEC.proof_status==='LOCAL_ONLY_PREPARED','required spec LOCAL_ONLY_PREPARED');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
