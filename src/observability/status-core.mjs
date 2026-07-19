// WAVE2 observability correction core (pure, testable). Fixes the three
// founder-facing status defects surfaced by the post-run audit:
//   A. heartbeat unit mismatch (ms vs s -> huge negative age)
//   B. final lifecycle state masked by a stale handoff launch marker
//   C. run-scoped vs legacy-unscoped event contamination
// Plus D: branch activity is evidence, never a liveness signal.

// --- A. HEARTBEAT UNIT NORMALIZATION -----------------------------------------
// Heartbeats may be written in seconds (legacy) or milliseconds (HOTFIX-2 ms+seq).
// Detect the unit explicitly; a malformed/impossible/future value is UNKNOWN, and
// age is NEVER negative.
const STALE_AFTER_S = 120;
export function normalizeHeartbeatAge(hb, nowMs) {
  if (!hb || typeof hb !== "object") return { status: "NONE", ageSeconds: null, unit: null };
  const ts = hb.ts;
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) return { status: "UNKNOWN", ageSeconds: null, unit: "malformed" };
  // epoch-seconds are ~1e9-1e10; epoch-ms are ~1e12-1e13. 1e11 cleanly separates
  // them for any plausible date (1e11 s ≈ year 5138).
  const isMs = ts > 1e11;
  const tsMs = isMs ? ts : ts * 1000;
  const age = Math.round((nowMs - tsMs) / 1000);
  // A heartbeat cannot be from the future; a negative/impossible age is UNKNOWN,
  // NEVER displayed as a huge negative number.
  if (age < -2) return { status: "UNKNOWN", ageSeconds: null, unit: isMs ? "ms" : "s", note: "future/impossible timestamp" };
  const ageSeconds = Math.max(0, age);
  return { status: ageSeconds > STALE_AFTER_S ? "STALE" : "OK", ageSeconds, unit: isMs ? "ms" : "s" };
}

// --- B. FINAL LIFECYCLE STATE PRECEDENCE -------------------------------------
// Lifecycle truth comes from the supervisor's final runtime state (state.json),
// NOT from the handoff launch marker. handoff.result stays HISTORICAL launch
// evidence. Distinct states remain distinct.
const LIFECYCLE_DISPLAY = {
  RUNNING: "RUNNING",
  DRAINING: "DRAINING (finishing in-flight work)",
  STOPPED_EXHAUSTED: "COMPLETED (queue exhausted)",
  RUN_DEADLINE_EXPIRED: "STOPPED (run deadline reached)",
  STOPPED_DEADLINE: "STOPPED (run deadline reached)",
  HOLD_CORRECTABLE: "HELD (correctable)",
  STOPPED_PANIC: "STOPPED (panic)",
  FAILED: "FAILED",
};
export function resolveLifecycle({ state, handoff } = {}) {
  const s = state && typeof state.state === "string" ? state.state : null;
  return {
    lifecycle_state: s || "UNKNOWN",
    lifecycle_display: s ? (LIFECYCLE_DISPLAY[s] || s) : "UNKNOWN",
    source: s ? "state.json" : "none",
    // handoff.result is the launch-time promise, NOT the live/final state.
    historical_launch_evidence: handoff && typeof handoff.result === "string" ? handoff.result : null,
    is_final: s !== null && s !== "RUNNING" && s !== "DRAINING",
  };
}

// --- C. RUN-SCOPED EVENT FILTERING -------------------------------------------
// Current timeline = events whose run_id matches the active run. Legacy events
// with no run_id are HISTORICAL/UNKNOWN, never counted as current progress.
export function scopeEvents(events, activeRunId) {
  const current = [], historical = [];
  let legacyUnscoped = 0;
  for (const e of events || []) {
    if (e && Object.prototype.hasOwnProperty.call(e, "run_id")) {
      if (e.run_id === activeRunId && activeRunId != null) current.push(e);
      else historical.push(e);
    } else { legacyUnscoped += 1; historical.push(e); }
  }
  return { active_run_id: activeRunId ?? null, current, historical, legacy_unscoped: legacyUnscoped };
}

// --- D. BRANCH ACTIVITY IS EVIDENCE, NOT LIVENESS ----------------------------
export const BRANCH_ACTIVITY_NOTE =
  "branch activity is generated-work EVIDENCE, not a runtime liveness signal; liveness comes from the heartbeat only";
export function branchActivityIsLiveness() { return false; }
