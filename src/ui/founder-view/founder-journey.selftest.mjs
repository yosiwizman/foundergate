// Founder journey selftest — the 5 named steps of the no-terminal path, truthful state.
import { buildFounderJourney, renderFounderJourney, UNKNOWN } from "./founder-journey.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Founder journey — 5-step no-terminal path ==");

const HB_MS = 1784428534019, NOW = HB_MS + 30_000;
const realArgs = {
  objective: "Decide whether widgets is safe to keep evaluating.",
  url: "https://github.com/acme/widgets",
  runId: "run-x",
  state: { state: "RUNNING" },
  heartbeat: { ts: HB_MS },
  evidence: [{ label: "pack", ts: Math.floor(NOW / 1000) - 100 }],
  nowMs: NOW,
  decision: "proceed",
};

// 01 five steps present, in order, with the expected names
(() => {
  const j = buildFounderJourney(realArgs);
  const names = j.steps.map((s) => s.name);
  ok("01 five steps in order", j.steps.length === 5 &&
    JSON.stringify(names) === JSON.stringify(["Objective", "URL intake", "Run status", "Evidence", "Decision"]) &&
    j.steps.every((s, i) => s.n === i + 1));
})();

// 02 objective appears first in the plain-English narrative
(() => {
  const j = buildFounderJourney(realArgs);
  ok("02 objective first", j.plain_english.startsWith(`Objective: ${realArgs.objective}`));
})();

// 03 missing everything -> every step is UNKNOWN, never fabricated
(() => {
  const j = buildFounderJourney({});
  ok("03 all UNKNOWN when nothing supplied",
    j.objective === UNKNOWN &&
    j.steps.every((s) => s.state === UNKNOWN));
})();

// 04 missing url alone -> URL intake stays UNKNOWN even with everything else real
(() => {
  const { url, ...rest } = realArgs;
  const j = buildFounderJourney(rest);
  ok("04 missing url -> URL intake UNKNOWN", j.steps[1].state === UNKNOWN);
})();

// 05 real inputs produce truthful, non-UNKNOWN states
(() => {
  const j = buildFounderJourney(realArgs);
  ok("05 real inputs -> truthful states",
    j.steps[0].state === "SET" &&
    j.steps[1].state === "RECEIVED" &&
    j.steps[2].state === "RUNNING" &&
    j.steps[3].state === "FRESH" &&
    j.steps[4].state === "PROCEED");
})();

// 06 unrecognized decision token -> UNKNOWN, never invented as a claim
(() => {
  const j = buildFounderJourney({ ...realArgs, decision: "definitely maybe" });
  ok("06 unrecognized decision -> UNKNOWN", j.steps[4].state === UNKNOWN);
})();

// 07 never over-claims production/commercial/customer-ready/green
(() => {
  const j = buildFounderJourney(realArgs);
  const lower = j.plain_english.toLowerCase();
  ok("07 never over-claims",
    !lower.includes("production-ready") &&
    !lower.includes("customer-ready") &&
    !lower.includes("certified green") &&
    lower.includes("not a production, commercial, or customer readiness claim"));
})();

// 08 frozen (top level, steps array, each step, and the composed view)
(() => {
  const j = buildFounderJourney(realArgs);
  ok("08 frozen", Object.isFrozen(j) && Object.isFrozen(j.steps) && j.steps.every((s) => Object.isFrozen(s)) && Object.isFrozen(j.view));
})();

// 09 deterministic render: same input -> identical output, matches renderFounderJourney
(() => {
  const j1 = buildFounderJourney(realArgs);
  const j2 = buildFounderJourney(realArgs);
  ok("09 deterministic render", j1.plain_english === j2.plain_english && renderFounderJourney(j1) === j1.plain_english);
})();

// 10 reuses buildFounderView read-only: run status/evidence steps track the view headline
(() => {
  const j = buildFounderJourney(realArgs);
  ok("10 steps track view headline",
    j.steps[2].state === j.view.headline.lifecycle &&
    j.steps[3].state === j.view.headline.evidence_freshness);
})();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nFOUNDER-JOURNEY-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
