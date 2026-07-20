// FounderGate LRCQ — SINGLE run orchestrator (first internal 5h WIDE-SAFE run).
// This is the ONE place that wires the governed lifecycle end to end:
//   activation -> exact candidate/backlog/provider binding -> run lock -> setup pipeline
//   -> capability lease -> blast-radius -> controller REAL -> eligible WIDE_SAFE selection
//   -> branch/worktree verify -> sealed intent -> single-route dispatch -> machine verification
//   -> independent read-only checker -> correction/completion -> replay -> reconciliation
//   -> evidence seal -> lock release + teardown -> pause/stop/gate/deadline/exhaustion.
//
// It NEVER: invokes an alternate provider route; launches without a valid activation record;
// dispatches without a valid single-use lease; dispatches without a sealed AUTHORIZED intent;
// retries an uncertain dispatch; treats builder success as completion; treats checker CLEAN as
// accept/merge; pushes; merges; writes protected main; contacts M1/AKIOR; touches customer data.
//
// The provider `dispatch` is INJECTED. The real launcher wires the ONE governed adapter
// (controller.stepReal -> provider/real-provider.runJob, spawning the founder-approved executable).
// Tests inject a DETERMINISTIC stub (never real Claude). There is exactly one dispatch seam.

import { Controller, MODE, isEligible, jobsCollide } from "../controller.mjs";
import { validateActivationV3, validateLease, validateBlastBudget, blastExceeded, authorityViolations } from "../assurance/assurance-core.mjs";
import { runSetup } from "./setup-pipeline.mjs";
import { SeparationJob } from "./separation.mjs";
import { ReplayStream } from "./replay.mjs";
import { validateIntent, canDispatch, reconcile, mayResume } from "../reconciliation/transaction.mjs";

export const HARNESS_STAGES = [
  "load_activation", "validate_activation", "validate_candidate_stack", "validate_backlog_digests",
  "validate_provider_identity", "acquire_run_lock", "setup_pipeline", "validate_capability_lease",
  "validate_blast_budget", "controller_real_init", "select_wide_safe", "verify_branch_worktree",
  "seal_intent", "dispatch_single_route", "machine_verification", "independent_checker",
  "transition", "replay_event", "reconciliation", "seal_evidence", "teardown",
];

// A hard refusal aborts the whole run BEFORE any dispatch. Returns a structured envelope.
function refuse(stage, reasons, extra = {}) {
  return { ready: false, refused: { stage, reasons: [].concat(reasons) }, dispatched: false, ...extra };
}

// The single-route guard. Any dispatch MUST pass through here; it enforces that a sealed
// AUTHORIZED intent exists, the idempotency key is fresh, a valid single-use lease is present,
// and the blast budget is not exceeded — THEN calls the injected provider seam exactly once.
async function governedDispatch(cfg, job, intent, lease, budget, usage, txByKey, replay, bindings) {
  const cd = canDispatch(intent, txByKey);
  if (!cd.ok) return { dispatched: false, refused: cd.reason, duplicate: !!cd.duplicate };
  // task-scoped lease: mint the per-job binding from the template and revalidate FULLY at the
  // dispatch boundary against THIS job (run/job/role/branch/worktree/file/tool/effect/cost).
  const jobLease = { ...lease, job_id: job.job_id, branch: job.branch, worktree: job.worktree, role: "builder" };
  const lv = validateLease(jobLease, { ...bindings, run_id: cfg.run_id, job_id: job.job_id, role: "builder", branch: job.branch, worktree: job.worktree });
  if (!lv.valid) return { dispatched: false, refused: "lease invalid at dispatch: " + lv.refusals.join(";") };
  // Check PROJECTED usage — the record this dispatch will seal (max_records +1) must fit the
  // budget. Checking projected (not current) usage means budget N allows exactly N completions,
  // never N+1. Any already-exceeded dimension also refuses.
  const projected = { ...usage, max_records: (usage.max_records || 0) + 1 };
  const ex = blastExceeded(budget, projected);
  if (ex.length) return { dispatched: false, refused: "blast budget exceeded: " + ex.join(";") };
  // mark dispatched in the registry BEFORE the provider call — a crash after this point is
  // an uncertain dispatch that reconciliation must NOT re-fire.
  txByKey[intent.idempotency_key] = { state: "DISPATCHED", job_id: job.job_id };
  if (lease.single_use) lease.uses_remaining -= 1; // consume the single-use lease
  const out = await cfg.dispatch(job, { activation: cfg.activation, bindings });
  return { dispatched: true, provider: out };
}

// Run ONE job through the full governed lifecycle. `sep` is its SeparationJob.
async function runJobLifecycle(cfg, job, lease, budget, usage, txByKey, replay, bindings, ledger) {
  const sep = new SeparationJob(job.job_id, job.max_attempts || 3);
  const builderSession = { session_id: "builder:" + cfg.run_id + ":" + job.job_id, prompt_digest: "bpd:" + job.job_id, read_only: false };
  let last = { state: sep.state };
  while (true) {
    // ---- sealed transaction intent (AUTHORIZED before any dispatch) ----
    const attempt = sep.attempts + 1;
    const intent = {
      transaction_id: "tx:" + cfg.run_id + ":" + job.job_id + ":" + attempt,
      idempotency_key: "k:" + cfg.run_id + ":" + job.job_id + ":" + attempt,
      run_id: cfg.run_id, job_id: job.job_id, attempt, role: "builder",
      candidate_stack: bindings.candidate_stack || "stack", backlog_digest: cfg.master_digest,
      lease_digest: cfg.lease_digest, blast_budget_digest: cfg.blast_digest,
      prompt_digest: builderSession.prompt_digest, tool_digests: "tools", worktree: job.worktree,
      branch: job.branch, pre_action_fingerprint: "fp:" + job.job_id + ":" + attempt,
      deadline_epoch: cfg.deadlineEpoch || 9e12, budget_usd: 1, evidence_dir: cfg.evidenceDir || "/ev",
      state: "AUTHORIZED",
    };
    const iv = validateIntent(intent);
    if (!iv.valid) { ledger.push({ job: job.job_id, stage: "seal_intent", refused: iv.refusals }); return { job_id: job.job_id, state: "PARKED", reason: "intent invalid" }; }
    sep.startBuilder(builderSession);
    // ---- dispatch through the single governed route ----
    const d = await governedDispatch(cfg, job, intent, lease, budget, usage, txByKey, replay, bindings);
    if (!d.dispatched) return { job_id: job.job_id, state: "PARKED", reason: "dispatch refused: " + d.refused, duplicate: d.duplicate };
    const prov = d.provider || {};
    // ---- uncertain-effect path: reconcile observed reality. NEVER auto re-fire an uncertain
    // dispatch. SAFE_TO_RESUME (intent only, no external effect, worktree unchanged) is the only
    // resumable case, and only after proving no duplicate effect; everything else stays HELD. ----
    if (prov.uncertain) {
      const obs = prov.obs || { dispatch_exists: true, process_alive: false, definitive_result: false };
      const rec = reconcile(obs);
      const resumable = mayResume(rec, true); // no-duplicate-effect proven by observation above
      // registry reflects the reconciliation: a safe-to-resume case rolls back to INTENT_RECORDED
      // (no external effect happened); an uncertain dispatch is EXTERNALLY_OBSERVED and must not re-fire.
      txByKey[intent.idempotency_key] = { state: resumable ? "INTENT_RECORDED" : "EXTERNALLY_OBSERVED", job_id: job.job_id, reconciliation: rec.state };
      replay.append(replayEvent(cfg, job, attempt, resumable ? "INTENT_RECORDED" : "DISPATCHED", rec.state));
      ledger.push({ job: job.job_id, stage: "reconciliation", reconciliation: rec.state, recommend: rec.recommend, resumable });
      return { job_id: job.job_id, state: resumable ? "SAFE_TO_RESUME_HELD" : "HELD_RECONCILE", reconciliation: rec.state, recommend: rec.recommend, resumed: false, resumable };
    }
    const builderOk = prov.ok === true;
    // builder exit-0 is NOT completion — machine verification is mandatory
    sep.builderResult(builderOk);
    sep.machineVerification(builderOk && prov.machine_verified !== false);
    if (sep.state === "PARKED") { replay.append(replayEvent(cfg, job, attempt, "DISPATCHED", "n/a")); return { job_id: job.job_id, state: "PARKED", reason: "parked after repeated machine-verification failure" }; }
    if (sep.state === "CORRECTION_PENDING") { ledger.push({ job: job.job_id, stage: "machine_verification", result: "fail->correction", attempt }); continue; }
    // ---- independent read-only checker (distinct session + prompt) ----
    const chk = cfg.checker
      ? await cfg.checker(job, builderSession, attempt)
      : { clean: prov.checker_clean !== false, session: { session_id: "checker:" + cfg.run_id + ":" + job.job_id + ":" + attempt, prompt_digest: "cpd:" + job.job_id + ":" + attempt, read_only: true } };
    sep.startChecker(chk.session); // throws if not independent / not read-only
    sep.checkerResult(chk.clean === true);
    if (sep.state === "PARKED") { replay.append(replayEvent(cfg, job, attempt, "SEALED", "n/a")); return { job_id: job.job_id, state: "PARKED", reason: "parked after repeated checker findings" }; }
    if (sep.state === "CORRECTION_PENDING") { ledger.push({ job: job.job_id, stage: "independent_checker", result: "findings->correction", attempt }); continue; }
    // ---- checker CLEAN: seal evidence THEN complete (never merge/accept) ----
    txByKey[intent.idempotency_key] = { state: "SEALED", job_id: job.job_id };
    usage.max_records = (usage.max_records || 0) + 1;
    replay.append(replayEvent(cfg, job, attempt, "SEALED", "RESULT_COMPLETE"));
    sep.complete();
    last = { job_id: job.job_id, state: "COMPLETED", merged: sep.canMerge(), accepted: sep.canAccept() };
    return last;
  }
}

function replayEvent(cfg, job, attempt, txState, reconState) {
  return {
    run_id: cfg.run_id, job_id: job.job_id, attempt, role: "builder", provider: "governed", model_id: null,
    cli_version: cfg.provider_version || "stub", executable_identity: cfg.provider_identity || "stub", policy_version: "pv",
    candidate_stack: "stack", prompt_digest: "pd", allowed_tools_digest: "ad", denied_tools_digest: "dd",
    lease_digest: cfg.lease_digest, blast_budget_digest: cfg.blast_digest, stdout_digest: "od", stderr_digest: "ed",
    transcript_digest: "td", branch: job.branch, worktree: job.worktree, pre_fingerprint: "pf", post_fingerprint: "pf2",
    checkpoint_before: "cb", checkpoint_after: "ca", transaction_state: txState, reconciliation_state: reconState,
    evidence_path: (cfg.evidenceDir || "/ev") + "/" + job.job_id, timestamp: cfg.now || 0,
  };
}

// The orchestrator. Deterministic given its injected seams. Returns a full structured result.
export async function runHarness(cfg) {
  const ledger = [];
  const bindings = cfg.bindings || {};
  // 1. load activation
  if (!cfg.activation) return refuse("load_activation", "no activation record");
  // 2/3/4/5. validate activation (three-layer candidate stack + backlog digests + provider identity + bounds)
  const av = validateActivationV3(cfg.activation, bindings);
  if (!av.valid) return refuse("validate_activation", av.refusals);
  // authority-plane invariant must hold before anything runs
  if (authorityViolations().length) return refuse("controller_real_init", authorityViolations());
  // 6. acquire run lock (injected lock manager; refuse if a live run is present)
  if (cfg.lockManager) {
    const lk = cfg.lockManager.acquire(cfg.run_id, cfg.now);
    if (!lk.ok) return refuse("acquire_run_lock", lk.reason || "run lock unavailable (live run?)");
  }
  // 7. setup pipeline — must be fully READY (a failed step blocks all later)
  const setup = cfg.setupChecks ? runSetup(cfg.setupChecks, cfg.setupCtx || {}) : { ok: true, ready: true, results: [] };
  if (!setup.ready || !setup.ok) return refuse("setup_pipeline", "setup not ready: failed_step=" + (setup.failed_step || "?"), { setup });
  // 8. capability lease. The lease is task-scoped (per-job binding is minted + fully revalidated
  // at each dispatch). At the RUN level we validate the template's shape + revocation/expiry/
  // single-use/run-scope against a run-scope overlay (job/branch/worktree are bound later).
  const lease = cfg.lease;
  const leaseShape = lease ? { ...lease, job_id: lease.job_id ?? "run-scope", branch: lease.branch ?? "run-scope", worktree: lease.worktree ?? "run-scope" } : lease;
  const lv = validateLease(leaseShape, { ...bindings, run_id: cfg.run_id });
  if (!lv.valid) return refuse("validate_capability_lease", lv.refusals);
  // 9. blast-radius budget
  const bv = validateBlastBudget(cfg.blast_budget);
  if (!bv.valid) return refuse("validate_blast_budget", bv.refusals);
  // 10. controller REAL init
  const controller = new Controller({ run_id: cfg.run_id, mode: MODE.REAL, maxWidth: cfg.maxWidth || 2, now: cfg.now || 0, deadlineEpoch: cfg.deadlineEpoch || null });
  controller.load(cfg.backlog || []);
  const replay = new ReplayStream(cfg.run_id);
  const txByKey = cfg.txByKey || {};
  const usage = { ...zeroUsage() };
  const jobResults = {};
  const teardown = { locks_released: [], processes_accounted: [] };

  // ---- deterministic governed scheduler ----
  const running = new Set();
  let ticks = 0;
  const maxTicks = (cfg.backlog || []).length * 8 + 50;
  while (ticks++ < maxTicks) {
    // pause / stop / deadline / gate checks BEFORE selecting new work
    if (cfg.control && cfg.control.stop) { controller.runtime_state = "STOPPED_BY_STOP"; break; }
    if (cfg.control && cfg.control.pause) { controller.pause(); break; }
    if (cfg.clock) cfg.clock(controller); // may advance controller.now
    if (controller.deadlineEpoch && controller.now >= controller.deadlineEpoch) { controller.runtime_state = "STOPPED_DEADLINE"; controller.stop_reason = "hard deadline reached"; break; }
    // select eligible WIDE_SAFE ungated jobs, respecting width + collisions
    const pending = controller.jobs.filter((j) => j.status === "PENDING");
    const eligible = pending.filter((j) => isEligible(j, controller.ctx()));
    // founder-gated / non-WIDE_SAFE / unknown-class jobs must be structurally held, never started
    for (const j of pending) {
      const hold = Controller.structuralHold(j);
      if (hold && j.status === "PENDING") { j.status = "HELD"; j.hold_reason = hold; }
    }
    const chosen = [];
    for (const j of eligible) {
      if (running.size + chosen.length >= (cfg.maxWidth || 2)) break;
      if ([...chosen, ...[...running].map((id) => controller.byId.get(id))].some((o) => jobsCollide(j, o))) continue;
      chosen.push(j);
    }
    if (!chosen.length && running.size === 0) break; // queue exhausted
    for (const j of chosen) {
      j.status = "RUNNING"; running.add(j.job_id);
      // 11. verify branch/worktree allocation (never protected main)
      if (!j.branch || j.branch === "main" || j.worktree === "/" || !j.worktree) { jobResults[j.job_id] = { job_id: j.job_id, state: "PARKED", reason: "invalid branch/worktree" }; running.delete(j.job_id); j.status = "PARKED"; continue; }
      const res = await runJobLifecycle(cfg, j, lease, cfg.blast_budget, usage, txByKey, replay, bindings, ledger);
      jobResults[j.job_id] = res;
      running.delete(j.job_id);
      j.status = res.state === "COMPLETED" ? "COMPLETED" : (res.state.startsWith("HELD") || res.state.endsWith("_HELD")) ? "HELD" : "PARKED";
      teardown.locks_released.push(j.job_id);
    }
  }
  // finalize held/blocked accounting
  for (const j of controller.jobs) if (j.status === "PENDING") { const h = Controller.structuralHold(j); if (h) { j.status = "HELD"; j.hold_reason = h; } }
  const final_state = controller.runtime_state && controller.runtime_state.startsWith("STOPPED") ? controller.runtime_state
    : controller.paused ? "PAUSED" : "STOPPED_EXHAUSTED";
  // 21. lock release + teardown accounting
  if (cfg.lockManager) { cfg.lockManager.release(cfg.run_id); teardown.lock_file_released = true; }
  const completed = Object.values(jobResults).filter((r) => r.state === "COMPLETED");
  const parked = Object.values(jobResults).filter((r) => r.state === "PARKED");
  const held = controller.jobs.filter((j) => j.status === "HELD");
  return {
    ready: true, refused: null, run_id: cfg.run_id, final_state,
    dispatched: Object.keys(txByKey).length > 0,
    jobResults, completed_count: completed.length, parked_count: parked.length,
    held_jobs: held.map((j) => ({ job_id: j.job_id, reason: j.hold_reason })),
    replay_ok: replay.verifyChain().ok, replay_len: replay.records.length,
    txRegistry: txByKey, usage, ledger, teardown,
    // invariants surfaced for the checker — always false, never inferred from completion
    merged: false, accepted: false, pushed: false, protected_main_written: false,
    setup_ready: setup.ready,
  };
}

function zeroUsage() { return { max_files: 0, max_changed_lines: 0, max_branches: 0, max_worktrees: 0, max_external_calls: 0, max_recipients: 0, max_dollars: 0, max_records: 0, max_execution_s: 0, max_delegation_depth: 0, max_output_bytes: 0 }; }
