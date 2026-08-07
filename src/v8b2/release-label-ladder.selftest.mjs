// FounderGate V8-B VB2 — RELEASE LABEL LADDER surface proof: the current label is placed on the
// ladder honestly (never assumed "dev"), the ladder rungs come from the release-label schema, the
// transition history is shown exactly as given (order preserved, missing metadata said out loud,
// jumps / step-downs / off-ladder moves classified honestly), and the surface has grown NO act
// edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as surface from "./release-label-ladder.mjs";
import {
  deriveLadderView, rungOf, renderLadderText, renderLadderHtml,
  renderSurfaceHtml, renderSurfaceText, LADDER, RELEASE_LABEL_LADDER_VERSION,
} from "./release-label-ladder.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// The REAL committed release-label schema enum — the authority for the ladder rungs — and the
// REAL committed release label the V8-A1 dashboard reads.
const SCHEMA = JSON.parse(
  readFileSync(join(HERE, "..", "v8a1", "schemas", "release_label.schema.json"), "utf8")
);
const REAL_LABEL = JSON.parse(
  readFileSync(join(HERE, "..", "v8a1", "fixture", "mock-project", ".foundergate", "release_label.json"), "utf8")
);

console.log("== VB2 Release Label Ladder — surface ==");

check("the ladder rungs are EXACTLY the schema enum minus the off-ladder UNKNOWN sentinel", () => {
  const enumLabels = SCHEMA.properties.label.enum;
  assert.deepEqual([...LADDER], enumLabels.filter((l) => l !== "UNKNOWN"),
    "the ladder must be the schema enum in order, minus UNKNOWN");
  assert.deepEqual([...LADDER], ["dev", "preview", "internal", "release"]);
});

check("rungOf places a label on its 1-based rung; off-ladder labels get null, never a coerced rung", () => {
  assert.equal(rungOf("dev"), 1);
  assert.equal(rungOf("preview"), 2);
  assert.equal(rungOf("internal"), 3);
  assert.equal(rungOf("release"), 4);
  assert.equal(rungOf("UNKNOWN"), null, "UNKNOWN is off the ladder");
  assert.equal(rungOf("nonsense"), null, "an unrecognised label is off the ladder");
  assert.equal(rungOf(""), null);
  assert.equal(rungOf(undefined), null);
  assert.equal(rungOf(42), null, "a non-string is never coerced to rung 1");
});

check("THE CENTRAL HONESTY: no declared label is 'not declared', NEVER assumed 'dev' (rung 1)", () => {
  const v = deriveLadderView({ source: "fixture" }); // no release object at all
  assert.equal(v.current.declared, false);
  assert.equal(v.current.label, "UNKNOWN");
  assert.equal(v.current.rung, null, "an undeclared label is placed on NO rung");
  assert.equal(v.current.onLadder, false);
  assert.equal(v.rungs.every((r) => r.state === "unplaced"), true, "no rung is 'current' when nothing is declared");
  const text = renderLadderText({ source: "fixture" });
  assert.ok(text.includes("no release label declared"), "text says it out loud");
  assert.ok(!/rung 1 of 4/.test(text), "an undeclared label must NOT be placed on rung 1");
});

check("the REAL committed label flows through and is carried as a MOCK truth-label", () => {
  const v = deriveLadderView({ source: "fixture", release: REAL_LABEL });
  assert.equal(v.current.label, "dev");
  assert.equal(v.current.rung, 1);
  assert.equal(v.current.onLadder, true);
  assert.equal(v.current.isTop, false);
  assert.equal(v.current.mock, true, "the committed label is mock:true — carried, not dropped");
  assert.equal(v.current.stage, REAL_LABEL.stage);
  const text = renderLadderText({ source: "fixture", release: REAL_LABEL });
  assert.ok(/MOCK/i.test(text), "the mock truth-label is surfaced");
});

check("an off-ladder declared label (UNKNOWN / unrecognised) is said to be off the ladder, not coerced", () => {
  const v = deriveLadderView({ source: "live", release: { label: "UNKNOWN" } });
  assert.equal(v.current.declared, true, "the label IS declared — it is just off the ladder");
  assert.equal(v.current.onLadder, false);
  assert.equal(v.current.rung, null);
  assert.equal(v.rungs.every((r) => r.state === "unplaced"), true);
  const weird = deriveLadderView({ source: "live", release: { label: "hotfix" } });
  assert.equal(weird.current.onLadder, false, "an unrecognised label is off the ladder, not mapped to a rung");
});

check("rung states are passed / current / ahead relative to the current label", () => {
  const v = deriveLadderView({ source: "live", release: { label: "internal" } }); // rung 3
  const byName = Object.fromEntries(v.rungs.map((r) => [r.name, r.state]));
  assert.equal(byName.dev, "passed");
  assert.equal(byName.preview, "passed");
  assert.equal(byName.internal, "current");
  assert.equal(byName.release, "ahead");
  assert.equal(v.current.isTop, false);
  const top = deriveLadderView({ source: "live", release: { label: "release" } });
  assert.equal(top.current.isTop, true, "release is the top rung");
});

check("transition history is preserved in the GIVEN order — timestamps are never parsed to re-sort", () => {
  const v = deriveLadderView({
    source: "live", release: { label: "internal" },
    history: [
      { from: "preview", to: "internal", at: "2026-01-01T00:00:00Z" }, // earlier ts, given 1st
      { from: "dev", to: "preview", at: "2026-06-06T00:00:00Z" },      // later ts, given 2nd
    ],
  });
  assert.equal(v.history.length, 2);
  assert.deepEqual(v.history.map((h) => `${h.from}->${h.to}`), ["preview->internal", "dev->preview"],
    "order must be exactly as given, NOT re-sorted by timestamp");
});

check("transition directions are classified honestly — promotion / jump / demotion / lateral / off-ladder", () => {
  const v = deriveLadderView({
    source: "live", release: { label: "release" },
    history: [
      { from: "dev", to: "preview" },      // +1 -> promotion
      { from: "preview", to: "release" },  // +2 -> jump (internal skipped)
      { from: "release", to: "internal" }, // down -> demotion
      { from: "internal", to: "internal" },// same -> lateral
      { from: "internal", to: "UNKNOWN" }, // endpoint off-ladder -> off-ladder
    ],
  });
  assert.deepEqual(v.history.map((h) => h.kind),
    ["promotion", "jump", "demotion", "lateral", "off-ladder"]);
  assert.equal(v.jumpCount, 1);
  assert.equal(v.demotionCount, 1);
  assert.equal(v.offLadderCount, 1);
});

check("a missing timestamp / actor is 'not recorded', never fabricated", () => {
  const v = deriveLadderView({
    source: "live", release: { label: "preview" },
    history: [{ from: "dev", to: "preview" }], // no `at`, no `by`
  });
  assert.equal(v.history[0].at, null);
  assert.equal(v.history[0].by, null);
  const text = renderLadderText({ source: "live", release: { label: "preview" }, history: [{ from: "dev", to: "preview" }] });
  assert.ok(text.includes("not recorded"), "the missing metadata is said out loud");
});

check("an empty / absent history is 'no transition history recorded' — never a manufactured path", () => {
  const v = deriveLadderView({ source: "fixture", release: REAL_LABEL });
  assert.equal(v.historyCount, 0);
  const text = renderLadderText({ source: "fixture", release: REAL_LABEL });
  assert.ok(/no transition history recorded/i.test(text));
  // No per-transition rows are manufactured: a rendered transition always carries a "When:" line,
  // so its absence proves the empty history did not sprout a fabricated dev→…→current path.
  assert.ok(!/When:/.test(text), "no dev→…→current path is manufactured for an empty history");
});

check("a history that does not end at the current label is flagged as a MISMATCH, not reconciled", () => {
  const v = deriveLadderView({
    source: "live", release: { label: "release" },
    history: [{ from: "dev", to: "preview" }], // ends at preview, current is release
  });
  assert.ok(v.historyMismatch, "the mismatch is surfaced");
  assert.equal(v.historyMismatch.historyEndsAt, "preview");
  assert.equal(v.historyMismatch.currentLabel, "release");
  assert.equal(v.historyEndsAtCurrent, false);
  const agree = deriveLadderView({
    source: "live", release: { label: "preview" },
    history: [{ from: "dev", to: "preview" }],
  });
  assert.equal(agree.historyMismatch, null);
  assert.equal(agree.historyEndsAtCurrent, true);
});

check("deriveLadderView is PURE — it does not mutate the snapshot", () => {
  const snap = { source: "live", release: { label: "preview", mock: false }, history: [{ from: "dev", to: "preview", at: "t", by: "founder" }] };
  const snapshot = JSON.stringify(snap);
  deriveLadderView(snap);
  assert.equal(JSON.stringify(snap), snapshot, "deriveLadderView mutated the snapshot");
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveLadderView(bad);
    assert.equal(v.current.declared, false);
    assert.equal(v.current.rung, null);
    assert.equal(v.history.length, 0);
    assert.equal(v.source, "UNKNOWN");
    assert.deepEqual([...v.ladder], ["dev", "preview", "internal", "release"]);
  }
});

check("source truth-label is carried and never conflated (live vs fixture vs unknown)", () => {
  assert.equal(deriveLadderView({ source: "fixture" }).source, "fixture");
  assert.equal(deriveLadderView({ source: "live" }).source, "live");
  assert.equal(deriveLadderView({ source: "weird" }).source, "UNKNOWN", "unknown source said out loud");
  assert.equal(deriveLadderView({}).source, "UNKNOWN");
});

check("renderSurfaceHtml is a COMPLETE page embedding current label + ladder + history", () => {
  const html = renderSurfaceHtml({
    source: "fixture", release: REAL_LABEL,
    history: [
      { from: "dev", to: "preview", at: "2026-07-10T00:00:00Z", by: "founder", note: "first look" },
      { from: "preview", to: "dev", at: "2026-07-12T00:00:00Z", by: "founder" }, // back to dev = matches current
    ],
  });
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Release Label Ladder"), "has the surface heading");
  assert.ok(html.includes("Current label"), "has the current-label section");
  assert.ok(html.includes("The ladder"), "has the ladder section");
  assert.ok(html.includes("Transition history"), "has the history section");
  for (const rung of ["dev", "preview", "internal", "release"]) assert.ok(html.includes(rung), `shows rung ${rung}`);
  assert.ok(html.includes("mock"), "surfaces the mock truth-label");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
});

check("HTML never places an undeclared label on a rung (the seductive release lie)", () => {
  const html = renderSurfaceHtml({ source: "fixture" }); // nothing declared
  assert.ok(html.includes("not declared"), "says the label is not declared");
  assert.ok(!/rung 1 of 4/.test(html), "undeclared must not be shown as rung 1");
  assert.ok(html.includes("assumed to be the bottom rung"), "states the bottom rung is not assumed");
});

check("content is injection-safe — a malicious label / stage / actor is escaped, not executed", () => {
  const html = renderSurfaceHtml({
    source: "fixture",
    release: { label: "<script>x</script>", stage: 'evil"><img>', note: "<b>n</b>" },
    history: [{ from: "dev", to: "<script>y</script>", by: 'a"><img>', note: "<i>m</i>" }],
  });
  assert.ok(!/<script>x<\/script>/.test(html), "the injected label script tag must not appear raw");
  assert.ok(!/<script>y<\/script>/.test(html), "the injected `to` script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"), "the label is escaped");
  assert.ok(html.includes("evil&quot;&gt;&lt;img&gt;"), "the stage is escaped");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const snap = {
    source: "fixture", release: REAL_LABEL,
    history: [{ from: "dev", to: "preview", at: "2026-07-10T00:00:00Z", by: "founder" }],
  };
  assert.equal(renderSurfaceHtml(snap), renderSurfaceHtml(snap));
  assert.equal(renderLadderText(snap), renderLadderText(snap));
  assert.equal(renderSurfaceText(snap), renderLadderText(snap), "surface text is the ladder text");
  assert.equal(RELEASE_LABEL_LADDER_VERSION, "1.0.0");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("release-label-ladder.mjs");
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
  const html = renderSurfaceHtml({
    source: "fixture", release: REAL_LABEL,
    history: [{ from: "dev", to: "preview", at: "t", by: "founder" }],
  });
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
  // camelCase-boundary lookahead: an act word matches only as a COMPLETE leading token, so
  // `runReport` is still caught but the read-only `rungOf` (rung + Of) is not a false positive.
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|charge|pay|spend|refund|promote|demote|release|tag|cut|ship|mintToken|token)(?![a-z])/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set([
    "deriveLadderView", "rungOf", "renderLadderHtml", "renderLadderText",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-RELEASE-LABEL-LADDER-SELFTEST: PASS (${pass} checks)`);
