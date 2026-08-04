// Emit the physical-containment evidence JSON + UI panel data + adversarial results. LOCAL / DETERMINISTIC.
import { LEVELS, classifyLevel } from './assurance-levels.mjs';
import { makePhysicalRunContract, validatePhysicalRunContract } from './physical-run-contract.mjs';
import { makeSupervisorState, validateSupervisor } from '../hardware_assurance/hardware-supervisor-model.mjs';
import { issueCapability, validateCapability } from '../capability_gate/capability-gate.mjs';
import { inventory, allGovernedObservations } from './path-inventory.mjs';
import { relayProof, powerProof, evidenceChannel } from './relay-power-evidence-channel.mjs';
import { makeMeasuredBoot } from './measured-boot-identity.mjs';
import { makeRegister } from './physical-assumption-register.mjs';
import { buildEvidencePackage } from './physical-evidence-package.mjs';
import { runAdversarialMatrix } from './adversarial-matrix.mjs';
import { ALLOWED_STATUSES } from './physical-claim-blocker.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(REPO, 'docs/generated/p0_physical_containment_assurance_model');
mkdirSync(DOCS, { recursive: true });

// A well-formed Level-2 (hardware-assisted) local synthetic scenario + a Level-3 attempt that is honestly downgraded.
const contract = makePhysicalRunContract({ physical_assurance_level: 2 });
const evidence = { relay_state: 'open', power_state: 'independent', path_inventory: 'full', evidence_channel: 'one_way', measured_boot: 'recorded' };
const cval = validatePhysicalRunContract(contract, evidence);
const sup = makeSupervisorState({});
const supVal = validateSupervisor(sup, {});
const cap = issueCapability({ allowed_destinations: ['evidence_plane'], nonce: 'nonce_run_1', expires_at: 100 });
const capVal = validateCapability(cap, { now: 10, capability: cap.capability, destination: 'evidence_plane', execution_machine_id: cap.execution_machine_id, execution_image_digest: cap.execution_image_digest }, new Set());
const paths = inventory(allGovernedObservations());
const relay = relayProof({ requested_relay_state: 'open', measured_relay_state: 'open', logical_index: 1 });
const power = powerProof({ requested_power_state: 'on', measured_power_state: 'on', current_sensor_state: 'current_present' });
const channel = evidenceChannel({});
const boot = makeMeasuredBoot({});
const register = makeRegister({});
// local synthetic Level-3 demonstration: all synthetic paths governed + one-way channel + hardware root present.
// (Inflation refusals — Level1→2, hardware-assisted→severed w/ ungoverned paths — are covered by the adversarial matrix.)
const levelCls = classifyLevel({ claimed_level: 3, hardware_root_of_trust: true, all_paths_governed: paths.all_paths_governed, one_way_evidence_channel: channel.one_way });
const adversarial = runAdversarialMatrix();

const pkg = buildEvidencePackage({
  run_contract_and_digest: contract.contract_digest,
  authorization_object_and_signature_result: { grant: cap.canonical_digest, result: capVal.status },
  execution_machine_identity_and_attestation: contract.execution_machine_identity,
  execution_image_digest: contract.execution_image_digest,
  hardware_supervisor_identity_and_version: sup.supervisor_identity + '@' + sup.supervisor_version,
  evidence_recorder_identity_and_version: contract.external_evidence_recorder_identity,
  physical_interface_inventory: paths.inventory_hash,
  relay_state_history: [relay.status], power_state_history: [power.status],
  pre_run_challenge_results: adversarial.all_fail_closed ? 'ALL_FAIL_CLOSED' : 'FAILURE',
  continuous_sensor_health_record: sup.supervisor_health,
  network_and_alternate_path_observations: paths.isolation_claim_status,
  capability_grant_history: [cap.canonical_digest],
  violation_events: [], stop_and_shutdown_timeline: [], termination_or_power_off_confirmation: 'n/a_local_synthetic',
  evidence_continuity_report: channel.status, missing_stale_or_contradictory_evidence: register.unknown === 0 ? 'none' : 'present',
  final_bounded_verdict: 'VERIFIED_WITHIN_DECLARED_BOUNDARIES',
});

const out = {
  record_type: 'physical_containment_evidence', run_id: 'p0_physical_containment_assurance_model_20260803T2030ET',
  levels: { 1: LEVELS[1].name, 2: LEVELS[2].name, 3: LEVELS[3].name }, level_classification: levelCls,
  contract_validation: cval, supervisor: supVal, capability: capVal.status, path_inventory: paths,
  relay: relay.status, power: power.status, evidence_channel: channel.status, measured_boot: boot.identity_hash,
  assumption_register: { declared: register.declared, verified: register.verified, unknown: register.unknown, violated: register.violated, action: register.register_action },
  evidence_package: { status: pkg.status, complete: pkg.complete, sections: pkg.section_count, missing: pkg.missing_sections.length, digest: pkg.package_digest },
  adversarial: { total: adversarial.total, all_fail_closed: adversarial.all_fail_closed, failed: adversarial.failed.length, by_group: adversarial.by_group },
  allowed_statuses: ALLOWED_STATUSES,
  blocked: { real_hardware: 'BLOCKED', real_provider: 'BLOCKED', private_repo: 'BLOCKED', gate_8: 'BLOCKED', external_network: 'BLOCKED', deploy: 'BLOCKED', bill: 'BLOCKED', merge: 'BLOCKED' },
};
writeFileSync(join(DOCS, 'PHYSICAL_CONTAINMENT_EVIDENCE.json'), JSON.stringify(out, null, 2));
writeFileSync(join(DOCS, 'ADVERSARIAL_RESULTS.json'), JSON.stringify(adversarial, null, 2));

// UI data
const ui = {
  kind: 'PHYSICAL_CONTAINMENT', run_id: out.run_id,
  levels: [{ n: 1, name: LEVELS[1].name }, { n: 2, name: LEVELS[2].name }, { n: 3, name: LEVELS[3].name }],
  selected_level: levelCls.supported_level, supported_level: levelCls.supported_level, level_confusion: levelCls.level_confusion,
  contract_status: cval.status, supervisor_status: supVal.status, capability_status: capVal.status,
  path_inventory: paths.rows.map((r) => ({ path: r.path, status: r.status })), isolation_claim: paths.isolation_claim_status,
  relay: relay.status, power: power.status, evidence_channel: channel.status, measured_boot_note: boot.does_not_prove,
  assumptions: { declared: register.declared, verified: register.verified, unknown: register.unknown, violated: register.violated },
  evidence_package: out.evidence_package,
  adversarial: out.adversarial,
  blocked: out.blocked,
  labels: ['LOCAL_SYNTHETIC_ONLY', 'Level 1 ≠ Level 2 ≠ Level 3', 'NOT real physical containment', 'NOT escape-impossible / NOT unhackable', 'measured boot ≠ vulnerability-free', 'a VM is NOT a physically severed machine', 'NOT security certification', 'NEVER SHIP'],
};
const ASSETS = join(REPO, 'demo/founder_operating_environment/assets/physical');
mkdirSync(ASSETS, { recursive: true });
writeFileSync(join(ASSETS, 'physical_index.json'), JSON.stringify(ui, null, 2));

console.log(`EMIT_OK levels=3 supported=${levelCls.supported_level} contract=${cval.status} cap=${capVal.status} paths=${paths.isolation_claim_status} relay=${relay.status} channel=${channel.status} pkg=${pkg.status}(${pkg.section_count}/20) adversarial=${adversarial.all_fail_closed?'ALL_FAIL_CLOSED':'FAILED'}(${adversarial.total})`);
if (!adversarial.all_fail_closed) { console.error('ADVERSARIAL_FAIL', JSON.stringify(adversarial.failed)); process.exit(1); }
if (!pkg.complete) { console.error('PKG_INCOMPLETE', pkg.missing_sections); process.exit(1); }
console.log('PHYSICAL_EMIT_OK');
