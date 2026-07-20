// FounderGate LRCQ — deterministic setup pipeline (Tier-1). Pure, ordered, fail-closed.
// 25 ordered verification/initialization steps. Each step has intent/action/expected/actual/
// verifier/status/evidence/rollback/next_safe_action. A failed step BLOCKS all later steps.
// NO Claude, NO provider invocation, NO merge. Steps are injected as functions for determinism.
import { validateActivationV3, validateLease, validateBlastBudget, authorityViolations } from "../assurance/assurance-core.mjs";

export const STEP_ORDER = [
  "verify_host", "verify_repository", "verify_candidate_stack", "verify_master_backlog_digest",
  "verify_first_real_run_backlog_digest", "verify_provider_identity", "validate_activation_record",
  "validate_capability_lease", "validate_blast_budget", "verify_no_active_run", "acquire_run_lock",
  "create_run_id", "init_evidence_root", "init_run_ledger", "init_replay_stream", "init_transaction_registry",
  "allocate_branches", "create_registered_worktrees", "verify_worktree_branch_identity", "init_controller_real_mode",
  "load_backlog", "validate_dependency_graph", "start_localhost_console", "record_ready", "allow_scheduling",
];

// checks: a map step_name -> () => ({ ok, actual, evidence }). Missing check => step fails closed.
export function runSetup(checks, ctx = {}) {
  const results = []; let blocked = false;
  for (const step of STEP_ORDER) {
    if (blocked) { results.push({ step, status: "BLOCKED", reason: "earlier step failed" }); continue; }
    const fn = checks[step];
    let r;
    try { r = fn ? fn(ctx) : { ok: false, actual: "no verifier for step" }; }
    catch (e) { r = { ok: false, actual: "verifier threw: " + (e.message || e) }; }
    const status = r.ok ? "PASS" : "FAIL";
    results.push({ step, intent: "verify/init " + step, status, actual: r.actual ?? null, evidence: r.evidence ?? null, rollback: r.rollback ?? "abort run; release lock", next_safe_action: r.ok ? "proceed" : "stop; report step failure" });
    if (!r.ok) blocked = true;
  }
  const failedAt = results.find((x) => x.status === "FAIL");
  return { ok: !failedAt && !blocked, ready: results[results.length - 1]?.status === "PASS", failed_step: failedAt ? failedAt.step : null, results };
}

// Convenience: a standard checks factory binding the real validators. Everything is passed
// in (no ambient I/O) so the pipeline stays pure and testable.
export function standardChecks(env) {
  const eq = (a, b) => a === b;
  return {
    verify_host: () => ({ ok: eq(env.host_model, "Mac16,11"), actual: env.host_model }),
    verify_repository: () => ({ ok: eq(env.repo_origin_ok, true), actual: env.repo_origin_ok }),
    verify_candidate_stack: () => ({ ok: env.lrcq_base_ok && env.provider_candidate_ok && env.run_harness_candidate_ok, actual: "3-layer" }),
    verify_master_backlog_digest: () => ({ ok: eq(env.master_digest, env.expected_master_digest), actual: env.master_digest }),
    verify_first_real_run_backlog_digest: () => ({ ok: eq(env.frr_digest, env.expected_frr_digest), actual: env.frr_digest }),
    verify_provider_identity: () => ({ ok: eq(env.provider_identity, env.expected_provider_identity), actual: env.provider_identity }),
    validate_activation_record: () => ({ ok: validateActivationV3(env.activation, env.activation_bindings).valid, actual: "v3" }),
    validate_capability_lease: () => ({ ok: validateLease(env.lease, env.lease_bindings).valid, actual: "lease" }),
    validate_blast_budget: () => ({ ok: validateBlastBudget(env.blast_budget).valid, actual: "blast" }),
    verify_no_active_run: () => ({ ok: eq(env.active_run, false), actual: env.active_run }),
    acquire_run_lock: () => ({ ok: env.lock_acquired === true, actual: env.lock_acquired }),
    create_run_id: () => ({ ok: !!env.run_id, actual: env.run_id }),
    init_evidence_root: () => ({ ok: !!env.evidence_root, actual: env.evidence_root }),
    init_run_ledger: () => ({ ok: env.ledger_ready === true }),
    init_replay_stream: () => ({ ok: env.replay_ready === true }),
    init_transaction_registry: () => ({ ok: env.tx_registry_ready === true }),
    allocate_branches: () => ({ ok: env.branches_ok === true }),
    create_registered_worktrees: () => ({ ok: env.worktrees_ok === true }),
    verify_worktree_branch_identity: () => ({ ok: env.identity_ok === true }),
    init_controller_real_mode: () => ({ ok: env.controller_real === true }),
    load_backlog: () => ({ ok: env.backlog_loaded === true }),
    validate_dependency_graph: () => ({ ok: env.dep_graph_ok === true && authorityViolations().length === 0 }),
    start_localhost_console: () => ({ ok: env.console_started === true }),
    record_ready: () => ({ ok: env.ready_recorded === true }),
    allow_scheduling: () => ({ ok: env.scheduling_allowed === true }),
  };
}
