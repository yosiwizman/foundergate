// PAES-1 Persistent Autonomous Execution Supervisor — mechanical core.
// Encodes the Continuation Law in executable form: a Claude final answer,
// terminal closure, context compaction, worker exit, PR merge, or checker
// finishing is NOT program completion. The supervisor may reach a terminal
// STOPPED state only when a machine stop-predicate is true AND no eligible safe
// work remains. Pure/deterministic: callers supply observed facts (from disk).
//
// Time is passed in explicitly (no Date.now()) so this is testable and
// resume-safe.

export const STATES = [
  "DISABLED", "INSTALLING", "INSTALLED", "QUALIFYING", "READY", "STARTING",
  "RUNNING", "WAITING_ON_DEPENDENCY", "WAITING_ON_CHECKER", "CORRECTING",
  "PARKED_AT_FOUNDER_GATE", "PARKED_AT_HUMAN_EXPERT_GATE", "DRAINING",
  "STOPPING", "STOPPED_DEADLINE", "STOPPED_EXHAUSTED", "STOPPED_PANIC",
  "HOLD_CORRECTABLE", "FAILED", "RECOVERING", "AUTONOMY_CAPABILITY_GAP",
];

// Preconditions that MUST all hold before entering RUNNING.
export const RUN_PRECONDITIONS = [
  "dcl_capture_verified", "are_manifest_verified", "arlc_active", "tbf_active",
  "unattended_executor_proven", "user_level_service_installed",
  "one_writer_lock_available", "deadline_not_passed", "panic_not_active",
  "authorized_job_exists",
];

export function canEnterRunning(ctx) {
  const missing = RUN_PRECONDITIONS.filter((p) => !ctx[p]);
  return { ok: missing.length === 0, missing };
}

// ---- Mechanical Continuation Law ----
// The ONLY machine predicates that permit a terminal stop.
export function stopPredicate(ctx) {
  if (ctx.panic_stop) return "STOPPED_PANIC";
  if (ctx.dcl_integrity_failure || ctx.arlc_integrity_failure || ctx.are_integrity_failure) return "STOPPED_PANIC";
  if (ctx.repository_corruption) return "STOPPED_PANIC";
  if (ctx.unresolved_writer_collision) return "STOPPED_PANIC";
  if (ctx.unattended_executor_lost) return "AUTONOMY_CAPABILITY_GAP";
  if (ctx.deadline_reached && ctx.atomic_work_drained) return "STOPPED_DEADLINE";
  if (ctx.all_jobs_terminal && !ctx.refill_candidate_exists) return "STOPPED_EXHAUSTED";
  if (ctx.restart_limit_exhausted && !ctx.unrelated_safe_job_exists) return "STOPPED_EXHAUSTED";
  return null;
}

// A stop is REJECTED while an authorized safe job remains ready (unless a hard
// critical predicate — PANIC/integrity/corruption/deadline — forces stop).
export function evaluateStop(ctx) {
  const HARD = new Set(["STOPPED_PANIC", "AUTONOMY_CAPABILITY_GAP", "STOPPED_DEADLINE"]);
  const pred = stopPredicate(ctx);
  // Reload-from-disk view: eligible safe work still present?
  const eligibleSafeWork = (ctx.ready_jobs || 0) > 0 || ctx.refill_candidate_exists === true;
  if (pred && HARD.has(pred)) return { stop: true, state: pred, reason: `hard predicate ${pred}` };
  if (eligibleSafeWork) {
    return { stop: false, state: "RUNNING", reason: "STOP_REJECTED_QUEUE_NONEMPTY" };
  }
  if (pred) return { stop: true, state: pred, reason: pred };
  return { stop: false, state: "RUNNING", reason: "no stop predicate and/or work remains" };
}

// A report/answer action can NEVER move the supervisor to a STOPPED state.
export function reportActionCausesStop() { return false; }

// ---- Lease / heartbeat / watchdog ----
export function leaseValid(lease, now) {
  if (!lease || !lease.worker_id || !lease.job_id) return false;
  return typeof lease.lease_expiration === "number" && now < lease.lease_expiration;
}

// Atomic acquire: succeeds only if no valid lease already holds the job.
export function acquireLease(existingLease, req, now) {
  if (existingLease && leaseValid(existingLease, now) && existingLease.job_id === req.job_id) {
    return { acquired: false, reason: "job already leased by a live worker" };
  }
  return {
    acquired: true,
    lease: { worker_id: req.worker_id, job_id: req.job_id, exact_sha: req.exact_sha,
      allowed_paths: req.allowed_paths || [], started: now, heartbeat: now,
      lease_expiration: now + (req.lease_ttl || 300), pid: req.pid,
      restart_count: req.restart_count || 0, recovery_action: req.recovery_action || "resume" },
  };
}

// A worker is stale ONLY if ALL three hold (prevents false-stale eviction of a
// healthy-but-busy worker).
export function isStale(worker, now, staleInterval) {
  const procGone = worker.process_absent === true || worker.process_unresponsive === true;
  const heartbeatOld = (now - (worker.heartbeat || 0)) > staleInterval;
  const leaseExpired = now >= (worker.lease_expiration || 0);
  return procGone && heartbeatOld && leaseExpired;
}

// ---- Restart policy ----
export function canRestart(job, ctx) {
  if ((job.restart_count || 0) >= (ctx.max_restarts || 3)) return { allowed: false, reason: "restart limit reached" };
  if (ctx.deadline_reached) return { allowed: false, reason: "no restart after deadline" };
  if (ctx.panic_stop) return { allowed: false, reason: "no restart after PANIC_STOP" };
  if (job.is_true_founder_gated) return { allowed: false, reason: "no restart of a founder-gated action" };
  if (job.is_live_or_external_action) return { allowed: false, reason: "no restart that repeats a live/external action" };
  return { allowed: true };
}

// Watchdog recovery: only after verifying staleness; preserves evidence; never
// repeats a committed/sealed action; never starts a duplicate writer.
export function watchdogRecover(worker, job, ctx, now) {
  if (!isStale(worker, now, ctx.stale_interval || 120)) {
    return { action: "none", reason: "worker not actually stale (false-stale prevented)" };
  }
  const restart = canRestart(job, ctx);
  if (!restart.allowed) {
    return { action: "park", reason: restart.reason, preserve_evidence: true, continue_unrelated: true };
  }
  if (job.last_action_committed_or_sealed) {
    return { action: "resume_next_action", from: job.next_safe_action, no_duplicate: true, preserve_evidence: true };
  }
  return { action: "relaunch", restart_count: (job.restart_count || 0) + 1, from: job.next_safe_action,
    preserve_evidence: true, duplicate_writer: false };
}

// ---- Deadline guards ----
export function deadlineStatus(now, startTime, deadline, drainOffset) {
  const drainStart = deadline - (drainOffset || 900); // default 15min drain window
  if (now >= deadline) return "DEADLINE_REACHED";
  if (now >= drainStart) return "DRAINING";
  return "RUNNING";
}
