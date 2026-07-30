// Founder demo selftest — composes URL-drop intake + founder view (command-center +
// status-cards) + evidence decision package into one plain-English story.
import { buildFounderDemo, renderFounderDemoText, UNKNOWN } from "./founder-demo.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Founder demo — intake + founder view + decision, in plain English ==");

const HB_MS = 1784428534019, NOW = HB_MS + 30_000;

const baseArgs = {
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

// 01 composes all three stages + plain-English narration
(() => {
  const d = buildFounderDemo(baseArgs);
  ok("01 composes intake + founder_view + decision + plain_english",
    !!d.intake && !!d.founder_view && !!d.decision && typeof d.plain_english === "string" && d.plain_english.length > 0);
})();

// 02 supported github URL is accepted
(() => {
  const d = buildFounderDemo(baseArgs);
  ok("02 github URL accepted", d.intake.classification === "SUPPORTED_PUBLIC_GIT" && d.intake.accepted === true);
})();

// 03 http:// URL is BLOCKED
(() => {
  const d = buildFounderDemo({ ...baseArgs, url: "http://github.com/acme/widgets" });
  ok("03 http url blocked", d.intake.classification === "BLOCKED" && d.intake.accepted === false);
})();

// 04 fresh heartbeat -> liveness LIVE
(() => {
  const d = buildFounderDemo(baseArgs);
  ok("04 fresh heartbeat -> LIVE", d.founder_view.headline.liveness === "LIVE");
})();

// 05 missing heartbeat -> never LIVE
(() => {
  const { heartbeat, ...rest } = baseArgs;
  const d = buildFounderDemo(rest);
  ok("05 missing heartbeat never LIVE", d.founder_view.headline.liveness !== "LIVE" && d.founder_view.headline.liveness === "NO HEARTBEAT");
})();

// 06 missing verdict -> UNKNOWN, certifies_green stays false
(() => {
  const { decisionInputs, ...rest } = baseArgs;
  const d = buildFounderDemo(rest);
  ok("06 missing verdict -> UNKNOWN", d.decision.verdict === UNKNOWN);
  ok("06b certifies_green stays false", d.decision.certifies_green === false);
})();

// 07 output is frozen
(() => {
  const d = buildFounderDemo(baseArgs);
  ok("07 frozen", Object.isFrozen(d));
})();

// 08 deterministic render (same input -> identical string)
(() => {
  const t1 = renderFounderDemoText(buildFounderDemo(baseArgs));
  const t2 = renderFounderDemoText(buildFounderDemo(baseArgs));
  ok("08 deterministic render", t1 === t2);
})();

// 09 render narrates all three stages
(() => {
  const t = renderFounderDemoText(buildFounderDemo(baseArgs));
  ok("09 render has all three stages", t.includes("Stage 1") && t.includes("Stage 2") && t.includes("Stage 3"));
})();

// 10 BLOCKED url path shows a blocked status + human reason in the URL check section
(() => {
  const d = buildFounderDemo({ ...baseArgs, url: "http://github.com/acme/widgets" });
  ok("10 blocked url shows BLOCKED + reason",
    d.plain_english.includes("BLOCKED") &&
    d.plain_english.includes("unsupported scheme") &&
    d.intake.reason.length > 0 && d.plain_english.includes(d.intake.reason));
})();

// 11 missing verdict -> bottom line honestly says UNKNOWN, never invents a pass
(() => {
  const { decisionInputs, ...rest } = baseArgs;
  const d = buildFounderDemo(rest);
  ok("11 bottom line says UNKNOWN when verdict missing",
    d.bottom_line.includes("UNKNOWN") && d.plain_english.includes("Bottom line:"));
})();

// 12 sectioned narrative + bottom line render deterministically and never over-claim
(() => {
  const d1 = buildFounderDemo(baseArgs);
  const d2 = buildFounderDemo(baseArgs);
  const hasSections = d1.plain_english.includes("URL check") &&
    d1.plain_english.includes("Run status") &&
    d1.plain_english.includes("Decision:") &&
    d1.plain_english.includes("Bottom line:");
  // Note: the disclaimer prose legitimately says "NOT a production/commercial ... claim", so
  // over-claiming is checked on the decision package's own fields, not by regexing the prose.
  const noOverclaim = d1.decision.certifies_green === false && d1.decision.certifies_production === false;
  ok("12 sectioned + honest + deterministic",
    hasSections && noOverclaim && d1.plain_english === d2.plain_english && d1.bottom_line === d2.bottom_line);
})();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nFOUNDER-DEMO-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
