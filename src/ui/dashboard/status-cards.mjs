// Lane A — Founder Dashboard / command center / truthful status cards.
//
// Plain English: given TRUTHFUL run inputs (lifecycle state, heartbeat, run id),
// this builds the founder-facing "status cards" for the command center. It never
// invents a status. If a signal is missing it says UNKNOWN — it never shows a
// fabricated number and never shows LIVE without a fresh heartbeat (Law 54).
//
// Pure + deterministic: no I/O, no clock, no randomness. `nowMs` is passed in.
// Reuses the audited Wave-2 observability core read-only.
import { normalizeHeartbeatAge, resolveLifecycle } from "../../observability/status-core.mjs";

export const UNKNOWN = "UNKNOWN";

// Display-only HTML escape so card content can never become markup.
export function escapeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Liveness is derived ONLY from the heartbeat, never from branch/other activity.
const LIVENESS_BY_HB = { OK: "LIVE", STALE: "STALE", NONE: "NO HEARTBEAT", UNKNOWN: "UNKNOWN" };
function livenessFromHeartbeat(hb) { return LIVENESS_BY_HB[hb.status] || UNKNOWN; }

// Build the single "run status" card from truthful inputs.
export function buildRunStatusCard({ runId, state, handoff, heartbeat, nowMs } = {}) {
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) {
    // Without a trusted clock we refuse to compute age; everything is UNKNOWN.
    const lc = resolveLifecycle({ state, handoff });
    return Object.freeze({
      title: "Run status",
      run_id: runId ?? UNKNOWN,
      lifecycle_display: lc.lifecycle_display,
      liveness: UNKNOWN,
      heartbeat_age_seconds: null,
      invented_state: false,
      note: "no trusted nowMs — age withheld",
    });
  }
  const lc = resolveLifecycle({ state, handoff });
  const hb = normalizeHeartbeatAge(heartbeat, nowMs);
  return Object.freeze({
    title: "Run status",
    run_id: runId ?? UNKNOWN,
    lifecycle_display: lc.lifecycle_display,          // from state.json only
    is_final: lc.is_final,
    liveness: livenessFromHeartbeat(hb),              // from heartbeat only
    heartbeat_age_seconds: hb.ageSeconds,             // null when unknown/none — never fabricated
    historical_launch_evidence: lc.historical_launch_evidence, // labelled historical, never the live state
    invented_state: false,
  });
}

// Build all founder command-center cards from a truthful snapshot.
export function buildCards(snapshot = {}) {
  return Object.freeze([buildRunStatusCard(snapshot)]);
}

// Deterministic plain-English render. Same input -> byte-identical output.
export function renderCardsText(cards) {
  const lines = ["FOUNDER COMMAND CENTER — status (truthful; UNKNOWN when unproven)"];
  for (const c of cards || []) {
    const age = c.heartbeat_age_seconds === null || c.heartbeat_age_seconds === undefined
      ? UNKNOWN : `${c.heartbeat_age_seconds}s`;
    lines.push(
      `• ${escapeText(c.title)}: run=${escapeText(c.run_id)} | lifecycle=${escapeText(c.lifecycle_display)} | liveness=${escapeText(c.liveness)} | heartbeat_age=${escapeText(age)}`
    );
  }
  return lines.join("\n");
}
