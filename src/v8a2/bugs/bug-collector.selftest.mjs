// FounderGate V8-A2 — Bug Collector selftest (hermetic, offline).
//
// Proves: Report Problem captures a data-classified evidence packet, stores it
// under the project's .foundergate/bugs, applies C3 classification automatically,
// hides secret/PII values fail-closed, and NEVER triages or takes any action.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureBug, listBugs, validateBug } from "./bug-collector.mjs";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

function makeProject(defaultClass = "MOCK_ONLY") {
  const root = mkdtempSync(join(tmpdir(), "v8a2-bug-"));
  mkdirSync(join(root, ".foundergate"), { recursive: true });
  writeFileSync(join(root, ".foundergate", "data_classification.json"),
    JSON.stringify({ schema_version: "1.0.0", default_class: defaultClass, hide_secret_values: true }));
  writeFileSync(join(root, ".foundergate", "preview.json"),
    JSON.stringify({ schema_version: "1.0.0", target: "static-preview", app_dir: "app", environment: "preview", sends: "off", payments: "mock" }));
  return root;
}
const cleanups = [];
const mk = (c) => { const r = makeProject(c); cleanups.push(r); return r; };

try {
  check("captures + stores a valid, data-classified packet (fixture default)", () => {
    const root = mk("MOCK_ONLY");
    const pkt = captureBug(root, { view: "preview-bay", note: "the button looks off", screenshot_captured: true });
    assert.match(pkt.id, /^bug-[a-z0-9]+$/);
    assert.equal(pkt.data_classification, "MOCK_ONLY");
    assert.equal(pkt.note, "the button looks off");
    assert.equal(pkt.screenshot_captured, true);
    assert.equal(pkt.environment_label, "preview");
    assert.ok(validateBug(pkt).valid);
    // stored on disk
    assert.ok(existsSync(join(root, ".foundergate", "bugs", `${pkt.id}.json`)));
    assert.equal(listBugs(root).length, 1);
  });

  check("C3: a secret in the note → class SECRET + secret redacted (fail-closed)", () => {
    const root = mk("MOCK_ONLY");
    const token = "gh" + "p_" + "A".repeat(36); // built at runtime; not a literal
    const pkt = captureBug(root, { view: "preview-bay", note: `broke with ${token} in it` });
    assert.equal(pkt.data_classification, "SECRET");
    assert.ok(!JSON.stringify(pkt).includes(token), "secret must not be stored");
    // stored packet is still schema-valid and secret-free
    const onDisk = JSON.parse(readFileSync(join(root, ".foundergate", "bugs", `${pkt.id}.json`), "utf8"));
    assert.ok(!JSON.stringify(onDisk).includes(token));
  });

  check("C3: PII in the note → class SECRET + note redacted", () => {
    const root = mk("MOCK_ONLY");
    const email = "someone" + "@" + "example.com";
    const pkt = captureBug(root, { view: "dashboard", note: `email me at ${email}` });
    assert.equal(pkt.data_classification, "SECRET");
    assert.ok(!JSON.stringify(pkt).includes(email), "PII must not be stored");
    assert.match(pkt.note, /redacted/i);
  });

  check("voice note + area captured; capture-only (no triage fields)", () => {
    const root = mk("MOCK_ONLY");
    const pkt = captureBug(root, { view: "preview-bay", note: "n", area: "top-right", voice_note: true });
    assert.equal(pkt.voice_note, true);
    assert.equal(pkt.area, "top-right");
    // capture-only: packet carries no triage / fix / lane fields
    for (const k of ["triage", "lane", "fix", "worker", "resolved", "status"]) {
      assert.ok(!(k in pkt), `bug packet must not carry a "${k}" field (V8-A2 captures only)`);
    }
  });

  check("two identical reports get distinct ids (no overwrite)", () => {
    const root = mk("MOCK_ONLY");
    const a = captureBug(root, { view: "v", note: "same" });
    const b = captureBug(root, { view: "v", note: "same" });
    assert.notEqual(a.id, b.id);
    assert.equal(listBugs(root).length, 2);
  });

  check("invalid packet shape is rejected by the schema", () => {
    assert.equal(validateBug({ schema_version: "1.0.0", id: "BAD ID", view: "v", data_classification: "MOCK_ONLY" }).valid, false);
  });

  console.log(`\nV8A2-BUG-COLLECTOR-SELFTEST: PASS (${passed} checks)`);
} finally {
  for (const r of cleanups) { try { rmSync(r, { recursive: true, force: true }); } catch {} }
}
