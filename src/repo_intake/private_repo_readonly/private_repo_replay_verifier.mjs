// W8b — Replay verifier (LOCAL). Reconstructs the decision from evidence FILES only (deterministic; no AI reasoning).
import { sha256 } from './private_repo_authority_model.mjs';
export function replay(evidence){
  if(!evidence || evidence.record_type!=='private_repo_readonly_evidence') return {record_type:'replay',status:'HOLD_NO_EVIDENCE',ok:false};
  const recomputed='pev_'+sha256({...evidence,evidence_digest:undefined,replayed:undefined}).slice(0,24);
  // note: digest was computed over the object WITHOUT evidence_digest at emit time; recompute the same way
  const base={...evidence}; delete base.evidence_digest; const dg='pev_'+sha256(base).slice(0,24);
  const matches=dg===evidence.evidence_digest;
  const safe=evidence.no_real_credential_used===true && evidence.no_real_private_repo_touched===true && evidence.no_write_attempted_succeeded===true && evidence.no_provider_call===true;
  return {record_type:'replay',source:'evidence_files_only',uses_ai_reasoning:false,digest_matches:matches,safety_invariants_hold:safe,
    status: (matches&&safe)?'REPLAY_VERIFIED':'HOLD_REPLAY_MISMATCH', ok: matches&&safe};
}
