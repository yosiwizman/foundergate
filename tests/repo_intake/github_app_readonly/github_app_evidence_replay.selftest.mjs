import { buildLocalEvidence, replay, PROHIBITED_FLAGS } from '../../../src/repo_intake/github_app_readonly/github_app_evidence_replay.mjs';
import { sha256 } from '../../../src/repo_intake/github_app_readonly/github_app_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const reseal=(ev)=>{const c={...ev};delete c.evidence_digest;c.evidence_digest='gae_'+sha256(c).slice(0,24);return c;};

const good=buildLocalEvidence({refusal_matrix_total:41,refusal_matrix_all_held:true});
ok(replay(good).status==='REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY','clean local record → REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY');
ok(replay(good).github_app_proven===false && replay(good).live_action_required===true,'replay never converts sim → live');
ok(replay(null).status==='HOLD_MISSING_EVIDENCE','no evidence → HOLD_MISSING_EVIDENCE');
ok(replay({record_type:'x'}).status==='HOLD_MISSING_EVIDENCE','wrong record type → HOLD_MISSING_EVIDENCE');

// B — falsification: independently set EACH prohibited field true / missing / malformed → must fail closed.
let allTrueHeld=true, allMissingHeld=true, allMalformedHeld=true;
for(const flag of PROHIBITED_FLAGS){
  // true (re-sealed so ONLY the flag is the failure)
  const t=reseal(Object.assign(buildLocalEvidence(),{[flag]:true}));
  if(replay(t).status!=='HOLD_REPLAY_MISMATCH') allTrueHeld=false;
  // missing (delete the flag, re-seal)
  const m=buildLocalEvidence(); delete m[flag]; const mr=reseal(m);
  if(replay(mr).status!=='HOLD_REPLAY_MISMATCH') allMissingHeld=false;
  // malformed (non-boolean)
  const x=reseal(Object.assign(buildLocalEvidence(),{[flag]:'yes'}));
  if(replay(x).status!=='HOLD_REPLAY_MISMATCH') allMalformedHeld=false;
}
ok(allTrueHeld,`each prohibited flag = true → HOLD_REPLAY_MISMATCH (${PROHIBITED_FLAGS.length} flags)`);
ok(allMissingHeld,`each prohibited flag MISSING → HOLD_REPLAY_MISMATCH (${PROHIBITED_FLAGS.length} flags)`);
ok(allMalformedHeld,`each prohibited flag MALFORMED (non-boolean) → HOLD_REPLAY_MISMATCH (${PROHIBITED_FLAGS.length} flags)`);

// digest-valid but unsafe must never verify
ok(replay(reseal(Object.assign(buildLocalEvidence(),{provider_call:true}))).status==='HOLD_REPLAY_MISMATCH','digest-valid but unsafe record → never verified');
// tampered digest
ok(replay(Object.assign(buildLocalEvidence(),{evidence_digest:'gae_deadbeef'})).status==='HOLD_REPLAY_MISMATCH','invalid digest → HOLD_REPLAY_MISMATCH');
// simulation claiming live
ok(replay(reseal(Object.assign(buildLocalEvidence(),{claims_live_proof:true}))).status==='HOLD_CONTRADICTORY_EVIDENCE','sim claims live → HOLD_CONTRADICTORY_EVIDENCE');
ok(replay(reseal(Object.assign(buildLocalEvidence(),{github_app_proven:true}))).status==='HOLD_CONTRADICTORY_EVIDENCE','sim github_app_proven:true → HOLD_CONTRADICTORY_EVIDENCE');
// secret in evidence
ok(replay(reseal(Object.assign(buildLocalEvidence(),{label:'x ghs_'+'A'.repeat(36)}))).status==='HOLD_CONTRADICTORY_EVIDENCE','secret material in evidence → HOLD_CONTRADICTORY_EVIDENCE');
// unaccepted cleanup value
ok(replay(reseal(Object.assign(buildLocalEvidence(),{cleanup_status:'weird'}))).status==='HOLD_REPLAY_MISMATCH','unaccepted cleanup value → HOLD_REPLAY_MISMATCH');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
