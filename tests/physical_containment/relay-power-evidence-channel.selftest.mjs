import { relayProof, powerProof, evidenceChannel } from '../../src/physical_containment/relay-power-evidence-channel.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 6 relay command alone not proof
ok(relayProof({requested_relay_state:'open'}).status==='UNKNOWN','6 relay command alone (no measurement) → UNKNOWN');
// 7 relay mismatch
ok(relayProof({requested_relay_state:'open',measured_relay_state:'closed'}).status==='HARDWARE_STATE_MISMATCH','7 relay measured mismatch → HARDWARE_STATE_MISMATCH');
ok(relayProof({requested_relay_state:'open',measured_relay_state:'open'}).status==='VERIFIED_WITHIN_DECLARED_BOUNDARIES','relay match → within boundaries');
// 8 evidence channel bidirectional → MONITORING_LOST
ok(evidenceChannel({commands_back:'allowed'}).status==='MONITORING_LOST','8 evidence channel bidirectional → MONITORING_LOST');
// 9 power command without measured state → cannot claim shutdown (UNKNOWN)
ok(powerProof({requested_power_state:'off'}).status==='UNKNOWN'&&powerProof({requested_power_state:'off'}).shutdown_confirmation===false,'9 power command w/o measured state → UNKNOWN, no shutdown claim');
ok(powerProof({requested_power_state:'off',measured_power_state:'off',current_sensor_state:'current_present'}).status==='HARDWARE_STATE_MISMATCH','power off but current present → HARDWARE_STATE_MISMATCH');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
