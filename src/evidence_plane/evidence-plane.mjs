// FounderGate — Independent Evidence Plane (LOCAL / SYNTHETIC / DETERMINISTIC).
// Append-only event log OUTSIDE the worker's control. worker_writable is always false. The packet digest is a
// running hash chain, so any tamper/omission changes the digest.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const COMPLETENESS = Object.freeze(['COMPLETE', 'PARTIAL', 'INCOMPLETE', 'MONITORING_LOST', 'UNKNOWN']);
const REQUIRED_STREAMS = ['contract_digest', 'runtime_digest', 'worker_identity', 'pre_run_attestation', 'challenge_results', 'monitor_health', 'post_run_verification'];

export function createEvidencePlane(meta = {}) {
  const plane = {
    record_type: 'evidence_plane', worker_writable: false, run_id: meta.run_id || null,
    events: [], streams: {}, _chain: 'genesis',
  };
  return plane;
}

// append-only: every append updates the running hash chain. Returns the sequence number.
export function appendEvent(plane, stream, payload) {
  const seq = plane.events.length;
  const entry = { seq, stream, payload_hash: sha256(payload), at_index: seq };
  plane.events.push(entry);
  plane._chain = sha256(plane._chain + '|' + stream + ':' + entry.payload_hash);
  plane.streams[stream] = (plane.streams[stream] || 0) + 1;
  return seq;
}

export function recordStreams(plane, streams = {}) {
  for (const [k, v] of Object.entries(streams)) appendEvent(plane, k, v);
  return plane;
}

export function classifyCompleteness(plane, opts = {}) {
  if (opts.monitoring_lost === true) return 'MONITORING_LOST';
  const present = REQUIRED_STREAMS.filter((s) => plane.streams[s] > 0);
  const missing = REQUIRED_STREAMS.filter((s) => !plane.streams[s]);
  if (opts.gap_detected === true) return 'INCOMPLETE';
  if (missing.length === 0) return 'COMPLETE';
  if (present.length === 0) return 'UNKNOWN';
  return 'PARTIAL';
}

export function sealEvidencePlane(plane, opts = {}) {
  const completeness = classifyCompleteness(plane, opts);
  return {
    record_type: 'evidence_plane_seal',
    worker_writable: false, append_only: true, events: plane.events.length,
    streams: { ...plane.streams }, completeness,
    evidence_plane_digest: 'evp_' + sha256(plane._chain).slice(0, 24),
    sealed: completeness === 'COMPLETE',
    status: completeness === 'COMPLETE' ? 'SEALED' : 'HOLD_' + completeness,
  };
}

// tamper attempt helper (for tests): if a worker tries to rewrite an event, the digest no longer matches.
export function verifyChain(plane, claimedDigest) {
  return ('evp_' + sha256(plane._chain).slice(0, 24)) === claimedDigest;
}
