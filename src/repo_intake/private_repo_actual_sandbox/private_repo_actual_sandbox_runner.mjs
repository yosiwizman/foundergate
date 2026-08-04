// Actual private sandbox proof — read-only intake runner (LOCAL orchestration over already-fetched read-only snapshot).
// It NEVER writes/executes/installs/builds/tests/dispatches or calls a provider. Those paths are structurally absent.
import { bindSnapshot } from '../private_repo_readonly/private_repo_snapshot_binder.mjs';
import { classifyFiles } from '../private_repo_readonly/private_repo_secret_classifier.mjs';
import { buildEvidence } from './private_repo_actual_sandbox_evidence.mjs';
// snapshot = { repo, private, default_branch, commit, tree, archive_digest, files:[{path,bytes,sample,binary}] }
export function runReadOnlyIntake(snapshot={}){
  const snap=bindSnapshot({commit:snapshot.commit,files:snapshot.files||[]});
  const secrets=classifyFiles(snapshot.files||[]);
  const evidence=buildEvidence({ repo:snapshot.repo, private:snapshot.private, default_branch:snapshot.default_branch,
    commit:snapshot.commit, tree:snapshot.tree, archive_digest:snapshot.archive_digest,
    manifest_digest:snap.manifest_digest, file_count:(snapshot.files||[]).length, total_bytes:snap.total_bytes,
    held_count:secrets.held_count, redaction_summary:secrets.by_type });
  const status = (snapshot.private===true && snap.status!=='HELD' /* binder holds unsafe-only; sandbox is clean */ && secrets!=null && evidence.actual_private_repo_accessed)
    ? 'ACTUAL_PRIVATE_SANDBOX_REPO_PROOF_READY_WITH_LIMITS' : 'PARTIAL_WITH_LIMITS';
  // NOTE: no write/exec/provider methods exist on this runner — read-only by construction.
  return { record_type:'actual_sandbox_intake', status, snapshot:snap, secrets, evidence };
}
