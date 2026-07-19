// FounderGate V8-B VB2 — FOUNDER HAND-BURDEN SCORE proof: the per-run score and the live
// scoring surface are HONEST (a score is a ratio that needs both sides proven; an empty run is
// UNSCORED, never a fake 100; a missing metric is UNKNOWN, never coerced), the trend surfaces a
// REGRESSION, the page is a complete read-only surface, and the module has grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UNKNOWN } from "./cto-queue.mjs";
import * as scorer from "./hand-burden-score.mjs";
import {
  SCORE_BAND, TREND,
  scoreRun, scoreSeries, handBurdenScore,
  renderScoreText, renderSeriesText,
  renderSurfaceHtml, renderSurfaceText,
} from "./hand-burden-score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A fully-measured "zero founder hand-ops" run in which the harness DID prove autonomous work:
// 0 founder operations, 3 suppressed gates + 3 autonomous routine actions. This is the run that
// deserves a perfect score.
function autonomousRun() {
  return {
    founder_clicks: 0, founder_terminal_actions: 0,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    founder_prompts_provided: 3, founder_signatures_provided: 0,
    false_founder_gates_suppressed: ["merge #162", "merge #163", "close superseded PRs"],
    routine_actions_completed_autonomously: ["merge #162", "selftests", "ARLC build+fix"],
  };
}
// A fully-measured run where the founder had to carry some hands-on work.
function assistedRun() {
  return {
    founder_clicks: 2, founder_terminal_actions: 1,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    founder_prompts_provided: 1, founder_signatures_provided: 0,
    false_founder_gates_suppressed: ["a"],
    routine_actions_completed_autonomously: ["b", "c", "d", "e", "f", "g"], // 6 autonomous, 3 hand → 6/9 = 67
  };
}

console.log("== VB2 Founder Hand-Burden Score — per-run score + live scoring surface ==");

// ── per-run score ────────────────────────────────────────────────────────────────────────────

check("scoreRun: zero hand-ops WITH proven autonomous work scores a perfect 100 → FULLY_AUTONOMOUS", () => {
  const s = scoreRun(autonomousRun());
  assert.equal(s.hand_ops, 0);
  assert.equal(s.autonomous_ops, 6, "3 suppressed gates + 3 autonomous routine actions");
  assert.equal(s.score, 100);
  assert.equal(s.band, "FULLY_AUTONOMOUS");
});

check("scoreRun: mixed run scores the harness's SHARE of the operations", () => {
  const s = scoreRun(assistedRun());
  assert.equal(s.hand_ops, 3, "2 clicks + 1 terminal action");
  assert.equal(s.autonomous_ops, 7, "1 suppressed gate + 6 autonomous routine actions");
  assert.equal(s.score, 70, "round(100 * 7 / 10)");
  assert.equal(s.band, "ASSISTED");
});

check("THE CORE HONESTY PROOF: an EMPTY run (no operations at all) is UNSCORED, never a fake 100", () => {
  // Every burden field present and 0, but the harness ALSO did nothing (no gates, no routine).
  // A raw count would call this "zero hand-burden"; a score must not mint autonomy from nothing.
  const s = scoreRun({
    founder_clicks: 0, founder_terminal_actions: 0,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    false_founder_gates_suppressed: [], routine_actions_completed_autonomously: [],
  });
  assert.equal(s.hand_ops, 0, "founder hand-ops genuinely zero");
  assert.equal(s.autonomous_ops, 0, "but no autonomous work was proven either");
  assert.equal(s.score, UNKNOWN, "no operations at all → no evidence of autonomy → UNKNOWN, not 100");
  assert.equal(s.band, UNKNOWN);
  assert.notEqual(s.score, 100, "must NEVER award a perfect score to an empty run");
});

check("scoreRun: a MISSING founder burden field makes the score UNKNOWN (can't score burden you didn't measure)", () => {
  const s = scoreRun({
    founder_clicks: 0, founder_terminal_actions: 0, founder_debugging_actions: 0, // raw_log_reviews absent
    false_founder_gates_suppressed: ["a"], routine_actions_completed_autonomously: ["b"],
  });
  assert.equal(s.hand_ops, UNKNOWN, "an absent burden field poisons hand-ops");
  assert.equal(s.score, UNKNOWN, "a ratio with an unknown side is UNKNOWN");
  assert.equal(s.band, UNKNOWN);
});

check("scoreRun: a MISSING avoided-burden metric makes the score UNKNOWN (can't credit autonomy you didn't measure)", () => {
  const s = scoreRun({
    founder_clicks: 0, founder_terminal_actions: 0,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    routine_actions_completed_autonomously: ["b"], // false_founder_gates_suppressed absent
  });
  assert.equal(s.hand_ops, 0);
  assert.equal(s.autonomous_ops, UNKNOWN, "one absent avoided-metric poisons autonomous_ops");
  assert.equal(s.score, UNKNOWN, "you cannot claim autonomy over an unmeasured half");
});

check("scoreRun: no metrics at all → everything UNKNOWN (degrades, never throws)", () => {
  const s = scoreRun(undefined);
  assert.equal(s.hand_ops, UNKNOWN);
  assert.equal(s.autonomous_ops, UNKNOWN);
  assert.equal(s.score, UNKNOWN);
  assert.equal(s.band, UNKNOWN);
});

check("scoreRun: direction (prompts/signatures) is NEVER counted into the score", () => {
  const withDirection = { ...autonomousRun(), founder_prompts_provided: 99, founder_signatures_provided: 42 };
  assert.equal(scoreRun(withDirection).score, 100, "direction must not change the score");
  assert.deepEqual(scoreRun(withDirection).direction, { founder_prompts_provided: 99, founder_signatures_provided: 42 });
});

check("scoreRun: a run the founder carried entirely scores 0 → FOUNDER_CARRIED_ALL", () => {
  const s = scoreRun({
    founder_clicks: 4, founder_terminal_actions: 1, founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    false_founder_gates_suppressed: [], routine_actions_completed_autonomously: [],
  });
  assert.equal(s.hand_ops, 5);
  assert.equal(s.autonomous_ops, 0);
  assert.equal(s.score, 0);
  assert.equal(s.band, "FOUNDER_CARRIED_ALL");
});

check("scoreRun band boundaries: 80 is NEAR_AUTONOMOUS, 49 is FOUNDER_OPERATED, 1 is not zero", () => {
  // 8 autonomous / 2 hand → 80.
  const near = scoreRun({ founder_clicks: 2, founder_terminal_actions: 0, founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    false_founder_gates_suppressed: ["a"], routine_actions_completed_autonomously: ["b","c","d","e","f","g","h"] });
  assert.equal(near.score, 80);
  assert.equal(near.band, "NEAR_AUTONOMOUS");
  // 49/51 → founder-operated.
  const lowScore = scoreRun({ founder_clicks: 51, founder_terminal_actions: 0, founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    false_founder_gates_suppressed: [], routine_actions_completed_autonomously: new Array(49).fill("x") });
  assert.equal(lowScore.score, 49);
  assert.equal(lowScore.band, "FOUNDER_OPERATED");
});

// ── live scoring surface (series) ──────────────────────────────────────────────────────────────

check("scoreSeries aggregates latest/best/worst/average over scored runs", () => {
  const d = scoreSeries([
    { run_id: "r1", at: "2026-07-16", metrics: assistedRun() },   // 70
    { run_id: "r2", at: "2026-07-17", metrics: autonomousRun() }, // 100
  ]);
  assert.equal(d.total, 2);
  assert.equal(d.scored, 2);
  assert.equal(d.latest, 100);
  assert.equal(d.best, 100);
  assert.equal(d.worst, 70);
  assert.equal(d.average, 85, "round((70 + 100) / 2)");
});

check("scoreSeries TREND: a rising score is IMPROVING (hand-burden falling), with the right delta", () => {
  const d = scoreSeries([
    { run_id: "r1", metrics: assistedRun() },   // 70
    { run_id: "r2", metrics: autonomousRun() }, // 100
  ]);
  assert.equal(d.trend, "IMPROVING");
  assert.equal(d.delta, 30);
  assert.equal(d.regressed, false);
});

check("THE REGRESSION PROOF: a falling score is REGRESSING (founder hand-burden ROSE) and is flagged", () => {
  const d = scoreSeries([
    { run_id: "r1", metrics: autonomousRun() }, // 100
    { run_id: "r2", metrics: assistedRun() },   // 70
  ]);
  assert.equal(d.trend, "REGRESSING");
  assert.equal(d.delta, -30);
  assert.equal(d.regressed, true, "a regression must be raised as its own fact");
});

check("scoreSeries trend skips OVER an unscored run to the two most recent SCORED runs", () => {
  const d = scoreSeries([
    { run_id: "r1", metrics: assistedRun() },   // 70   (scored)
    { run_id: "r2", metrics: undefined },       // UNKNOWN (unscored — must not define the trend)
    { run_id: "r3", metrics: autonomousRun() }, // 100  (scored)
  ]);
  assert.equal(d.scored, 2);
  assert.equal(d.trend, "IMPROVING", "trend compares r1(70) → r3(100), skipping the unscored r2");
  assert.equal(d.delta, 30);
});

check("scoreSeries counts an unscored run but excludes it from best/worst/average (stated via scored/total)", () => {
  const d = scoreSeries([
    { run_id: "r1", metrics: autonomousRun() }, // 100
    { run_id: "r2", metrics: undefined },       // UNKNOWN
  ]);
  assert.equal(d.total, 2, "the unscored run is counted, never dropped");
  assert.equal(d.scored, 1);
  assert.equal(d.average, 100, "average is over scored runs only");
  assert.equal(d.latest, UNKNOWN, "latest honestly reflects the most recent run even when unscored");
});

check("scoreSeries: fewer than two scored runs → trend UNKNOWN (never guessed)", () => {
  assert.equal(scoreSeries([{ run_id: "r1", metrics: autonomousRun() }]).trend, UNKNOWN);
  assert.equal(scoreSeries([]).trend, UNKNOWN);
  assert.equal(scoreSeries([]).average, UNKNOWN, "no scored runs → average UNKNOWN, not 0");
});

check("scoreSeries total_hand_ops is an HONEST sum: one unknown run poisons the total to UNKNOWN", () => {
  const known = scoreSeries([
    { run_id: "r1", metrics: assistedRun() },   // hand_ops 3
    { run_id: "r2", metrics: autonomousRun() }, // hand_ops 0
  ]);
  assert.equal(known.total_hand_ops, 3);
  const poisoned = scoreSeries([
    { run_id: "r1", metrics: assistedRun() },
    { run_id: "r2", metrics: { founder_clicks: 0 } }, // hand_ops UNKNOWN
  ]);
  assert.equal(poisoned.total_hand_ops, UNKNOWN, "a run with unknown hand-ops makes the total UNKNOWN");
});

check("scoreSeries is PURE — it does not mutate the input", () => {
  const input = [{ run_id: "r1", metrics: assistedRun() }];
  const snapshot = JSON.stringify(input);
  scoreSeries(input);
  assert.equal(JSON.stringify(input), snapshot, "series mutated its input");
});

check("handBurdenScore composes the series and a matching headline", () => {
  const d = handBurdenScore({ runs: [
    { run_id: "r1", metrics: assistedRun() },
    { run_id: "r2", metrics: autonomousRun() },
  ] });
  assert.equal(d.headline.latest_score, 100);
  assert.equal(d.headline.latest_band, "FULLY_AUTONOMOUS");
  assert.equal(d.headline.average_score, 85);
  assert.equal(d.headline.trend, "IMPROVING");
  assert.equal(d.headline.runs_scored, 2);
  assert.equal(d.headline.runs_total, 2);
});

// ── surface ──────────────────────────────────────────────────────────────────────────────────

const seededSurface = () => ({ runs: [
  { run_id: "v8b-nightshift", at: "2026-07-16", metrics: assistedRun() },
  { run_id: "v8b-wave-2", at: "2026-07-18", metrics: autonomousRun() },
] });

check("renderSurfaceHtml is a COMPLETE page embedding the score card and the history", () => {
  const html = renderSurfaceHtml(seededSurface());
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "well-formed document");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Founder hand-burden score"), "carries the title");
  assert.ok(html.includes("Score history"), "embeds the history section");
  assert.ok(html.includes("v8b-nightshift") && html.includes("v8b-wave-2"), "embeds real run records");
});

check("THE CRITICAL PROOF: the surface page has NO act affordance (no script/form/button/input/handler/link)", () => {
  const html = renderSurfaceHtml(seededSurface());
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("the surface escapes record content — a hostile run_id can't become markup", () => {
  const html = renderSurfaceHtml({ runs: [
    { run_id: '<b>x</b> & "y"', at: "t", metrics: autonomousRun() },
  ] });
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<b>x</b>"), "raw markup must not appear");
});

check("an UNKNOWN score is stated out loud on the surface, never rendered as a clean 100", () => {
  const text = renderSurfaceText({ runs: [{ run_id: "empty", at: "t", metrics: {
    founder_clicks: 0, founder_terminal_actions: 0, founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    false_founder_gates_suppressed: [], routine_actions_completed_autonomously: [],
  } }] });
  assert.ok(/Unscored/i.test(text), "the surface says the score is unscored");
  assert.ok(!/100\/100/.test(text), "must NOT award a perfect score to an empty run");
});

check("the surface names a REGRESSION out loud when the score falls", () => {
  const text = renderSurfaceText({ runs: [
    { run_id: "r1", at: "t1", metrics: autonomousRun() }, // 100
    { run_id: "r2", at: "t2", metrics: assistedRun() },   // 70
  ] });
  assert.ok(/Regressing/i.test(text), "a regression is stated plainly for the founder");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const s = seededSurface();
  assert.equal(renderSurfaceHtml(s), renderSurfaceHtml(s));
  assert.equal(renderSurfaceText(s), renderSurfaceText(s));
  assert.equal(renderSeriesText(s), renderSeriesText(s));
  assert.equal(renderScoreText(autonomousRun()), renderScoreText(autonomousRun()));
});

check("exported enums are frozen and complete (SCORE_BAND / TREND include UNKNOWN)", () => {
  assert.ok(Object.isFrozen(SCORE_BAND) && Object.isFrozen(TREND));
  assert.ok(SCORE_BAND.includes(UNKNOWN) && SCORE_BAND.includes("FULLY_AUTONOMOUS"));
  assert.ok(TREND.includes(UNKNOWN) && TREND.includes("REGRESSING") && TREND.includes("IMPROVING"));
});

// ── no act edge (structural scans) ─────────────────────────────────────────────────────────────

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("hand-burden-score.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `scorer imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "Math.random", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `scorer contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "scorer must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|mintToken|token)/i;
  const allowed = new Set([
    "scoreRun", "scoreSeries", "handBurdenScore",
    "renderScoreText", "renderScoreHtml",
    "renderSeriesText", "renderSeriesHtml",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  const names = Object.keys(scorer).filter((k) => typeof scorer[k] === "function");
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on scorer: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `scorer export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-HAND-BURDEN-SCORE-SELFTEST: PASS (${pass} checks)`);
