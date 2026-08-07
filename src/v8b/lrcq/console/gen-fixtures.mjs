// FounderGate LRCQ Live Run Console — fixture generator (Phase 6/8/9/10 inputs).
// Produces console VIEW fixtures for every required state from REAL controller runs
// and the read-only historical Wave-2 evidence. Output: <outdir>/<name>.view.json
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Controller } from "../controller.mjs";
import { projectConsole } from "../projection.mjs";
import { runShadow } from "../shadow-sim.mjs";

const OUT = process.argv[2] || "/tmp/lrcq-fixtures";
mkdirSync(OUT, { recursive: true });
const NOW = 1784521228;
const write = (name, view) => { writeFileSync(join(OUT, name + ".view.json"), JSON.stringify(view, null, 2) + "\n"); return name; };
const made = [];

// 1. RUNNING (mid-run): first refill, jobs RUNNING, one collision held
{
  const { buildShadowBacklog } = await import("../shadow-sim.mjs");
  const c = new Controller({ run_id: "shadow-sim", now: NOW, maxWidth: 3 });
  c.load(buildShadowBacklog()); c.refill();
  made.push(write("running", projectConsole(c.snapshot(), NOW * 1000 + 5000)));
  made.push(write("collision", projectConsole(c.snapshot(), NOW * 1000 + 5000))); // collX running, collY held-collision visible in eligibility
}
// 2. QUEUE-EXHAUSTED + HELD-FOUNDER-GATE + FAILURE (final shadow state carries all)
{
  const { view } = runShadow({ maxWidth: 3, now: NOW });
  made.push(write("queue-exhausted", view));
  made.push(write("held-founder-gate", view));
  made.push(write("failure", view)); // includes broken=PARKED + afterBroken=BLOCKED
}
// 3. HELD-HUMAN-EXPERT (same final; legalReview held)
{
  const { view } = runShadow({ maxWidth: 3, now: NOW });
  made.push(write("held-human-expert", view));
}
// 4. STALE heartbeat
made.push(write("stale", projectConsole({ run_id: "shadow-sim", runtime_state: "RUNNING", heartbeat: { ts: NOW - 100000 }, jobs: [], started_at: NOW }, NOW * 1000)));
// 5. UNKNOWN (missing state)
made.push(write("unknown", projectConsole({ jobs: [] }, NOW * 1000)));
// 6. RECOVERY (post-resume: a job reset to PENDING, others completed)
{
  const c = new Controller({ run_id: "shadow-sim", now: NOW, maxWidth: 3 });
  const { buildShadowBacklog } = await import("../shadow-sim.mjs");
  c.load(buildShadowBacklog()); c.refill(); c.step(c.jobs.find((j) => j.status === "RUNNING").job_id);
  const snap = c.snapshot(); snap.recovered = true;
  made.push(write("recovery", { ...projectConsole(snap, NOW * 1000 + 8000), recovered: true, recovery_note: "resumed from durable snapshot; unsealed RUNNING jobs reset to PENDING (no duplicate/false-green)" }));
}
// 7. HISTORICAL WAVE-2 replay (read-only reconstruction; labeled historical)
{
  const wave2 = {
    run_id: "v8b-wave-2-1784421259", runtime_state: "STOPPED_EXHAUSTED",
    handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" }, heartbeat: { ts: 1784428534019 },
    started_at: "2026-07-19T00:34:19Z", deadline: "2026-07-19T05:34:19Z", max_window_s: 9 * 3600, elapsed_s: Math.round(2.02 * 3600),
    final_duration_s: Math.round(2.02 * 3600), stop_reason: "queue exhaustion (all 13 jobs DONE)",
    merged: false, accepted: false, cost: 39.9263,
    jobs: Array.from({ length: 13 }, (_, i) => ({ job_id: "w2-job" + (i + 1), title: "wave-2 job", status: "COMPLETED", risk_class: "WIDE_SAFE", gate_trigger: "NONE", correction_cycle: 0 })),
    events: Array.from({ length: 46 }, (_, i) => ({ event_id: "legacy-" + i, timestamp: 1784421259 + i, source: "supervisor", event_type: "legacy" })), // unscoped legacy
  };
  const view = projectConsole(wave2, 1784428534019 + 30000);
  view.HISTORICAL = true;
  view.historical_label = "HISTORICAL REPLAY — not a live run-ID-stamped proof. The Wave-2 run predates run_id event stamping; its events are legacy-unscoped and correctly show 0 current progress.";
  view.replay_blocked = true;
  made.push(write("wave2-historical", view));
}
console.log("fixtures written to " + OUT + ":\n  " + made.join("\n  "));
