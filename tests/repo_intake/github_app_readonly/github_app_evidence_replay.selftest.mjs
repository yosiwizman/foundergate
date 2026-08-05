import { buildLocalEvidence, replay, PROHIBITED_FLAGS, EVIDENCE_SCHEMA_VERSION } from '../../../src/repo_intake/github_app_readonly/github_app_evidence_replay.mjs';
import { sha256 } from '../../../src/repo_intake/github_app_readonly/github_app_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const reseal=(ev)=>{const c={...ev};delete c.evidence_digest;c.evidence_digest='gae_'+sha256(c).slice(0,24);return c;};
const V='REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY';

const good=buildLocalEvidence();
ok(replay(good).status===V,'clean local record → REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY');
ok(replay(good).github_app_proven===false && replay(good).live_action_required===true,'replay never converts sim → live');

// CORRECTION 1 — mandatory falsification: local record → live_app_proof + contract_satisfied + cleanup completed, valid digest.
const live=reseal(Object.assign(buildLocalEvidence(),{mode:'live_app_proof',contract_satisfied:true,cleanup_status:'completed'}));
ok(replay(live).status==='HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE','live_app_proof+contract_satisfied+cleanup(valid digest) → HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE');
ok(replay(reseal(Object.assign(buildLocalEvidence(),{contract_satisfied:true}))).status==='HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE','contract_satisfied:true alone → HOLD live-pipeline');
ok(replay(reseal(Object.assign(buildLocalEvidence(),{github_app_proven:true}))).status==='HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE','github_app_proven:true → HOLD live-pipeline');
ok(replay(reseal(Object.assign(buildLocalEvidence(),{mode:'live_app_proof'}))).status==='HOLD_LIVE_PROOF_REQUIRES_SEPARATE_FOUNDER_GATED_PIPELINE','mode live_app_proof (valid digest) → HOLD live-pipeline');
// structurally incapable: the replay function body contains no REPLAY_VERIFIED_LIVE_APP_PROOF literal
ok(!/REPLAY_VERIFIED_LIVE_APP_PROOF/.test(replay.toString()),'replay() body contains NO REPLAY_VERIFIED_LIVE_APP_PROOF path (structurally incapable)');

// CORRECTION 2 — complete envelope validation; each re-digested variant must HOLD (no REPLAY_VERIFIED_*).
const holdCases=[
  ['cleanup_status deleted', (e)=>{delete e.cleanup_status;}],
  ['cleanup_status undefined', (e)=>{e.cleanup_status=undefined;}],
  ['cleanup_status wrong', (e)=>{e.cleanup_status='completed';}],
  ['github_app_proven deleted', (e)=>{delete e.github_app_proven;}],
  ['claims_live_proof deleted', (e)=>{delete e.claims_live_proof;}],
  ['live_action_authority true', (e)=>{e.live_action_authority=true;}],
  ['sandbox_repo acme/prod', (e)=>{e.sandbox_repo='acme/prod';}],
  ['next_gate deleted', (e)=>{delete e.next_gate;}],
  ['next_gate changed', (e)=>{e.next_gate='SOMETHING_ELSE';}],
  ['refusal_matrix_all_held false', (e)=>{e.refusal_matrix_all_held=false;}],
  ['refusal_matrix_total zero', (e)=>{e.refusal_matrix_total=0;}],
  ['counts inconsistent', (e)=>{e.executable_refusal_paths=10;e.catalog_only_assertions=0;}], // 10+0 != 41
  ['schema_version missing', (e)=>{delete e.schema_version;}],
  ['schema_version wrong', (e)=>{e.schema_version='x@1';}],
  ['unknown mode', (e)=>{e.mode='weird';}],
  ['label not allowed', (e)=>{e.label='SHIP_IT';}],
];
let allHold=true, wrongName=null;
for(const [name,mut] of holdCases){
  const e=buildLocalEvidence(); mut(e); const r=replay(reseal(e));
  if(/^REPLAY_VERIFIED/.test(r.status)){ allHold=false; wrongName=name; }
}
ok(allHold, `every malformed/missing/contradictory envelope variant HOLDs (no REPLAY_VERIFIED_*)${wrongName?' — FAILED at: '+wrongName:''}`);

// each prohibited flag true/missing/malformed → HOLD
let flagsHold=true;
for(const flag of PROHIBITED_FLAGS){
  if(/^REPLAY_VERIFIED/.test(replay(reseal(Object.assign(buildLocalEvidence(),{[flag]:true}))).status)) flagsHold=false;
  const m=buildLocalEvidence(); delete m[flag]; if(/^REPLAY_VERIFIED/.test(replay(reseal(m)).status)) flagsHold=false;
  if(/^REPLAY_VERIFIED/.test(replay(reseal(Object.assign(buildLocalEvidence(),{[flag]:'yes'}))).status)) flagsHold=false;
}
ok(flagsHold, `each of ${PROHIBITED_FLAGS.length} prohibited flags true/missing/malformed → HOLD`);

ok(replay(null).status==='HOLD_MISSING_EVIDENCE','null → HOLD_MISSING_EVIDENCE');
ok(replay({record_type:'x'}).status==='HOLD_MISSING_EVIDENCE','wrong record type → HOLD_MISSING_EVIDENCE');
ok(replay(Object.assign(buildLocalEvidence(),{evidence_digest:'gae_deadbeef'})).status==='HOLD_REPLAY_MISMATCH','tampered digest → HOLD_REPLAY_MISMATCH');
ok(replay(reseal(Object.assign(buildLocalEvidence(),{label:'x ghs_'+'A'.repeat(36)}))).status==='HOLD_CONTRADICTORY_EVIDENCE','secret in evidence → HOLD_CONTRADICTORY_EVIDENCE');
ok(EVIDENCE_SCHEMA_VERSION==='github_app_local_macro_evidence@2','schema version pinned');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
