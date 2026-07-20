"use strict";
// FounderGate Live Run Console — pure renderer of a projection VIEW (single authority
// is projection.mjs, computed server-side by the data adapter). This script only
// displays; it never infers acceptance/merge from completion and never shows a bare green.
const $ = (id) => document.getElementById(id);
const qp = new URLSearchParams(location.search);
const fixture = qp.get("fixture") || "queue-exhausted";

// Honest status chip: names the exact proven fact; UNKNOWN/STALE/HELD/NOT-* are never green.
function chip(label, kind) {
  const el = document.createElement("span");
  el.className = "chip chip-" + (kind || "neutral");
  el.textContent = label;
  return el;
}
function kv(ul, k, v) {
  const li = document.createElement("li");
  li.innerHTML = "<span class='k'></span><span class='v'></span>";
  li.querySelector(".k").textContent = k;
  li.querySelector(".v").textContent = v;
  ul.appendChild(li);
}

function render(v) {
  $("run-id").textContent = v.run_id;
  // founder banner
  if (v.founder_action_required) { $("founder-banner").hidden = false; $("founder-reason").textContent = v.gate_reason || "a founder gate is held"; }
  // lifecycle + chips
  $("lifecycle").textContent = v.lifecycle_display;
  if (v.HISTORICAL) { $("historical-label").hidden = false; $("historical-label").textContent = v.historical_label || "HISTORICAL REPLAY"; }
  const chips = $("status-chips");
  const lc = v.lifecycle_display || "UNKNOWN";
  chips.appendChild(chip(lc, /COMPLETED/.test(lc) ? "observed" : /RUNNING/.test(lc) ? "running" : /HELD/.test(lc) ? "held" : /FAILED|PANIC/.test(lc) ? "failed" : /UNKNOWN/.test(lc) ? "unknown" : /STOPPED/.test(lc) ? "stopped" : "neutral"));
  chips.appendChild(chip(v.heartbeat_status === "OK" ? "HEARTBEAT OK" : "HEARTBEAT " + v.heartbeat_status, v.heartbeat_status === "OK" ? "observed" : v.heartbeat_status === "STALE" ? "stale" : "unknown"));
  chips.appendChild(chip(v.any_output_merged === true ? "MERGED" : "NOT MERGED", v.any_output_merged === true ? "observed" : "notproven"));
  chips.appendChild(chip(v.any_output_accepted === true ? "ACCEPTED" : "NOT ACCEPTED", v.any_output_accepted === true ? "observed" : "notproven"));
  if (v.HISTORICAL) chips.appendChild(chip("HISTORICAL", "unknown"));
  if (v.replay_blocked) chips.appendChild(chip("REPLAY-BLOCKED", "held"));

  // current work
  $("current-job").textContent = v.current_job;
  $("running").textContent = (v.running_jobs || []).join(", ") || "none";
  // queues
  const q = $("queue-summary");
  kv(q, "queue depth", v.queue_depth);
  kv(q, "eligible", (v.eligible_jobs || []).length);
  kv(q, "running", (v.running_jobs || []).length);
  kv(q, "blocked (deps)", (v.blocked_dependency_jobs || []).length);
  kv(q, "held", (v.held_jobs || []).length);
  kv(q, "parked", (v.parked_jobs || []).length);
  // progress
  const p = $("progress-summary");
  kv(p, "completed", (v.completed_jobs || []).length);
  kv(p, "failed", (v.failed_jobs || []).length);
  kv(p, "unknown", (v.unknown_jobs || []).length);
  kv(p, "correction cycles", Object.keys(v.correction_cycle_counts || {}).length);
  // time
  const t = $("time-summary");
  kv(t, "authorized start", v.authorized_start);
  kv(t, "hard deadline", v.hard_deadline);
  kv(t, "max window (h)", v.max_authorization_window_hours);
  kv(t, "elapsed (h)", v.actual_elapsed_hours);
  kv(t, "final runtime (h)", v.final_runtime_hours);
  kv(t, "runtime ceiling (h)", v.configured_runtime_ceiling_hours);
  // heartbeat
  $("heartbeat").textContent = v.heartbeat_status === "NONE" ? "none" : v.heartbeat_status === "UNKNOWN" ? "UNKNOWN (malformed/impossible)" : (v.heartbeat_age_seconds + "s ago (" + v.heartbeat_status + ", " + v.heartbeat_unit + ")");
  // cost
  const cs = $("cost-summary");
  kv(cs, "current cost", v.current_cost);
  kv(cs, "cost ceiling", v.configured_cost_ceiling);
  // stop / next
  $("stop-reason").textContent = v.stop_reason;
  $("next-safe").textContent = v.next_safe_action;
  // acceptance boundary
  const af = $("accept-flags");
  kv(af, "any output merged", String(v.any_output_merged));
  kv(af, "any output accepted", String(v.any_output_accepted));
  kv(af, "build vs accept", v.build_vs_accept);
  const ab = $("accept-boundary");
  for (const s of v.acceptance_boundary || []) { const li = document.createElement("li"); li.textContent = s; ab.appendChild(li); }
  // branches/worktrees
  $("branch-worktrees").textContent = (v.branch_worktree_assignments || []).length + " assignments (isolated per job)";
  // evidence + timeline
  $("evidence-links").textContent = (v.evidence_links || []).length ? v.evidence_links.join(", ") : "none linked";
  $("evidence-json").textContent = JSON.stringify(v, null, 2);
  $("cur-events").textContent = v.current_events;
  $("hist-events").textContent = v.historical_events;
  $("legacy-events").textContent = v.legacy_unscoped_events;
}

fetch("./fixtures/" + fixture + ".view.json").then((r) => r.json()).then(render).catch((e) => {
  $("lifecycle").textContent = "UNKNOWN — fixture load failed: " + e.message;
});
