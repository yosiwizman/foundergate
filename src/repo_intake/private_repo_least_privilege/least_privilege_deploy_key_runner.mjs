// Least-privilege deploy-key proof — read-only intake orchestration over the already-fetched snapshot.
// Exposes NO write/exec/provider/token methods. Read-only by construction.
import { bindSnapshot } from '../private_repo_readonly/private_repo_snapshot_binder.mjs';
import { classifyFiles } from '../private_repo_readonly/private_repo_secret_classifier.mjs';
import { buildEvidence } from './least_privilege_deploy_key_evidence.mjs';
export function runIntake(snapshot={}, lifecycle={}){
  const snap=bindSnapshot({commit:snapshot.commit,files:snapshot.files||[]});
  const secrets=classifyFiles(snapshot.files||[]);
  const evidence=buildEvidence({ repo:snapshot.repo, private:snapshot.private, commit:snapshot.commit,
    deploy_key_id:snapshot.deploy_key_id, fingerprint:snapshot.fingerprint, archive_digest:snapshot.archive_digest,
    manifest_digest:snap.manifest_digest, file_count:(snapshot.files||[]).length, total_bytes:snap.total_bytes,
    held_count:secrets.held_count, redaction_summary:secrets.by_type,
    revoked:lifecycle.revoked, post_revocation_failed:lifecycle.post_revocation_failed, private_key_destroyed:lifecycle.private_key_destroyed });
  const ready = snapshot.private===true && evidence.deploy_key_read_only && !evidence.broad_gh_auth_used_for_intake
    && lifecycle.revoked===true && lifecycle.post_revocation_failed===true && lifecycle.private_key_destroyed===true;
  const status = ready ? 'LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS' : 'PARTIAL_WITH_LIMITS';
  return { record_type:'least_privilege_intake', status, snapshot:snap, secrets, evidence };
}
