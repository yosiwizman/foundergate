// FounderGate LRCQ — NON-AUTHORITATIVE legacy field projection (FG-LRCQ-ACT-029).
//
// The reviewed provider adapter (PR #188) validates a V2 activation record. V4 execution authority lives
// ENTIRELY in the opaque SUPERVISOR_EXECUTION capability minted by lifecycle-authority-v4. This module is
// the ONLY place a V2-shaped record is produced for new execution, and it is a pure PROJECTION:
//
//   * every field is derived from SIGNED V4 facts carried on the SUPERVISOR_EXECUTION capability (the
//     founder-signed payload) plus the manifest that capability's SIGNED run_manifest_digest binds;
//   * it recreates NO authority: `authoritative:false`, and `founder_signature` is the literal string
//     NON_AUTHORITATIVE_V4_PROJECTION — never a signature, never a presence-check that grants anything;
//   * the record carries v4_supervisor_claim_digest, and the provider spawn boundary REQUIRES that digest to
//     equal the digest on the genuine capability it was handed. A projection alone opens nothing.
//
// Consequence: a caller who fabricates this record still cannot spawn a provider, because it holds no
// SUPERVISOR_EXECUTION capability and the spawn boundary checks the capability brand first.
import { isSupervisorExecutionCapabilityV4 } from "../assurance/lifecycle-authority-v4.mjs";
import { V4_SIGNED_LIMITS, V4_SIGNED_EXCLUSIONS, signedLimitValueValid } from "../assurance/activation-v4.mjs";

// run_duration_s bounds the whole run, not one job, so it has no direct projection field; the provider
// boundary enforces it as a deadline/duration ceiling instead.
const LIMIT_IS_RUN_WIDE = new Set(["run_duration_s"]);

export const PROJECTION_SCHEMA = "lrcq-v4-legacy-projection-1";
export const NON_AUTHORITATIVE_SIGNATURE = "NON_AUTHORITATIVE_V4_PROJECTION";

// A denied-tools list that SEMANTICALLY covers every prohibited class the V2 validator checks.
export const SEMANTIC_DENY = ["git push", "git merge", "git checkout", "git switch", "gh pr merge", "git reset --hard", "git clean -f", "rm -rf", "--dangerously-skip-permissions", "bypassPermissions"];

// A manifest-declared bound may only NARROW the founder-signed ceiling, never widen it.
function narrow(candidate, signedCeiling) {
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0) return signedCeiling;
  return Math.min(candidate, signedCeiling);
}

// role: "builder" | "checker". opts: { evidenceRoot, sessionBudgetUsd }
export function projectLegacyActivationV4(supExecCap, manifest, loaded, role = "builder", opts = {}) {
  if (!isSupervisorExecutionCapabilityV4(supExecCap)) throw new Error("v4-legacy-projection: SUPERVISOR_EXECUTION capability required");
  if (!manifest || typeof manifest !== "object") throw new Error("v4-legacy-projection: manifest required");
  const tools = (loaded && loaded.allowed_tools_manifest_path) || {};
  const builderTools = tools.builder || ["Read", "Write", "Edit", "Grep"];
  const checkerTools = tools.checker || ["Read", "Grep"];
  const evidenceRoot = opts.evidenceRoot || manifest.evidence_root;
  const isChecker = role === "checker";
  const rec = {
    schema_version: "lrcq-activation-2",
    // ---- provenance: this record is a projection, NOT an authority ----
    projection_schema: PROJECTION_SCHEMA, authoritative: false, derived_from: "SIGNED_V4",
    founder_signature: NON_AUTHORITATIVE_SIGNATURE,
    v4_activation_identity: supExecCap.activation_identity,
    v4_payload_digest: supExecCap.payload_digest,
    v4_consumed_marker_digest: supExecCap.consumed_marker_digest,
    v4_launch_intent_digest: supExecCap.launch_intent_digest,
    v4_supervisor_claim_digest: supExecCap.supervisor_claim_digest,
    v4_supervisor_pid: supExecCap.supervisor_pid,
    // ---- temporal + candidate stack: SIGNED ----
    issued_epoch: supExecCap.issued_epoch, expiry_epoch: supExecCap.expiry_epoch, hard_deadline_epoch: supExecCap.hard_deadline_epoch,
    lrcq_base_sha: supExecCap.lrcq_base_sha, lrcq_base_tree: supExecCap.lrcq_base_tree,
    provider_candidate_sha: supExecCap.provider_candidate_sha, provider_candidate_tree: supExecCap.provider_candidate_tree,
    backlog_digest: supExecCap.backlog_digest, run_id: supExecCap.run_id, start_condition: "v4_supervisor_execution",
    // ---- limits: the SIGNED ceiling always wins. The manifest (itself bound by the SIGNED
    // run_manifest_digest) may narrow a limit but can NEVER widen one; the per-session CLI ceiling is the
    // run-wide ledger reservation, not the run cap. ----
    max_parallel_width: narrow(manifest.max_parallel_width, supExecCap.limits.max_parallel_width),
    per_job_timeout_s: narrow(manifest.per_job_timeout_s, supExecCap.limits.per_job_timeout_s),
    termination_grace_s: narrow(manifest.termination_grace_s, supExecCap.limits.termination_grace_s),
    max_output_bytes: narrow(manifest.output_cap_bytes, supExecCap.limits.max_output_bytes),
    max_budget_usd: narrow(opts.sessionBudgetUsd, supExecCap.limits.max_budget_usd),
    // ---- tool + path boundaries: manifest bound by the SIGNED run_manifest_digest ----
    allowed_tools: isChecker ? checkerTools : builderTools,
    denied_tools: isChecker ? SEMANTIC_DENY.concat(["Write", "Edit"]) : SEMANTIC_DENY.slice(),
    allowed_repository: manifest.repository_root, allowed_branch_prefix: manifest.branch_prefix,
    allowed_worktree_root: manifest.permitted_worktree_root, allowed_evidence_root: evidenceRoot,
    // ---- provider: SIGNED. EXECUTION uses provider_resolved_target (the immutable reviewed versioned
    // binary); provider_executable_path is the mutable alias, kept only for identity consistency. ----
    provider_executable_path: supExecCap.provider_executable_path,
    provider_resolved_target: supExecCap.resolved_provider_target || supExecCap.provider_executable_path,
    provider_executable_alias: supExecCap.provider_executable_path,
    provider_version: supExecCap.provider_version,
    provider_executable_identity: supExecCap.provider_identity,
    provider_mode: "default", subscription_only: true,
    prohibited_env: ["ANTHROPIC_API_KEY", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY"],
    prohibited_commands: SEMANTIC_DENY.slice(),
    stop_conditions: ["hard_deadline", "per_job_timeout", "pause", "stop", "queue_exhaustion", "founder_gate"],
    // ---- exclusions: SIGNED as true in the V4 payload; the verifier already refused anything else ----
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
  };
  return Object.freeze(rec);
}

// The bindings the V2 adapter validator cross-checks — also derived from SIGNED facts only.
export function projectLegacyBindingsV4(supExecCap, opts = {}) {
  return {
    lrcq_base_sha: supExecCap.lrcq_base_sha, lrcq_base_tree: supExecCap.lrcq_base_tree,
    provider_candidate_sha: supExecCap.provider_candidate_sha, provider_candidate_tree: supExecCap.provider_candidate_tree,
    backlog_digest: supExecCap.backlog_digest,
    provider_path: supExecCap.provider_executable_path, provider_version: supExecCap.provider_version,
    provider_identity: supExecCap.provider_identity,
    now_epoch: typeof opts.nowEpoch === "number" ? opts.nowEpoch : Math.floor(Date.now() / 1000),
    active_run: false, recovery_resolved: true,
    run_harness_candidate_sha: supExecCap.evaluated_candidate, run_harness_candidate_tree: supExecCap.evaluated_candidate_tree,
    candidate_stack: supExecCap.evaluated_candidate,
  };
}

// Is this record a projection of THIS capability? Used at the provider spawn boundary.
//
// FG-FCHK-197-B: the binding previously covered provenance + digests ONLY, never a limit or an exclusion —
// so a spread copy of the honest projection with one widened number still "matched" its capability. It now
// also requires every founder-signed limit to be present, valid and NO WIDER than the signed ceiling, and
// every signed exclusion to survive as exactly true. (The authoritative, refusal-reporting enforcement lives
// in provider/authority-boundary.mjs; this predicate is the same contract in boolean form, so a caller that
// only asks "is this projection bound to this capability?" cannot get a yes for a widened record.)
export function projectionMatchesCapability(rec, supExecCap) {
  if (!rec || rec.authoritative !== false || rec.projection_schema !== PROJECTION_SCHEMA) return false;
  if (!isSupervisorExecutionCapabilityV4(supExecCap)) return false;
  if (rec.v4_supervisor_claim_digest !== supExecCap.supervisor_claim_digest) return false;
  if (rec.v4_activation_identity !== supExecCap.activation_identity) return false;
  const limits = supExecCap.limits, exclusions = supExecCap.exclusions;
  if (!limits || !Object.isFrozen(limits) || !exclusions || !Object.isFrozen(exclusions)) return false;
  for (const spec of V4_SIGNED_LIMITS) {
    if (LIMIT_IS_RUN_WIDE.has(spec.field)) continue;      // bounded as a duration ceiling at the boundary
    const signed = limits[spec.field];
    if (!signedLimitValueValid(spec, signed)) return false;
    const projected = rec[spec.field];
    if (!signedLimitValueValid(spec, projected)) return false;
    if (projected > signed) return false;
  }
  for (const f of V4_SIGNED_EXCLUSIONS) if (exclusions[f] !== true || rec[f] !== true) return false;
  return true;
}
