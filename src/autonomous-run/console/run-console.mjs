// Lane C — Live Run Console view-model + install-Doctor (pure, read-only).
//
// Plain English: the founder needs a truthful "live run console" — what the
// current run is doing right now — plus a plain pause/stop visibility signal and
// an install "Doctor" checklist. It NEVER claims a run is live/RUNNING on a stale
// heartbeat, NEVER counts other-run or legacy events as current progress, and the
// Doctor NEVER reports a missing/unknown tool as PASS (Law 54 — honest UNKNOWN).
//
// Pure + deterministic: no I/O, no clock, no randomness. Inputs are passed in.
// Reuses the audited Wave-2 observability core read-only.
import { normalizeHeartbeatAge, resolveLifecycle, scopeEvents } from "../../observability/status-core.mjs";

export const UNKNOWN = "UNKNOWN";
const LIVENESS_BY_HB = { OK: "LIVE", STALE: "STALE", NONE: "NO HEARTBEAT", UNKNOWN: "UNKNOWN" };

// Build the live run console view-model from a truthful run snapshot.
export function buildConsoleView({ runId, state, handoff, heartbeat, events, nowMs } = {}) {
  const lc = resolveLifecycle({ state, handoff });
  const hb = (typeof nowMs === "number" && Number.isFinite(nowMs))
    ? normalizeHeartbeatAge(heartbeat, nowMs)
    : { status: "UNKNOWN", ageSeconds: null, unit: null };
  const liveness = LIVENESS_BY_HB[hb.status] || UNKNOWN;
  const scoped = scopeEvents(events, runId ?? null);

  // Pause/stop visibility: actionable only while the run is non-final AND alive.
  const alive = liveness === "LIVE";
  const actionable = !lc.is_final && alive;

  // Truthful conflict surfacing: lifecycle says RUNNING but the heartbeat is stale.
  const running = lc.lifecycle_state === "RUNNING" || lc.lifecycle_state === "DRAINING";
  const conflict = running && (hb.status === "STALE" || hb.status === "NONE")
    ? `STALE_WHILE_${lc.lifecycle_state}` : null;

  return Object.freeze({
    title: "Live Run Console",
    run_id: runId ?? UNKNOWN,
    lifecycle_display: lc.lifecycle_display,      // from state.json only
    is_final: lc.is_final,
    liveness,                                     // from heartbeat only
    heartbeat_age_seconds: hb.ageSeconds,         // null when unknown/none
    current_event_count: scoped.current.length,   // only active-run events
    historical_event_count: scoped.historical.length,
    legacy_unscoped_events: scoped.legacy_unscoped,
    pause_available: actionable,
    stop_available: actionable,
    liveness_conflict: conflict,                  // surfaced, never hidden
  });
}

// Install-Doctor: given an observed tool-presence map, produce an honest checklist.
// undefined/unknown -> UNKNOWN (never invented PASS). Overall READY only when every
// required tool is explicitly present.
const DEFAULT_REQUIRED = ["git", "gh", "node", "npm", "zip", "unzip", "shasum", "python3"];
export function buildDoctorChecklist(presence = {}, required = DEFAULT_REQUIRED) {
  const items = required.map((name) => {
    const v = presence[name];
    let status;
    if (v === true) status = "PASS";
    else if (v === false) status = "MISSING";
    else status = UNKNOWN;                        // undefined/null/other -> honest UNKNOWN
    return Object.freeze({ name, status });
  });
  const anyUnknown = items.some((i) => i.status === UNKNOWN);
  const anyMissing = items.some((i) => i.status === "MISSING");
  const overall = anyUnknown ? UNKNOWN : (anyMissing ? "NOT_READY" : "READY");
  return Object.freeze({ title: "Install Doctor", overall, items: Object.freeze(items) });
}

// Deterministic plain-English renders.
export function renderConsoleText(v) {
  const age = v.heartbeat_age_seconds == null ? UNKNOWN : `${v.heartbeat_age_seconds}s`;
  return [
    `${v.title}: run=${v.run_id}`,
    `lifecycle=${v.lifecycle_display} | liveness=${v.liveness} | heartbeat_age=${age}`,
    `events: current=${v.current_event_count} historical=${v.historical_event_count} legacy_unscoped=${v.legacy_unscoped_events}`,
    `controls: pause=${v.pause_available ? "on" : "off"} stop=${v.stop_available ? "on" : "off"}`,
    v.liveness_conflict ? `CONFLICT: ${v.liveness_conflict}` : `conflict: none`,
  ].join("\n");
}
export function renderDoctorText(d) {
  return [`${d.title}: ${d.overall}`, ...d.items.map((i) => `  [${i.status}] ${i.name}`)].join("\n");
}
