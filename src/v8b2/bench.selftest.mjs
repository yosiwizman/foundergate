// FounderGate V8-B VB2 — BENCH v1 proof: the two result ledgers and the hand-burden score
// are HONEST (zero-filled, UNKNOWN never faked to PASS, no "zero burden" over missing
// metrics), the page is a complete read-only surface, redaction flows through, and the
// module has grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REDACTED, UNKNOWN } from "./cto-queue.mjs";
import * as bench from "./bench.mjs";
import {
  RESULT, BURDEN_FIELDS, DIRECTION_FIELDS,
  componentLedger, projectLedger, burdenDigest, benchDigest,
  renderComponentLedgerText, renderProjectLedgerText, renderBurdenText,
  renderSurfaceHtml, renderSurfaceText,
} from "./bench.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A representative bench snapshot — every field is DATA the caller supplies (no clock).
function seededComponents() {
  return [
    { id: "cto-queue-surface", name: "CTO queue surface", selftest: "cto-queue-surface.selftest.mjs", result: "PASS", checks: 13 },
    { id: "lane-router", name: "Lane router", selftest: "lane-router.selftest.mjs", result: "PASS", checks: 22 },
    { id: "spec-card-engine", name: "Spec card engine", selftest: "spec-card.selftest.mjs", result: "FAIL", checks: 4 },
    { id: "evidence-viewer", name: "Evidence viewer", selftest: "evidence-viewer.selftest.mjs", result: UNKNOWN },
  ];
}
function seededProjects() {
  return [
    { id: "prj_akior", name: "AKIOR", result: "PASS", data_class: "INTERNAL", runs: 12 },
    { id: "prj_public", name: "Public demo", result: "FAIL", data_class: "PUBLIC", runs: 2 },
  ];
}
function seededBurden() {
  return {
    founder_clicks: 0, founder_terminal_actions: 0,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
    founder_prompts_provided: 3, founder_signatures_provided: 0,
    false_founder_gates_suppressed: ["merge #162", "merge #163", "close superseded PRs"],
    routine_actions_completed_autonomously: ["merge #162", "selftests", "ARLC build+fix"],
  };
}
const seededBench = () => ({ components: seededComponents(), projects: seededProjects(), burden: seededBurden() });

console.log("== VB2 Bench v1 — component+project ledger + hand-burden ==");

// ── component result ledger ──────────────────────────────────────────────────────────────

check("componentLedger on empty input is all-zero with every result bucket present (honest)", () => {
  const d = componentLedger([]);
  assert.equal(d.total, 0);
  assert.equal(d.proven, 0);
  assert.equal(d.unproven, 0);
  assert.equal(d.checks_proven, 0);
  for (const r of RESULT) assert.equal(d.by_result[r], 0, `result ${r} must be present and 0`);
  assert.equal(componentLedger(undefined).total, 0, "undefined input degrades to empty, not a throw");
});

check("componentLedger counts each result and sum(by_result) === total (no lost items)", () => {
  const d = componentLedger(seededComponents());
  assert.equal(d.total, 4);
  assert.equal(d.by_result.PASS, 2);
  assert.equal(d.by_result.FAIL, 1);
  assert.equal(d.by_result[UNKNOWN], 1);
  const sum = RESULT.reduce((n, r) => n + d.by_result[r], 0);
  assert.equal(sum, d.total, "result buckets must sum to the total");
});

check("componentLedger: proven === PASS, unproven === everything not proven (UNKNOWN is NOT a pass)", () => {
  const d = componentLedger(seededComponents());
  assert.equal(d.proven, d.by_result.PASS);
  assert.equal(d.unproven, d.total - d.by_result.PASS);
  assert.equal(d.unproven, d.by_result.FAIL + d.by_result[UNKNOWN], "FAIL and UNKNOWN are both unproven");
});

check("componentLedger never invents state: an out-of-enum result is UNKNOWN, never coerced to PASS", () => {
  const d = componentLedger([{ id: "x", name: "X", result: "green" }, { id: "y", name: "Y", result: "ok" }]);
  assert.equal(d.by_result[UNKNOWN], 2, "unknown results fall into UNKNOWN, never a made-up bucket");
  assert.equal(d.by_result.PASS, 0, "a non-PASS string must NEVER become PASS");
  assert.equal(d.proven, 0);
});

check("componentLedger checks_proven tallies self-test checks behind PROVEN components only", () => {
  const d = componentLedger(seededComponents());
  assert.equal(d.checks_proven, 35, "13 + 22 from the two PASS components; FAIL/UNKNOWN checks excluded");
});

check("componentLedger tolerates a missing checks count without faking it as 0-with-a-claim", () => {
  const d = componentLedger([{ id: "z", name: "Z", result: "PASS" }]);
  assert.equal(d.items[0].checks, UNKNOWN, "absent checks read as UNKNOWN, not a fabricated number");
  assert.equal(d.checks_proven, 0, "an UNKNOWN-checks proven component adds nothing to the proven-checks tally");
});

check("componentLedger is PURE — it does not mutate the input array or records", () => {
  const input = seededComponents();
  const snapshot = JSON.stringify(input);
  componentLedger(input);
  assert.equal(JSON.stringify(input), snapshot, "ledger mutated its input");
});

// ── project result ledger ────────────────────────────────────────────────────────────────

check("projectLedger counts results honestly and sums to total", () => {
  const d = projectLedger(seededProjects());
  assert.equal(d.total, 2);
  assert.equal(d.by_result.PASS, 1);
  assert.equal(d.by_result.FAIL, 1);
  const sum = RESULT.reduce((n, r) => n + d.by_result[r], 0);
  assert.equal(sum, d.total);
});

check("projectLedger redacts a protected project's NAME but keeps its RESULT (a result is a fact, not content)", () => {
  const d = projectLedger([
    { id: "prj_secret", name: "Confidential Client X", result: "PASS", data_class: "SECRET", runs: 5 },
    { id: "prj_ok", name: "Open project", result: "FAIL", data_class: "PUBLIC", runs: 1 },
  ]);
  assert.equal(d.protected, 1);
  const secret = d.items.find((it) => it.id === "prj_secret");
  assert.equal(secret.name, REDACTED, "protected project name is redacted");
  assert.equal(secret.result, "PASS", "protected project's RESULT is still visible");
  assert.equal(secret.protected, true);
});

check("projectLedger redaction flows through the TEXT renderer — protected name never in the clear", () => {
  const text = renderProjectLedgerText([
    { id: "prj_secret", name: "Confidential Client X", result: "PASS", data_class: "BLOCKED", runs: 5 },
  ]);
  assert.ok(!text.includes("Confidential Client X"), "protected project name leaked into text");
  assert.ok(text.includes("Protected"), "text names the protected tally");
});

// ── hand-burden score ────────────────────────────────────────────────────────────────────

check("burdenDigest: all-zero technical operations -> hand_ops 0 -> ZERO_HAND_BURDEN", () => {
  const d = burdenDigest(seededBurden());
  assert.equal(d.hand_ops, 0);
  assert.equal(d.verdict, "ZERO_HAND_BURDEN");
});

check("burdenDigest sums ONLY the burden fields; direction (prompts/signatures) is NOT counted as burden", () => {
  const d = burdenDigest({
    founder_clicks: 1, founder_terminal_actions: 2,
    founder_debugging_actions: 0, founder_raw_log_reviews: 3,
    founder_prompts_provided: 99, founder_signatures_provided: 42, // direction — must not inflate hand_ops
  });
  assert.equal(d.hand_ops, 6, "1 + 2 + 0 + 3; prompts/signatures excluded");
  assert.equal(d.verdict, "HAND_BURDEN_PRESENT");
  assert.equal(d.direction.founder_prompts_provided, 99, "direction is surfaced separately");
  assert.equal(d.direction.founder_signatures_provided, 42);
});

check("THE HONESTY PROOF: a MISSING burden metric makes hand_ops UNKNOWN — never a fake 'zero burden'", () => {
  const missingOne = { founder_clicks: 0, founder_terminal_actions: 0, founder_debugging_actions: 0 };
  const d = burdenDigest(missingOne); // founder_raw_log_reviews absent
  assert.equal(d.hand_ops, UNKNOWN, "an absent burden input must poison the sum to UNKNOWN");
  assert.equal(d.verdict, UNKNOWN, "you cannot claim zero hand-burden over metrics you do not have");
  assert.notEqual(d.verdict, "ZERO_HAND_BURDEN");
});

check("burdenDigest: no metrics at all -> everything UNKNOWN, verdict UNKNOWN (degrades, never throws)", () => {
  const d = burdenDigest(undefined);
  assert.equal(d.hand_ops, UNKNOWN);
  assert.equal(d.gates_suppressed, UNKNOWN, "absent array is UNKNOWN, not 0");
  assert.equal(d.routine_autonomous, UNKNOWN);
  assert.equal(d.verdict, UNKNOWN);
  for (const f of BURDEN_FIELDS) assert.equal(d.breakdown[f], UNKNOWN);
});

check("burdenDigest counts avoided burden (suppressed false gates + autonomous routine actions)", () => {
  const d = burdenDigest(seededBurden());
  assert.equal(d.gates_suppressed, 3);
  assert.equal(d.routine_autonomous, 3);
});

check("burdenDigest treats a negative/garbage metric as UNKNOWN, not a real count (Law 54)", () => {
  const d = burdenDigest({
    founder_clicks: -1, founder_terminal_actions: 0,
    founder_debugging_actions: 0, founder_raw_log_reviews: 0,
  });
  assert.equal(d.breakdown.founder_clicks, UNKNOWN, "a negative count is not trustworthy");
  assert.equal(d.hand_ops, UNKNOWN, "one bad input poisons the whole sum");
});

// ── combined digest + surface ────────────────────────────────────────────────────────────

check("benchDigest composes all three sections and a matching headline", () => {
  const d = benchDigest(seededBench());
  assert.equal(d.headline.components_proven, 2);
  assert.equal(d.headline.components_total, 4);
  assert.equal(d.headline.projects_total, 2);
  assert.equal(d.headline.hand_ops, 0);
  assert.equal(d.headline.verdict, "ZERO_HAND_BURDEN");
  assert.equal(d.components.proven, d.headline.components_proven);
});

check("renderSurfaceHtml is a COMPLETE page embedding all three ledgers", () => {
  const html = renderSurfaceHtml(seededBench());
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "well-formed document");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Component result ledger"), "embeds the component ledger");
  assert.ok(html.includes("Project result ledger"), "embeds the project ledger");
  assert.ok(html.includes("Founder hand-burden"), "embeds the hand-burden section");
  assert.ok(html.includes("CTO queue surface") && html.includes("AKIOR"), "embeds real records");
});

check("THE CRITICAL PROOF: the surface page has NO act affordance (no script/form/button/input/handler/link)", () => {
  const html = renderSurfaceHtml(seededBench());
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("the surface escapes record content — content can't become markup", () => {
  const html = renderSurfaceHtml({
    components: [{ id: "x", name: '<b>x</b> & "y"', selftest: "x.selftest.mjs", result: "PASS", checks: 1 }],
    projects: [], burden: seededBurden(),
  });
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<b>x</b>"), "raw markup must not appear");
});

check("data-class redaction flows THROUGH the full surface (protected name never in the clear)", () => {
  const hostile = {
    components: [], burden: seededBurden(),
    projects: [{ id: "prj_x", name: "TopSecret Client Name", result: "PASS", data_class: "SECRET", runs: 9 }],
  };
  const html = renderSurfaceHtml(hostile);
  const text = renderSurfaceText(hostile);
  assert.ok(!html.includes("TopSecret Client Name"), "surface html leaked a protected name");
  assert.ok(!text.includes("TopSecret Client Name"), "surface text leaked a protected name");
  assert.ok(html.includes(REDACTED), "surface shows the redaction marker instead");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const b = seededBench();
  assert.equal(renderSurfaceHtml(b), renderSurfaceHtml(b));
  assert.equal(renderSurfaceText(b), renderSurfaceText(b));
  assert.equal(renderBurdenText(b.burden), renderBurdenText(b.burden));
  assert.equal(renderComponentLedgerText(b.components), renderComponentLedgerText(b.components));
});

check("an UNKNOWN hand-burden is stated out loud on the surface, never rendered as a clean zero", () => {
  const b = { components: seededComponents(), projects: seededProjects(), burden: { founder_clicks: 0 } };
  const text = renderSurfaceText(b);
  assert.ok(/unknown/i.test(text), "the surface says the hand-burden is unknown");
  assert.ok(!/Zero founder hand-burden/.test(text), "must NOT claim zero hand-burden over incomplete metrics");
});

// ── no act edge (structural scans) ───────────────────────────────────────────────────────

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("bench.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `bench imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `bench contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "bench must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|mintToken|token)/i;
  const allowed = new Set([
    "componentLedger", "projectLedger", "burdenDigest", "benchDigest",
    "renderComponentLedgerText", "renderProjectLedgerText", "renderBurdenText",
    "renderComponentLedgerHtml", "renderProjectLedgerHtml", "renderBurdenHtml",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  const names = Object.keys(bench).filter((k) => typeof bench[k] === "function");
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on bench: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `bench export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-BENCH-SELFTEST: PASS (${pass} checks)`);
