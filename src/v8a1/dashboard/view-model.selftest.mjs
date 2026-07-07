// FounderGate V8-A1 — dashboard view-model selftest (hermetic, offline, Node).
//
// Proves the UI RENDER LOGIC in Node (no browser needed in CI): the same pure
// view-model the browser uses — including the ANTI-REPEAT checks that turn the
// four founder-caught G2 defects into permanent guards.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildView, buildDoctor, visibleStrings, ciRowStrings, FAILURE_MODES, EIGHT_QUESTIONS, BANNED_WORDS, SIDEBAR_NAV, REQUIRED_TRANSLATIONS } from "./view-model.mjs";
import { buildModel, UNKNOWN } from "../reader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "..", "fixture", "mock-project");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

const view = buildView(buildModel(FIXTURE_ROOT));

// ---- Original V8-A1 render invariants (still enforced) ----------------------
check("A19: exactly the 10 failure-mode lines, verbatim, in order", () => {
  assert.equal(FAILURE_MODES.length, 10);
  assert.deepEqual(view.failureModes.lines, FAILURE_MODES);
  assert.equal(view.failureModes.lines[0], "green CI ≠ product works");
  assert.equal(view.failureModes.lines[9], "a local tool ≠ a business");
});

check("A13/Law44: 8 questions render in strict priority order", () => {
  assert.equal(view.questions.items.length, 8);
  view.questions.items.forEach((q, i) => assert.equal(q.q, EIGHT_QUESTIONS[i], `question ${i} out of order`));
});

check("A15/Law55: gate cards are view-only and NOT approvable", () => {
  for (const g of view.gates) { assert.equal(g.viewOnly, true); assert.equal(g.approvable, false); }
});

check("A23: cost guard is display-only (runtime enforcement begins V8-B)", () => {
  assert.match(view.cost.friendly, /later version \(V8-B\)/i);
  assert.ok(!/enforc/i.test(view.cost.friendly)); // no claim of enforcement now
});

check("A22: data classification present (MOCK_ONLY fixture)", () => {
  assert.equal(view.dataBadges.projectClass, "MOCK_ONLY");
});

check("A20: Doctor reports files-found, never invented health", () => {
  assert.equal(view.doctor.filesPresent, "10/10");
  assert.equal(view.doctor.connected, true);
});

// ---- ANTI-REPEAT: the four founder-caught G2 defects become guards ----------

// Defect 2 — "tone is developer-scary": friendly-copy lint over ALL visible text.
check("ANTI-REPEAT (friendly copy): no banned/scary word in any visible UI text", () => {
  const all = visibleStrings(view).join("  ").toLowerCase();
  for (const w of BANNED_WORDS) {
    assert.ok(!new RegExp(`\\b${w}\\b`).test(all), `banned word "${w}" reached visible UI`);
  }
});

// Defect 3 — the red "Panic" button: calm, correctly-named pause control.
check("ANTI-REPEAT (pause control): named 'Pause & get help', calm, honest scope", () => {
  assert.equal(view.pause.button, "Pause & get help");
  assert.ok(!/panic/i.test(view.pause.title + view.pause.button + view.pause.scope), "pause copy must not say 'panic'");
  // idle fixture → honest: nothing was running
  assert.match(view.pause.scope, /nothing was running/i);
  assert.match(view.pause.scope, /evidence is safe/i);
});

// Defect 4 — app shell: disabled future-nav items carry honest stage labels.
check("ANTI-REPEAT (nav truth): disabled items carry stage labels; active set correct", () => {
  assert.deepEqual(view.nav.active.map((n) => n.label), ["Dashboard", "My Project", "Settings"]);
  assert.ok(view.nav.disabled.length >= 5);
  for (const d of view.nav.disabled) {
    assert.ok(d.stage && /^V8-[A-E]/.test(d.stage), `disabled nav ${d.label} missing stage label`);
  }
  const pg = view.nav.disabled.find((d) => d.id === "project-guide");
  assert.ok(pg && pg.stage === "V8-A4", "Project Guide must be disabled with [V8-A4]");
});

// Welcome header uses the founder's name from project config.
check("welcome header greets by founder name from project config", () => {
  assert.equal(view.header.greeting, "Welcome back, Sam");
});

// Defect 1 (single project) — one project card, no multi-project list.
check("one project only (single card, no multi-project chips)", () => {
  assert.ok(view.project && typeof view.project === "object" && !Array.isArray(view.project));
  assert.equal(view.project.name, "Mock Demo Project");
});

// Law 54 preserved through the friendly layer: UNKNOWN stays VERBATIM, gently explained.
check("Law54: disconnected → UNKNOWN verbatim + gentle explanation, never green", () => {
  const v = buildView(buildModel("/nonexistent-root-xyz"));
  assert.equal(v.header.connected, false);
  assert.equal(v.header.greeting, "Welcome back"); // no invented name
  assert.equal(v.statusCard.ci.text, UNKNOWN); // verbatim token preserved
  assert.equal(v.statusCard.ci.kind, "unknown");
  assert.match(v.statusCard.ci.hint, /can't see this yet/i); // gentle explanation
  const blob = JSON.stringify(v.statusCard);
  assert.ok(!/\b(passing|green|ready)\b/i.test(blob), `fabricated positive: ${blob}`);
  // and still no scary word anywhere in the disconnected view
  const all = visibleStrings(v).join(" ").toLowerCase();
  for (const w of BANNED_WORDS) assert.ok(!new RegExp(`\\b${w}\\b`).test(all));
});

// ANTI-REPEAT (copy-polish): the five founder-approved translations MUST appear.
check("ANTI-REPEAT (required translations): the 5 plain-English strings are present", () => {
  const all = visibleStrings(view).join("\n");
  for (const t of REQUIRED_TRANSLATIONS) {
    assert.ok(all.includes(t), `missing required translation: "${t}"`);
  }
});

// ANTI-REPEAT (banned pairing): "safety" may NEVER appear in the CI row.
check("ANTI-REPEAT (CI row): 'safety' never appears; CI label stays 'Checks (CI)'", () => {
  assert.equal(view.statusCard.ciLabel, "Checks (CI)");
  const ciRow = ciRowStrings(view).join(" ").toLowerCase();
  assert.ok(!/\bsafety\b/.test(ciRow), `"safety" leaked into the CI row: ${ciRow}`);
  // and the CI token itself stays verbatim
  assert.equal(view.statusCard.ci.text, "passing");
});

// Tokens kept verbatim (Law 54) while gaining plain companions.
check("tokens verbatim + plain companions (blocked/#7/MOCK_ONLY)", () => {
  assert.equal(view.statusCard.state, "blocked"); // verbatim
  assert.equal(view.statusCard.statePlain, "Waiting for your decision.");
  assert.equal(view.statusCard.prDisplay, "Developer work package #7 (PR)");
  assert.ok(view.header.dataChip.includes("MOCK_ONLY")); // token kept
  assert.match(view.header.dataChip, /Demo mode/);
});

check("Decision Needed card is view-only, with the honest review-here note", () => {
  assert.equal(view.decision.title, "Decision Needed");
  assert.match(view.decision.viewOnlyNote, /recorded outside this screen/i);
  // no approvable gate
  for (const g of view.decision.items) assert.equal(g.approvable, false);
});

check("buildDoctor is pure and counts presence", () => {
  assert.equal(buildDoctor({ presence: { project: true, status: true } }).filesPresent, "2/10");
});

console.log(`\nV8A1-VIEW-MODEL-SELFTEST: PASS (${passed} checks)`);
