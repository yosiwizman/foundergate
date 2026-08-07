// FounderGate V8-B VB2 — PROJECT BENCH proof: a project's result is DERIVED from its run
// timeline (latest run wins, never a supplied flag), a pass-then-fail project is surfaced as a
// REGRESSION, an out-of-enum / no-run project is UNKNOWN (never coerced to PROVEN), data-class
// redaction flows through, the page is a complete read-only surface, and the module has grown
// NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REDACTED, UNKNOWN } from "./cto-queue.mjs";
import * as projectBenchMod from "./project-bench.mjs";
import {
  STATUS,
  projectRecord, projectBench,
  renderProjectRecordText, renderProjectBenchText,
  renderProjectRecordHtml, renderProjectBenchHtml, renderProjectBenchSurfaceHtml,
} from "./project-bench.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A representative per-project snapshot — every field is DATA the caller supplies (no clock).
// `at` is an inert display string; runs are chronological oldest → newest.
function seededProjects() {
  return [
    {
      id: "prj_akior", name: "AKIOR", data_class: "INTERNAL",
      runs: [
        { run_id: "run-1", result: "PASS", at: "2026-07-10T00:00:00Z" },
        { run_id: "run-2", result: "PASS", at: "2026-07-12T00:00:00Z" },
        { run_id: "run-3", result: "PASS", at: "2026-07-14T00:00:00Z" },
      ],
      components: [
        { id: "cto-queue-surface", name: "CTO queue surface", selftest: "cto-queue-surface.selftest.mjs", result: "PASS", checks: 13 },
        { id: "lane-router", name: "Lane router", selftest: "lane-router.selftest.mjs", result: "PASS", checks: 22 },
      ],
    },
    {
      id: "prj_reg", name: "Public demo", data_class: "PUBLIC",
      runs: [
        { run_id: "run-1", result: "PASS", at: "2026-07-09T00:00:00Z" },
        { run_id: "run-2", result: "FAIL", at: "2026-07-13T00:00:00Z" },
      ],
      components: [],
    },
    {
      id: "prj_new", name: "Not started", data_class: "PUBLIC", runs: [], components: [],
    },
  ];
}

console.log("== VB2 Project Bench — per-project result ledger (timeline-derived) ==");

// ── result is DERIVED from the timeline, not declared ────────────────────────────────────

check("projectRecord DERIVES status from the LATEST run — the last run wins", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "FAIL", at: "1" }, { run_id: "b", result: "PASS", at: "2" }],
  });
  assert.equal(r.current, "PASS", "current is the last run's result");
  assert.equal(r.previous, "FAIL", "previous is the second-to-last run's result");
  assert.equal(r.status, "PROVEN", "latest PASS -> PROVEN");
});

check("THE HONESTY PROOF: a project with NO runs is UNKNOWN, never coerced to PROVEN", () => {
  const r = projectRecord({ id: "p", name: "P", data_class: "PUBLIC", runs: [] });
  assert.equal(r.status, UNKNOWN, "no runs -> UNKNOWN status");
  assert.equal(r.current, UNKNOWN);
  assert.notEqual(r.status, "PROVEN", "an unrun project must never read as proven");
  assert.equal(projectRecord({ id: "p" }).status, UNKNOWN, "missing runs array degrades to UNKNOWN, not a throw");
});

check("a supplied top-level result flag is IGNORED — only the run timeline decides", () => {
  // A caller hands us a flattering result:"PASS", but the latest actual run FAILED.
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC", result: "PASS",
    runs: [{ run_id: "a", result: "PASS", at: "1" }, { run_id: "b", result: "FAIL", at: "2" }],
  });
  assert.equal(r.status, "FAILED", "a stale supplied PASS cannot override a failed latest run");
});

check("an out-of-enum run result is UNKNOWN, never a made-up PASS (Law 54)", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "green", at: "1" }],
  });
  assert.equal(r.runs[0].result, UNKNOWN, "a non-enum result normalises to UNKNOWN");
  assert.equal(r.by_result[UNKNOWN], 1);
  assert.equal(r.by_result.PASS, 0, "a bogus 'green' must NEVER become PASS");
  assert.equal(r.status, UNKNOWN);
});

// ── regression / recovery — the thing a flat roster cannot show ──────────────────────────

check("REGRESSION: latest run FAILED but an earlier run PASSED -> regression=true", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "PASS", at: "1" }, { run_id: "b", result: "FAIL", at: "2" }],
  });
  assert.equal(r.status, "FAILED");
  assert.equal(r.regression, true, "worked before, broken now -> regression");
  assert.equal(r.recovered, false);
});

check("a project that only ever failed is NOT a regression (it never worked to break)", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "FAIL", at: "1" }, { run_id: "b", result: "FAIL", at: "2" }],
  });
  assert.equal(r.regression, false, "no prior PASS means no regression");
});

check("RECOVERY: latest run PASSED but an earlier run FAILED -> recovered=true (good news is a fact too)", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "FAIL", at: "1" }, { run_id: "b", result: "PASS", at: "2" }],
  });
  assert.equal(r.recovered, true);
  assert.equal(r.regression, false);
});

check("pass_streak counts trailing consecutive PASSes and resets to 0 the moment the latest run is not a pass", () => {
  const green = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "FAIL", at: "1" }, { run_id: "b", result: "PASS", at: "2" }, { run_id: "c", result: "PASS", at: "3" }],
  });
  assert.equal(green.pass_streak, 2, "two trailing passes");
  const broken = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC",
    runs: [{ run_id: "a", result: "PASS", at: "1" }, { run_id: "b", result: "FAIL", at: "2" }],
  });
  assert.equal(broken.pass_streak, 0, "latest not a pass -> streak 0");
});

// ── per-project deliverable proof (reuses the frozen component ledger) ────────────────────

check("deliverables reuse the component ledger: proven counts PASS deliverables, checks behind proven only", () => {
  const r = projectRecord({
    id: "p", name: "P", data_class: "PUBLIC", runs: [{ run_id: "a", result: "PASS", at: "1" }],
    components: [
      { id: "c1", name: "C1", result: "PASS", checks: 5 },
      { id: "c2", name: "C2", result: "FAIL", checks: 3 },
      { id: "c3", name: "C3", result: UNKNOWN },
    ],
  });
  assert.equal(r.deliverables.total, 3);
  assert.equal(r.deliverables.proven, 1);
  assert.equal(r.deliverables.unproven, 2, "FAIL and UNKNOWN are both unproven");
  assert.equal(r.deliverables.checks_proven, 5, "only the PASS deliverable's checks count");
});

// ── rollup ───────────────────────────────────────────────────────────────────────────────

check("projectBench rollup: by_status buckets are present, zero-filled, and sum to total", () => {
  const b = projectBench(seededProjects());
  assert.equal(b.total, 3);
  assert.equal(b.by_status.PROVEN, 1);
  assert.equal(b.by_status.FAILED, 1);
  assert.equal(b.by_status[UNKNOWN], 1);
  const sum = STATUS.reduce((n, s) => n + b.by_status[s], 0);
  assert.equal(sum, b.total, "status buckets must sum to the total");
  assert.equal(b.regressed, 1, "exactly the pass->fail project is regressed");
  assert.equal(b.headline.projects_regressed, 1);
});

check("projectBench on empty / non-array input degrades to an all-zero rollup, never throws", () => {
  const b = projectBench(undefined);
  assert.equal(b.total, 0);
  assert.equal(b.regressed, 0);
  for (const s of STATUS) assert.equal(b.by_status[s], 0);
});

check("projectBench is PURE — it does not mutate the input array or its records", () => {
  const input = seededProjects();
  const snapshot = JSON.stringify(input);
  projectBench(input);
  assert.equal(JSON.stringify(input), snapshot, "bench mutated its input");
});

// ── data-class redaction (frozen cto-queue law) ──────────────────────────────────────────

check("a protected project's NAME is redacted but its result, history and regression stay visible", () => {
  const r = projectRecord({
    id: "prj_secret", name: "Confidential Client X", data_class: "SECRET",
    runs: [{ run_id: "a", result: "PASS", at: "1" }, { run_id: "b", result: "FAIL", at: "2" }],
  });
  assert.equal(r.protected, true);
  assert.equal(r.name, REDACTED, "protected project name is redacted");
  assert.equal(r.status, "FAILED", "result is a structural fact — still shown");
  assert.equal(r.regression, true, "regression is a fact — still shown");
  assert.equal(r.runs.length, 2, "timeline shape is a fact — still shown");
});

check("redaction flows through the TEXT surface — a protected name never appears in the clear", () => {
  const text = renderProjectBenchText([
    { id: "prj_secret", name: "TopSecret Client Name", data_class: "BLOCKED", runs: [{ run_id: "a", result: "PASS", at: "1" }] },
  ]);
  assert.ok(!text.includes("TopSecret Client Name"), "protected name leaked into text");
  assert.ok(text.includes(REDACTED), "text shows the redaction marker instead");
  assert.ok(text.includes("Protected"), "text names the protected tally");
});

// ── surface (html) ───────────────────────────────────────────────────────────────────────

check("renderProjectBenchSurfaceHtml is a COMPLETE page embedding the rollup and project cards", () => {
  const html = renderProjectBenchSurfaceHtml(seededProjects());
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "well-formed document");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Project bench") || html.includes("Project Bench"), "titled");
  assert.ok(html.includes("AKIOR"), "embeds a real project");
  assert.ok(html.includes("Regressed"), "surfaces the regression tile");
});

check("THE CRITICAL PROOF: the surface page has NO act affordance (no script/form/button/input/handler/link)", () => {
  const html = renderProjectBenchSurfaceHtml(seededProjects());
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("the surface escapes record content — content can't become markup", () => {
  const html = renderProjectBenchSurfaceHtml([
    { id: '<b>id</b>', name: '<b>x</b> & "y"', data_class: "PUBLIC", runs: [{ run_id: "<i>r</i>", result: "PASS", at: "<u>t</u>" }] },
  ]);
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<b>x</b>"), "raw markup must not appear");
  assert.ok(!html.includes("<i>r</i>") && !html.includes("<u>t</u>"), "run fields escaped too");
});

check("data-class redaction flows THROUGH the full surface (protected name never in the clear)", () => {
  const hostile = [
    { id: "prj_x", name: "TopSecret Client Name", data_class: "SECRET", runs: [{ run_id: "a", result: "PASS", at: "1" }] },
  ];
  const html = renderProjectBenchSurfaceHtml(hostile);
  assert.ok(!html.includes("TopSecret Client Name"), "surface html leaked a protected name");
  assert.ok(html.includes(REDACTED), "surface shows the redaction marker instead");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const p = seededProjects();
  assert.equal(renderProjectBenchSurfaceHtml(p), renderProjectBenchSurfaceHtml(p));
  assert.equal(renderProjectBenchText(p), renderProjectBenchText(p));
  assert.equal(renderProjectBenchHtml(p), renderProjectBenchHtml(p));
});

check("the public per-record renderers agree with the bench (protected name stays redacted, no re-derive bug)", () => {
  const secret = { id: "prj_secret", name: "Confidential Client X", data_class: "SECRET", runs: [{ run_id: "a", result: "PASS", at: "1" }] };
  const text = renderProjectRecordText(secret);
  const html = renderProjectRecordHtml(secret);
  assert.ok(!text.includes("Confidential Client X") && !html.includes("Confidential Client X"), "single-record renderers must redact too");
  assert.ok(text.includes(REDACTED) && html.includes(REDACTED));
  // a public project renders its real name (redaction is targeted, not blanket)
  const open = renderProjectRecordText({ id: "prj_ok", name: "Open Project", data_class: "PUBLIC", runs: [{ run_id: "a", result: "PASS", at: "1" }] });
  assert.ok(open.includes("Open Project"), "a public project renders normally");
});

// ── no act edge (structural scans) ───────────────────────────────────────────────────────

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("project-bench.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `project-bench imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `project-bench contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "project-bench must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|mintToken|token)/i;
  const allowed = new Set([
    "projectRecord", "projectBench",
    "renderProjectRecordText", "renderProjectBenchText",
    "renderProjectRecordHtml", "renderProjectBenchHtml", "renderProjectBenchSurfaceHtml",
  ]);
  const names = Object.keys(projectBenchMod).filter((k) => typeof projectBenchMod[k] === "function");
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on project-bench: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `project-bench export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-PROJECT-BENCH-SELFTEST: PASS (${pass} checks)`);
