// V8-A4 — Law 54 (cannot invent state) for Project Guide surfaces.
// With state absent, the Guide says UNKNOWN honestly and cites the missing source;
// it never fabricates a status, gate, cost, or file.

import assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answer } from "./guide/guide.mjs";

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== V8-A4 cannot-invent-state (Law 54) selftest ==");

// (1) a project with NO .foundergate at all.
const bare = mkdtempSync(join(tmpdir(), "v8a4-bare-"));
try {
  check("no .foundergate -> status is honest, not invented", () => {
    const r = answer(bare, "what is happening?");
    // reader reports NOT CONNECTED / UNKNOWN; the Guide must not fabricate progress.
    assert.ok(!/all green|passed|approved|complete|done/i.test(r.text), `must not invent: ${r.text}`);
  });
  check("no cost data -> cost is UNKNOWN, honestly", () => {
    const r = answer(bare, "what is this costing?");
    assert.equal(r.unknown, true);
    assert.match(r.text, /don't know|hasn't recorded/i);
  });
  check("no gates -> does not invent an approval", () => {
    const r = answer(bare, "do I need to approve anything?");
    assert.ok(!/you approved|already approved/i.test(r.text));
  });
  check("unknown/garbled question -> honest 'not sure', not a fabricated answer", () => {
    const r = answer(bare, "florp the wibble");
    assert.equal(r.unknown, true);
  });
} finally { rmSync(bare, { recursive: true, force: true }); }

// (2) a project with .foundergate present but status.json MISSING.
const partial = mkdtempSync(join(tmpdir(), "v8a4-partial-"));
try {
  mkdirSync(join(partial, ".foundergate"), { recursive: true });
  writeFileSync(join(partial, ".foundergate", "project.json"), JSON.stringify({ name: "mock" }));
  check("status.json missing -> blocker/status answers stay honest (no invention)", () => {
    const r = answer(partial, "what is blocked?");
    // no current_blocker recorded -> must be UNKNOWN or an honest 'nothing recorded',
    // never a fabricated blocker.
    assert.ok(r.unknown === true || /nothing recorded|don't know/i.test(r.text), `got: ${r.text}`);
  });
  check("asking about a file that isn't there -> UNKNOWN, not guessed", () => {
    const r = answer(partial, "what does invoice.pdf say?");
    assert.equal(r.unknown, true);
    assert.match(r.text, /don't see/i);
  });
} finally { rmSync(partial, { recursive: true, force: true }); }

console.log(`\nV8A4-CANNOT-INVENT-STATE-SELFTEST: PASS ${pass}`);
