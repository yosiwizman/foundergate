// RunGrid Wave — Lane A: Founder command center + evidence-freshness view-model.
//
// Plain English: one truthful "command center" summary for the founder — current run
// lifecycle, heartbeat-derived liveness, run-scoped event counts, and an EVIDENCE
// FRESHNESS rollup (is the proof recent, or stale, or unknown?). It never invents a
// status: missing/malformed signals render UNKNOWN/NONE, never a fabricated number,
// and it never shows LIVE without a fresh heartbeat (Law 54).
//
// Pure + deterministic: no I/O, no clock, no randomness. `nowMs` is passed in.
// Reuses the audited Wave-2 observability core read-only.
import { normalizeHeartbeatAge, resolveLifecycle, scopeEvents } from "../../observability/status-core.mjs";

export const UNKNOWN = "UNKNOWN";
const LIVENESS_BY_HB = { OK: "LIVE", STALE: "STALE", NONE: "NO HEARTBEAT", UNKNOWN: "UNKNOWN" };

// Classify one evidence item's freshness against a configurable window. Reuses the
// safe unit-detection + never-negative age logic from status-core (via a heartbeat-shaped
// probe), then applies the evidence freshness window.
export function classifyEvidenceFreshness(item, nowMs, freshWithinS = 3600) {
  if (!item || typeof item !== "object") return Object.freeze({ label: UNKNOWN, status: "NONE", ageSeconds: null });
  const label = item.label != null ? String(item.label) : UNKNOWN;
  const probe = normalizeHeartbeatAge({ ts: item.ts }, nowMs); // OK|STALE|UNKNOWN|NONE + ageSeconds
  if (probe.status === "UNKNOWN") return Object.freeze({ label, status: UNKNOWN, ageSeconds: null });
  if (probe.status === "NONE") return Object.freeze({ label, status: "NONE", ageSeconds: null });
  const age = probe.ageSeconds;
  return Object.freeze({ label, status: age <= freshWithinS ? "FRESH" : "STALE", ageSeconds: age });
}

function rollupFreshness(items) {
  const counts = { fresh: 0, stale: 0, unknown: 0, none: 0 };
  for (const e of items) {
    if (e.status === "FRESH") counts.fresh++;
    else if (e.status === "STALE") counts.stale++;
    else if (e.status === UNKNOWN) counts.unknown++;
    else counts.none++;
  }
  let overall;
  if (items.length === 0) overall = "NONE";
  else if (counts.stale > 0) overall = "STALE";          // any stale proof dominates
  else if (counts.unknown > 0 || counts.none > 0) overall = UNKNOWN; // fail honest, never FRESH
  else overall = "FRESH";
  return { counts, overall };
}

// Build the founder command-center summary from a truthful snapshot.
export function buildCommandCenter({ runId, state, handoff, heartbeat, events, evidence, nowMs, freshWithinS = 3600 } = {}) {
  const validNow = typeof nowMs === "number" && Number.isFinite(nowMs);
  const lc = resolveLifecycle({ state, handoff });
  const hb = validNow ? normalizeHeartbeatAge(heartbeat, nowMs) : { status: "UNKNOWN", ageSeconds: null };
  const scoped = scopeEvents(events, runId ?? null);
  const evItems = validNow && Array.isArray(evidence)
    ? evidence.map((e) => classifyEvidenceFreshness(e, nowMs, freshWithinS))
    : [];
  const fresh = rollupFreshness(evItems);
  return Object.freeze({
    title: "Founder Command Center",
    run_id: runId ?? UNKNOWN,
    lifecycle_display: lc.lifecycle_display,     // from state.json only
    is_final: lc.is_final,
    liveness: LIVENESS_BY_HB[hb.status] || UNKNOWN, // from heartbeat only
    heartbeat_age_seconds: hb.ageSeconds,        // null when unknown/none — never fabricated
    current_events: scoped.current.length,
    historical_events: scoped.historical.length,
    evidence: Object.freeze(evItems),
    evidence_freshness: fresh.overall,           // FRESH | STALE | UNKNOWN | NONE
    evidence_counts: Object.freeze(fresh.counts),
    invented_state: false,
  });
}

export function renderCommandCenterText(cc) {
  const age = cc.heartbeat_age_seconds == null ? UNKNOWN : `${cc.heartbeat_age_seconds}s`;
  const c = cc.evidence_counts;
  return [
    `${cc.title}: run=${cc.run_id}`,
    `lifecycle=${cc.lifecycle_display} | liveness=${cc.liveness} | heartbeat_age=${age}`,
    `events: current=${cc.current_events} historical=${cc.historical_events}`,
    `evidence_freshness=${cc.evidence_freshness} (fresh=${c.fresh} stale=${c.stale} unknown=${c.unknown} none=${c.none})`,
  ].join("\n");
}
