// PAES-WORKER-DEADLINE-HOTFIX-3 — HARD DEADLINE LAW (pure, deterministic).
//
// The original run deadline is IMMUTABLE. For every worker invocation the
// supervisor computes remaining_run_time = original_run_deadline - now and derives
// an effective worker timeout that can NEVER exceed the remaining run time. No
// env var / queue field / adapter may enlarge it. A restart/recovery reuses the
// original deadline and never mints a fresh window.
//
// All times are epoch SECONDS (matching current-cycle.json / checkpoint.json).

export const WORKER_OUTCOMES = Object.freeze([
  "SUCCESS", "FAILED", "WORKER_TIMEOUT", "RUN_DEADLINE_EXPIRED",
  "OUTPUT_OVERFLOW", "SPAWN_ERROR", "TERMINATED_BY_STOP", "UNKNOWN_FAILURE",
]);

// The authoritative immutable deadline: prefer the ORC recovery checkpoint's
// original_deadline (survives restart/recovery); fall back to the cycle deadline.
// Malformed/missing -> null so the caller FAILS CLOSED (treats as expired).
export function originalRunDeadline({ checkpoint, cycle } = {}) {
  const c = checkpoint && Number(checkpoint.original_deadline);
  if (Number.isFinite(c) && c > 0) return c;
  const y = cycle && Number(cycle.deadline);
  if (Number.isFinite(y) && y > 0) return y;
  return null; // fail closed
}

export function remainingRunSeconds(originalDeadlineS, nowS) {
  if (!Number.isFinite(originalDeadlineS) || !Number.isFinite(nowS)) return null; // fail closed
  return originalDeadlineS - nowS;
}

// The single decision a worker invocation needs. Returns:
//  { spawn:false, outcome:"RUN_DEADLINE_EXPIRED" }              (deadline passed/unknown)
//  { spawn:true, effectiveTimeoutS, timeoutOutcome }            (ok to spawn)
// timeoutOutcome is what the worker MUST be classified as if its timer fires:
// RUN_DEADLINE_EXPIRED when the run deadline is the binding cap, else WORKER_TIMEOUT.
export function workerSpawnDecision({ originalDeadlineS, nowS, jobTimeoutS } = {}) {
  const remaining = remainingRunSeconds(originalDeadlineS, nowS);
  // fail closed: unknown/missing deadline or no time left -> never spawn
  if (remaining === null || remaining <= 0) {
    return { spawn: false, outcome: "RUN_DEADLINE_EXPIRED", remainingS: remaining };
  }
  // job-specific timeout is honored ONLY if positive+finite; it can shorten but
  // NEVER lengthen the window. Anything else (0, negative, NaN, absent, Infinity)
  // means "no job timeout" -> capped purely by the remaining run time.
  const job = (typeof jobTimeoutS === "number" && Number.isFinite(jobTimeoutS) && jobTimeoutS > 0)
    ? jobTimeoutS : Infinity;
  const effective = Math.min(job, remaining);
  // The deadline is the binding cap whenever the job timeout does not strictly
  // finish before the run deadline.
  const deadlineIsBinding = effective >= remaining;
  return {
    spawn: true,
    remainingS: remaining,
    effectiveTimeoutS: effective,
    timeoutOutcome: deadlineIsBinding ? "RUN_DEADLINE_EXPIRED" : "WORKER_TIMEOUT",
  };
}

// Only SUCCESS advances a job to DONE. Every other outcome (incl. UNKNOWN) is a
// non-DONE terminal — fail closed. Used by the supervisor to map outcome->state.
export function jobStateForOutcome(outcome) {
  return outcome === "SUCCESS" ? "DONE" : "FAILED";
}
export function isDoneOutcome(outcome) { return outcome === "SUCCESS"; }

// After a worker returns RUN_DEADLINE_EXPIRED (or the pre-spawn check says the
// deadline passed) the supervisor must STOP scheduling further jobs.
export function shouldStopScheduling(outcome) {
  return outcome === "RUN_DEADLINE_EXPIRED";
}
