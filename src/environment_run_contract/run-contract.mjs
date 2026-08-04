// FounderGate — Environment Run Contract (LOCAL / SYNTHETIC / DETERMINISTIC).
// No agent run may begin without a valid contract. Digest changes on any material change.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const REQUIRED_FIELDS = Object.freeze([
  'contract_id', 'contract_version', 'exact_agent_or_worker_identity', 'exact_harness_version',
  'sandbox_or_runtime_identity', 'sandbox_or_runtime_digest', 'allowed_network_state', 'allowed_destinations',
  'prohibited_destinations', 'dns_policy', 'approved_tools', 'denied_tools', 'filesystem_mounts', 'writable_paths',
  'read_only_paths', 'credential_policy', 'process_limits', 'resource_limits', 'cost_limit', 'time_limit',
  'target_systems', 'allowed_package_repositories', 'required_monitoring', 'automatic_stop_conditions', 'evidence_destination',
]);

// material fields = everything except the digest itself
function digestOf(c) {
  const material = {};
  for (const k of REQUIRED_FIELDS) material[k] = c[k];
  return 'erc_' + sha256(material).slice(0, 24);
}

export function makeRunContract(input = {}) {
  const c = {
    record_type: 'environment_run_contract',
    contract_id: input.contract_id || 'erc_local',
    contract_version: input.contract_version || 'v1',
    exact_agent_or_worker_identity: input.exact_agent_or_worker_identity || 'local_synthetic_worker@v1',
    exact_harness_version: input.exact_harness_version || 'foundergate-harness@P0.2',
    sandbox_or_runtime_identity: input.sandbox_or_runtime_identity || 'local_node_synthetic',
    sandbox_or_runtime_digest: input.sandbox_or_runtime_digest || 'sbx_' + sha256('local_node_synthetic').slice(0, 16),
    allowed_network_state: input.allowed_network_state || 'blocked',
    allowed_destinations: (input.allowed_destinations || []).slice().sort(),
    prohibited_destinations: (input.prohibited_destinations || ['*', '169.254.169.254', 'metadata.google.internal']).slice().sort(),
    dns_policy: input.dns_policy || 'deny_all',
    approved_tools: (input.approved_tools || ['read_file', 'write_local', 'run_local_tests']).slice().sort(),
    denied_tools: (input.denied_tools || ['curl', 'wget', 'ssh', 'docker']).slice().sort(),
    filesystem_mounts: (input.filesystem_mounts || ['workspace']).slice().sort(),
    writable_paths: (input.writable_paths || ['workspace/tmp']).slice().sort(),
    read_only_paths: (input.read_only_paths || ['workspace/src']).slice().sort(),
    credential_policy: input.credential_policy || 'none_present',
    process_limits: input.process_limits || { max_children: 4 },
    resource_limits: input.resource_limits || { cpu: 'bounded', mem: 'bounded' },
    cost_limit: input.cost_limit != null ? input.cost_limit : 0,
    time_limit: input.time_limit != null ? input.time_limit : 60,
    target_systems: (input.target_systems || ['local_synthetic']).slice().sort(),
    allowed_package_repositories: (input.allowed_package_repositories || []).slice().sort(),
    required_monitoring: (input.required_monitoring || ['network', 'process', 'filesystem', 'monitor_health']).slice().sort(),
    automatic_stop_conditions: (input.automatic_stop_conditions || ['boundary_violation', 'monitoring_loss', 'deadline_exceeded']).slice().sort(),
    evidence_destination: input.evidence_destination || 'evidence_plane://outside_worker',
  };
  c.contract_digest = digestOf(c);
  return c;
}

export function validateRunContract(c) {
  if (!c || c.record_type !== 'environment_run_contract') return { record_type: 'run_contract_validation', valid: false, status: 'HOLD_NO_CONTRACT', missing: REQUIRED_FIELDS.slice() };
  const missing = REQUIRED_FIELDS.filter((f) => c[f] === undefined || c[f] === null || (Array.isArray(c[f]) && c[f].length === 0 && ['approved_tools', 'required_monitoring', 'automatic_stop_conditions', 'prohibited_destinations'].includes(f)));
  if (missing.length) return { record_type: 'run_contract_validation', valid: false, status: 'HOLD_MISSING_FIELDS', missing };
  if (c.contract_digest !== digestOf(c)) return { record_type: 'run_contract_validation', valid: false, status: 'HOLD_DIGEST_MISMATCH', missing: [] };
  if (c.evidence_destination && !/outside_worker|evidence_plane/.test(c.evidence_destination)) return { record_type: 'run_contract_validation', valid: false, status: 'HOLD_EVIDENCE_INSIDE_WORKER', missing: [] };
  return { record_type: 'run_contract_validation', valid: true, status: 'VALID', contract_digest: c.contract_digest, missing: [] };
}

export { digestOf as contractDigest };
