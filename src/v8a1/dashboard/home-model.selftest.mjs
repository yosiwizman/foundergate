// V8-A1 VA-REPAIR-2 — anti-repeat guard for Stranger Run-2 findings F1/F2/F3.
//
// F1 (Step 1: "I don't understand what it's supposed to do") — a plain-language
//    project summary, populated from real fields, friendly-copy clean.
// F2 (Step 1: "wouldn't notice the $50 unless shown") — the big cost figure is
//    present, display-only, and derived from the real budget.
// F3 (Step 6: "don't understand the decision… lots of words") — the decision card
//    leads with a one-sentence plain summary and stays VIEW-ONLY (Law 55).
// Also locks the two mandatory legal corrections: honest pause wording and a
// view-only decision affordance (no approve / move-forward language anywhere).

import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildModel } from "../reader.mjs";
import { buildView, BANNED_WORDS } from "./view-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const h = buildView(buildModel(FIXTURE)).home;

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };
const friendly = (s) => { for (const w of BANNED_WORDS) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(s), `banned word "${w}" in: ${s}`); };
// wording that would imply the founder can ACT from the dashboard (Law 55 forbids it here)
const ACT_WORDS = /\b(approve|approving|confirm|accept|move forward|proceed|continue the project|make a decision|submit|deploy|send|pay)\b/i;

console.log("== V8-A1 home-model (F1/F2/F3 + legal) selftest ==");

check("F1: plain project summary is present, populated, and friendly", () => {
  assert.ok(typeof h.summary === "string" && h.summary.length > 12, "F1 summary must be a real sentence");
  assert.match(h.summary, /your project/i);
  friendly(h.summary);
});

check("F2: the big cost figure is present, from the real budget, display-only", () => {
  assert.match(h.costCard.big, /^\$\d+$/); // e.g. $50 (from monthly_limit_usd)
  assert.equal(h.costCard.per, "per month");
  assert.match(h.costCard.disclaimer, /blocked in demo mode/i);
  assert.match(h.costCard.note, /isn't tracked yet|later version|V8-B/i); // honest display-only
});

check("F3: decision card leads with a plain one-sentence summary", () => {
  assert.ok(typeof h.waiting.lead === "string" && h.waiting.lead.length > 12);
  friendly(h.waiting.lead);
});

check("LEGAL: the decision affordance is VIEW-ONLY (no approve/move-forward wording)", () => {
  assert.match(h.waiting.buttonLabel, /read the decision/i);
  assert.ok(!ACT_WORDS.test(h.waiting.buttonLabel), `decision button must not imply acting: ${h.waiting.buttonLabel}`);
  assert.ok(!ACT_WORDS.test(h.waiting.lead), `decision lead must not imply acting: ${h.waiting.lead}`);
  assert.match(h.waiting.note, /nothing will happen until you decide/i);
  // the decision quick-tile is view-only too
  const decTile = h.tiles.find((t) => /decision/i.test(t.title));
  assert.ok(decTile && decTile.viewOnly === true, "decision tile must be view-only");
  assert.ok(!ACT_WORDS.test(decTile.title + " " + decTile.sub), "decision tile must not imply acting");
});

check("LEGAL: pause wording keeps honest scope (NOT 'Pause Everything')", () => {
  assert.match(h.pauseCard.button, /pause & get help/i);
  assert.ok(!/pause everything/i.test(h.pauseCard.button), "pause must not claim to stop everything");
});

check("no dead controls: every quick tile links (or is view-only) and every nav item links or is staged", () => {
  for (const t of h.tiles) assert.ok(typeof t.href === "string" && t.href.length, `tile "${t.title}" has no link`);
  for (const n of h.nav) assert.ok((n.href && n.href.length) || (n.stage && n.stage.length), `nav "${n.label}" is a dead control`);
});

check("5 status chips, each a colour-coded scannable answer", () => {
  assert.equal(h.statusStrip.length, 5);
  const tones = new Set(h.statusStrip.map((c) => c.tone));
  assert.ok(tones.size >= 3, `status chips need a spread of colours, got ${[...tones]}`);
});

check("safety never labels the Checks chip (scoped honesty rule)", () => {
  const checks = h.statusStrip.find((c) => c.key === "checks");
  assert.ok(!/safety/i.test(checks.name + " " + checks.value), "the Checks chip must not be relabelled 'safety'");
});

check("Safety chip is MODEL-DERIVED, no blanket 'everything safe' claim (Law 54)", () => {
  const safety = h.statusStrip.find((c) => c.key === "safety");
  assert.ok(!/everything safe|all safe|totally safe|100% safe/i.test(safety.value), `safety chip must not make a blanket claim: "${safety.value}"`);
  // it must be scoped to what the real data-classification supports, or say UNKNOWN
  assert.match(safety.value, /demo|protections|protecting|can't see/i, `safety chip must be derived/scoped: "${safety.value}"`);
});

check("restored A1 honesty companions are present and model-derived", () => {
  assert.match(h.honesty.checksNote, /doesn't mean the product is finished/i);
  assert.match(h.honesty.dataChip, /MOCK_ONLY/);
  assert.equal(h.honesty.decisionLabel, "Decision Needed");
  assert.match(h.honesty.decisionState, /waiting for your decision/i);
  assert.match(h.honesty.prDisplay, /Developer work package .*\(PR\)/);
});

check("activity feed carries no invented timestamps (Law 54)", () => {
  for (const a of h.activity) assert.ok(!/\b\d+\s*(second|minute|hour|day)s?\s*ago\b/i.test(a.text), `invented time in: ${a.text}`);
});

console.log(`\nV8A1-HOME-MODEL-SELFTEST: PASS ${pass}`);
