// FounderGate — Relay / Power / One-Way Evidence Channel models (LOCAL / SYNTHETIC).
// Command alone is NEVER proof — the MEASURED state must match. Evidence-channel failure → MONITORING_LOST, no pass.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export function relayProof(input={}){
  const requested=input.requested_relay_state, measured=input.measured_relay_state;
  const known = measured!=null;
  const match = known && requested===measured;
  return { record_type:'relay_proof', requested_relay_state:requested??null, measured_relay_state:measured??null,
    logical_index: input.logical_index??null, controller_identity: input.controller_identity||'relay_ctrl_local_synth',
    sensor_health: input.sensor_health||(known?'OK':'UNKNOWN'),
    signed_checkpoint_placeholder:'SYNTHETIC_CHECKPOINT',
    discrepancy: known ? (match?'NONE':'MISMATCH') : 'UNKNOWN',
    status: !known ? 'UNKNOWN' : (match ? 'VERIFIED_WITHIN_DECLARED_BOUNDARIES' : 'HARDWARE_STATE_MISMATCH'),
    hash: sha256({requested,measured}) };
}
export function powerProof(input={}){
  const requested=input.requested_power_state, measured=input.measured_power_state;
  const sensor=input.current_sensor_state; const known = measured!=null && sensor!=null;
  const match = known && requested===measured && !(requested==='off' && sensor==='current_present');
  return { record_type:'power_proof', requested_power_state:requested??null, measured_power_state:measured??null,
    current_sensor_state: sensor??null, shutdown_confirmation: (requested==='off'&&measured==='off'&&sensor==='no_current'),
    discrepancy: known ? (match?'NONE':'MISMATCH') : 'UNKNOWN',
    status: !known ? 'UNKNOWN' : (match ? 'VERIFIED_WITHIN_DECLARED_BOUNDARIES' : 'HARDWARE_STATE_MISMATCH'),
    hash: sha256({requested,measured,sensor}) };
}
export function evidenceChannel(input={}){
  const transmit_outward = input.transmit_outward!==false;
  const commands_back_denied = input.commands_back!=='allowed';
  const overwrite_denied = input.overwrite!=='allowed';
  const bidirectional = input.bidirectional_drift===true || input.commands_back==='allowed' || input.overwrite==='allowed';
  const continuity_ok = input.continuity_gap!==true;
  const oneWay = transmit_outward && commands_back_denied && overwrite_denied && !bidirectional;
  let status='VERIFIED_WITHIN_DECLARED_BOUNDARIES';
  if(bidirectional) status='MONITORING_LOST';
  else if(!continuity_ok) status='EVIDENCE_INCOMPLETE';
  else if(!oneWay) status='NOT_PASSED';
  return { record_type:'one_way_evidence_channel', transmit_outward, commands_back_denied, overwrite_denied,
    recorder_timestamp_independent: input.recorder_timestamp_independent!==false,
    dropped_event_recorded: input.dropped_event_recorded!==false, malformed_event_recorded: input.malformed_event_recorded!==false,
    bidirectional_drift: bidirectional, continuity_gap: !continuity_ok, one_way: oneWay,
    requires_containment: status==='MONITORING_LOST', status };
}
