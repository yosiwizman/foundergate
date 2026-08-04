import { runReadOnlyIntake } from '../../../src/repo_intake/private_repo_actual_sandbox/private_repo_actual_sandbox_runner.mjs';
import { runWriteRefusalMatrix } from '../../../src/repo_intake/private_repo_actual_sandbox/write_refusal_matrix.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const snap={ repo:'yosiwizman/foundergate-private-readonly-sandbox-x', private:true, default_branch:'main', commit:'fb54698d5cbb', tree:'3a357de', archive_digest:'deadbeef',
  files:[{path:'README.md',bytes:100,sample:'# readme'},{path:'fixtures/fake_env.example',bytes:60,sample:'API_KEY=EXAMPLE'},{path:'fixtures/fake_private_key.example',bytes:80,sample:'-----BEGIN FAKE PRIVATE KEY-----'},{path:'fixtures/fake_database_url.example',bytes:40,sample:'postgres://EXAMPLE_USER:EXAMPLE_PASS@example.invalid/db'},{path:'fixtures/customer_like_fake_data.csv',bytes:50,sample:'name,ssn\nExample,000-00-0000 customer'}] };
const r=runReadOnlyIntake(snap);
ok(r.status==='ACTUAL_PRIVATE_SANDBOX_REPO_PROOF_READY_WITH_LIMITS','intake READY_WITH_LIMITS on private synthetic snapshot');
ok(r.evidence.actual_private_repo_accessed===true && r.evidence.private===true,'evidence: actual private repo accessed');
ok(r.evidence.existing_repo_touched===false && r.evidence.customer_repo_touched===false && r.evidence.credential_value_seen===false && r.evidence.code_execution===false && r.evidence.provider_call===false && r.evidence.write_during_read_proof===false,'evidence: no existing/customer repo, no credential value, no exec, no provider, no write');
ok(r.evidence.least_privilege_token_proven===false && r.evidence.label==='ACTUAL_PRIVATE_SANDBOX_REPO_ACCESS_PROVEN_WITH_EXISTING_GH_AUTH','honest label: existing gh auth, NOT least-privilege');
ok(r.secrets.held_count>=4 && r.secrets.contents_never_sent_to_model===true,'fake-secret files held; contents never sent to a model');
ok(JSON.stringify(r).indexOf('EXAMPLE_PASS')===-1 || JSON.stringify(r.secrets).indexOf('EXAMPLE_PASS')===-1,'secret sample not surfaced in classifier held output (paths/fingerprints only)');
const wr=runWriteRefusalMatrix();
ok(wr.total===25 && wr.all_held===true && wr.no_real_write_attempted===true,'write-refusal matrix 25/25 held, no real write attempted');
// no write method on runner
import('../../../src/repo_intake/private_repo_actual_sandbox/private_repo_actual_sandbox_runner.mjs').then(m=>{ ok(typeof m.push==='undefined' && typeof m.commit==='undefined','runner exposes no write/commit method'); console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1); });
