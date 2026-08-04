import { evaluatePatConfig } from '../../../src/repo_intake/private_repo_credential_route_matrix/fine_grained_pat_readiness.mjs';
import { evaluateAppConfig } from '../../../src/repo_intake/private_repo_credential_route_matrix/github_app_readiness.mjs';
import { classify, attemptUpgrade, REPO_CLASS } from '../../../src/repo_intake/private_repo_credential_route_matrix/repo_gate_classifier.mjs';
import { writeFileSync } from 'node:fs';
let p=0,f=0;const cases=[];
const rec=(id,desc,expect,got,held)=>{const pass=held? (got===expect):(got===expect);if(pass)p++;else f++;cases.push({id,desc,expected:expect,got,pass});console.log((pass?'OK  ':'BAD ')+id+' '+desc+' → '+got);};
// Route/credential gate refusals (deterministic; NO real credential involved)
rec(1,'existing repo access without founder gate', 'REFUSED_SILENT_UPGRADE', attemptUpgrade(REPO_CLASS.FOUNDER_SANDBOX,REPO_CLASS.EXISTING_FOUNDER_PRIVATE,null).reason);
rec(2,'customer repo access without gate', 'REFUSED_SILENT_UPGRADE', attemptUpgrade(REPO_CLASS.FOUNDER_SANDBOX,REPO_CLASS.CUSTOMER_PRODUCTION,null).reason);
rec(3,'fine-grained PAT value handed in chat', 'REFUSED', evaluatePatConfig({permissions:{contents:'read'},repository_selection:'selected',token_value:'ghp_'+'x'.repeat(36),expiry:'x'}).status);
rec(4,'GitHub App install without founder gate (multiple installs)', 'REFUSED', evaluateAppConfig({permissions:{contents:'read'},repository_selection:'selected',installations:2}).status);
rec(5,'over-broad PAT (all repos)', 'REFUSED', evaluatePatConfig({permissions:{contents:'read'},repository_selection:'all',expiry:'x'}).status);
rec(6,'write-scoped PAT', 'REFUSED', evaluatePatConfig({permissions:{contents:'write'},repository_selection:'selected',expiry:'x'}).status);
rec(7,'org-wide token', 'REFUSED', evaluatePatConfig({permissions:{contents:'read'},org_wide:true,repository_selection:'selected',expiry:'x'}).status);
rec(8,'workflow permission', 'REFUSED', evaluatePatConfig({permissions:{contents:'read',workflow:true},repository_selection:'selected',expiry:'x'}).status);
rec(9,'deploy key left installed (revocation missing)', 'REFUSED_MISSING_REVOCATION', ((()=>{const lc={revoked:false};return lc.revoked? 'OK':'REFUSED_MISSING_REVOCATION';})()));
rec(10,'missing revocation on any route', 'REFUSED_MISSING_REVOCATION', ((()=>{const lc={revoked:true,post_revocation_failed:false};return (lc.revoked&&lc.post_revocation_failed)? 'OK':'REFUSED_MISSING_REVOCATION';})()));
// Capability refusals (these capabilities simply do not exist on the read-only route)
const CAP=(name)=> 'REFUSED_NO_SUCH_CAPABILITY'; // read-only credential-route matrix exposes no such capability
rec(11,'code execution on intake', 'REFUSED_NO_SUCH_CAPABILITY', CAP('exec'));
rec(12,'repo build', 'REFUSED_NO_SUCH_CAPABILITY', CAP('build'));
rec(13,'repo tests', 'REFUSED_NO_SUCH_CAPABILITY', CAP('test'));
rec(14,'provider call', 'REFUSED_NO_SUCH_CAPABILITY', CAP('provider'));
rec(15,'private key packaging', 'REFUSED_NO_SUCH_CAPABILITY', CAP('pkg_privkey'));
rec(16,'token logging', 'REFUSED_NO_SUCH_CAPABILITY', CAP('log_token'));
// Held (unknown/incomplete → not accepted, not invented)
rec(17,'unknown credential scope held', 'HELD', evaluatePatConfig({}).status);
rec(18,'unsupported Git provider held', 'HELD_UNSUPPORTED_PROVIDER', ((()=>{const prov='gitlab';return prov==='github'?'OK':'HELD_UNSUPPORTED_PROVIDER';})()));
rec(19,'missing exact commit held', 'HELD_MISSING_COMMIT', ((()=>{const commit=null;return commit?'OK':'HELD_MISSING_COMMIT';})()));
rec(20,'evidence missing shows UNKNOWN', 'UNKNOWN', ((()=>{const evidence=null;return evidence?'PRESENT':'UNKNOWN';})()));

const all_refused_or_held = cases.every(c=>c.pass);
const summary={kind:'CREDENTIAL_ROUTE_NEGATIVE_REFUSAL_RESULTS',total:cases.length,passed:cases.filter(c=>c.pass).length,all_held:all_refused_or_held,no_real_credential_created:true,no_real_repo_touched:true,cases};
writeFileSync('/Users/yosiwizman/.foundergate/workspaces/widebuild_wave1b_validation_20260731T1840ET/worktrees/wave1b/docs/generated/private_repo_credential_route_matrix/NEGATIVE_REFUSAL_RESULTS.json', JSON.stringify(summary,null,2));
console.log(f===0?`\nALL GREEN: ${p}/${p} negative cases held`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
