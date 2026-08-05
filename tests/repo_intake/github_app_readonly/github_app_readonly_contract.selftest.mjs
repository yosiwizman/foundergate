import { validate, REQUIRED_FIELDS, CONTRACT } from '../../../src/repo_intake/github_app_readonly/github_app_readonly_contract.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const full={route_identity:'github_app_readonly',repo:SB,repo_private:true,installation_mode:'selected',permissions:{contents:'read',metadata:'read'},
  exact_commit:'f'.repeat(40),manifest_digest:'man_'+'a'.repeat(24),archive_digest:'arc_'+'b'.repeat(24),
  file_count:9,byte_count:1104,manifest_file_count:9,secret_classification:'HELD_SENSITIVE_FILES',held_secret_count:5,
  no_code_execution:true,no_build:true,no_repo_tests:true,no_provider_call:true,
  existing_repo_touched:false,customer_repo_touched:false,production_repo_touched:false,protected_main_touched:false,pr_200_touched:false,
  cleanup_status:'completed',evidence_replay_valid:true,refusal_evidence_valid:true,secret_contents_present:false};
// CORRECTION 4: schema-valid is NOT live proof.
ok(validate(full).status==='CANDIDATE_LIVE_CONTRACT_SCHEMA_VALID_NOT_PROOF','complete + semantically valid → CANDIDATE_LIVE_CONTRACT_SCHEMA_VALID_NOT_PROOF (NOT proof)');
ok(/NOT LIVE PROOF/i.test(validate(full).note) && /separate founder-gated/i.test(validate(full).note),'satisfied note states schema validation is not live proof + needs separate founder-gated pipeline');
ok(!/WOULD_BE_LIVE_PROOF/.test(JSON.stringify(validate(full))),'no WOULD_BE_LIVE_PROOF language remains');
// presence-only insufficiency + C negative tests (semantic)
ok(validate({}).status==='OVERCLAIM_REFUSED','empty → overclaim refused');
ok(validate({...full,exact_commit:'a'}).status==='HOLD_INVALID_COMMIT','one-char commit → HOLD_INVALID_COMMIT');
ok(validate({...full,exact_commit:'F'.repeat(40)}).status==='HOLD_INVALID_COMMIT','uppercase commit → HOLD_INVALID_COMMIT');
ok(validate({...full,exact_commit:'z'.repeat(40)}).status==='HOLD_INVALID_COMMIT','non-hex commit → HOLD_INVALID_COMMIT');
ok(validate({...full,manifest_digest:'junk'}).status==='HOLD_INVALID_MANIFEST_DIGEST','junk manifest digest → HOLD');
ok(validate({...full,archive_digest:'arc_XYZ'}).status==='HOLD_INVALID_ARCHIVE_DIGEST','malformed archive digest → HOLD');
ok(validate({...full,file_count:-1}).status==='HOLD_INVALID_FILE_COUNT','negative file count → HOLD');
ok(validate({...full,byte_count:-5}).status==='HOLD_INVALID_BYTE_COUNT','negative byte count → HOLD');
ok(validate({...full,file_count:9,manifest_file_count:8}).status==='HOLD_COUNT_DISAGREEMENT','count disagreement → HOLD');
ok(validate({...full,secret_classification:'MADEUP'}).status==='HOLD_UNKNOWN_SECRET_CLASSIFICATION','unknown secret classification → HOLD');
ok(validate({...full,held_secret_count:-2}).status==='HOLD_INVALID_HELD_COUNT','negative held count → HOLD');
ok(validate({...full,secret_contents_present:true}).status==='HOLD_SECRET_CONTENTS_PRESENT','secret contents present → HOLD');
ok(validate({...full,cleanup_status:'not_done'}).status==='HOLD_CLEANUP_INCOMPLETE','missing/false cleanup → HOLD_CLEANUP_INCOMPLETE');
ok(validate({...full,no_code_execution:false}).status==='HOLD_UNSAFE_EXECUTION','code execution flag → HOLD');
ok(validate({...full,existing_repo_touched:true}).status==='HOLD_PROHIBITED_TOUCH','existing repo touched → HOLD');
ok(validate({...full,repo:'x/other'}).status==='HOLD_TARGET_NOT_SANDBOX','wrong repository → HOLD');
ok(validate({...full,repo_private:false}).status==='HOLD_NOT_PRIVATE','not private → HOLD');
ok(validate({...full,route_identity:'deploy_key'}).status==='HOLD_WRONG_ROUTE','wrong route identity → HOLD');
ok(validate({...full,permissions:{contents:'read',metadata:'read',issues:'write'}}).status==='HOLD_SPEC_INVALID','extra permission → HOLD_SPEC_INVALID');
ok(validate({...full,permissions:{contents:'read'}}).status==='HOLD_SPEC_INVALID','missing metadata permission → HOLD_SPEC_INVALID');
ok(validate({...full,evidence_replay_valid:false}).status==='HOLD_REPLAY_INVALID','replay invalid → HOLD');
ok(validate({...full,refusal_evidence_valid:false}).status==='HOLD_REFUSAL_INVALID','refusal invalid → HOLD');
ok(REQUIRED_FIELDS.length>=20 && CONTRACT.proof_status==='LOCAL_ONLY_PREPARED','contract requires >=20 fields; status LOCAL_ONLY_PREPARED');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
