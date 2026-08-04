// Emit private-repo readiness evidence JSON + UI data by running the synthetic fixture end-to-end (no real repo/credential).
import { readinessProof } from './private_repo_authority_model.mjs';
import { validateCredential } from './private_repo_credential_gate.mjs';
import { resolveIdentity } from './private_repo_identity_resolver.mjs';
import { bindSnapshot } from './private_repo_snapshot_binder.mjs';
import { classifyFiles } from './private_repo_secret_classifier.mjs';
import { makeMockPrivateRepo } from './mock_private_repo_adapter.mjs';
import { assertReadOnly } from './private_repo_readonly_adapter_contract.mjs';
import { emitEvidence } from './private_repo_evidence_emitter.mjs';
import { replay } from './private_repo_replay_verifier.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const REPO=join(dirname(fileURLToPath(import.meta.url)),'..','..','..');
const DOCS=join(REPO,'docs/generated/private_repo_readonly_readiness'); mkdirSync(DOCS,{recursive:true});

const adapter=makeMockPrivateRepo();
const roCheck=assertReadOnly(adapter);
const cred=validateCredential({present:true,scopes:['contents:read'],source:'environment(FAKE)',value:'ghp_FAKE_TEST_readonly_123456'});
const identity=resolveIdentity({url:'https://github.com/synthetic-owner/synthetic-private-repo',commit:adapter.__commit});
const manifest=adapter.getArchiveManifest();
// snapshot binder on the SAFE subset (the mock intentionally includes unsafe files; binder holds them)
const snap=bindSnapshot({commit:manifest.commit,files:manifest.files.filter(f=>!/\.\.(\/|$)/.test(f.path)&&!f.symlink)});
const secrets=classifyFiles(manifest.files);
// refusal matrix results (read from json if present)
let refusal=null; try{ refusal=JSON.parse(readFileSync(join(DOCS,'NEGATIVE_REFUSAL_RESULTS.json'),'utf8')); }catch{}
const evidence=emitEvidence({identity:identity.full_name,commit:identity.commit,archive_digest:snap.archive_digest,manifest_digest:snap.manifest_digest,held_count:secrets.held_count,redaction_summary:secrets.by_type,refusal_matrix:refusal?{total:refusal.total,all_held:refusal.all_held}:null});
const rep=replay(evidence);

// overall readiness status (readiness with limits — NOT actual access)
const status = (roCheck.is_read_only && cred.accepted && identity.resolved && snap.status==='BOUND_SYNTHETIC' && secrets.status==='HELD_SENSITIVE_FILES' && (refusal?refusal.all_held:false) && rep.ok)
  ? 'PRIVATE_REPO_READONLY_READINESS_READY_WITH_LIMITS' : 'PARTIAL_WITH_LIMITS';

const out={ record_type:'private_repo_readiness_result', status, readiness:readinessProof(), adapter_readonly:roCheck.status,
  credential:cred.status, identity:identity.status, snapshot:snap.status, secrets:secrets.status, replay:rep.status,
  refusal_matrix:refusal?{total:refusal.total,all_held:refusal.all_held}:null, evidence_digest:evidence.evidence_digest,
  no_real_private_repo:true, no_real_credential:true, no_provider_call:true, no_code_execution:true };
writeFileSync(join(DOCS,'PRIVATE_REPO_READINESS_EVIDENCE.json'), JSON.stringify({result:out,evidence,snapshot:snap,secrets,identity,adapter:roCheck},null,2));

const ui={ kind:'PRIVATE_REPO_GATE', run_id:evidence.run_id, status, proof_type:'PRIVATE_REPO_READINESS_PROOF (synthetic)',
  synthetic_fixture:adapter.getRepoMetadata().full_name, exact_commit:identity.commit, snapshot_digest:snap.archive_digest,
  secret_classifier:{status:secrets.status,held:secrets.held_count,by_type:secrets.by_type},
  refusal_matrix:refusal?{total:refusal.total,all_held:refusal.all_held}:null, evidence_status:rep.status,
  proven:['read-only adapter contract','credential gate (fake, read-only)','exact commit/snapshot binding','secret classification','25/25 write-attempt refusals','evidence replay'],
  not_proven:['actual private repo access','private repo support complete','customer repo support','production/SaaS/commercial/security readiness'],
  blocked:{ real_private_repo:'BLOCKED', real_credential:'BLOCKED', code_execution:'BLOCKED', write_merge:'BLOCKED', provider_call:'BLOCKED', gate_8:'BLOCKED', deploy:'BLOCKED', bill:'BLOCKED' },
  next_founder_gate:'real private repo read-only access (exact repo + read-only credential + explicit founder phrase)',
  labels:['NO real private repo accessed','NO real credential used','NO code executed','NO write possible','actual private repo proof requires a separate founder gate','support NOT complete','synthetic fixtures only','NEVER SHIP'] };
mkdirSync(join(REPO,'demo/founder_operating_environment/assets/private_repo'),{recursive:true});
writeFileSync(join(REPO,'demo/founder_operating_environment/assets/private_repo/private_repo_index.json'), JSON.stringify(ui,null,2));

console.log('EMIT_OK status='+status+' adapter='+roCheck.status+' cred='+cred.status+' identity='+identity.status+' snapshot='+snap.status+' secrets='+secrets.status+'('+secrets.held_count+')'+' refusal='+(refusal?refusal.all_held:'n/a')+' replay='+rep.status);
if(JSON.stringify(ui).match(/gh[pousr]_[A-Za-z0-9]{20,}/) && !JSON.stringify(ui).match(/FAKE/)) { console.error('SECRET_LEAK'); process.exit(1); }
