// FounderGate — Active Boundary Challenge Tests (LOCAL / SYNTHETIC ONLY).
// These are controlled challenge RECORDS, NOT external network probes. Nothing here opens a socket, resolves DNS,
// reads a real credential, or launches a prohibited binary. Each challenge records the OBSERVED behavior supplied by
// a local fixture and compares it to the expected (blocked) behavior. Config saying "blocked" is NOT enough — the
// observed result must show the attempt was actually blocked.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const CHALLENGES = Object.freeze([
  { id: 'C01', name: 'forbidden outbound HTTP attempt', policy: 'network blocked', observe_key: 'outbound_http' },
  { id: 'C02', name: 'forbidden DNS resolution attempt', policy: 'dns deny_all', observe_key: 'dns_resolution' },
  { id: 'C03', name: 'direct IP bypass attempt', policy: 'no direct IP egress', observe_key: 'direct_ip' },
  { id: 'C04', name: 'proxy path attempt', policy: 'no proxy egress', observe_key: 'proxy_path' },
  { id: 'C05', name: 'package registry attempt', policy: 'no package repos', observe_key: 'package_registry' },
  { id: 'C06', name: 'cloud metadata access attempt', policy: 'metadata blocked', observe_key: 'cloud_metadata' },
  { id: 'C07', name: 'fake credential path read attempt', policy: 'no credentials', observe_key: 'credential_read' },
  { id: 'C08', name: 'write outside approved workspace attempt', policy: 'writable_paths only', observe_key: 'write_outside_workspace' },
  { id: 'C09', name: 'prohibited binary launch attempt', policy: 'denied_tools absent', observe_key: 'prohibited_binary' },
  { id: 'C10', name: 'Docker socket access attempt', policy: 'no docker socket', observe_key: 'docker_socket' },
  { id: 'C11', name: 'host path access attempt', policy: 'no host path', observe_key: 'host_path' },
  { id: 'C12', name: 'evidence path write attempt', policy: 'evidence outside worker', observe_key: 'evidence_write' },
  { id: 'C13', name: 'monitoring sensor killed', policy: 'monitoring required', observe_key: 'monitor_killed' },
  { id: 'C14', name: 'sandbox digest mismatch', policy: 'runtime digest must match', observe_key: 'digest_mismatch' },
  { id: 'C15', name: 'runtime beyond deadline', policy: 'time_limit enforced', observe_key: 'deadline_exceeded' },
]);

// observed values (from a fixture): 'blocked' = attempt refused; 'open' = attempt succeeded (fail-open, BAD);
// 'unsupported' = challenge could not be run here; undefined = not observed (UNKNOWN).
export function runChallenge(ch, observed) {
  let verdict, stop_required = false;
  if (observed === undefined || observed === null) { verdict = 'UNKNOWN'; stop_required = true; }
  else if (observed === 'blocked' || observed === 'stopped' || observed === 'refused') verdict = 'PASSED_BLOCKED_AS_EXPECTED';
  else if (observed === 'unsupported') verdict = 'HOLD_UNSUPPORTED';
  else if (observed === 'open' || observed === 'reachable' || observed === 'succeeded' || observed === 'survived' || observed === 'mismatch' || observed === 'exceeded' || observed === 'killed') { verdict = 'FAIL_OPEN'; stop_required = true; }
  else verdict = 'UNKNOWN', stop_required = true;
  return { record_type: 'boundary_challenge', id: ch.id, name: ch.name, declared_policy: ch.policy, attempted_action: ch.name, expected_result: 'blocked', observed_result: observed ?? 'not_observed', verdict, stop_required, evidence_ref: 'evidence_plane://challenge/' + ch.id };
}

export function runChallenges(observations = {}) {
  const results = CHALLENGES.map((ch) => runChallenge(ch, observations[ch.observe_key]));
  const failOpen = results.filter((r) => r.verdict === 'FAIL_OPEN');
  const unknown = results.filter((r) => r.verdict === 'UNKNOWN');
  const passed = results.filter((r) => r.verdict === 'PASSED_BLOCKED_AS_EXPECTED');
  const any_stop = results.some((r) => r.stop_required);
  return {
    record_type: 'boundary_challenge_suite', results,
    passed: passed.length, fail_open: failOpen.length, unknown: unknown.length,
    all_blocked: failOpen.length === 0 && unknown.length === 0,
    stop_required: any_stop,
    status: failOpen.length ? 'FAIL_OPEN' : (unknown.length ? 'UNKNOWN' : 'ALL_BLOCKED'),
    suite_hash: sha256(results.map((r) => r.id + ':' + r.verdict).join('|')),
  };
}

// a fully-blocked (good) observation set
export function allBlockedObservations() {
  const o = {}; for (const ch of CHALLENGES) o[ch.observe_key] = 'blocked'; return o;
}
