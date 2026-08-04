// W8a — Evidence emitter (LOCAL / SYNTHETIC). Records no real credential/repo; no write/exec/provider.
import { sha256 } from './private_repo_authority_model.mjs';
export function emitEvidence(input={}){
  const ev={ record_type:'private_repo_readonly_evidence', run_id:input.run_id||'private_repo_readonly_readiness_20260804T0035ET',
    lane_ids:input.lane_ids||['W1','W2','W3','W4','W5','W6','W7','W8'], synthetic_fixture_id:input.fixture_id||'synthetic-private-repo',
    resolved_repo_identity:input.identity||null, exact_commit:input.commit||null, archive_digest:input.archive_digest||null,
    manifest_digest:input.manifest_digest||null, held_files_count:input.held_count??null, redaction_summary:input.redaction_summary||null,
    refusal_matrix:input.refusal_matrix||null, no_real_credential_used:true, no_real_private_repo_touched:true,
    no_write_attempted_succeeded:true, no_command_execution:true, no_provider_call:true,
    next_true_founder_gate:'real private repo read-only access (exact repo + read-only credential + founder phrase)' };
  ev.evidence_digest='pev_'+sha256(ev).slice(0,24);
  return ev;
}
