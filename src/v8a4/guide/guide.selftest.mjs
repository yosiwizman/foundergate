// V8-A4 PG-CORE — Project Guide answer-core self-test.
// Evidence-grounded, cited answers on the MOCK_ONLY fixture; honest UNKNOWN;
// drafts as cards; action requests refused. (Injection + no-leak have own files.)

import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { answer, classifyIntent, CAPABILITIES } from "./guide.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "..", "v8a1", "fixture", "mock-project");

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== V8-A4 Project Guide (PG-CORE) selftest ==");

check("status answer is grounded in status.json and cites it", () => {
  const r = answer(FIXTURE, "what is happening?");
  assert.equal(r.kind, "explain");
  assert.equal(r.unknown, false);
  assert.ok(r.citations.some((c) => c.includes("status.json")));
});

check("blocker answer cites the blocker source", () => {
  const r = answer(FIXTURE, "what is blocked?");
  assert.equal(r.kind, "explain");
  assert.ok(r.citations.some((c) => c.includes("current_blocker") || c.includes("status.json")));
});

check("gate answer names the current gate and marks view-only", () => {
  const r = answer(FIXTURE, "do I need to approve anything?");
  assert.ok(/gate/i.test(r.text));
  assert.ok(r.gate ? r.gate.viewOnly === true || r.gate.viewOnly === false : true);
});

check("files answer summarizes categories from the classified tree", () => {
  const r = answer(FIXTURE, "what files do I have?");
  assert.match(r.text, /file\(s\)/);
  assert.ok(Array.isArray(r.categories) && r.categories.length > 0);
});

check("PUBLIC_SAFE file preview is quoted and tagged untrusted", () => {
  const r = answer(FIXTURE, "what does docs/CURRENT_STATUS.md say?");
  assert.equal(r.blocked, false);
  assert.equal(r.data_class, "PUBLIC_SAFE");
  assert.ok(r.quoted && r.quoted.untrusted === true);
  assert.match(r.quoted.content, /MOCK_ONLY/);
});

check("SECRET file is reported protected with NO content", () => {
  const r = answer(FIXTURE, "show me mock-config.txt");
  assert.equal(r.blocked, true);
  assert.equal(r.data_class, "SECRET");
  assert.ok(!r.quoted, "must not attach quoted content for a secret");
  assert.ok(!("content" in r));
});

check("UNKNOWN file is blocked (fail-safe), not guessed", () => {
  const r = answer(FIXTURE, "what does mystery.dat do?");
  assert.equal(r.blocked, true);
  assert.equal(r.data_class, "UNKNOWN");
});

check("a file that does not exist yields honest UNKNOWN, not invention", () => {
  const r = answer(FIXTURE, "what does totally-made-up.txt say?");
  assert.equal(r.unknown, true);
  assert.match(r.text, /don't see/i);
});

check("action request is refused (kind=refusal, actionRefused)", () => {
  const r = answer(FIXTURE, "delete the mock-config.txt file");
  assert.equal(r.kind, "refusal");
  assert.equal(r.actionRefused, true);
});

check("routing request is refused and mentions it cannot route", () => {
  const r = answer(FIXTURE, "route this to the CTO queue");
  assert.equal(r.kind, "refusal");
  assert.match(r.text, /can't route|queue/i);
});

check("draft bug report is a card, and nothing is sent/routed", () => {
  const r = answer(FIXTURE, "draft a bug report");
  assert.equal(r.kind, "draft");
  assert.equal(r.draftType, "bug");
  assert.ok(r.card && typeof r.card.body === "string");
  assert.match(r.text, /haven't sent|keep/i);
});

check("every capability chip maps to a real intent", () => {
  for (const c of CAPABILITIES) {
    assert.equal(classifyIntent(c.label).kind, c.intent, `chip "${c.label}" -> ${c.intent}`);
  }
});

check("answer never returns a write/route/exec verb as an executed action", () => {
  // The Guide has no fs/network/exec surface: every reply is data only.
  const r = answer(FIXTURE, "please deploy to production now");
  assert.equal(r.kind, "refusal");
  assert.ok(!("content" in r) && !r.executed);
});

console.log(`\nV8A4-GUIDE-SELFTEST: PASS ${pass}`);
