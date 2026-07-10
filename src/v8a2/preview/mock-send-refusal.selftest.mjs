// FounderGate V8-A2 — MOCK-SEND REFUSAL guard (anti-repeat for defect D3).
//
// A real non-developer tester found nothing in the previewed app to try to send,
// so the product's honest live-refusal was untestable ("There is no send button
// for the user to try to send."). The mocked app now carries ONE clearly-labelled
// mock Send control whose only effect is an inline plain-English refusal.
//
// This static check locks that in AND proves it is honest — there is NO real
// send/fetch/XHR/WebSocket/form-action network path in the mock app.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOCK_APP = join(HERE, "..", "..", "v8a1", "fixture", "mock-project", "app", "index.html");
const html = readFileSync(MOCK_APP, "utf8");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

check("mock app has a clearly-labelled Send control", () => {
  assert.match(html, /<button\b[^>]*id="mock-send"[^>]*>([\s\S]*?)<\/button>/,
    "no mock-send button");
  const label = /<button\b[^>]*id="mock-send"[^>]*>([\s\S]*?)<\/button>/.exec(html)[1];
  assert.match(label, /send/i, "the Send control is not labelled 'Send'");
});

check("clicking Send shows the plain-English live-refusal inline", () => {
  assert.match(html, /never really sends anything/i,
    "missing the plain-English refusal message");
  assert.match(html, /practice version/i,
    "refusal should explain this is a practice version");
});

check("mock app has NO real send / network path (refusal is inline only)", () => {
  const FORBIDDEN = [
    "fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon",
    "http.request", "https.request", "EventSource", ".submit(",
  ];
  for (const tok of FORBIDDEN) {
    assert.ok(!html.includes(tok), `mock app contains a network token: ${tok}`);
  }
  // no <form> that could POST to a network endpoint
  assert.ok(!/<form\b/i.test(html), "mock app must not contain a form");
  // no attribute action / href pointing at an http(s) or protocol-relative URL
  assert.ok(!/(action|href)\s*=\s*["'](https?:|\/\/)/i.test(html),
    "mock app must not point any control at a network URL");
});

check("mock app language stays warm (no panic/fatal/abort)", () => {
  for (const word of ["panic", "fatal", "abort"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(html), `mock app uses forbidden word: ${word}`);
  }
});

console.log(`\nV8A2-MOCK-SEND-REFUSAL-GUARD: PASS (${passed} checks)`);
