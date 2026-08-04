// FounderGate — Cryptographic Capability Gate (LOCAL / DETERMINISTIC / SYNTHETIC SIGNATURE ONLY).
// Models a narrow, single-use capability object. The execution environment may REQUEST but NEVER authorize,
// broaden, renew, or reactivate a capability. Any material change invalidates the grant. No real crypto keys.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

const MATERIAL = ['run_id', 'execution_image_digest', 'execution_machine_id', 'capability', 'allowed_destinations', 'maximum_duration_seconds', 'maximum_requests', 'valid_after', 'expires_at', 'single_use', 'evidence_policy_digest', 'nonce'];

function canonicalDigest(g) {
  const m = {}; for (const k of MATERIAL) m[k] = g[k];
  m.allowed_destinations = (g.allowed_destinations || []).slice().sort();
  return 'cap_' + sha256(m).slice(0, 24);
}

// authority = the hardware supervisor / founder side (NOT the execution environment). Synthetic signature only.
export function issueCapability(input = {}) {
  const g = {
    record_type: 'capability_grant',
    run_id: input.run_id || 'run_local',
    execution_image_digest: input.execution_image_digest || 'img_' + sha256('local_img').slice(0, 16),
    execution_machine_id: input.execution_machine_id || 'machine_local',
    capability: input.capability || 'read_local_synthetic',
    allowed_destinations: (input.allowed_destinations || []).slice().sort(),
    maximum_duration_seconds: input.maximum_duration_seconds != null ? input.maximum_duration_seconds : 60,
    maximum_requests: input.maximum_requests != null ? input.maximum_requests : 1,
    valid_after: input.valid_after != null ? input.valid_after : 0,
    expires_at: input.expires_at != null ? input.expires_at : 100,
    single_use: input.single_use !== false,
    evidence_policy_digest: input.evidence_policy_digest || 'evp_local',
    nonce: input.nonce || 'nonce_local_1',
    issued_by: 'hardware_supervisor_or_founder', // NEVER the execution environment
  };
  g.canonical_digest = canonicalDigest(g);
  g.synthetic_signature_status = 'SIGNED_SYNTHETIC'; // placeholder; no real key
  return g;
}

// validate a presented grant against the runtime context + a used-nonce set. Fails closed.
export function validateCapability(grant, ctx = {}, usedNonces = new Set()) {
  if (!grant || grant.record_type !== 'capability_grant') return v(false, 'AUTHORIZATION_INVALID', 'no grant');
  // the execution environment cannot have issued/broadened it
  if (ctx.requested_by === 'execution_environment' && ctx.self_authorized === true) return v(false, 'AUTHORIZATION_INVALID', 'execution environment cannot self-authorize');
  // digest / tamper
  if (grant.canonical_digest !== canonicalDigest(grant)) return v(false, 'AUTHORIZATION_INVALID', 'grant tampered (digest mismatch)');
  if (grant.synthetic_signature_status !== 'SIGNED_SYNTHETIC') return v(false, 'AUTHORIZATION_INVALID', 'unsigned grant');
  // binding checks
  if (ctx.execution_machine_id != null && ctx.execution_machine_id !== grant.execution_machine_id) return v(false, 'AUTHORIZATION_INVALID', 'wrong machine binding');
  if (ctx.execution_image_digest != null && ctx.execution_image_digest !== grant.execution_image_digest) return v(false, 'AUTHORIZATION_INVALID', 'wrong image binding');
  if (ctx.capability != null && ctx.capability !== grant.capability) return v(false, 'AUTHORIZATION_INVALID', 'capability mismatch');
  if (ctx.destination != null && !(grant.allowed_destinations || []).includes(ctx.destination)) return v(false, 'AUTHORIZATION_INVALID', 'destination not permitted');
  if (ctx.requested_duration != null && ctx.requested_duration > grant.maximum_duration_seconds) return v(false, 'AUTHORIZATION_INVALID', 'duration exceeds grant');
  // expiry (integer logical clock)
  if (ctx.now != null && (ctx.now < grant.valid_after || ctx.now > grant.expires_at)) return v(false, 'AUTHORIZATION_EXPIRED', 'grant expired / not yet valid');
  // nonce replay / single-use
  if (usedNonces.has(grant.nonce)) return v(false, 'AUTHORIZATION_INVALID', 'nonce replay (single-use violated)');
  return { record_type: 'capability_validation', valid: true, status: 'VERIFIED_HARDWARE_GATED_CAPABILITY', consume: () => usedNonces.add(grant.nonce) };
  function v(ok, status, reason) { return { record_type: 'capability_validation', valid: ok, status, reason }; }
}

export { canonicalDigest };
