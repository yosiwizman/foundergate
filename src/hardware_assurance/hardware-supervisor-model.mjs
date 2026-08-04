// FounderGate — Hardware Supervisor Model (LOCAL / SYNTHETIC ONLY — models STATE, never touches hardware).
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const PROHIBITED = Object.freeze(['unrestricted_master_unlock','reusable_bearer_token','private_key_export','unsigned_host_request','silent_capability_broadening','safety_state_depends_on_execution_vm','usb_insertion_as_authorization']);

export function makeSupervisorState(input={}){
  const s={
    record_type:'hardware_supervisor_state',
    supervisor_identity: input.supervisor_identity||'hwsup_local_synth',
    supervisor_version: input.supervisor_version||'hwsup@0.1-synth',
    signing_key_placeholder: 'HARDWARE_PROTECTED_PLACEHOLDER (no real key; never exportable)',
    watchdog_state: input.watchdog_state||'ACTIVE',
    relay_controller_state: input.relay_controller_state||'READY',
    power_controller_state: input.power_controller_state||'READY',
    evidence_signing_state: input.evidence_signing_state||'READY',
    emergency_stop_state: input.emergency_stop_state||'ARMED',
    supervisor_health: input.supervisor_health||'OK',
  };
  s.state_hash='hws_'+sha256(s).slice(0,20);
  return s;
}
export function validateSupervisor(s, request={}){
  if(!s||s.record_type!=='hardware_supervisor_state') return {valid:false,status:'SUPERVISOR_UNAVAILABLE',reason:'no supervisor'};
  // unknown-state refusal
  if(s.supervisor_health!=='OK'||s.watchdog_state!=='ACTIVE') return {valid:false,status:'SUPERVISOR_UNAVAILABLE',reason:'supervisor unhealthy/watchdog inactive → refuse'};
  // prohibited capability requests
  const bad = (request.flags||[]).filter(f=>PROHIBITED.includes(f));
  if(bad.length) return {valid:false,status:'AUTHORIZATION_INVALID',reason:'prohibited capability shape',prohibited:bad};
  if(request.safety_depends_on_execution_vm===true) return {valid:false,status:'AUTHORIZATION_INVALID',reason:'safety state must not depend on the execution VM'};
  if(request.authorization_source==='usb_insertion_only') return {valid:false,status:'AUTHORIZATION_INVALID',reason:'USB insertion alone is not authorization'};
  return {valid:true,status:'OK',supervisor_identity:s.supervisor_identity};
}
