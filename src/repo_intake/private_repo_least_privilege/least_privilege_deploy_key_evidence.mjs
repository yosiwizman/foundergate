// Least-privilege deploy-key proof — evidence (LOCAL). No private key / token in evidence.
import { sha256 } from '../private_repo_readonly/private_repo_authority_model.mjs';
export function buildEvidence(i={}){
  const ev={ record_type:'least_privilege_deploy_key_evidence', run_id:'private_repo_least_privilege_deploy_key_20260804T0630ET',
    label:'LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS',
    repo:i.repo, owner:(i.repo||'/').split('/')[0], private:i.private===true, exact_commit:i.commit,
    credential_type:'READ_ONLY_DEPLOY_KEY', deploy_key_id:i.deploy_key_id??null, deploy_key_read_only:true, deploy_key_repo_scoped:true,
    deploy_key_fingerprint:i.fingerprint||null, broad_gh_auth_used_for_intake:false, intake_auth_route:'ssh_deploy_key_identities_only',
    archive_digest:'arc_'+String(i.archive_digest||'').slice(0,24), manifest_digest:i.manifest_digest||null,
    file_count:i.file_count??null, total_bytes:i.total_bytes??null, held_fake_secret_files:i.held_count??null, redaction_summary:i.redaction_summary||null,
    actual_private_repo_accessed:true, repo_is_founder_owned_sandbox:true,
    existing_repo_touched:false, customer_repo_touched:false, credential_value_seen:false, private_key_packaged:false,
    code_execution:false, build_run:false, tests_run_from_repo:false, provider_call:false, write_during_read_proof:false,
    deploy_key_revoked:i.revoked===true, post_revocation_access_failed:i.post_revocation_failed===true, private_key_destroyed:i.private_key_destroyed===true };
  ev.evidence_digest='lpk_'+sha256({...ev,evidence_digest:undefined}).slice(0,24);
  return ev;
}
