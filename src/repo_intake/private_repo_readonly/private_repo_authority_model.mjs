// W1 — Private Repo Authority Model (LOCAL / SYNTHETIC). The 6 proof levels are NEVER equivalent.
import { createHash } from 'node:crypto';
export const sha256=(x)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export const PROOF_LEVELS=Object.freeze({
  PUBLIC_REPO_PROOF:{id:1,name:'Public repo proof',accesses_real_private:false,requires_founder_phrase:false},
  PRIVATE_REPO_READINESS_PROOF:{id:2,name:'Private repo readiness proof (synthetic)',accesses_real_private:false,requires_founder_phrase:false,note:'MUST NOT claim actual private repo access'},
  PRIVATE_REPO_READONLY_PROOF:{id:3,name:'Actual private repo read-only proof',accesses_real_private:true,requires_founder_phrase:true,requires:['exact_repo_identifier','exact_credential_source','exact_scope','founder_phrase','no_code_execution','no_writes','no_merge','no_deploy']},
  PRIVATE_REPO_EXECUTION_PROOF:{id:4,name:'Private repo execution proof',accesses_real_private:true,requires_founder_phrase:true,blocked:true},
  PRIVATE_REPO_WRITE_PROOF:{id:5,name:'Private repo write proof',accesses_real_private:true,requires_founder_phrase:true,blocked:true},
  CUSTOMER_DATA_PROOF:{id:6,name:'Customer data proof',accesses_real_private:true,requires_founder_phrase:true,blocked:true},
});
// classify a claimed proof; refuse inflation (readiness must NOT claim actual access)
export function classifyProof(input={}){
  const claimed=input.claimed_level; const spec=PROOF_LEVELS[claimed];
  const problems=[];
  if(!spec) return {record_type:'proof_classification',status:'HOLD_UNKNOWN_LEVEL',claimed_level:claimed};
  if(claimed==='PRIVATE_REPO_READINESS_PROOF' && input.claims_actual_access===true) problems.push('readiness proof must NOT claim actual private repo access');
  if(spec.accesses_real_private && input.founder_phrase!==true) problems.push(spec.name+' requires an explicit founder phrase (absent) → blocked');
  if(claimed==='PRIVATE_REPO_READONLY_PROOF'){ for(const r of spec.requires){ if(input[r]!==true && r!=='founder_phrase') problems.push('missing requirement: '+r); } }
  return {record_type:'proof_classification',claimed_level:claimed,level_id:spec.id,accesses_real_private:spec.accesses_real_private,
    status:problems.length?'HOLD_NOT_SUPPORTED':'OK',problems,hash:sha256({claimed,problems})};
}
export function readinessProof(){ return {record_type:'private_repo_readiness_proof',level:'PRIVATE_REPO_READINESS_PROOF',accesses_real_private:false,synthetic_only:true,claims_actual_access:false,status:'READINESS_WITH_LIMITS'}; }
