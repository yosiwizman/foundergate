// FounderGate LRCQ — deterministic shadow-autonomy simulation (Phase 8).
// Builds a >=24-job synthetic backlog over DISJOINT fake file sets, runs the controller
// with the deterministic fake provider ONLY (no real worker), and returns the run
// evidence. Reused by the selftest (assertions) and the evidence generator.
import { Controller } from "./controller.mjs";
import { projectConsole } from "./projection.mjs";

const base = (id, o = {}) => ({
  job_id: id, title: id + " task", objective: "wide-safe synthetic " + id, done_meaning: "artifact + passing test",
  source: "protected-main (synthetic)", risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS",
  dependencies: o.deps || [], allowed_files: o.files || ["sim/" + id + ".mjs"], forbidden_files: ["src/", ".foundergate/governance/", "tools/terminal0/paes/"],
  branch: "lane/sim-" + id, worktree: "/wt/sim-" + id, expected_outputs: ["sim/" + id + ".mjs"], tests: ["sim/" + id + ".selftest.mjs"],
  required_evidence: ["sim/evidence/" + id + ".json"], checker_requirement: "independent-lane-checker", gate_trigger: o.gate || "NONE",
  estimated_minutes: o.min || 12, max_attempts: o.max || 3, correction_cycle: 0, status: "PENDING", sim: o.sim,
});

export function buildShadowBacklog() {
  const jobs = [];
  // 13 independent safe jobs (drive refill/width)
  for (let i = 1; i <= 13; i++) jobs.push(base("safe" + i));
  // a dependency chain: chainA -> chainB -> chainC
  jobs.push(base("chainA"));
  jobs.push(base("chainB", { deps: ["chainA"] }));
  jobs.push(base("chainC", { deps: ["chainB"] }));
  // one intentional collision pair (same file)
  jobs.push(base("collX", { files: ["sim/shared-collision.mjs"] }));
  jobs.push(base("collY", { files: ["sim/shared-collision.mjs"] }));
  // one correctable failure
  jobs.push(base("flaky", { sim: { outcome: "fail_once" } }));
  // one repeated failure parked after 3 cycles
  jobs.push(base("broken", { sim: { outcome: "fail_always" }, max: 3 }));
  // a job depending on the parked one (must end BLOCKED)
  jobs.push(base("afterBroken", { deps: ["broken"] }));
  // one founder-gate job (never started)
  jobs.push(base("founderReview", { gate: "FOUNDER_GATE" }));
  // one human-expert-gate job (never started)
  jobs.push(base("legalReview", { gate: "HUMAN_EXPERT_GATE" }));
  // one unknown-classification job (never started)
  jobs.push(base("mystery", { risk: "UNKNOWN" }));
  return jobs; // 24 jobs
}

export function runShadow(opts = {}) {
  const jobs = buildShadowBacklog();
  const c = new Controller({ run_id: opts.run_id || "shadow-sim", now: opts.now || 1000, maxWidth: opts.maxWidth || 3, deadlineEpoch: opts.deadlineEpoch });
  const load = c.load(jobs);
  if (!load.ok) throw new Error("backlog invalid: " + JSON.stringify(load.errors));
  c.runToCompletion();
  const view = projectConsole(c.snapshot(), (opts.now || 1000) * 1000 + 30000);
  return { controller: c, view, jobs };
}
