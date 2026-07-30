// Founder operate selftest — objective up front, then the five-step story
// (intake, run status, evidence freshness, decision, bottom line), reusing the
// founder-demo narrative as the body. Deterministic fixtures only.
import { buildFounderOperate, renderFounderOperate, UNKNOWN } from "./founder-operate.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Founder operate — objective + 5-step story on top of founder-demo ==");

const HB_MS = 1784428534019, NOW = HB_MS + 30_000;

const baseArgs = {
  objective: "Decide whether widgets is safe to keep evaluating.",
  runId: "run-x",
  state: { state: "RUNNING" },
  heartbeat: { ts: HB_MS },
  evidence: [{ label: "pack", ts: Math.floor(NOW / 1000) - 100 }],
  nowMs: NOW,
  url: "https://github.com/acme/widgets",
  decisionInputs: {
    verdict: "PASS",
    claims: [{ name: "offline safety check", status: "PROVEN" }],
    limitations: ["demo-only, not a production certification"],
    evidence_sha256: "a".repeat(64),
    run_id: "run-x",
  },
};

// 01 objective appears first in the plain-English narrative
(() => {
  const op = buildFounderOperate(baseArgs);
  ok("01 objective appears first", op.plain_english.startsWith(`Objective: ${baseArgs.objective}`));
})();

// 02 all 5 steps present, in order, with the expected names
(() => {
  const op = buildFounderOperate(baseArgs);
  const names = op.steps.map((s) => s.name);
  ok("02 five steps in order", op.steps.length === 5 &&
    JSON.stringify(names) === JSON.stringify(["Intake", "Run status", "Evidence freshness", "Decision", "Bottom line"]) &&
    op.steps.every((s, i) => s.step === i + 1));
})();

// 03 steps also appear in order inside the plain-English text
(() => {
  const op = buildFounderOperate(baseArgs);
  const idx = op.steps.map((s) => op.plain_english.indexOf(`Step ${s.step} of 5 — ${s.name}:`));
  ok("03 step lines present and ordered in text",
    idx.every((i) => i >= 0) && idx.every((i, k) => k === 0 || i > idx[k - 1]));
})();

// 04 missing objective -> UNKNOWN, never fabricated
(() => {
  const { objective, ...rest } = baseArgs;
  const op = buildFounderOperate(rest);
  ok("04 missing objective -> UNKNOWN", op.objective === UNKNOWN && op.plain_english.startsWith(`Objective: ${UNKNOWN}`));
})();

// 05 a BLOCKED url still yields a coherent 5-step story
(() => {
  const op = buildFounderOperate({ ...baseArgs, url: "http://github.com/acme/widgets" });
  ok("05 BLOCKED url still coherent",
    op.steps.length === 5 &&
    op.steps[0].summary.includes("BLOCKED") &&
    op.plain_english.includes("BLOCKED") &&
    op.plain_english.includes("Bottom line:"));
})();

// 06 missing verdict -> UNKNOWN, and the story never claims production/commercial/customer-ready/green
(() => {
  const { decisionInputs, ...rest } = baseArgs;
  const op = buildFounderOperate(rest);
  const lower = op.plain_english.toLowerCase();
  ok("06 missing verdict -> UNKNOWN, no over-claim",
    op.demo.decision.verdict === UNKNOWN &&
    op.steps[3].summary.includes("UNKNOWN") &&
    !lower.includes("production-ready") &&
    !lower.includes("customer-ready") &&
    op.demo.decision.certifies_green === false);
})();

// 07 output is deeply frozen (top level and steps)
(() => {
  const op = buildFounderOperate(baseArgs);
  ok("07 frozen", Object.isFrozen(op) && Object.isFrozen(op.steps) && op.steps.every((s) => Object.isFrozen(s)));
})();

// 08 render is deterministic (same input -> identical string, matches renderFounderOperate)
(() => {
  const op1 = buildFounderOperate(baseArgs);
  const op2 = buildFounderOperate(baseArgs);
  ok("08 deterministic render",
    op1.plain_english === op2.plain_english &&
    renderFounderOperate(op1) === op1.plain_english);
})();

// 09 reuses the founder-demo narrative as the body (Stage 1/2/3 markers present)
(() => {
  const op = buildFounderOperate(baseArgs);
  ok("09 founder-demo body reused",
    op.plain_english.includes("Stage 1") && op.plain_english.includes("Stage 2") && op.plain_english.includes("Stage 3"));
})();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nFOUNDER-OPERATE-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
