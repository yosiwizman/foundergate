// FounderGate V8-B VB2 — COST DISPLAY surface proof: the quota is shown, spend is summed with
// maximum honesty (unmeasured is never $0, a partial total is never a complete one, "within
// budget" is claimed only when fully measured and under limit), and the surface has grown NO
// act edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as surface from "./cost-display.mjs";
import {
  deriveCostView, fmtMoney, renderCostText, renderCostHtml,
  renderSurfaceHtml, renderSurfaceText, KNOWN_ENFORCEMENT,
} from "./cost-display.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// The REAL committed cost budget policy — the same file the V8-A1 dashboard reads and the
// evidence generator feeds in as the declared quota.
const BUDGET = JSON.parse(
  readFileSync(join(HERE, "..", "v8a1", "fixture", "mock-project", ".foundergate", "cost_budget.json"), "utf8")
);

console.log("== VB2 Cost Display — surface ==");

check("fmtMoney is deterministic two-decimal USD and says 'not measured' for an absent amount", () => {
  assert.equal(fmtMoney(0), "$0.00");
  assert.equal(fmtMoney(12.5), "$12.50");
  assert.equal(fmtMoney(3), "$3.00");
  assert.equal(fmtMoney(null), "not measured");
  assert.equal(fmtMoney(undefined), "not measured");
  assert.equal(fmtMoney(-1), "not measured", "a negative amount is not a valid cost");
  assert.equal(fmtMoney(NaN), "not measured");
});

check("the declared quota flows through verbatim (limit, enforcement, paid-services, policy)", () => {
  const v = deriveCostView({ source: "fixture", budget: BUDGET });
  assert.equal(v.budget.declared, true);
  assert.equal(v.budget.monthlyLimitUsd, 50);
  assert.equal(v.budget.enforcement, KNOWN_ENFORCEMENT);
  assert.equal(v.budget.enforcementIsDisplayOnly, true, "the budget is display-only, not enforced");
  assert.equal(v.budget.paidServicesBlocked, true);
  assert.ok(v.budget.sameFailureLoopPolicy.includes("3 identical failures"));
});

check("source truth-label is carried and never conflated (live vs fixture vs unknown)", () => {
  assert.equal(deriveCostView({ source: "fixture" }).source, "fixture");
  assert.equal(deriveCostView({ source: "live" }).source, "live");
  assert.equal(deriveCostView({ source: "weird" }).source, "UNKNOWN", "unknown source said out loud");
  assert.equal(deriveCostView({}).source, "UNKNOWN");
});

check("THE CENTRAL HONESTY: an unmeasured run/PR cost is 'not measured', NEVER $0.00", () => {
  const v = deriveCostView({
    source: "fixture", budget: BUDGET,
    runs: [{ label: "run-a", prs: [{ number: 139, title: "x" }] }],
  });
  assert.equal(v.runs[0].cost, null, "unmeasured run cost is null, not 0");
  assert.equal(v.runs[0].costMeasured, false);
  assert.equal(v.runs[0].prs[0].cost, null, "unmeasured PR cost is null, not 0");
  assert.equal(v.spendTracking, "not-enabled", "no measured cost anywhere → tracking not enabled");
  const text = renderCostText(v && { source: "fixture", budget: BUDGET, runs: [{ label: "run-a", prs: [{ number: 139, title: "x" }] }] });
  assert.ok(text.includes("not measured"), "text says 'not measured' out loud");
  assert.ok(!/\$0\.00/.test(text), "an unmeasured cost must NOT appear as $0.00");
});

check("a REAL zero is distinct from unmeasured (0.00 shows, null says not measured)", () => {
  const v = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [{ label: "free-run", cost_usd: 0, prs: [{ number: 1, title: "docs", cost_usd: 0 }] }],
  });
  assert.equal(v.runs[0].cost, 0);
  assert.equal(v.runs[0].costMeasured, true, "a measured $0.00 is measured, not unknown");
  assert.equal(v.spendTracking, "measured");
  assert.equal(fmtMoney(v.runs[0].cost), "$0.00");
});

check("measured total sums ONLY measured runs and is flagged PARTIAL when any run is unmeasured", () => {
  const v = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [
      { label: "r1", cost_usd: 10 },
      { label: "r2" }, // unmeasured — must NOT be counted as 0
      { label: "r3", cost_usd: 5 },
    ],
  });
  assert.equal(v.totalMeasuredSpend, 15, "unmeasured run must not add 0 into a 'complete' total");
  assert.equal(v.measuredRunCount, 2);
  assert.equal(v.totalRunCount, 3);
  assert.equal(v.allRunsMeasured, false);
  assert.equal(v.totalIsPartial, true, "the total is a floor, flagged partial");
  assert.equal(v.budgetStatus, "partial");
});

check("'within budget' is claimed ONLY when every run is measured AND the total is under limit", () => {
  const within = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [{ label: "r1", cost_usd: 10 }, { label: "r2", cost_usd: 20 }],
  });
  assert.equal(within.allRunsMeasured, true);
  assert.equal(within.totalMeasuredSpend, 30);
  assert.equal(within.budgetStatus, "within", "fully measured and under $50 → within");
  assert.ok(Math.abs(within.percentOfLimit - 60) < 1e-9);

  const partialUnderLimit = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [{ label: "r1", cost_usd: 10 }, { label: "r2" }],
  });
  assert.equal(partialUnderLimit.budgetStatus, "partial",
    "a partial total under the limit must NOT be flattered to 'within'");
});

check("over-limit is surfaced as 'over' (red), never softened", () => {
  const v = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [{ label: "r1", cost_usd: 40 }, { label: "r2", cost_usd: 30 }],
  });
  assert.equal(v.totalMeasuredSpend, 70);
  assert.equal(v.budgetStatus, "over");
  assert.ok(v.percentOfLimit > 100);
});

check("no declared limit → 'no-limit', never assumed unlimited or assumed zero", () => {
  const noLimit = deriveCostView({
    source: "live",
    budget: { schema_version: "1.0.0", enforcement: "policy-display-only" },
    runs: [{ label: "r1", cost_usd: 5 }],
  });
  assert.equal(noLimit.budget.monthlyLimitUsd, null);
  assert.equal(noLimit.budgetStatus, "no-limit");
  assert.equal(noLimit.percentOfLimit, null, "no percent without a declared limit");
  const noBudget = deriveCostView({ source: "live", runs: [] });
  assert.equal(noBudget.budget.declared, false);
});

check("spend measured but not comparable: limit present, zero measured → 'unmeasured'", () => {
  const v = deriveCostView({
    source: "fixture", budget: BUDGET,
    runs: [{ label: "r1" }, { label: "r2" }],
  });
  assert.equal(v.spendTracking, "not-enabled");
  assert.equal(v.budgetStatus, "unmeasured", "cannot compare unmeasured spend to a limit");
});

check("per-PR costs roll up per run (measured count + measured-only sum)", () => {
  const v = deriveCostView({
    source: "live", budget: BUDGET,
    runs: [{ label: "r1", cost_usd: 9, prs: [
      { number: 139, title: "a", cost_usd: 4 },
      { number: 140, title: "b" }, // unmeasured
      { number: 141, title: "c", cost_usd: 5 },
    ] }],
  });
  const run = v.runs[0];
  assert.equal(run.prCount, 3);
  assert.equal(run.measuredPrCount, 2);
  assert.equal(run.allPrsMeasured, false);
  assert.equal(run.measuredPrCost, 9, "only measured PR costs are summed");
  assert.equal(run.prs[1].cost, null, "the unmeasured PR stays null, not 0");
});

check("deriveCostView is PURE — it does not mutate the snapshot", () => {
  const snap = { source: "live", budget: BUDGET, runs: [{ label: "r1", cost_usd: 1, prs: [{ number: 1, title: "t" }] }] };
  const snapshot = JSON.stringify(snap);
  deriveCostView(snap);
  assert.equal(JSON.stringify(snap), snapshot, "deriveCostView mutated the snapshot");
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveCostView(bad);
    assert.equal(v.runs.length, 0);
    assert.equal(v.totalMeasuredSpend, 0);
    assert.equal(v.spendTracking, "not-enabled");
    assert.equal(v.budget.declared, false);
  }
});

check("renderSurfaceHtml is a COMPLETE page embedding quota + spend + per-run/per-PR cost", () => {
  const html = renderSurfaceHtml({
    source: "fixture", budget: BUDGET,
    runs: [{ label: "run-2026-07-18", startedAt: "2026-07-18T12:00:00Z", prs: [{ number: 139, title: "feature lane" }] }],
  });
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Cost Display"), "has the surface heading");
  assert.ok(html.includes("Quota"), "has the quota section");
  assert.ok(html.includes("$50.00"), "shows the declared monthly limit");
  assert.ok(html.includes("Cost per PR"), "has the cost-per-PR breakdown");
  assert.ok(html.includes("#139"), "shows the PR number");
  assert.ok(html.includes("not measured"), "unmeasured cost shown honestly");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
});

check("HTML never renders an unmeasured cost as $0.00 (the seductive cost lie)", () => {
  const html = renderSurfaceHtml({
    source: "fixture", budget: BUDGET,
    runs: [{ label: "r1", prs: [{ number: 1, title: "t" }] }],
  });
  assert.ok(!/\$0\.00/.test(html), "no run/PR is unmeasured → the page must contain no $0.00");
  assert.ok(html.includes("not measured"));
});

check("content is injection-safe — a malicious run label / PR title is escaped, not executed", () => {
  const html = renderSurfaceHtml({
    source: "fixture", budget: BUDGET,
    runs: [{ label: '<script>x</script>', prs: [{ number: 7, title: 'evil"><img>' }] }],
  });
  assert.ok(!/<script>x<\/script>/.test(html), "the injected script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"), "the label is escaped");
  assert.ok(html.includes("evil&quot;&gt;&lt;img&gt;"), "the PR title is escaped");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const snap = { source: "fixture", budget: BUDGET, runs: [{ label: "r1", cost_usd: 1.5, prs: [{ number: 1, title: "t", cost_usd: 1.5 }] }] };
  assert.equal(renderSurfaceHtml(snap), renderSurfaceHtml(snap));
  assert.equal(renderCostText(snap), renderCostText(snap));
  assert.equal(renderSurfaceText(snap), renderCostText(snap), "surface text is the cost text");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("cost-display.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `surface imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `surface contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "surface must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (rendered page): no script/form/button/input/on*/href/anchor; states read-only", () => {
  const html = renderSurfaceHtml({ source: "fixture", budget: BUDGET, runs: [{ label: "r1", cost_usd: 2 }] });
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link (<a href>)");
  assert.ok(!/<a[\s>]/i.test(html), "no anchor element at all");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("NO ACT EDGE (export scan): every exported function is read-only-named", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|charge|pay|spend|refund|mintToken|token)/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set([
    "deriveCostView", "fmtMoney", "renderCostHtml", "renderCostText",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-COST-DISPLAY-SELFTEST: PASS (${pass} checks)`);
