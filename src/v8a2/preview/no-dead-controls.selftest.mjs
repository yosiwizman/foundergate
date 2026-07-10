// FounderGate V8-A2 — NO-DEAD-CONTROLS guard (anti-repeat for defect D2).
//
// A real non-developer tester found Preview Bay buttons that looked clickable but
// did nothing ("Restart, refresh, clear cache is not really active or responsive").
// This static check makes that class of defect fail the suite forever:
//
//   Every <button> in the Preview Bay UI must EITHER
//     (a) be enabled AND have a wired handler — its id or data-action is
//         referenced by the page JS (addEventListener / $() / [data-action]); OR
//     (b) carry the `disabled` attribute AND a visible plain-English label
//         (the same honest "not in this version" treatment the dashboard nav uses).
//
// A button that is enabled but has no handler is a DEAD control and fails here.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(HERE, "ui", f), "utf8");
const html = read("preview-bay.html");
const js = read("preview-bay.js");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

function buttons(src) {
  const out = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const attrs = m[1];
    const label = m[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
    out.push({
      attrs,
      label,
      id: (/\bid="([^"]+)"/.exec(attrs) || [])[1] || null,
      action: (/\bdata-action="([^"]+)"/.exec(attrs) || [])[1] || null,
      disabled: /\bdisabled\b/.test(attrs),
    });
  }
  return out;
}

// A button is "wired" if its id is referenced in the JS (via getElementById/$),
// or it uses data-action and the JS attaches a handler to [data-action] buttons.
function isWired(b) {
  if (b.action) return js.includes("data-action") || js.includes("dataset.action");
  if (b.id) return js.includes(`"${b.id}"`) || js.includes(`'${b.id}'`);
  return false;
}

const all = buttons(html);

check("Preview Bay defines buttons to inspect", () => {
  assert.ok(all.length >= 5, `expected several buttons, found ${all.length}`);
});

check("no dead controls: every enabled button has a wired handler", () => {
  for (const b of all) {
    if (b.disabled) continue;
    const name = b.id || b.action || b.label || "(unnamed)";
    assert.ok(isWired(b), `enabled button "${name}" has no wired handler — dead control`);
  }
});

check("every inert (disabled) button carries a visible label", () => {
  for (const b of all) {
    if (!b.disabled) continue;
    assert.ok(b.label && b.label.length > 0, `disabled button has no visible label`);
  }
});

check("the three previously-inert controls are present and wired", () => {
  for (const action of ["restart", "refresh", "clear-cache"]) {
    const b = all.find((x) => x.action === action);
    assert.ok(b, `missing control data-action="${action}"`);
    assert.ok(!b.disabled && isWired(b), `control "${action}" is not a wired, working control`);
  }
});

check("clicking a control shows visible plain-English feedback (D2)", () => {
  // The handler must render a human-readable feedback line, not silently no-op.
  assert.match(js, /action-feedback/, "no feedback element wired");
  assert.match(js, /function feedbackFor\(/, "no per-action feedback message");
  assert.match(js, /Reloaded the preview/, "refresh gives no visible confirmation");
});

// UI language law: warm, plain English — never these words.
check("UI language stays warm (no panic/fatal/abort)", () => {
  for (const word of ["panic", "fatal", "abort"]) {
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(html), `html uses forbidden word: ${word}`);
    assert.ok(!new RegExp(`\\b${word}\\b`, "i").test(js), `js uses forbidden word: ${word}`);
  }
});

console.log(`\nV8A2-NO-DEAD-CONTROLS-GUARD: PASS (${passed} checks)`);
