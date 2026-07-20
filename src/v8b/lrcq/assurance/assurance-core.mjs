// FounderGate LRCQ Assurance Core — pure, fail-closed contracts for the unattended
// real-run harness. NO I/O, NO Claude. Implements: the five-plane authority matrix
// (A01), task-scoped capability leases (A03), blast-radius budgets (B21), and the
// three-layer activation record v3. Every validator refuses on absence/violation.

// ---- A01: FIVE-PLANE AUTHORITY MATRIX -------------------------------------------------
export const PLANES = ["control", "execution", "evidence", "identity_capability", "reconciliation"];
// Component -> the planes it MAY write. INVARIANT: no component may write all five.
export const AUTHORITY_MATRIX = {
  launcher: ["control"],
  controller: ["control"],
  provider_adapter: ["execution"],
  builder_worker: ["execution"],
  checker_worker: [],                         // read-only
  evidence_writer: ["evidence"],
  lease_manager: ["identity_capability"],
  reconciler: ["reconciliation"],
};
export const PLANE_CONTRACTS = {
  evidence: "append-only; no mutation/deletion of prior records",
  execution: "no self-approval; no gate signing; no merge/push",
  control: "no execution; schedules only",
  reconciliation: "no policy rewrite; records/decides reconciliation only",
  identity_capability: "issues/revokes leases; does not execute",
};
export function authorityViolations() {
  const v = [];
  for (const [comp, planes] of Object.entries(AUTHORITY_MATRIX)) {
    if (planes.length === PLANES.length) v.push(comp + " writes ALL five planes (forbidden)");
    for (const p of planes) if (!PLANES.includes(p)) v.push(comp + " references unknown plane " + p);
  }
  // cross-plane prohibitions
  if (AUTHORITY_MATRIX.controller.includes("execution")) v.push("control plane must not execute");
  if ((AUTHORITY_MATRIX.provider_adapter || []).some((p) => ["control", "evidence", "identity_capability", "reconciliation"].includes(p))) v.push("execution plane over-reaches");
  if (AUTHORITY_MATRIX.reconciler.includes("control")) v.push("reconciliation must not rewrite policy/control");
  if (AUTHORITY_MATRIX.checker_worker.length !== 0) v.push("checker must be read-only (no plane writes)");
  return v;
}
export function canWrite(component, plane) { return (AUTHORITY_MATRIX[component] || []).includes(plane); }

// ---- A03: TASK-SCOPED CAPABILITY LEASE ------------------------------------------------
export const LEASE_FIELDS = ["lease_id", "run_id", "job_id", "role", "candidate_stack", "branch", "worktree", "allowed_files", "allowed_tools", "denied_tools", "effect_class", "deadline_epoch", "max_cost_usd", "max_files", "max_changed_lines", "max_external_calls", "max_delegation_depth", "evidence_dir", "uses_remaining", "single_use", "expiry_epoch", "revoked"];
// bindings: { run_id, job_id, role, branch, worktree, file, tool, effect_class, now_epoch, cost_so_far }
export function validateLease(lease, bindings = {}) {
  const r = []; const R = (c, m) => { if (c) r.push(m); };
  R(!lease || typeof lease !== "object", "lease absent");
  if (!lease || typeof lease !== "object") return { valid: false, refusals: r };
  for (const f of LEASE_FIELDS) R(lease[f] === undefined || lease[f] === null, "lease missing " + f);
  R(lease.revoked === true, "lease revoked");
  R(typeof lease.expiry_epoch === "number" && typeof bindings.now_epoch === "number" && bindings.now_epoch >= lease.expiry_epoch, "lease expired");
  R(typeof lease.deadline_epoch === "number" && typeof bindings.now_epoch === "number" && bindings.now_epoch >= lease.deadline_epoch, "lease deadline passed");
  R(lease.single_use === true && !(lease.uses_remaining >= 1), "single-use lease already consumed");
  if (bindings.run_id !== undefined) R(lease.run_id !== bindings.run_id, "wrong run");
  if (bindings.job_id !== undefined) R(lease.job_id !== bindings.job_id, "wrong job");
  if (bindings.role !== undefined) R(lease.role !== bindings.role, "wrong role");
  if (bindings.branch !== undefined) R(lease.branch !== bindings.branch, "wrong branch");
  if (bindings.worktree !== undefined) R(lease.worktree !== bindings.worktree, "wrong worktree");
  if (bindings.file !== undefined) R(!(lease.allowed_files || []).some((f) => bindings.file === f || (f.endsWith("/") && bindings.file.startsWith(f))), "file outside lease: " + bindings.file);
  if (bindings.tool !== undefined) R(!(lease.allowed_tools || []).includes(bindings.tool), "tool outside lease: " + bindings.tool);
  if (bindings.effect_class !== undefined) R(bindings.effect_class !== lease.effect_class, "effect class widened");
  if (typeof bindings.cost_so_far === "number") R(bindings.cost_so_far > lease.max_cost_usd, "cost overrun");
  return { valid: r.length === 0, refusals: r };
}

// ---- B21: BLAST-RADIUS BUDGET ---------------------------------------------------------
export const BLAST_DIMS = ["max_files", "max_changed_lines", "max_branches", "max_worktrees", "max_external_calls", "max_recipients", "max_dollars", "max_records", "max_execution_s", "max_delegation_depth", "max_output_bytes"];
const posFin = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
export function validateBlastBudget(budget) {
  const r = []; if (!budget || typeof budget !== "object") return { valid: false, refusals: ["budget absent"] };
  for (const d of BLAST_DIMS) { if (budget[d] === undefined || budget[d] === null) r.push("missing " + d); else if (!posFin(budget[d])) r.push("malformed " + d); }
  return { valid: r.length === 0, refusals: r };
}
// usage: an object with same keys (current cumulative). Returns exceeded dimensions.
export function blastExceeded(budget, usage) {
  const ex = [];
  for (const d of BLAST_DIMS) if (typeof usage[d] === "number" && usage[d] > budget[d]) ex.push(d + " (" + usage[d] + ">" + budget[d] + ")");
  return ex;
}

// ---- ACTIVATION RECORD v3 (three-layer candidate binding + hard upper bounds) ---------
export const ACTIVATION_V3_VERSION = "lrcq-activation-3";
export const V3_LIMITS = { max_parallel_width: 3, max_budget_usd: 10, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 10485760, run_duration_s: 18000, delegation_depth: 1, external_calls: 0, recipients: 0 };
export const V3_REQUIRED = ["schema_version", "founder_signature", "issued_epoch", "expiry_epoch", "lrcq_base_sha", "lrcq_base_tree", "provider_candidate_sha", "provider_candidate_tree", "run_harness_candidate_sha", "run_harness_candidate_tree", "assurance_control_backlog_digest", "first_real_run_backlog_digest", "provider_executable_path", "provider_version", "provider_executable_identity", "policy_version", "capability_lease_digest", "blast_radius_budget_digest", "run_id", "hard_deadline_epoch", "run_duration_s", "max_parallel_width", "per_job_timeout_s", "termination_grace_s", "max_output_bytes", "max_budget_usd", "delegation_depth", "external_calls", "recipients", "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass"];
export function validateActivationV3(rec, bindings = {}) {
  const r = []; const R = (c, m) => { if (c) r.push(m); };
  if (!rec || typeof rec !== "object") return { valid: false, refusals: ["activation absent"] };
  for (const f of V3_REQUIRED) R(rec[f] === undefined || rec[f] === null || rec[f] === "", "missing " + f);
  R(rec.schema_version !== ACTIVATION_V3_VERSION, "wrong schema_version");
  // three-layer candidate + policy/backlog binding
  for (const [k, b] of [["lrcq_base_sha", "lrcq_base_sha"], ["lrcq_base_tree", "lrcq_base_tree"], ["provider_candidate_sha", "provider_candidate_sha"], ["provider_candidate_tree", "provider_candidate_tree"], ["run_harness_candidate_sha", "run_harness_candidate_sha"], ["run_harness_candidate_tree", "run_harness_candidate_tree"], ["assurance_control_backlog_digest", "assurance_control_backlog_digest"], ["first_real_run_backlog_digest", "first_real_run_backlog_digest"], ["provider_executable_path", "provider_path"], ["provider_executable_identity", "provider_identity"]]) {
    if (bindings[b] !== undefined) R(rec[k] !== bindings[b], k + " differs from binding");
  }
  // hard upper bounds (larger values refuse)
  R(!(rec.max_parallel_width >= 1 && rec.max_parallel_width <= V3_LIMITS.max_parallel_width), "max_parallel_width out of [1,3]");
  R(!(rec.max_budget_usd > 0 && rec.max_budget_usd <= V3_LIMITS.max_budget_usd), "max_budget_usd out of (0,10]");
  R(!(rec.per_job_timeout_s > 0 && rec.per_job_timeout_s <= V3_LIMITS.per_job_timeout_s), "per_job_timeout_s out of (0,2700]");
  R(!(rec.termination_grace_s > 0 && rec.termination_grace_s <= V3_LIMITS.termination_grace_s), "termination_grace_s out of (0,30]");
  R(!(rec.max_output_bytes > 0 && rec.max_output_bytes <= V3_LIMITS.max_output_bytes), "max_output_bytes out of (0,10MiB]");
  R(!(rec.run_duration_s > 0 && rec.run_duration_s <= V3_LIMITS.run_duration_s), "run_duration_s out of (0,18000]");
  R(rec.delegation_depth > V3_LIMITS.delegation_depth, "delegation_depth > 1");
  R(rec.external_calls !== 0, "external_calls must be 0");
  R(rec.recipients !== 0, "recipients must be 0");
  // temporal
  R(typeof bindings.now_epoch === "number" && rec.expiry_epoch <= bindings.now_epoch, "expired");
  R(typeof bindings.now_epoch === "number" && rec.hard_deadline_epoch <= bindings.now_epoch, "deadline elapsed");
  // no-action flags must all be true
  for (const f of ["no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass"]) R(rec[f] !== true, f + " must be true");
  return { valid: r.length === 0, refusals: r };
}
