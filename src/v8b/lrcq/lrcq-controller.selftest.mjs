// FounderGate LRCQ — controller test matrix (Phase 7): unit + false-green + recovery.
import { Controller, MODE, eligibilityReason, isEligible, jobsCollide, collisionMatrix, realProviderAdapter, fakeProvider } from "./controller.mjs";
import { validateBacklog, validateJob, findCycle } from "./schemas.mjs";
import { projectConsole } from "./projection.mjs";
import { saveSnapshot, resume, detectLiveRun } from "./persist.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const J = (id, o = {}) => ({ job_id: id, title: id, objective: "o", done_meaning: "d", source: "main", risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS", dependencies: o.deps || [], allowed_files: o.files || ["src/x/" + id + ".mjs"], forbidden_files: o.forbidden || [], branch: o.branch || ("lane/" + id), worktree: o.worktree || ("/wt/" + id), expected_outputs: ["x"], tests: o.tests === undefined ? ["t"] : o.tests, required_evidence: o.ev === undefined ? ["e"] : o.ev, checker_requirement: o.chk === undefined ? "independent" : o.chk, gate_trigger: o.gate || "NONE", estimated_minutes: o.min || 10, max_attempts: o.max || 3, correction_cycle: 0, status: "PENDING", sim: o.sim });
const run = (jobs, opts = {}) => { const c = new Controller({ run_id: "t", now: opts.now || 100, maxWidth: opts.maxWidth || 3, deadlineEpoch: opts.deadline }); const r = c.load(jobs); if (!r.ok && !opts.expectBadLoad) throw new Error("load failed: " + JSON.stringify(r.errors)); if (!opts.noRun && r.ok) c.runToCompletion(); return c; };
const status = (c) => Object.fromEntries(c.jobs.map((j) => [j.job_id, j.status]));

// ---------- BACKLOG VALIDATION ----------
ok("01 valid backlog accepted", validateBacklog([J("a")]).ok);
ok("02 malformed backlog (missing objective) rejected", !validateBacklog([{ ...J("a"), objective: undefined }]).ok);
ok("03 duplicate job_id rejected", !validateBacklog([J("a"), J("a")]).ok);
ok("04 missing dependency rejected", !validateBacklog([J("a", { deps: ["ghost"] })]).ok);
ok("05 dependency cycle rejected", !validateBacklog([J("a", { deps: ["b"] }), J("b", { deps: ["a"] })]).ok);
ok("06 cycle detector finds the cycle", !!findCycle([J("a", { deps: ["b"] }), J("b", { deps: ["a"] })]));

// ---------- ELIGIBILITY ----------
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a")]);
  ok("07 WIDE_SAFE clean job is ELIGIBLE", eligibilityReason(c.byId.get("a"), c.ctx()) === "ELIGIBLE");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { risk: "NARROW_SENSITIVE" })]);
  ok("08 NARROW_SENSITIVE is HELD (not eligible)", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { risk: "UNKNOWN" })]);
  ok("09 UNKNOWN risk is HELD", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { risk: "BLOCKED" })]);
  ok("10 BLOCKED risk is HELD", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { gate: "FOUNDER_GATE" })]);
  ok("11 FOUNDER_GATE job is HELD (never eligible)", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { gate: "HUMAN_EXPERT_GATE" })]);
  ok("12 HUMAN_EXPERT_GATE job is HELD", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { eff: "LIVE_ACTION" })]);
  ok("13 LIVE_ACTION effect is HELD", c.byId.get("a").status === "HELD");
}
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a", { tests: [] })]);
  ok("14 job without tests is not eligible", eligibilityReason(c.byId.get("a"), c.ctx()).startsWith("HELD:no-tests"));
}

// ---------- DEPENDENCIES ----------
{
  const c = run([J("a"), J("b", { deps: ["a"] })]);
  ok("15 completed dependency unlocks dependent", status(c).a === "COMPLETED" && status(c).b === "COMPLETED");
}
{
  const c = run([J("f", { sim: { outcome: "fail_always" } }), J("g", { deps: ["f"] })]);
  ok("16 failed/parked dependency -> dependent BLOCKED", status(c).f === "PARKED" && status(c).g === "BLOCKED");
}

// ---------- COLLISIONS ----------
ok("17 exact file collision detected", jobsCollide(J("a", { files: ["src/x/shared.mjs"] }), J("b", { files: ["src/x/shared.mjs"] })));
ok("18 directory-overlap collision detected", jobsCollide(J("a", { files: ["src/x/"] }), J("b", { files: ["src/x/deep/y.mjs"] })));
ok("19 disjoint files do not collide", !jobsCollide(J("a", { files: ["src/x/a.mjs"] }), J("b", { files: ["src/y/b.mjs"] })));
{
  // two same-file jobs: only one runs at a time (one-writer), the other HELD_COLLISION while first runs
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 3 });
  c.load([J("a", { files: ["src/z/shared.mjs"], branch: "lane/a", worktree: "/wt/a" }), J("b", { files: ["src/z/shared.mjs"], branch: "lane/b", worktree: "/wt/b" })]);
  c.refill();
  const running = c.jobs.filter((j) => j.status === "RUNNING").length;
  ok("20 file collision -> one-writer (only 1 of 2 same-file jobs runs)", running === 1);
  const other = c.jobs.find((j) => j.status !== "RUNNING");
  ok("21 colliding sibling held while first holds the lock", eligibilityReason(other, c.ctx()).startsWith("HELD_COLLISION"));
  c.runToCompletion();
  ok("22 both same-file jobs eventually complete serially", status(c).a === "COMPLETED" && status(c).b === "COMPLETED");
}
{
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 3 });
  c.load([J("a", { branch: "lane/shared" }), J("b", { branch: "lane/shared", files: ["src/x/b.mjs"] })]);
  c.refill();
  ok("23 branch collision -> only one runs", c.jobs.filter((j) => j.status === "RUNNING").length === 1);
}
{
  // RUNTIME directory-overlap enforcement (checker finding): "src/z/" dir vs "src/z/deep.mjs"
  const c1 = new Controller({ run_id: "t", now: 1, maxWidth: 3 });
  c1.load([J("dir", { files: ["src/z/"], branch: "lane/dir", worktree: "/wt/dir" }), J("file", { files: ["src/z/deep.mjs"], branch: "lane/file", worktree: "/wt/file" })]);
  c1.refill();
  ok("23b dir-overlap collision serialized at RUNTIME (only 1 runs)", c1.jobs.filter((j) => j.status === "RUNNING").length === 1);
  c1.runToCompletion();
  ok("23c both dir-overlap jobs complete serially", status(c1).dir === "COMPLETED" && status(c1).file === "COMPLETED");
  // and the reverse ordering (file locked first, dir candidate)
  const c2 = new Controller({ run_id: "t", now: 1, maxWidth: 1 });
  c2.load([J("file", { files: ["src/z/deep.mjs"], branch: "lane/file", worktree: "/wt/file" }), J("dir", { files: ["src/z/"], branch: "lane/dir", worktree: "/wt/dir" })]);
  c2.refill();
  const running = c2.jobs.find((j) => j.status === "RUNNING");
  const held = c2.jobs.find((j) => j.status !== "RUNNING");
  ok("23d reverse dir-overlap also held", eligibilityReason(held, c2.ctx()).startsWith("HELD_COLLISION"));
}

// ---------- REFILL / WIDTH ----------
{
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 2 });
  c.load([J("a"), J("b"), J("c"), J("d")]); c.refill();
  ok("24 max parallel width respected", c.jobs.filter((j) => j.status === "RUNNING").length === 2);
}
{
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 2 });
  c.load([J("a"), J("b"), J("c"), J("d")]); c.refill(); c.step("a"); c.refill();
  ok("25 automatic refill after a completion", c.jobs.filter((j) => j.status === "RUNNING").length === 2 && status(c).a === "COMPLETED");
}
{
  // no refill after a founder gate is raised
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 3 });
  c.load([J("a"), J("b")]); c.raiseGate("FOUNDER_GATE", "test", "merge", "founder decides"); const before = c.runningCount();
  const res = c.refill();
  ok("26 no refill while a founder gate is held", res.refilled === 0 && c.runningCount() === before);
}

// ---------- CORRECTION CYCLES / PARK ----------
{
  const c = run([J("e", { sim: { outcome: "fail_once" } })]);
  ok("27 correctable failure retries then completes", status(c).e === "COMPLETED" && c.byId.get("e").correction_cycle === 1);
}
{
  const c = run([J("f", { sim: { outcome: "fail_always" }, max: 3 })]);
  ok("28 repeated failure parks after 3 cycles", status(c).f === "PARKED" && c.byId.get("f").correction_cycle === 3);
}
{
  const c = run([J("f", { sim: { outcome: "fail_always" } }), J("safe1"), J("safe2")]);
  ok("29 unrelated safe lanes continue despite a parked lane", status(c).safe1 === "COMPLETED" && status(c).safe2 === "COMPLETED");
}

// ---------- DEADLINE / PAUSE ----------
{
  const c = new Controller({ run_id: "t", now: 1000, maxWidth: 3, deadlineEpoch: 500 });
  c.load([J("a"), J("b")]); const res = c.refill();
  ok("30 deadline prevents new scheduling", res.refilled === 0 && c.runtime_state === "STOPPED_DEADLINE");
}
{
  const c = new Controller({ run_id: "t", now: 1, maxWidth: 3 });
  c.load([J("a"), J("b")]); c.pause(); const res = c.refill();
  ok("31 pause prevents new scheduling", res.refilled === 0 && c.runtime_state === "PAUSED");
}

// ---------- DUPLICATE PREVENTION ----------
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a")]); c.refill();
  const r2 = c.load([J("a")]);
  ok("32 duplicate run refused while running", r2.ok === false);
}
ok("33 duplicate job_id refused at validation", !validateBacklog([J("a"), J("a")]).ok);

// ---------- PROVIDER DISCIPLINE ----------
ok("34 real provider disabled without activation record", realProviderAdapter(null).enabled === false && realProviderAdapter(null).invoked === false);
ok("35 real provider refuses incomplete activation", realProviderAdapter({ candidate_sha: "x" }).enabled === false);
ok("36 real provider refuses stale candidate_sha", realProviderAdapter({ candidate_sha: "x", candidate_tree: "t", run_deadline_epoch: 1, backlog_digest: "d", allowed_tools: ["Read"], denied_tools: [], max_parallel_width: 3, provider: "cc", founder_signature: "s" }, { candidate_sha: "y", backlog_digest: "d" }).enabled === false);
ok("37 real provider refuses permission-weakening flag", realProviderAdapter({ candidate_sha: "x", candidate_tree: "t", run_deadline_epoch: 1, backlog_digest: "d", allowed_tools: ["Read"], denied_tools: [], max_parallel_width: 3, provider: "cc", founder_signature: "s", dangerously_skip_permissions: true }).enabled === false);
ok("38 real provider NEVER invoked even when admissible", realProviderAdapter({ candidate_sha: "x", candidate_tree: "t", run_deadline_epoch: 1, backlog_digest: "d", allowed_tools: ["Read"], denied_tools: [], max_parallel_width: 3, provider: "cc", founder_signature: "s" }).invoked === false);

// ---------- EVIDENCE SEAL ORDERING ----------
{
  const c = new Controller({ run_id: "t", now: 1 }); c.load([J("a")]); c.refill(); c.step("a");
  const evs = c.events.filter((e) => e.job_id === "a").map((e) => e.event_type);
  ok("39 evidence sealed BEFORE job_completed", evs.indexOf("evidence_sealed") < evs.indexOf("job_completed") && evs.includes("evidence_sealed"));
}

// ---------- EVENT SCOPING (via projection / PR#183 truth) ----------
{
  const snap = { run_id: "R", runtime_state: "RUNNING", jobs: [J("a")], events: [{ event_id: "1", run_id: "R", timestamp: 1, source: "s", event_type: "x" }, { event_id: "2", run_id: "OTHER", timestamp: 1, source: "s", event_type: "x" }, { event_id: "3", timestamp: 1, source: "s", event_type: "x" }] };
  const v = projectConsole(snap, 100000);
  ok("40 current events = only active run_id", v.current_events === 1);
  ok("41 other-run + unscoped events are historical", v.historical_events === 2 && v.legacy_unscoped_events === 1);
}

// ---------- HEARTBEAT / LIFECYCLE (via projection) ----------
{
  const v = projectConsole({ run_id: "R", runtime_state: "STOPPED_EXHAUSTED", handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" }, heartbeat: { ts: 1784428534019 }, jobs: [] }, 1784428534019 + 30000);
  ok("42 STOPPED_EXHAUSTED -> COMPLETED display", v.lifecycle_display === "COMPLETED (queue exhausted)");
  ok("43 handoff marker is historical only", v.historical_launch_marker === "SAFE_TO_LEAVE_UNATTENDED");
  ok("44 ms heartbeat age non-negative + OK", v.heartbeat_age_seconds >= 0 && v.heartbeat_status === "OK");
}
{
  const v = projectConsole({ run_id: "R", runtime_state: "RUNNING", heartbeat: null, jobs: [] }, 100000);
  ok("45 missing heartbeat -> NONE (never OK)", v.heartbeat_status === "NONE");
}

// ========== FALSE-GREEN MATRIX ==========
{
  const v = projectConsole({ run_id: "R", runtime_state: "STOPPED_EXHAUSTED", jobs: [J("a")], merged: false, accepted: false }, 100000);
  ok("FG1 completed is NOT accepted", v.any_output_accepted === false);
  ok("FG2 completed is NOT merged", v.any_output_merged === false);
  ok("FG3 queue-exhausted never says accepted/merged in display", !/ACCEPT|MERGE/i.test(v.lifecycle_display));
}
{
  const v = projectConsole({ run_id: "R", runtime_state: "RUNNING", heartbeat: { ts: 1 }, jobs: [] }, 1e13);
  ok("FG4 stale/ancient heartbeat is STALE, not current", v.heartbeat_status === "STALE");
}
{
  const v = projectConsole({ run_id: "R", runtime_state: "RUNNING", cost: undefined, jobs: [] }, 100000);
  ok("FG5 absent cost displayed UNKNOWN, never a number", v.current_cost === "UNKNOWN");
}
{
  const v = projectConsole({ run_id: "R", runtime_state: "UNKNOWN", jobs: [] }, 100000);
  ok("FG6 unknown runtime -> UNKNOWN display", v.lifecycle_display === "UNKNOWN");
}
{
  // progress from another run must not count as current
  const v = projectConsole({ run_id: "R", runtime_state: "RUNNING", jobs: [], events: [{ event_id: "1", run_id: "OTHER", timestamp: 1, source: "s", event_type: "job_completed" }] }, 100000);
  ok("FG7 other-run progress not current", v.current_events === 0);
}
ok("FG8 branch activity is never liveness", projectConsole({ run_id: "R", jobs: [] }, 1).branch_activity_is_liveness === false);
{
  // missing state must not read as zero failures / green
  const v = projectConsole({ jobs: [] }, 100000);
  ok("FG9 missing state -> UNKNOWN, not green", v.lifecycle_display === "UNKNOWN" && v.run_id === "UNKNOWN");
}
{
  const v = projectConsole({ run_id: "R", runtime_state: "STOPPED_EXHAUSTED", jobs: [], cost: 12.5, cost_ceiling: null }, 100000);
  ok("FG10 real cost shown as number, estimate never fabricated", v.current_cost === 12.5);
}

// ========== RECOVERY MATRIX ==========
const tmp = mkdtempSync(join(tmpdir(), "lrcq-rec-"));
{
  // crash BEFORE job start: no job started -> resume has none running
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("a"), J("b")]); saveSnapshot(tmp, c);
  const r = resume(tmp);
  ok("R1 crash before start -> resume clean, no duplicate", r.jobs.every((j) => j.status === "PENDING" || j.status === "HELD"));
}
{
  // crash DURING fake worker (RUNNING, not sealed) -> resume resets to PENDING (safe re-attempt)
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("a")]); c.refill(); saveSnapshot(tmp, c);
  const r = resume(tmp);
  ok("R2 crash during worker (unsealed) -> PENDING re-attempt, not duplicated/green", r.byId.get("a").status === "PENDING");
}
{
  // crash AFTER seal but BEFORE final-state write -> resume promotes to COMPLETED (no re-run)
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("a")]); c.refill();
  c.sealed.add("a"); // sealed but leave status RUNNING to simulate crash before final write
  saveSnapshot(tmp, c);
  const r = resume(tmp);
  ok("R3 crash after seal, before final -> COMPLETED (no double-run)", r.byId.get("a").status === "COMPLETED");
}
{
  // resume then continue completes without duplicating events for the same job
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("a"), J("b")]); c.refill(); saveSnapshot(tmp, c);
  const r = resume(tmp); r.runToCompletion();
  const doneEvents = r.events.filter((e) => e.event_type === "job_completed" && e.job_id === "a").length;
  ok("R4 restart resumes without duplicate completion events", doneEvents <= 1 && status(r).a === "COMPLETED");
}
{
  // indeterminate resume never fabricates green
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("a")]); c.refill(); saveSnapshot(tmp, c);
  const r = resume(tmp);
  ok("R5 indeterminate running -> PENDING/HELD/UNKNOWN, never COMPLETED w/o seal", r.byId.get("a").status !== "COMPLETED");
}
{
  // live-run detection refuses a duplicate concurrent start; stale lock is recoverable
  const c = new Controller({ run_id: "t", now: 1000 }); c.load([J("a")]); c.refill(); saveSnapshot(tmp, c);
  ok("R6 live run detected (refuse duplicate)", detectLiveRun(tmp, 1000 + 10).live === true);
  ok("R7 stale lock is recoverable, not treated as live", detectLiveRun(tmp, 1000 + 10000).live === false);
}
{
  // recovery does NOT consume a founder gate
  const c = new Controller({ run_id: "t", now: 10 }); c.load([J("d", { gate: "FOUNDER_GATE" })]); saveSnapshot(tmp, c);
  const r = resume(tmp);
  ok("R8 recovery does not start/consume a founder-gate job", r.byId.get("d").status === "HELD");
}

console.log("\nLRCQ CONTROLLER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
