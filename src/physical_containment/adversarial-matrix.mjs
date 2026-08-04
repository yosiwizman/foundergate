// FounderGate — Adversarial Physical Test Matrix (LOCAL / SYNTHETIC). Every hostile case must fail closed:
// HOLD / UNKNOWN / NOT_PASSED / ALTERNATE_PATH_DETECTED / HARDWARE_STATE_MISMATCH / MONITORING_LOST / AUTHORIZATION_*.
// No forbidden claim, no false green.
import { relayProof, powerProof, evidenceChannel } from './relay-power-evidence-channel.mjs';
import { inventory, allGovernedObservations } from './path-inventory.mjs';
import { issueCapability, validateCapability } from '../capability_gate/capability-gate.mjs';
import { classifyLevel } from './assurance-levels.mjs';
import { measuredBootImpliesVulnerabilityFree } from './measured-boot-identity.mjs';
import { makeSupervisorState, validateSupervisor } from '../hardware_assurance/hardware-supervisor-model.mjs';

// GREEN = an actual green verdict. Note: must NOT match "PASS" inside "NOT_PASSED", so no bare PASS token here.
const GREEN = /(VERIFIED_PHYSICAL_PATHS_ABSENT|VERIFIED_HARDWARE_GATED_CAPABILITY|VERIFIED_WITHIN_DECLARED_BOUNDARIES|^OK$|^PASS$|PASSED_BLOCKED)/;
const HELD = /(HOLD|UNKNOWN|NOT_PASSED|ALTERNATE_PATH_DETECTED|HARDWARE_STATE_MISMATCH|MONITORING_LOST|AUTHORIZATION_INVALID|AUTHORIZATION_EXPIRED|SUPERVISOR_UNAVAILABLE|EVIDENCE_INCOMPLETE|QUARANTINE|REFUSED)/;

export function runAdversarialMatrix() {
  const cases = [];
  const add = (group, name, observed) => cases.push({ group, name, observed: String(observed), fail_closed: HELD.test(String(observed)) && !GREEN.test(String(observed)) });
  const goodCap = issueCapability({ allowed_destinations: ['evidence_plane'], nonce: 'n1', expires_at: 100 });
  const used = new Set();

  // ---- Hardware / path failures ----
  add('hardware', 'relay commanded open but measured closed', relayProof({ requested_relay_state: 'open', measured_relay_state: 'closed' }).status);
  add('hardware', 'relay commanded closed without authorization', validateCapability(goodCap, { capability: 'close_relay' }, used).status);
  add('hardware', 'alternate Ethernet adapter attached', inventory({ ...allGovernedObservations(), second_ethernet: 'PRESENT_UNGOVERNED' }).isolation_claim_status);
  add('hardware', 'Wi-Fi interface appears', inventory({ ...allGovernedObservations(), wifi: 'PRESENT_UNGOVERNED' }).isolation_claim_status);
  add('hardware', 'Bluetooth interface active', inventory({ ...allGovernedObservations(), bluetooth: 'PRESENT_UNGOVERNED' }).isolation_claim_status);
  add('hardware', 'USB network adapter inserted', inventory({ ...allGovernedObservations(), usb_ethernet: 'PRESENT_UNGOVERNED' }).isolation_claim_status);
  add('hardware', 'host bridge available', inventory({ ...allGovernedObservations(), host_bridge: 'PRESENT_UNGOVERNED' }).isolation_claim_status);
  add('hardware', 'data-diode channel becomes bidirectional', evidenceChannel({ commands_back: 'allowed' }).status);
  add('hardware', 'execution node gains write to evidence store', evidenceChannel({ overwrite: 'allowed' }).status);
  add('hardware', 'power relay fails to open', powerProof({ requested_power_state: 'off', measured_power_state: 'on', current_sensor_state: 'current_present' }).status);

  // ---- Authorization failures ----
  const used2 = new Set(['n1']);
  add('authorization', 'replayed signature (nonce reuse)', validateCapability(goodCap, {}, used2).status);
  add('authorization', 'expired signature', validateCapability(goodCap, { now: 999 }, new Set()).status);
  add('authorization', 'signature for wrong machine', validateCapability(goodCap, { execution_machine_id: 'other' }, new Set()).status);
  add('authorization', 'signature for wrong image', validateCapability(goodCap, { execution_image_digest: 'other' }, new Set()).status);
  add('authorization', 'signature for wrong destination', validateCapability(goodCap, { destination: 'evil' }, new Set()).status);
  add('authorization', 'broadened capability request', validateCapability({ ...goodCap, capability: 'root_all', canonical_digest: goodCap.canonical_digest }, {}, new Set()).status);
  add('authorization', 'duplicate nonce', validateCapability(goodCap, {}, new Set(['n1'])).status);
  add('authorization', 'execution env self-authorizes', validateCapability(goodCap, { requested_by: 'execution_environment', self_authorized: true }, new Set()).status);
  add('authorization', 'hardware supervisor key mismatch (unhealthy)', validateSupervisor(makeSupervisorState({ supervisor_health: 'DEGRADED' })).status);

  // ---- Monitoring failures ----
  add('monitoring', 'sensor killed', relayProof({ requested_relay_state: 'open' }).status);
  add('monitoring', 'evidence stream interrupted', evidenceChannel({ continuity_gap: true }).status);
  add('monitoring', 'two sensors disagree (relay mismatch)', relayProof({ requested_relay_state: 'open', measured_relay_state: 'closed' }).status);
  add('monitoring', 'recorder bidirectional drift', evidenceChannel({ bidirectional_drift: true }).status);
  add('monitoring', 'supervisor restarts (watchdog inactive)', validateSupervisor(makeSupervisorState({ watchdog_state: 'INACTIVE' })).status);

  // ---- Stop failures ----
  add('stop', 'power cut requested but current remains', powerProof({ requested_power_state: 'off', measured_power_state: 'off', current_sensor_state: 'current_present' }).status);
  add('stop', 'power state unknown (no measurement)', powerProof({ requested_power_state: 'off' }).status);

  // ---- Claim tests ----
  add('claim', 'missing relay evidence never passes', relayProof({ requested_relay_state: 'open' }).status);
  add('claim', 'unknown radio state → no isolation claim', inventory({ ...allGovernedObservations(), wifi: 'UNKNOWN' }).isolation_claim_status);
  add('claim', 'one path test does not imply all blocked', classifyLevel({ claimed_level: 3, inferred_all_paths_from_one_test: true }).status);
  add('claim', 'measured boot ⇒ vulnerability-free? (must be false)', measuredBootImpliesVulnerabilityFree() === false ? 'NOT_PASSED' : 'PASS');
  add('claim', 'hardware-assisted labeled physically severed', classifyLevel({ claimed_level: 3, hardware_root_of_trust: true, all_paths_governed: false }).status);
  add('claim', 'Level1 claims hardware-assisted', classifyLevel({ claimed_level: 2, hardware_root_of_trust: false }).status);

  const failed = cases.filter((c) => !c.fail_closed);
  const byGroup = {};
  for (const c of cases) byGroup[c.group] = (byGroup[c.group] || 0) + 1;
  return { record_type: 'adversarial_matrix', total: cases.length, all_fail_closed: failed.length === 0, failed, by_group: byGroup, cases };
}
