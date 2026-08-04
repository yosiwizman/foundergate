// FounderGate — Physical Containment Run Contract (LOCAL / SYNTHETIC). Extends the P0.2 environment run contract.
// Missing required physical evidence → UNKNOWN / NOT_PASSED, never PASS.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
import { makeRunContract } from '../environment_run_contract/run-contract.mjs';

export const PHYS_REQUIRED = Object.freeze(['physical_assurance_level','execution_machine_identity','execution_image_digest','hardware_supervisor_identity','hardware_supervisor_version','external_evidence_recorder_identity','relay_policy','power_policy','radio_policy','alternate_path_inventory','evidence_channel_policy','capability_grant_policy','measured_boot_policy','physical_assumption_register','sensor_health_requirements','physical_stop_conditions','allowed_final_claims','forbidden_final_claims']);

export function makePhysicalRunContract(input={}){
  const envc = makeRunContract(input.env||{});
  const c = {
    record_type:'physical_run_contract', base_env_contract_digest: envc.contract_digest,
    physical_assurance_level: input.physical_assurance_level!=null?input.physical_assurance_level:1,
    execution_machine_identity: input.execution_machine_identity||'machine_local_synth',
    execution_image_digest: input.execution_image_digest||'img_'+sha256('local_img').slice(0,16),
    hardware_supervisor_identity: input.hardware_supervisor_identity||'hwsup_local_synth',
    hardware_supervisor_version: input.hardware_supervisor_version||'hwsup@0.1-synth',
    external_evidence_recorder_identity: input.external_evidence_recorder_identity||'recorder_local_synth',
    relay_policy: input.relay_policy||'open_unless_authorized',
    power_policy: input.power_policy||'independent_controller',
    radio_policy: input.radio_policy||'all_radios_absent_or_unpowered',
    alternate_path_inventory: input.alternate_path_inventory||'required_full',
    evidence_channel_policy: input.evidence_channel_policy||'one_way_outbound',
    capability_grant_policy: input.capability_grant_policy||'single_use_signed',
    measured_boot_policy: input.measured_boot_policy||'record_identity_only',
    physical_assumption_register: input.physical_assumption_register||'required',
    sensor_health_requirements: input.sensor_health_requirements||['relay','power','evidence_channel','watchdog'],
    physical_stop_conditions: input.physical_stop_conditions||['alternate_path_detected','hardware_state_mismatch','monitoring_lost','authorization_invalid'],
    allowed_final_claims: input.allowed_final_claims||['VERIFIED_WITHIN_DECLARED_BOUNDARIES'],
    forbidden_final_claims: input.forbidden_final_claims||['ESCAPE_IMPOSSIBLE','UNHACKABLE','ABSOLUTELY_SECURE'],
  };
  c.contract_digest='prc_'+sha256(PHYS_REQUIRED.map(k=>k+':'+JSON.stringify(c[k])).join('|')+'|'+envc.contract_digest).slice(0,24);
  return c;
}
export function validatePhysicalRunContract(c, evidence={}){
  if(!c||c.record_type!=='physical_run_contract') return {record_type:'physical_run_contract_validation',valid:false,status:'NOT_PASSED',missing:PHYS_REQUIRED.slice()};
  const missing = PHYS_REQUIRED.filter(f=>c[f]===undefined||c[f]===null||(Array.isArray(c[f])&&c[f].length===0));
  if(missing.length) return {record_type:'physical_run_contract_validation',valid:false,status:'NOT_PASSED',missing};
  // required physical evidence must be present to move beyond UNKNOWN
  const reqEvidence=['relay_state','power_state','path_inventory','evidence_channel','measured_boot'];
  const missingEv = reqEvidence.filter(k=>evidence[k]===undefined||evidence[k]===null);
  if(missingEv.length) return {record_type:'physical_run_contract_validation',valid:false,status:'UNKNOWN',missing_evidence:missingEv,note:'missing physical evidence → UNKNOWN, never PASS'};
  return {record_type:'physical_run_contract_validation',valid:true,status:'VERIFIED_WITHIN_DECLARED_BOUNDARIES',contract_digest:c.contract_digest};
}
