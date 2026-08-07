// FounderGate V8-B VB2 — CTO queue DEDICATED SURFACE proof: derived summary is honest,
// the page is a complete read-only surface, and it has grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyQueue, addItem, STATUS, KIND, UNKNOWN, REDACTED } from "./cto-queue.mjs";
import * as surface from "./cto-queue-surface.mjs";
import {
  queueDigest, renderDigestText, renderDigestHtml,
  renderSurfaceHtml, renderSurfaceText,
} from "./cto-queue-surface.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A well-formed item; created_at is DATA the caller supplies — never a clock read.
function item(over = {}) {
  return {
    id: "q000000000001", title: "Route Guide draft", kind: "guide_draft", status: "queued",
    created_at: "2026-07-12T00:00:00Z", summary: "Founder to review three copy edits.",
    requested_by: "project-guide", data_class: "INTERNAL",
    ...over,
  };
}

// A representative seeded queue: one of each status across a couple of kinds.
function seededQueue() {
  let q = emptyQueue();
  q = addItem(q, item({ id: "q000000000001", status: "queued", kind: "guide_draft" }));
  q = addItem(q, item({ id: "q000000000002", status: "blocked", kind: "review", title: "Review run plan", requested_by: "founder", data_class: "PUBLIC" }));
  q = addItem(q, item({ id: "q000000000003", status: "done", kind: "run_draft", title: "Recorded run", data_class: "PUBLIC" }));
  q = addItem(q, item({ id: "q000000000004", status: UNKNOWN, kind: "note", title: "Unlabelled note", data_class: "PUBLIC" }));
  return q;
}

console.log("== VB2 CTO queue — dedicated surface ==");

check("queueDigest counts the empty queue as all-zero, every status bucket present (honest)", () => {
  const d = queueDigest(emptyQueue());
  assert.equal(d.total, 0);
  assert.equal(d.protected, 0);
  for (const s of STATUS) assert.equal(d.by_status[s], 0, `status ${s} must be present and 0`);
  for (const k of KIND) assert.equal(d.by_kind[k], 0, `kind ${k} must be present and 0`);
});

check("queueDigest counts each status/kind and sum(by_status) === total", () => {
  const d = queueDigest(seededQueue());
  assert.equal(d.total, 4);
  assert.equal(d.by_status.queued, 1);
  assert.equal(d.by_status.blocked, 1);
  assert.equal(d.by_status.done, 1);
  assert.equal(d.by_status[UNKNOWN], 1);
  assert.equal(d.by_kind.guide_draft, 1);
  assert.equal(d.by_kind.review, 1);
  assert.equal(d.by_kind.run_draft, 1);
  assert.equal(d.by_kind.note, 1);
  const sum = STATUS.reduce((n, s) => n + d.by_status[s], 0);
  assert.equal(sum, d.total, "status buckets must sum to the total (no lost items)");
});

check("queueDigest is PURE — it does not mutate the queue", () => {
  const q = seededQueue();
  const snapshot = JSON.stringify(q);
  queueDigest(q);
  assert.equal(JSON.stringify(q), snapshot, "digest mutated the queue");
});

check("queueDigest never invents state: an out-of-enum status is counted as UNKNOWN, not guessed", () => {
  // bypass validation to hand-craft an item whose status is not in the enum
  const hostile = { schema_version: "1.0.0", items: [
    { ...item({ status: "running" }) }, // "running" is not a legal status
  ] };
  const d = queueDigest(hostile);
  assert.equal(d.total, 1);
  assert.equal(d.by_status[UNKNOWN], 1, "an unknown status must fall into UNKNOWN, never a made-up bucket");
  const sum = STATUS.reduce((n, s) => n + d.by_status[s], 0);
  assert.equal(sum, d.total);
});

check("queueDigest tallies protected (non-displayable) items WITHOUT summarising their content", () => {
  const hostile = { schema_version: "1.0.0", items: [
    { ...item({ id: "q0000000000aa", data_class: "SECRET", summary: "top-secret payload", title: "launch codes", requested_by: "insider" }) },
    { ...item({ id: "q0000000000bb", data_class: "PUBLIC", title: "public note", summary: "fine to show" }) },
  ] };
  const d = queueDigest(hostile);
  assert.equal(d.total, 2);
  assert.equal(d.protected, 1, "the SECRET-classed item is tallied as protected");
  // the summary text must never leak the protected content
  const text = renderDigestText(hostile);
  for (const secret of ["launch codes", "top-secret payload", "insider", "SECRET"]) {
    assert.ok(!text.includes(secret), `digest text leaked protected content: ${secret}`);
  }
  assert.ok(text.includes("Protected"), "digest text names the protected tally");
});

check("renderDigestText omits the protected line when nothing is protected", () => {
  assert.ok(!renderDigestText(seededQueue()).includes("Protected"));
});

check("renderSurfaceHtml is a COMPLETE page embedding the summary and the routed-item list", () => {
  const html = renderSurfaceHtml(seededQueue());
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html"), "has <html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("</html>"), "closes </html>");
  assert.ok(html.includes("Queue summary"), "embeds the digest section");
  assert.ok(html.includes("CTO Queue"), "embeds the queue heading");
  assert.ok(html.includes("Route Guide draft"), "embeds a routed item title");
});

check("THE CRITICAL PROOF: the surface page has NO act affordance (no script/form/button/handler/link)", () => {
  const html = renderSurfaceHtml(seededQueue());
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
  // and it says out loud that it is read-only
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("the surface escapes item content — content can't become markup", () => {
  let q = emptyQueue();
  q = addItem(q, item({ id: "q0000000000ff", title: '<b>x</b> & "y"', kind: "note", data_class: "PUBLIC" }));
  const html = renderSurfaceHtml(q);
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<b>x</b>"), "raw markup must not appear");
});

check("data-class redaction flows THROUGH the full surface (protected content never in the clear)", () => {
  const hostile = { schema_version: "1.0.0", items: [
    { ...item({ id: "q000000000009", data_class: "SECRET", title: "launch codes", summary: "top-secret payload text", requested_by: "insider" }) },
  ] };
  const html = renderSurfaceHtml(hostile);
  const text = renderSurfaceText(hostile);
  for (const secret of ["launch codes", "top-secret payload text", "insider"]) {
    assert.ok(!html.includes(secret), `surface html leaked: ${secret}`);
    assert.ok(!text.includes(secret), `surface text leaked: ${secret}`);
  }
  assert.ok(html.includes(REDACTED), "surface shows the redaction marker instead");
});

check("rendering is DETERMINISTIC — same queue in, byte-identical output (no clock/randomness)", () => {
  const q = seededQueue();
  assert.equal(renderSurfaceHtml(q), renderSurfaceHtml(q));
  assert.equal(renderSurfaceText(q), renderSurfaceText(q));
  assert.equal(renderDigestHtml(q), renderDigestHtml(q));
});

check("NO ACT EDGE (source scan): the surface module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("cto-queue-surface.mjs");
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

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|mintToken|token)/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set(["queueDigest", "renderDigestText", "renderDigestHtml", "renderSurfaceHtml", "renderSurfaceText"]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-CTO-QUEUE-SURFACE-SELFTEST: PASS (${pass} checks)`);
