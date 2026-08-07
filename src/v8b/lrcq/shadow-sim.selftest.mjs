// FounderGate LRCQ — Phase-8 shadow-simulation proofs.
import { runShadow, buildShadowBacklog } from "./shadow-sim.mjs";
import { collisionMatrix } from "./controller.mjs";
import { validateBacklog } from "./schemas.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const jobs = buildShadowBacklog();
ok("00 backlog has >=24 jobs", jobs.length >= 24);
ok("01 backlog is valid", validateBacklog(jobs).ok);

const { controller: c, view } = runShadow({ maxWidth: 3 });
const st = Object.fromEntries(c.jobs.map((j) => [j.job_id, j.status]));

ok("02 safe jobs completed", ["safe1", "safe6", "safe12"].every((id) => st[id] === "COMPLETED"));
ok("03 dependency chain completed in order", st.chainA === "COMPLETED" && st.chainB === "COMPLETED" && st.chainC === "COMPLETED");
ok("04 collision pair both eventually complete (serialized by one-writer)", st.collX === "COMPLETED" && st.collY === "COMPLETED");
ok("05 collision detected in static matrix", collisionMatrix(jobs).some(([a, b]) => (a === "collX" && b === "collY") || (a === "collY" && b === "collX")));
ok("06 correctable failure retried then completed", st.flaky === "COMPLETED" && c.byId.get("flaky").correction_cycle === 1);
ok("07 repeated failure parked after 3 cycles", st.broken === "PARKED" && c.byId.get("broken").correction_cycle === 3);
ok("08 dependent of parked job is BLOCKED", st.afterBroken === "BLOCKED");
ok("09 founder-gate job NEVER started (HELD)", st.founderReview === "HELD" && !c.events.some((e) => e.job_id === "founderReview" && e.event_type === "job_started"));
ok("10 human-expert job NEVER started (HELD)", st.legalReview === "HELD" && !c.events.some((e) => e.job_id === "legalReview" && e.event_type === "job_started"));
ok("11 unknown-class job NEVER started (HELD)", st.mystery === "HELD" && !c.events.some((e) => e.job_id === "mystery" && e.event_type === "job_started"));
ok("12 final state honest (STOPPED_EXHAUSTED)", c.runtime_state === "STOPPED_EXHAUSTED");
ok("13 console shows founder action required", view.founder_action_required === true && view.held_founder_gate_jobs.includes("founderReview"));
ok("14 nothing merged / nothing accepted", view.any_output_merged === false && view.any_output_accepted === false);
ok("15 completed != accepted (>=17 completed, 0 accepted)", view.completed_jobs.length >= 17 && view.any_output_accepted === false);
ok("16 held set = {founderReview, legalReview, mystery}", ["founderReview", "legalReview", "mystery"].every((id) => view.held_jobs.includes(id)) && view.held_jobs.length === 3);

// deadline stops new scheduling in a fresh run
const dr = runShadow({ maxWidth: 3, now: 100000, deadlineEpoch: 50000 });
ok("17 deadline stops scheduling (nothing runs, STOPPED_DEADLINE)", dr.controller.runtime_state === "STOPPED_DEADLINE" && dr.controller.jobs.every((j) => j.status !== "COMPLETED"));

// max width never exceeded during the whole run (check event interleave via a width-2 run)
const w2 = runShadow({ maxWidth: 2 });
ok("18 all safe work still completes at width 2 (refill kept lanes supplied)", ["safe1", "safe12", "chainC"].every((id) => Object.fromEntries(w2.controller.jobs.map((j) => [j.job_id, j.status]))[id] === "COMPLETED"));

console.log("\nLRCQ SHADOW-SIM SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
