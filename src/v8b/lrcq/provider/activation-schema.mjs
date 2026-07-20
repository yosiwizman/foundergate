// FounderGate LRCQ — founder ACTIVATION-RECORD schema + fail-closed validator.
// The activation record is the ENTIRE safety boundary for a real run. Without a
// complete, non-stale, binding-matched record, no real Claude worker may start.
// This module NEVER invokes Claude and NEVER reads credentials.

export const ACTIVATION_SCHEMA_VERSION = "lrcq-activation-1";

// Every required field. Absence of ANY -> refusal.
export const REQUIRED_FIELDS = [
  "schema_version", "founder_signature", "issued_epoch", "expiry_epoch",
  "candidate_sha", "candidate_tree", "pr187_base_sha", "backlog_digest", "run_id",
  "start_condition", "hard_deadline_epoch", "max_parallel_width", "per_job_timeout_s",
  "termination_grace_s", "max_output_bytes", "allowed_tools", "denied_tools",
  "allowed_repository", "allowed_branch_prefix", "allowed_worktree_root", "allowed_evidence_root",
  "provider_executable_path", "provider_version", "provider_mode", "subscription_only",
  "prohibited_env", "prohibited_commands", "stop_conditions",
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized",
  "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass",
];

const PERMISSION_BYPASS = ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "bypassPermissions"];

// bindings = { candidate_sha, candidate_tree, backlog_digest, provider_path, provider_version,
//              now_epoch, active_run (bool), recovery_resolved (bool) }
export function validateActivation(rec, bindings = {}) {
  const refusals = [];
  const R = (c, m) => { if (c) refusals.push(m); };

  R(!rec || typeof rec !== "object", "activation record absent/not-an-object");
  if (!rec || typeof rec !== "object") return { valid: false, refusals };

  for (const f of REQUIRED_FIELDS) R(rec[f] === undefined || rec[f] === null || rec[f] === "", "missing field: " + f);
  R(rec.schema_version !== ACTIVATION_SCHEMA_VERSION, "wrong schema_version");

  // expiry / deadline
  const now = bindings.now_epoch;
  R(typeof rec.expiry_epoch === "number" && typeof now === "number" && now >= rec.expiry_epoch, "activation expired");
  R(rec.hard_deadline_epoch === undefined || rec.hard_deadline_epoch === null, "hard deadline absent");
  R(typeof rec.hard_deadline_epoch === "number" && typeof now === "number" && now >= rec.hard_deadline_epoch, "hard deadline elapsed");

  // exact binding matches (candidate SHA/tree, backlog digest, provider identity)
  R(bindings.candidate_sha !== undefined && rec.candidate_sha !== bindings.candidate_sha, "candidate_sha differs");
  R(bindings.candidate_tree !== undefined && rec.candidate_tree !== bindings.candidate_tree, "candidate_tree differs");
  R(bindings.backlog_digest !== undefined && rec.backlog_digest !== bindings.backlog_digest, "backlog_digest differs");
  R(bindings.provider_path !== undefined && rec.provider_executable_path !== bindings.provider_path, "provider identity (path) differs");
  R(bindings.provider_version !== undefined && rec.provider_version !== bindings.provider_version, "provider version differs");

  // tool boundaries present + non-empty arrays
  R(!Array.isArray(rec.allowed_tools) || rec.allowed_tools.length === 0, "allowed_tools absent/empty");
  R(!Array.isArray(rec.denied_tools), "denied_tools absent");

  // worktree + evidence boundaries present
  R(!rec.allowed_worktree_root, "worktree boundary absent");
  R(!rec.allowed_evidence_root, "evidence boundary absent");

  // subscription-only condition must be explicitly verifiable
  R(rec.subscription_only !== true && rec.subscription_only !== false, "subscription condition cannot be verified");

  // permission-bypass requested anywhere -> refuse
  const bypassRequested =
    rec.no_permission_bypass !== true ||
    rec.provider_mode === "bypassPermissions" ||
    (Array.isArray(rec.allowed_tools) && rec.allowed_tools.some((t) => PERMISSION_BYPASS.includes(t))) ||
    (rec.extra_flags && [].concat(rec.extra_flags).some((f) => PERMISSION_BYPASS.includes(f)));
  R(bypassRequested, "permission-bypass requested/permitted -> refused");

  // concurrency + recovery
  R(bindings.active_run === true, "another run is active");
  R(bindings.recovery_resolved === false, "recovery state unresolved");

  // hard safety flags must all be affirmatively set
  for (const flag of ["no_protected_main_merge", "no_pr_merge", "no_m1", "no_akior", "no_customer_data", "no_live_action"]) {
    R(rec[flag] !== true, flag + " must be true");
  }
  return { valid: refusals.length === 0, refusals };
}
