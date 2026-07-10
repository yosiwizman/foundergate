// V8-A1 D1 anti-repeat — SCAN-BUDGET guard (stranger Run-1 Step-1 defect).
//
// The stranger needed 12+ minutes to answer the 8 questions because they were a
// prose wall. This guard makes that regression impossible: each of the 8 answers
// must be a DISTINCT, machine-checkable, colour-coded element you can read at a
// glance, and the render must carry the role/label/answer markers the fold
// geometry check relies on. (The pixel-level above-the-fold geometry is asserted
// in smoke.mjs at 1366x768; this is the CI-committed structural half.)

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { buildModel } from "../reader.mjs";
import { buildView } from "./view-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const APPJS = readFileSync(join(HERE, "app.js"), "utf8");
const CSS = readFileSync(join(HERE, "styles.css"), "utf8");

const TONES = new Set(["attention", "caution", "ok", "info", "unknown"]);
let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== V8-A1 scan-budget (D1) selftest ==");

const view = buildView(buildModel(FIXTURE));
const items = view.questions.items;

check("exactly 8 answer cards", () => {
  assert.equal(items.length, 8);
});

check("every question has a colour-coded status chip (answer-at-a-glance, never invented)", () => {
  for (const it of items) {
    assert.ok(it.chip && typeof it.chip.label === "string" && it.chip.label.length > 0, `q${it.n} missing chip label`);
    assert.ok(TONES.has(it.chip.tone), `q${it.n} chip tone "${it.chip.tone}" not in the colour set`);
    // the chip must be short enough to scan (not another prose sentence)
    assert.ok(it.chip.label.length <= 20, `q${it.n} chip "${it.chip.label}" is too long to scan`);
  }
});

check("each of the 8 is a DISTINCT numbered element", () => {
  const ns = items.map((i) => i.n);
  assert.deepEqual(ns, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(ns).size, 8);
});

check("the fixture check-in is scannable (a mix of tones, not one grey wall)", () => {
  const tones = new Set(items.map((i) => i.chip.tone));
  assert.ok(tones.size >= 3, `expected a spread of status colours, got ${[...tones].join(",")}`);
  // the fixture is blocked & waiting on the founder — that must read as "attention"
  assert.ok(items.some((i) => i.chip.tone === "attention"), "a blocked/waiting fixture must surface an attention chip");
});

check("render wires the machine-checkable markers (role, aria-label, data-answer, chip)", () => {
  for (const marker of ['setAttribute("role", "group")', 'setAttribute("aria-label"', 'data-answer', 'qchip ${item.chip.tone}', 'data-q']) {
    assert.ok(APPJS.includes(marker), `app.js must render marker: ${marker}`);
  }
});

check("each tone has a distinct colour treatment (chip + left accent)", () => {
  for (const tone of TONES) {
    assert.ok(CSS.includes(`.qchip.${tone}`), `styles.css missing colour for tone .qchip.${tone}`);
  }
});

console.log(`\nV8A1-SCAN-BUDGET-SELFTEST: PASS ${pass}`);
