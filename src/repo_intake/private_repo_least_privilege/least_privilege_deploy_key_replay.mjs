// Replay from sealed evidence only (deterministic; no AI reasoning).
import { sha256 } from '../private_repo_readonly/private_repo_authority_model.mjs';
export function replay(evidence){
  if(!evidence || evidence.record_type!=='least_privilege_deploy_key_evidence') return {record_type:'replay',status:'HOLD_NO_EVIDENCE',ok:false};
  const base={...evidence}; delete base.evidence_digest; const dg='lpk_'+sha256(base).slice(0,24);
  const matches=dg===evidence.evidence_digest;
  const inv = evidence.actual_private_repo_accessed===true && evidence.credential_type==='READ_ONLY_DEPLOY_KEY' &&
    evidence.deploy_key_read_only===true && evidence.broad_gh_auth_used_for_intake===false &&
    evidence.existing_repo_touched===false && evidence.customer_repo_touched===false && evidence.credential_value_seen===false &&
    evidence.private_key_packaged===false && evidence.code_execution===false && evidence.provider_call===false &&
    evidence.write_during_read_proof===false && evidence.deploy_key_revoked===true && evidence.post_revocation_access_failed===true &&
    evidence.private_key_destroyed===true && evidence.private===true;
  return { record_type:'replay', source:'sealed_evidence_only', uses_ai_reasoning:false, digest_matches:matches, invariants_hold:inv,
    repo:evidence.repo, exact_commit:evidence.exact_commit, credential_type:evidence.credential_type, manifest_digest:evidence.manifest_digest,
    archive_digest:evidence.archive_digest, held_fake_secret_files:evidence.held_fake_secret_files, revocation_verified:evidence.deploy_key_revoked&&evidence.post_revocation_access_failed,
    result_label:evidence.label, status:(matches&&inv)?'REPLAY_VERIFIED':'HOLD_REPLAY_MISMATCH', ok:matches&&inv };
}
