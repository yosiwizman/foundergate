// V1 Golden Path — deterministic resume guard for the LOCAL stub run. Pure decision:
// resume from saved state, refuse a duplicate resume if already completed, or start fresh.
export const UNKNOWN = "UNKNOWN";
export function resumeDecision({ recoveryState = null, requestedRunId = null } = {}) {
  if (recoveryState == null) return { decision: "START_FRESH", reason: "no saved recovery state" };
  if (typeof recoveryState !== "object") return { decision: "UNKNOWN", reason: "malformed recovery state" };
  if (requestedRunId != null && recoveryState.run_id != null && requestedRunId !== recoveryState.run_id)
    return { decision: "UNKNOWN", reason: "run_id mismatch — will not resume a different run" };
  if (recoveryState.status === "COMPLETED")
    return { decision: "REFUSE_DUPLICATE", reason: "run already COMPLETED — refusing duplicate resume (idempotent)" };
  if (recoveryState.status === "INTERRUPTED" || recoveryState.status === "RUNNING")
    return { decision: "RESUME", reason: `resume from step ${recoveryState.step ?? UNKNOWN}` };
  return { decision: "UNKNOWN", reason: `unrecognized status: ${recoveryState.status ?? UNKNOWN}` };
}
