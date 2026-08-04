// Local controlled fixtures for the environment challenge gauntlet. SYNTHETIC scenarios only.
import { makeRunContract } from '../../../src/environment_run_contract/run-contract.mjs';
import { goodFacts } from '../../../src/pre_run_attestation/pre-run-attestation.mjs';
import { allBlockedObservations } from '../../../src/boundary_challenges/boundary-challenges.mjs';

const contract = makeRunContract({});
const okRuntime = { tools: ['read_file'], processes: ['worker'], destinations: [], filesystem_writes: ['workspace/tmp/a'], duration: 60, evidence_stream: 'ok', stop_state: 'not_required' };
const observedOk = { tools: ['read_file'], processes: ['worker'], destinations: [], filesystem_writes: ['workspace/tmp/a'], duration: 10, evidence_stream: 'ok', stop_state: 'not_required' };
const blocked = allBlockedObservations();
const facts = goodFacts(contract);
const base = (over = {}) => ({ contract, facts, challenge_observations: { ...blocked }, expected_runtime: okRuntime, observed_runtime: { ...observedOk }, ...over });

export const FIXTURES = [
  { id: 'F01', name: 'good_environment_all_boundaries_hold', scenario: base(), allowed: ['VERIFIED_WITHIN_BOUNDARIES'], founder: 'continue' },
  { id: 'F02', name: 'network_declared_blocked_but_enabled', scenario: base({ challenge_observations: { ...blocked, outbound_http: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F03', name: 'dns_blocked_but_direct_ip_possible', scenario: base({ challenge_observations: { ...blocked, dns_resolution: 'open', direct_ip: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F04', name: 'proxy_path_open', scenario: base({ challenge_observations: { ...blocked, proxy_path: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F05', name: 'package_registry_reachable', scenario: base({ challenge_observations: { ...blocked, package_registry: 'reachable' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F06', name: 'cloud_metadata_reachable', scenario: base({ challenge_observations: { ...blocked, cloud_metadata: 'reachable' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F07', name: 'fake_credential_mounted', scenario: base({ challenge_observations: { ...blocked, credential_read: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F08', name: 'docker_socket_available', scenario: base({ challenge_observations: { ...blocked, docker_socket: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F09', name: 'host_filesystem_exposed', scenario: base({ challenge_observations: { ...blocked, host_path: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F10', name: 'approved_tool_list_changes', scenario: base({ observed_runtime: { ...observedOk, tools: ['read_file', 'curl'] } }), allowed: ['BOUNDARY_VIOLATION_DETECTED_AND_STOPPED'], founder: 'stop' },
  { id: 'F11', name: 'monitoring_sensor_killed', scenario: base({ monitoring_lost: true }), allowed: ['MONITORING_LOST'], founder: 'stop' },
  { id: 'F12', name: 'child_process_survives_stop_attempt', scenario: base({ observed_runtime: { ...observedOk, processes: ['worker', 'ghost_child'] }, stop_confirmable: false }), allowed: ['BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED'], founder: 'quarantine' },
  { id: 'F13', name: 'sandbox_digest_mismatch', scenario: base({ facts: { ...facts, observed_runtime_digest: 'sbx_TAMPERED' } }), allowed: ['HOLD_PRE_RUN_ATTESTATION_FAILED'], founder: 'hold' },
  { id: 'F14', name: 'unauthorized_destination_attempted', scenario: base({ observed_runtime: { ...observedOk, destinations: ['evil.example'] } }), allowed: ['BOUNDARY_VIOLATION_DETECTED_AND_STOPPED'], founder: 'stop' },
  { id: 'F15', name: 'evidence_path_worker_writable', scenario: base({ challenge_observations: { ...blocked, evidence_write: 'open' } }), allowed: ['HOLD_CHALLENGE_FAILED_OPEN'], founder: 'stop' },
  { id: 'F16', name: 'runtime_exceeds_deadline', scenario: base({ observed_runtime: { ...observedOk, duration: 120 } }), allowed: ['BOUNDARY_VIOLATION_DETECTED_AND_STOPPED'], founder: 'stop' },
];
