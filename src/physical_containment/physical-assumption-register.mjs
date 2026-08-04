// FounderGate — Physical Assumption Register (LOCAL / SYNTHETIC / DETERMINISTIC).
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
const DEFS=[
 ['PA01','public internet path physically absent','path_inventory','network_sensor'],
 ['PA02','Wi-Fi absent or unpowered','radio_inventory','radio_sensor'],
 ['PA03','Bluetooth absent or unpowered','radio_inventory','radio_sensor'],
 ['PA04','no cellular interface','radio_inventory','radio_sensor'],
 ['PA05','Ethernet relay open','relay_proof','relay_sensor'],
 ['PA06','evidence channel one-way','evidence_channel','recorder'],
 ['PA07','execution node cannot write evidence store','evidence_channel','recorder'],
 ['PA08','no production credentials mounted','execution_integrity','fs_sensor'],
 ['PA09','no host-shared storage','path_inventory','mount_sensor'],
 ['PA10','no uncontrolled management channel','path_inventory','mgmt_sensor'],
 ['PA11','power controller independent','power_proof','power_sensor'],
 ['PA12','supervisor watchdog active','hardware_supervisor','watchdog'],
];
export function makeRegister(overrides={}){
  const items = DEFS.map(([id,stmt,method,src])=>{
    const o=overrides[id]||{};
    const observed = 'observed' in o ? o.observed : 'holds';
    const status = observed==null?'UNKNOWN':(observed==='holds'?'VERIFIED':(observed==='stale'?'STALE':'VIOLATED'));
    return { assumption_id:id, statement:stmt, verification_method:method, sensor_or_evidence_source:src,
      initial_result:status, continuous_monitoring_required:true,
      expiration_condition:o.expiration||'sensor_gap_or_index_expiry', 
      violation_response: status==='VIOLATED'?'QUARANTINE':(status==='UNKNOWN'||status==='STALE'?'PAUSE':'CONTINUE'),
      final_result:status };
  });
  const violated=items.filter(i=>i.final_result==='VIOLATED').length;
  const unknown=items.filter(i=>i.final_result==='UNKNOWN'||i.final_result==='STALE').length;
  return { record_type:'physical_assumption_register', items, declared:items.length,
    verified:items.filter(i=>i.final_result==='VERIFIED').length, violated, unknown,
    all_clear: violated===0&&unknown===0,
    register_action: violated?'QUARANTINE':(unknown?'PAUSE':'CONTINUE'),
    register_hash: sha256(items.map(i=>i.assumption_id+':'+i.final_result).join('|')) };
}
