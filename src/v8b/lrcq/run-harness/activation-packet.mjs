// FounderGate LRCQ — UNSIGNED activation-packet generator (Tier-1).
// Assembles the mechanically-resolved v3 activation record for the founder to review.
// It contains NO founder signature (founder_signature: null) and MUST NOT be treated as
// authorization. Building it never invokes Claude, never activates, never merges.
import { ACTIVATION_V3_VERSION, V3_LIMITS, validateActivationV3 } from "../assurance/assurance-core.mjs";

// resolved: mechanically-discovered exact values (SHAs/trees/digests/provider identity).
export function buildUnsignedPacket(resolved) {
  const packet = {
    schema_version: ACTIVATION_V3_VERSION,
    founder_signature: null,          // UNSIGNED — founder fills this in a separate signing step
    unsigned: true,
    issued_epoch: null, expiry_epoch: null,   // set at signing time
    lrcq_base_sha: resolved.lrcq_base_sha, lrcq_base_tree: resolved.lrcq_base_tree,
    provider_candidate_sha: resolved.provider_candidate_sha, provider_candidate_tree: resolved.provider_candidate_tree,
    run_harness_candidate_sha: resolved.run_harness_candidate_sha, run_harness_candidate_tree: resolved.run_harness_candidate_tree,
    assurance_control_backlog_digest: resolved.assurance_control_backlog_digest,
    first_real_run_backlog_digest: resolved.first_real_run_backlog_digest,
    provider_executable_path: resolved.provider_executable_path, provider_version: resolved.provider_version, provider_executable_identity: resolved.provider_executable_identity,
    policy_version: resolved.policy_version, capability_lease_digest: resolved.capability_lease_digest, blast_radius_budget_digest: resolved.blast_radius_budget_digest,
    run_id: null, hard_deadline_epoch: null,
    // recommended bounded defaults (founder may lower, never raise past V3_LIMITS)
    run_duration_s: V3_LIMITS.run_duration_s, max_parallel_width: 2, per_job_timeout_s: V3_LIMITS.per_job_timeout_s,
    termination_grace_s: V3_LIMITS.termination_grace_s, max_output_bytes: V3_LIMITS.max_output_bytes, max_budget_usd: V3_LIMITS.max_budget_usd,
    delegation_depth: 1, external_calls: 0, recipients: 0,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true,
  };
  // Sanity: with a founder signature + timestamps + run_id + deadline filled and matching
  // bindings, this packet WOULD validate. We prove that with a dry-run overlay (never signs).
  const dry = { ...packet, founder_signature: "<founder-signs-here>", issued_epoch: 1000, expiry_epoch: 9999999999, run_id: "<founder-run-id>", hard_deadline_epoch: 9999999999 };
  const bindings = { lrcq_base_sha: resolved.lrcq_base_sha, lrcq_base_tree: resolved.lrcq_base_tree, provider_candidate_sha: resolved.provider_candidate_sha, provider_candidate_tree: resolved.provider_candidate_tree, run_harness_candidate_sha: resolved.run_harness_candidate_sha, run_harness_candidate_tree: resolved.run_harness_candidate_tree, assurance_control_backlog_digest: resolved.assurance_control_backlog_digest, first_real_run_backlog_digest: resolved.first_real_run_backlog_digest, provider_path: resolved.provider_executable_path, provider_identity: resolved.provider_executable_identity, now_epoch: 2000 };
  const dryResult = validateActivationV3(dry, bindings);
  return { packet, would_validate_when_signed: dryResult.valid, dry_run_refusals: dryResult.refusals };
}
