// FounderGate — Pre-Run Environment Attestation (LOCAL / SYNTHETIC / DETERMINISTIC).
// Consumes a run contract + locally-observed/synthetic facts. Missing critical evidence → HOLD/UNKNOWN, never PASS.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

// Each predicate: needs an explicit observed fact. `critical:true` → missing evidence blocks PASS.
export const PREDICATES = Object.freeze([
  { key: 'network_policy_known', critical: true, want: (f) => f.network_policy != null },
  { key: 'dns_policy_known', critical: true, want: (f) => f.dns_policy != null },
  { key: 'internet_isolation_known', critical: true, want: (f) => f.internet_isolation != null },
  { key: 'prohibited_destinations_known', critical: true, want: (f) => Array.isArray(f.prohibited_destinations) },
  { key: 'cloud_metadata_policy_known', critical: true, want: (f) => f.cloud_metadata_policy != null },
  { key: 'credential_absence_known', critical: true, want: (f) => f.credentials != null },
  { key: 'ssh_agent_exposure_known', critical: false, want: (f) => f.ssh_agent != null },
  { key: 'home_dir_exposure_known', critical: false, want: (f) => f.home_dir_exposure != null },
  { key: 'docker_socket_exposure_known', critical: true, want: (f) => f.docker_socket != null },
  { key: 'host_path_exposure_known', critical: true, want: (f) => f.host_path_exposure != null },
  { key: 'approved_tools_present', critical: true, want: (f) => f.approved_tools_present === true },
  { key: 'denied_tools_absent', critical: true, want: (f) => f.denied_tools_absent === true },
  { key: 'write_permissions_match_contract', critical: true, want: (f) => f.write_permissions_match === true },
  { key: 'runtime_digest_matches_contract', critical: true, want: (f, c) => f.observed_runtime_digest != null && f.observed_runtime_digest === c.sandbox_or_runtime_digest },
  { key: 'monitoring_sensors_active', critical: true, want: (f) => f.monitoring_active === true },
  { key: 'stop_controller_available', critical: true, want: (f) => f.stop_controller_available === true },
  { key: 'evidence_destination_outside_worker', critical: true, want: (f, c) => f.evidence_outside_worker === true && /outside_worker|evidence_plane/.test(c.evidence_destination || '') },
]);

export function preRunAttestation(contract, facts = {}) {
  const results = PREDICATES.map((p) => {
    const observedMissing = (() => {
      // "unknown" when the fact needed is absent
      try { return p.want.length >= 2 ? undefined : undefined; } catch { return undefined; }
    })();
    let proven;
    try { proven = !!p.want(facts, contract); } catch { proven = false; }
    // distinguish "absent evidence" (UNKNOWN) from "present-but-false" (FAIL) for critical predicates
    const evidencePresent = factPresentFor(p.key, facts);
    const state = proven ? 'PROVEN' : (evidencePresent ? 'FAILED' : 'UNKNOWN');
    return { predicate: p.key, critical: p.critical, state };
  });
  const criticalUnknown = results.filter((r) => r.critical && r.state === 'UNKNOWN');
  const criticalFailed = results.filter((r) => r.critical && r.state === 'FAILED');
  let verdict;
  if (criticalFailed.length) verdict = 'FAIL';
  else if (criticalUnknown.length) verdict = 'HOLD';
  else if (results.every((r) => r.state === 'PROVEN')) verdict = 'PASS';
  else verdict = 'HOLD'; // non-critical unknowns still block a clean PASS → HOLD (fail closed)
  return {
    record_type: 'pre_run_attestation', verdict, results,
    critical_unknown: criticalUnknown.map((r) => r.predicate),
    critical_failed: criticalFailed.map((r) => r.predicate),
    attestation_hash: sha256(results.map((r) => r.predicate + ':' + r.state).join('|')),
  };
}

function factPresentFor(key, f) {
  const map = {
    network_policy_known: 'network_policy', dns_policy_known: 'dns_policy', internet_isolation_known: 'internet_isolation',
    prohibited_destinations_known: 'prohibited_destinations', cloud_metadata_policy_known: 'cloud_metadata_policy',
    credential_absence_known: 'credentials', ssh_agent_exposure_known: 'ssh_agent', home_dir_exposure_known: 'home_dir_exposure',
    docker_socket_exposure_known: 'docker_socket', host_path_exposure_known: 'host_path_exposure',
    approved_tools_present: 'approved_tools_present', denied_tools_absent: 'denied_tools_absent',
    write_permissions_match_contract: 'write_permissions_match', runtime_digest_matches_contract: 'observed_runtime_digest',
    monitoring_sensors_active: 'monitoring_active', stop_controller_available: 'stop_controller_available',
    evidence_destination_outside_worker: 'evidence_outside_worker',
  };
  const fk = map[key];
  return fk != null && f[fk] !== undefined && f[fk] !== null;
}

// a fully-good local synthetic fact set matching a default contract
export function goodFacts(contract) {
  return {
    network_policy: 'blocked', dns_policy: 'deny_all', internet_isolation: 'blocked',
    prohibited_destinations: contract.prohibited_destinations, cloud_metadata_policy: 'blocked',
    credentials: 'none_present', ssh_agent: 'absent', home_dir_exposure: 'none', docker_socket: 'absent', host_path_exposure: 'none',
    approved_tools_present: true, denied_tools_absent: true, write_permissions_match: true,
    observed_runtime_digest: contract.sandbox_or_runtime_digest, monitoring_active: true, stop_controller_available: true,
    evidence_outside_worker: true,
  };
}
