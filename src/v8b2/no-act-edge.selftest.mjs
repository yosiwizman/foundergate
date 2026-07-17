// FounderGate V8-B VB2 — THE CRITICAL PROOF: there is NO act / approve / execute path,
// and rendering the queue is a pure, read-only, zero-write operation.
//
// This is the whole point of VB2 being a separate, non-executing scaffold. If any of
// these fail, VB2 has grown an act edge it must not have.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as queueModel from "./cto-queue.mjs";
import * as queueView from "./queue-view.mjs";
import * as store from "./classified-object-store.mjs";
import { emptyQueue, addItem, REDACTED } from "./cto-queue.mjs";
import { renderQueueText, renderQueueHtml } from "./queue-view.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };

// Words that would betray an execution / approval / act / side-effecting edge.
const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|mintToken|token)/i;

// Source-level tokens that would mean the module can touch the outside world.
const SIDE_EFFECT_IMPORTS = [
  "node:fs", "node:child_process", "node:net", "node:http", "node:https",
  "node:dgram", "node:worker_threads", "node:process", "child_process",
];
const SIDE_EFFECT_CALLS = [
  "writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync",
  "fetch(", "Date.now(", "process.exit", "eval(",
];

function sourceOf(name) { return readFileSync(join(HERE, name), "utf8"); }

console.log("== VB2 CTO queue — NO ACT EDGE / read-only proof ==");

check("data-model exports contain NO executor / act / approve / run function", () => {
  const names = Object.keys(queueModel).filter((k) => typeof queueModel[k] === "function");
  // allowed function exports are exactly the pure accessors + the error class
  const allowed = new Set(["emptyQueue", "addItem", "listItems", "getItem", "validateItem", "QueueError", "isDisplayableClass"]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on data model: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `data-model export ${n} reads like an act edge`);
  }
});

check("UI-shell exports contain NO executor / act / approve / run function", () => {
  const names = Object.keys(queueView).filter((k) => typeof queueView[k] === "function");
  const allowed = new Set(["renderQueueText", "renderQueueHtml"]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on UI shell: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `UI-shell export ${n} reads like an act edge`);
  }
});

check("NO module under src/v8b2 imports anything from src/v8b1 (lane isolation)", () => {
  const files = ["cto-queue.mjs", "queue-view.mjs", "cto-queue.selftest.mjs", "no-act-edge.selftest.mjs", "classified-object-store.mjs", "classified-object-store.selftest.mjs"];
  // (a) NO import/require statement anywhere resolves into v8b1.
  for (const f of files) {
    for (const line of sourceOf(f).split("\n")) {
      if (/^\s*import\b/.test(line) || /\brequire\s*\(/.test(line)) {
        assert.ok(!/v8b1/i.test(line), `${f} imports from v8b1: ${line.trim()}`);
      }
    }
  }
  // (b) the two PRODUCTION modules never even mention v8b1 (belt and braces).
  for (const f of ["cto-queue.mjs", "queue-view.mjs"]) {
    assert.ok(!/v8b1/i.test(sourceOf(f)), `${f} references v8b1`);
  }
});

check("no production source imports fs / net / child_process / process (no side-effect surface)", () => {
  for (const f of ["cto-queue.mjs", "queue-view.mjs", "classified-object-store.mjs"]) {
    const src = sourceOf(f);
    for (const imp of SIDE_EFFECT_IMPORTS) {
      assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `${f} imports ${imp}`);
    }
    for (const call of SIDE_EFFECT_CALLS) {
      assert.ok(!src.includes(call), `${f} contains side-effecting token ${call}`);
    }
  }
});

check("ClassifiedObjectStore: no act/approve/execute export; only node:crypto (pure hash + isolated entropy)", () => {
  const src = sourceOf("classified-object-store.mjs");
  // its exported functions must not read like an act edge
  for (const [n, v] of Object.entries(store)) {
    if (typeof v === "function") assert.ok(!ACT_WORDS.test(n), `store export ${n} reads like an act edge`);
  }
  // the ONLY node built-in it may import is node:crypto (createHash = pure; randomBytes = ID-mint entropy).
  const builtinImports = [...src.matchAll(/from\s+["'](node:[^"']+)["']/g)].map((m) => m[1]);
  for (const b of builtinImports) assert.equal(b, "node:crypto", `unexpected node built-in import: ${b}`);
  // entropy (randomBytes) is used ONLY inside newId(); the rest is deterministic given inputs.
  assert.ok(/export function newId\(\)\s*\{\s*return idFromBytes\(randomBytes\(16\)\)/.test(src), "randomBytes must be isolated in newId()");
  // no act edge on the store: it never sends/executes/approves — proven by the export + import scans above.
  assert.ok(!/child_process|node:fs|fetch\(|process\.exit/.test(src), "store must have no execute/network/exit surface");
});

check("the UI shell HTML has no <script>, form, button, or on* handler (no wired affordance)", () => {
  const q = seededQueue();
  const html = renderQueueHtml(q);
  assert.ok(!/<script/i.test(html));
  assert.ok(!/<form/i.test(html));
  assert.ok(!/<button/i.test(html));
  assert.ok(!/\son\w+=/i.test(html), "no inline event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
});

check("rendering returns a PURE STRING and does not mutate the queue (zero writes)", () => {
  const q = seededQueue();
  const snapshot = JSON.stringify(q);
  const text = renderQueueText(q);
  const html = renderQueueHtml(q);
  assert.equal(typeof text, "string");
  assert.equal(typeof html, "string");
  // input untouched -> the render performed zero writes to the queue
  assert.equal(JSON.stringify(q), snapshot, "render mutated the queue");
});

check("rendering is DETERMINISTIC — same queue in, byte-identical string out (no clock/randomness)", () => {
  const q = seededQueue();
  assert.equal(renderQueueText(q), renderQueueText(q));
  assert.equal(renderQueueHtml(q), renderQueueHtml(q));
});

check("the empty queue renders read-only text with no action language", () => {
  const text = renderQueueText(emptyQueue());
  assert.ok(text.includes("read-only"));
  assert.ok(text.includes("takes no action") || text.includes("cannot approve, run, or send"));
});

check("HTML output escapes item content (display only — content can't become markup)", () => {
  let q = emptyQueue();
  q = addItem(q, {
    id: "q0000000000ff", title: "<b>x</b> & \"y\"", kind: "note", status: "queued",
    created_at: "2026-07-12T00:00:00Z", summary: "plain summary", requested_by: "founder",
    data_class: "PUBLIC",
  });
  const html = renderQueueHtml(q);
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(html.includes("&amp;"));
  assert.ok(!html.includes("<b>x</b>"));
});

check("LOW-1: a HAND-CRAFTED queue with a SECRET-classed item renders REDACTED, never in the clear", () => {
  // bypass addItem entirely — a caller hand-crafts a queue with forbidden content.
  const hostile = {
    schema_version: "1.0.0",
    items: [{
      id: "q000000000009", title: "launch codes", kind: "note", status: "queued",
      created_at: "2026-07-12T00:00:00Z", summary: "top-secret payload text",
      requested_by: "insider", data_class: "SECRET",
    }],
  };
  const text = renderQueueText(hostile);
  const html = renderQueueHtml(hostile);
  // the secret CONTENT never appears in either rendering
  for (const secret of ["launch codes", "top-secret payload text", "insider"]) {
    assert.ok(!text.includes(secret), `text leaked: ${secret}`);
    assert.ok(!html.includes(secret), `html leaked: ${secret}`);
  }
  // the class label "SECRET" is not printed in the clear either
  assert.ok(!text.includes("data class: SECRET"));
  assert.ok(!html.includes("SECRET"));
  // and the redaction marker is shown instead (REDACTED has no HTML-special chars)
  assert.ok(text.includes(REDACTED));
  assert.ok(html.includes(REDACTED));
  // a permitted class still displays normally (redaction is targeted, not blanket)
  assert.ok(renderQueueText(seededQueue()).includes("Route Guide draft"));
});

function seededQueue() {
  let q = emptyQueue();
  q = addItem(q, {
    id: "q000000000001", title: "Route Guide draft", kind: "guide_draft", status: "queued",
    created_at: "2026-07-12T00:00:00Z", summary: "Founder to review three copy edits.",
    requested_by: "project-guide", data_class: "INTERNAL",
  });
  q = addItem(q, {
    id: "q000000000002", title: "Review run plan", kind: "review", status: "blocked",
    created_at: "2026-07-12T01:00:00Z", summary: "A gate has not cleared this yet.",
    requested_by: "founder", data_class: "PUBLIC",
  });
  return q;
}

console.log(`\nV8B2-NO-ACT-EDGE-SELFTEST: PASS (${pass} checks)`);
