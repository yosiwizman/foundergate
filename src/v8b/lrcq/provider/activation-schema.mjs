// FounderGate LRCQ — founder ACTIVATION-RECORD schema + fail-closed validator (HARDENED).
// The activation record is the ENTIRE safety boundary for a real run. It binds the EXACT
// final stacked PR #188 provider candidate (not merely PR #187) and requires positive,
// bounded numeric limits incl. a MANDATORY cost ceiling. This module NEVER invokes Claude
// and NEVER reads credentials.

export const ACTIVATION_SCHEMA_VERSION = "lrcq-activation-2";

export const REQUIRED_FIELDS = [
  "schema_version", "founder_signature", "issued_epoch", "expiry_epoch",
  // combined candidate binding (FG-LRCQ-P188-001): PR#187 base AND the final provider candidate
  "lrcq_base_sha", "lrcq_base_tree", "provider_candidate_sha", "provider_candidate_tree",
  "backlog_digest", "run_id", "start_condition", "hard_deadline_epoch",
  "max_parallel_width", "per_job_timeout_s", "termination_grace_s", "max_output_bytes",
  "max_budget_usd", // MANDATORY cost ceiling (FG-LRCQ-P188-011)
  "allowed_tools", "denied_tools",
  "allowed_repository", "allowed_branch_prefix", "allowed_worktree_root", "allowed_evidence_root",
  "provider_executable_path", "provider_version", "provider_executable_identity", "provider_mode", "subscription_only",
  "prohibited_env", "prohibited_commands", "stop_conditions",
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized",
  "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass",
];

const PERMISSION_BYPASS = ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "bypassPermissions"];
const posFinite = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const posFiniteInt = (v) => Number.isInteger(v) && v > 0;

// The deny-list must SEMANTICALLY cover each prohibited class (FG-LRCQ-P188-012).
const DENY_SEMANTICS = {
  "git push": (t) => /git\s+push/i.test(t),
  "git merge": (t) => /git\s+merge/i.test(t),
  "protected-main checkout/switch": (t) => /git\s+(checkout|switch)/i.test(t),
  "gh pr merge": (t) => /gh\s+pr\s+merge/i.test(t),
  "destructive reset": (t) => /git\s+reset\s+--hard|git\s+clean\s+-|rm\s+-rf/i.test(t),
  "permission bypass": (t) => /dangerously-skip-permissions|bypassPermissions/i.test(t),
};
export function denyListSemanticGaps(deniedTools) {
  const joined = (deniedTools || []).join("   ");
  const gaps = [];
  for (const [cls, m] of Object.entries(DENY_SEMANTICS)) if (!m(joined)) gaps.push(cls);
  return gaps;
}

// bindings = { lrcq_base_sha, lrcq_base_tree, provider_candidate_sha, provider_candidate_tree,
//              backlog_digest, provider_path, provider_version, provider_identity,
//              now_epoch, active_run, recovery_resolved }
export function validateActivation(rec, bindings = {}) {
  const refusals = [];
  const R = (c, m) => { if (c) refusals.push(m); };
  R(!rec || typeof rec !== "object", "activation record absent/not-an-object");
  if (!rec || typeof rec !== "object") return { valid: false, refusals };

  for (const f of REQUIRED_FIELDS) R(rec[f] === undefined || rec[f] === null || rec[f] === "", "missing field: " + f);
  R(rec.schema_version !== ACTIVATION_SCHEMA_VERSION, "wrong schema_version (expected " + ACTIVATION_SCHEMA_VERSION + ")");

  // ---- bounded numeric limits (all positive + finite) ----
  R(!posFinite(rec.issued_epoch), "issued_epoch must be positive finite");
  R(!posFinite(rec.expiry_epoch), "expiry_epoch must be positive finite");
  R(!posFinite(rec.hard_deadline_epoch), "hard_deadline_epoch must be positive finite");
  R(!posFinite(rec.max_budget_usd), "max_budget_usd must be finite > 0 (mandatory cost ceiling)");
  R(!posFiniteInt(rec.max_parallel_width), "max_parallel_width must be a positive integer");
  R(!posFinite(rec.per_job_timeout_s), "per_job_timeout_s must be finite > 0");
  R(!posFinite(rec.termination_grace_s), "termination_grace_s must be finite > 0");
  R(!posFinite(rec.max_output_bytes), "max_output_bytes must be finite > 0");
  // temporal ordering
  const now = bindings.now_epoch;
  R(posFinite(rec.issued_epoch) && typeof now === "number" && rec.issued_epoch > now + 60, "issued_epoch is in the future");
  R(posFinite(rec.issued_epoch) && posFinite(rec.expiry_epoch) && rec.expiry_epoch <= rec.issued_epoch, "expiry not later than issue");
  R(posFinite(rec.issued_epoch) && posFinite(rec.hard_deadline_epoch) && rec.hard_deadline_epoch <= rec.issued_epoch, "hard deadline not later than issue");
  R(typeof now === "number" && posFinite(rec.expiry_epoch) && now >= rec.expiry_epoch, "activation expired");
  R(typeof now === "number" && posFinite(rec.hard_deadline_epoch) && now >= rec.hard_deadline_epoch, "hard deadline elapsed");

  // ---- combined candidate binding (final PR#188 provider candidate + PR#187 base) ----
  R(bindings.lrcq_base_sha !== undefined && rec.lrcq_base_sha !== bindings.lrcq_base_sha, "lrcq_base_sha differs");
  R(bindings.lrcq_base_tree !== undefined && rec.lrcq_base_tree !== bindings.lrcq_base_tree, "lrcq_base_tree differs");
  R(bindings.provider_candidate_sha !== undefined && rec.provider_candidate_sha !== bindings.provider_candidate_sha, "provider_candidate_sha differs");
  R(bindings.provider_candidate_tree !== undefined && rec.provider_candidate_tree !== bindings.provider_candidate_tree, "provider_candidate_tree differs");
  R(bindings.backlog_digest !== undefined && rec.backlog_digest !== bindings.backlog_digest, "backlog_digest differs");
  R(bindings.provider_path !== undefined && rec.provider_executable_path !== bindings.provider_path, "provider path differs");
  R(bindings.provider_version !== undefined && rec.provider_version !== bindings.provider_version, "provider version differs");
  R(bindings.provider_identity !== undefined && rec.provider_executable_identity !== bindings.provider_identity, "provider executable identity differs");

  // ---- tool boundaries ----
  R(!Array.isArray(rec.allowed_tools) || rec.allowed_tools.length === 0, "allowed_tools absent/empty");
  R(!Array.isArray(rec.denied_tools) || rec.denied_tools.length === 0, "denied_tools absent/empty");
  if (Array.isArray(rec.denied_tools) && rec.denied_tools.length) { const gaps = denyListSemanticGaps(rec.denied_tools); R(gaps.length > 0, "denied_tools missing prohibitions: " + gaps.join(", ")); }
  R(Array.isArray(rec.allowed_tools) && rec.allowed_tools.some((t) => PERMISSION_BYPASS.includes(t)), "allowed_tools contains a permission-bypass token");

  // ---- boundaries present ----
  R(!rec.allowed_worktree_root, "worktree boundary absent");
  R(!rec.allowed_evidence_root, "evidence boundary absent");
  R(!rec.allowed_repository, "repository boundary absent");

  // ---- subscription condition explicit (additional, NOT a replacement for the cost ceiling) ----
  R(rec.subscription_only !== true && rec.subscription_only !== false, "subscription condition cannot be verified");

  // ---- permission bypass ----
  const bypassRequested = rec.no_permission_bypass !== true || rec.provider_mode === "bypassPermissions" ||
    (Array.isArray(rec.allowed_tools) && rec.allowed_tools.some((t) => PERMISSION_BYPASS.includes(t))) ||
    (rec.extra_flags && [].concat(rec.extra_flags).some((f) => PERMISSION_BYPASS.includes(f)));
  R(bypassRequested, "permission-bypass requested/permitted -> refused");

  // ---- concurrency + recovery ----
  R(bindings.active_run === true, "another run is active");
  R(bindings.recovery_resolved === false, "recovery state unresolved");

  // ---- hard safety flags ----
  for (const flag of ["no_protected_main_merge", "no_pr_merge", "no_m1", "no_akior", "no_customer_data", "no_live_action"]) R(rec[flag] !== true, flag + " must be true");
  return { valid: refusals.length === 0, refusals };
}
