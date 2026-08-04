import { runIntake } from '../../../src/repo_intake/private_repo_least_privilege/least_privilege_deploy_key_runner.mjs';
import { runWriteRefusalMatrix } from '../../../src/repo_intake/private_repo_least_privilege/write_refusal_matrix.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const files=[{path:'README.md',bytes:100,sample:'# r'},{path:'fixtures/fake_env.example',bytes:60,sample:'API_KEY=EXAMPLE'},{path:'fixtures/fake_private_key.example',bytes:80,sample:'-----BEGIN FAKE PRIVATE KEY-----'},{path:'fixtures/fake_database_url.example',bytes:40,sample:'postgres://EXAMPLE_USER:EXAMPLE_PASS@example.invalid/db'},{path:'fixtures/customer_like_fake_data.csv',bytes:50,sample:'ssn 000-00-0000 customer'}];
const lc={revoked:true,post_revocation_failed:true,private_key_destroyed:true};
const r=runIntake({repo:'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET',private:true,commit:'fb54698d5cbb',deploy_key_id:123,fingerprint:'SHA256:x',archive_digest:'d',files},lc);
ok(r.status==='LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS','READY only when private+read-only-key+deploy-key-only+revoked+post-fail+key-destroyed');
ok(r.evidence.credential_type==='READ_ONLY_DEPLOY_KEY' && r.evidence.deploy_key_read_only===true && r.evidence.broad_gh_auth_used_for_intake===false,'evidence: read-only deploy key; broad auth NOT used for intake');
ok(r.evidence.deploy_key_revoked===true && r.evidence.post_revocation_access_failed===true && r.evidence.private_key_destroyed===true,'evidence: revoked + post-revocation-failed + key destroyed');
ok(r.evidence.private_key_packaged===false && r.evidence.credential_value_seen===false && r.evidence.code_execution===false && r.evidence.provider_call===false,'evidence: no key packaged / no credential value / no exec / no provider');
ok(r.secrets.held_count>=4 && r.secrets.contents_never_sent_to_model===true,'fake secrets held; contents never sent to a model');
// NOT READY if revocation missing (fail-closed)
ok(runIntake({repo:'x/y',private:true,commit:'c',files},{revoked:false}).status==='PARTIAL_WITH_LIMITS','no revocation → PARTIAL (fail closed)');
const wr=runWriteRefusalMatrix();
ok(wr.total===25 && wr.all_held===true && wr.no_real_mutation_attempted===true,'write-refusal 25/25 held; no real mutation');
ok(JSON.stringify(r.secrets).indexOf('EXAMPLE_PASS')===-1,'secret sample not surfaced in classifier held output');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
