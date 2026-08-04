import { classifyFiles } from '../../../src/repo_intake/private_repo_readonly/private_repo_secret_classifier.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const r=classifyFiles([
  {path:'.env',sample:'API_KEY=sk-FAKE1234567890abcdefghij'},
  {path:'certs/k.pem',sample:'-----BEGIN PRIVATE KEY-----'},
  {path:'db.js',sample:'postgres://u:p@host/db'},
  {path:'data/customers.csv',sample:'ssn 123-45-6789'},
  {path:'README.md',sample:'# hello'},
]);
ok(r.held_count===4 && r.status==='HELD_SENSITIVE_FILES','4 sensitive files held; README safe');
ok(r.by_type.dotenv_file>=1 && r.by_type.private_key>=1 && r.by_type.database_url>=1 && r.by_type.personal_customer_data>=1,'.env/private-key/db-url/customer-data classified');
ok(r.contents_never_sent_to_model===true && r.secrets_in_evidence===false && r.fail_closed===true,'contents never sent to model; no secrets in evidence; fail closed');
ok(classifyFiles([{path:'README.md',sample:'clean'}]).status==='CLEAN','clean repo → CLEAN');
ok(JSON.stringify(r).indexOf('sk-FAKE')===-1,'raw secret sample NOT in classifier output (fingerprints/paths only)');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
