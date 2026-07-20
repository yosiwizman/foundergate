// FounderGate LRCQ — backlog-quality selftest.
//
// Plain English: proves the five-hour WIDE-SAFE refill backlog is well-formed,
// safe, and parallelizable. Data-only guard — it reads the JSON and the shared
// schema/controller validators; it changes no state and touches no live action.
//
// Green condition: every assertion below holds, exit 0. Any failure exits 1.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBacklog } from "../schemas.mjs";
import { jobsCollide } from "../controller.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(HERE, "five-hour-backlog.json");
const jobs = JSON.parse(readFileSync(JSON_PATH, "utf8"));

// Deny-list: forbidden path prefixes no allowed_file may ever start with.
const DENY_PREFIXES = [
  "src/founder_url_drop/",
  ".foundergate/governance/",
  "tools/terminal0/paes/",
  "secrets/",
];

let n = 0;
const fails = [];
const ok = (name, cond) => {
  n++;
  if (!cond) {
    fails.push(name);
    console.log("  FAIL " + name);
  } else {
    console.log("  ok   " + name);
  }
};

// 01 — schema validity (unique ids, resolvable deps, no cycles).
ok("01 validateBacklog(jobs).ok===true", validateBacklog(jobs).ok === true);

// 02 — exactly 25 jobs.
ok("02 jobs.length===25", jobs.length === 25);

// 03 — total estimated minutes >= 300 (five hours).
const totalMinutes = jobs.reduce((a, j) => a + j.estimated_minutes, 0);
ok("03 sum(estimated_minutes) >= 300 (" + totalMinutes + ")", totalMinutes >= 300);

// 04 — every job is WIDE_SAFE.
ok("04 all risk_class WIDE_SAFE", jobs.every((j) => j.risk_class === "WIDE_SAFE"));

// 05 — every job gate_trigger NONE (auto-eligible, no founder interaction).
ok("05 all gate_trigger NONE", jobs.every((j) => j.gate_trigger === "NONE"));

// 06 — no allowed_file touches any forbidden prefix.
const denyHit = jobs.find((j) =>
  j.allowed_files.some((f) => DENY_PREFIXES.some((p) => f.startsWith(p)))
);
ok("06 no forbidden path in any allowed_files", !denyHit);

// 07 — every job has non-empty tests, required_evidence, and a checker_requirement.
ok(
  "07 each job has tests + required_evidence + checker_requirement",
  jobs.every(
    (j) =>
      Array.isArray(j.tests) && j.tests.length > 0 &&
      Array.isArray(j.required_evidence) && j.required_evidence.length > 0 &&
      typeof j.checker_requirement === "string" && j.checker_requirement.length > 0
  )
);

// 08 — every job carries the extra rollback + collision_set fields.
ok(
  "08 each job has rollback + collision_set",
  jobs.every(
    (j) =>
      typeof j.rollback === "string" && j.rollback.length > 0 &&
      Array.isArray(j.collision_set)
  )
);

// 09 — effect_class restricted to PURE|LOCAL_FS.
ok(
  "09 effect_class in {PURE,LOCAL_FS}",
  jobs.every((j) => j.effect_class === "PURE" || j.effect_class === "LOCAL_FS")
);

// 10 — collision graph is sparse: a greedy maximal independent set of pairwise
// non-colliding jobs must reach at least 20, so parallel refill has real supply.
const disjoint = [];
for (const j of jobs) {
  if (disjoint.every((d) => !jobsCollide(j, d))) disjoint.push(j);
}
ok(
  "10 >=20 jobs pairwise-disjoint (" + disjoint.length + ")",
  disjoint.length >= 20
);

// 11 — declared collision_set is consistent with the actual collision matrix:
// any pair the controller says collides must be recorded in both jobs' sets.
const byId = new Map(jobs.map((j) => [j.job_id, j]));
let collisionMismatch = null;
for (let i = 0; i < jobs.length && !collisionMismatch; i++) {
  for (let k = i + 1; k < jobs.length; k++) {
    if (jobsCollide(jobs[i], jobs[k])) {
      const a = jobs[i], b = jobs[k];
      if (!a.collision_set.includes(b.job_id) || !b.collision_set.includes(a.job_id)) {
        collisionMismatch = a.job_id + " <-> " + b.job_id;
        break;
      }
    }
  }
}
ok("11 declared collision_set matches collision matrix", !collisionMismatch);

// 12 — every collision_set entry names an existing job.
ok(
  "12 collision_set entries reference existing jobs",
  jobs.every((j) => j.collision_set.every((id) => byId.has(id)))
);

const passed = n - fails.length;
console.log("\nBACKLOG-QUALITY SELFTEST: " + passed + "/" + n + " passed");
process.exit(fails.length === 0 ? 0 : 1);
