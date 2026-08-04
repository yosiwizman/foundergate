// Actual private sandbox proof — evidence record (LOCAL). Records the real read-only intake result. No secrets/tokens.
import { sha256 } from '../private_repo_readonly/private_repo_authority_model.mjs';
export function buildEvidence(i={}){
  const ev={ record_type:'actual_private_sandbox_evidence', run_id:'private_repo_actual_sandbox_proof_20260804T0105ET',
    label:'ACTUAL_PRIVATE_SANDBOX_REPO_ACCESS_PROVEN_WITH_EXISTING_GH_AUTH',
    repo:i.repo, owner:(i.repo||'/').split('/')[0], private:i.private===true, default_branch:i.default_branch||null,
    exact_commit:i.commit, tree_sha:i.tree||null, archive_digest:'arc_'+String(i.archive_digest||'').slice(0,24),
    manifest_digest:i.manifest_digest||null, file_count:i.file_count??null, total_bytes:i.total_bytes??null,
    held_fake_secret_files:i.held_count??null, redaction_summary:i.redaction_summary||null,
    actual_private_repo_accessed:true, repo_is_founder_owned_sandbox:true, repo_created_this_run:true,
    existing_repo_touched:false, customer_repo_touched:false, credential_value_seen:false,
    code_execution:false, build_run:false, tests_run_from_repo:false, provider_call:false, write_during_read_proof:false,
    least_privilege_token_proven:false, token_scopes_note:'existing gh auth (gist,read:org,repo) — broad, NOT least-privilege' };
  ev.evidence_digest='ase_'+sha256({...ev,evidence_digest:undefined}).slice(0,24);
  return ev;
}
