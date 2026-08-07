// FounderGate V8-B VB2 — SPEC CARD ENGINE surface proof: the engine lifts a blueprint requirement
// into a plain-English spec card (what was asked / what "done" looks like / what it will NOT do /
// open questions), an unapproved card is NEVER shown as approved and NEVER spawns a lane, the gate
// is taken exactly as the compiler classified it (never invented here), missing parts are said out
// loud, and the surface has grown NO act edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as surface from "./spec-card-engine.mjs";
import {
  deriveSpecCard, deriveSpecCardView, renderSpecCardText, renderSpecCardHtml,
  renderSurfaceHtml, renderSurfaceText, PIPELINE_STAGES, KILL_SWITCHES, SPEC_CARD_ENGINE_VERSION,
} from "./spec-card-engine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A representative blueprint the engine reads — two requirements, one routine, one that will need a
// founder gate, plus non-goals, open questions, and per-requirement acceptance criteria.
const BLUEPRINT = {
  objective: "Give the founder a plain-English spec card before any feature is built.",
  non_goals: ["No auto-approval", "No lane spawn from this surface"],
  known_unknowns: ["Where does the approval record live?"],
  founder_decisions_required: ["Approve the card format"],
  evidence_expectations: ["selftest_green", "rendered_page"],
  functional_requirements: [
    { id: "FR-1", text: "Render a spec card from a blueprint requirement.", title: "Spec card render" },
    { id: "FR-2", text: "Store customer data for the card index.", data_classes: ["customer_data"] },
  ],
  acceptance_criteria: [
    { requirement_id: "FR-1", text: "A page shows all four card sections.", test: "spec-card-engine.selftest.mjs" },
    { requirement_id: "FR-1", text: "The page is readable by a non-engineer." }, // stated, not shown testable
    { requirement_id: "FR-2", text: "Data is classified before storage.", proof: "classification_evidence" },
  ],
};

console.log("== VB2 Spec Card Engine — surface ==");

check("the engine lifts a blueprint requirement into a plain-English card with all four contents", () => {
  const card = deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" });
  assert.equal(card.specCardId, "SC-FR-1");
  assert.equal(card.requirementId, "FR-1");
  assert.equal(card.asked, "Render a spec card from a blueprint requirement.");
  assert.equal(card.doneCriteria.length, 2, "only FR-1 acceptance criteria are bound to FR-1");
  assert.ok(card.doneCriteria.every((d) => !/customer/i.test(d.text)), "FR-2's criterion did not leak into FR-1");
  assert.deepEqual([...card.nonGoals], ["No auto-approval", "No lane spawn from this surface"]);
  assert.ok(card.openQuestions.includes("Where does the approval record live?"));
  assert.ok(card.openQuestions.includes("Approve the card format"), "founder-decisions-required roll into open questions");
  assert.equal(card.gate, "OPERATIONAL_AUTONOMOUS");
});

check("THE CENTRAL HONESTY: an unapproved card is 'awaiting', NEVER shown approved, and spawns NO lane", () => {
  const v = deriveSpecCardView({ source: "fixture", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.equal(v.approved, false);
  assert.equal(v.card.approval.state, "awaiting");
  assert.equal(v.laneMaySpawn, false, "no lane may spawn without approval (N16)");
  assert.ok(/awaiting founder approval/i.test(v.laneReason));
  const text = renderSpecCardText({ source: "fixture", card: v.card });
  assert.ok(/AWAITING/i.test(text) && /no lane may spawn/i.test(text));
  assert.ok(!/\bAPPROVED\b/.test(text.replace(/awaiting founder approval/gi, "")), "the word APPROVED must not appear for an unapproved card");
});

check("an explicit approval record flips the card to approved and lets a lane spawn — only then", () => {
  const card = deriveSpecCard(BLUEPRINT, "FR-1", {
    gate: "OPERATIONAL_AUTONOMOUS",
    approval: { state: "approved", by: "founder", at: "2026-07-18T00:00:00Z", note: "looks right" },
  });
  const v = deriveSpecCardView({ source: "live", card });
  assert.equal(v.approved, true);
  assert.equal(v.card.approval.by, "founder");
  assert.equal(v.laneMaySpawn, true);
  assert.ok(/a lane may spawn/i.test(v.laneReason));
});

check("approval is honest about non-approved states — pending / blank / rejected are NOT approved", () => {
  for (const state of ["pending", "", "  ", "maybe", "rejected"]) {
    const card = deriveSpecCard(BLUEPRINT, "FR-1", { approval: { state } });
    const v = deriveSpecCardView({ source: "live", card });
    assert.equal(v.approved, false, `state="${state}" must not be approved`);
    assert.equal(v.laneMaySpawn, false);
  }
  const rej = deriveSpecCardView({ source: "live", card: deriveSpecCard(BLUEPRINT, "FR-1", { approval: { state: "rejected" } }) });
  assert.equal(rej.card.approval.state, "rejected", "rejected is surfaced distinctly, not folded into 'awaiting'");
});

check('missing "done" is said out loud as "no testable definition of done" — never manufactured', () => {
  const bp = { ...BLUEPRINT, acceptance_criteria: [] };
  const v = deriveSpecCardView({ source: "fixture", card: deriveSpecCard(bp, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.equal(v.hasDone, false);
  assert.equal(v.hasTestableDone, false);
  assert.ok(v.warnings.some((w) => /no testable definition of "done"/i.test(w)));
  const text = renderSpecCardText({ source: "fixture", card: v.card });
  assert.ok(/no testable definition of "done" recorded/i.test(text));
});

check("testability is honest — a criterion is testable only when it declares HOW it is proven", () => {
  const card = deriveSpecCard(BLUEPRINT, "FR-1", {});
  const withTest = card.doneCriteria.find((d) => /all four card sections/i.test(d.text));
  const withoutTest = card.doneCriteria.find((d) => /non-engineer/i.test(d.text));
  assert.equal(withTest.testable, true, "the criterion with a `test` field is testable");
  assert.equal(withoutTest.testable, false, "a bare stated criterion is not shown testable");
  const v = deriveSpecCardView({ source: "live", card });
  assert.equal(v.hasDone, true);
  assert.equal(v.hasTestableDone, true, "at least one criterion is testable");
});

check('missing non-goals is "scope boundary undefined", missing open questions is not "all clear"', () => {
  const bp = { objective: "x", functional_requirements: [{ id: "FR-1", text: "t" }] };
  const v = deriveSpecCardView({ source: "fixture", card: deriveSpecCard(bp, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.equal(v.card.nonGoals.length, 0);
  assert.equal(v.card.openQuestions.length, 0);
  assert.ok(v.warnings.some((w) => /scope boundary is undefined/i.test(w)));
  const text = renderSpecCardText({ source: "fixture", card: v.card });
  assert.ok(/no explicit non-goals recorded/i.test(text));
  assert.ok(/no open questions recorded/i.test(text));
  assert.ok(!/all clear/i.test(text));
});

check("the gate is taken EXACTLY as classified — never computed here; unclassified is not assumed autonomous", () => {
  const classified = deriveSpecCard(BLUEPRINT, "FR-2", { gate: "TRUE_FOUNDER_GATE" });
  assert.equal(classified.gate, "TRUE_FOUNDER_GATE", "the caller's compiler verdict flows through verbatim");
  const unclassified = deriveSpecCardView({ source: "fixture", card: deriveSpecCard(BLUEPRINT, "FR-2", {}) });
  assert.equal(unclassified.gateClassified, false);
  assert.equal(unclassified.card.gate, null);
  assert.ok(unclassified.warnings.some((w) => /not assumed autonomous/i.test(w)));
  const text = renderSpecCardText({ source: "fixture", card: unclassified.card });
  assert.ok(/not classified/i.test(text) && /NOT assumed autonomous/i.test(text));
});

check("the requirements-to-tests pipeline marks each stage present/absent from the card alone", () => {
  const full = deriveSpecCardView({ source: "live", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  const byKey = Object.fromEntries(full.pipeline.map((p) => [p.key, p.present]));
  assert.deepEqual(byKey, { asked: true, requirement: true, done: true, proof: true, gate: true });
  assert.equal(full.pipelineReadyCount, 5);
  assert.equal(full.pipelineTotal, PIPELINE_STAGES.length);
  const bare = deriveSpecCardView({ source: "fixture", card: deriveSpecCard({ functional_requirements: [{ id: "FR-1", text: "t" }] }, "FR-1", {}) });
  const bareKeys = Object.fromEntries(bare.pipeline.map((p) => [p.key, p.present]));
  assert.deepEqual(bareKeys, { asked: true, requirement: true, done: false, proof: false, gate: false });
});

check("scope kill-switches are shown as REFERENCE and are the five documented commands", () => {
  assert.deepEqual([...KILL_SWITCHES], [
    "stop building this", "freeze scope", "defer to later", "remove from roadmap", "make it a manual process for now",
  ]);
  const text = renderSpecCardText({ source: "live", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.ok(/SCOPE KILL-SWITCHES \(reference/i.test(text), "labelled reference-only");
  for (const k of KILL_SWITCHES) assert.ok(text.includes(k), `shows kill-switch: ${k}`);
});

check("deriveSpecCard / deriveSpecCardView are PURE — they do not mutate their inputs", () => {
  const bp = JSON.parse(JSON.stringify(BLUEPRINT));
  const snap = JSON.stringify(bp);
  const card = deriveSpecCard(bp, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" });
  deriveSpecCardView({ source: "live", card });
  assert.equal(JSON.stringify(bp), snap, "the blueprint was mutated");
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveSpecCardView(bad);
    assert.equal(v.approved, false);
    assert.equal(v.laneMaySpawn, false);
    assert.equal(v.hasDone, false);
    assert.equal(v.source, "UNKNOWN");
    assert.equal(v.card.gate, null);
  }
  // and the engine over a nonexistent requirement id yields an honest empty card
  const missing = deriveSpecCard(BLUEPRINT, "FR-NOPE", {});
  assert.equal(missing.asked, null);
  assert.equal(missing.doneCriteria.length, 0);
});

check("source truth-label is carried and never conflated (live vs fixture vs unknown)", () => {
  assert.equal(deriveSpecCardView({ source: "fixture", card: {} }).source, "fixture");
  assert.equal(deriveSpecCardView({ source: "live", card: {} }).source, "live");
  assert.equal(deriveSpecCardView({ source: "weird", card: {} }).source, "UNKNOWN");
  assert.equal(deriveSpecCardView({ card: {} }).source, "UNKNOWN");
});

check("a mock card is carried as a truth-label out loud", () => {
  const card = deriveSpecCard({ mock: true, functional_requirements: [{ id: "FR-1", text: "t" }] }, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" });
  assert.equal(card.mock, true);
  const text = renderSpecCardText({ source: "fixture", card });
  assert.ok(/MOCK/i.test(text));
  assert.ok(/mock/i.test(renderSurfaceHtml({ source: "fixture", card })));
});

check("renderSurfaceHtml is a COMPLETE page embedding all four card sections + pipeline", () => {
  const html = renderSurfaceHtml({ source: "fixture", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Spec Card"), "has the surface heading");
  assert.ok(html.includes("What the founder asked for"), "asked section");
  assert.ok(html.includes("looks like"), "done section"); // heading quotes are HTML-escaped
  assert.ok(html.includes("What it will NOT do"), "non-goals section");
  assert.ok(html.includes("Open questions"), "open-questions section");
  assert.ok(html.includes("Requirements-to-tests pipeline"), "pipeline section");
  assert.ok(html.includes("Scope kill-switches"), "kill-switch section");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
  // section open/close tags are balanced (composition emits no stray/unclosed <section>)
  assert.equal((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length, "balanced <section> tags");
});

check("HTML never shows an unapproved card as approved (the seductive spec-card lie)", () => {
  const html = renderSurfaceHtml({ source: "fixture", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) });
  assert.ok(html.includes("awaiting founder approval"), "says awaiting");
  assert.ok(html.includes("no lane may spawn"), "says no lane may spawn");
});

check("content is injection-safe — a malicious title / criterion / actor is escaped, not executed", () => {
  const html = renderSurfaceHtml({
    source: "fixture",
    card: deriveSpecCard(
      {
        objective: "<script>o</script>",
        non_goals: ['evil"><img>'],
        functional_requirements: [{ id: "FR-1", text: "<script>x</script>", title: "<b>t</b>" }],
        acceptance_criteria: [{ requirement_id: "FR-1", text: "<script>d</script>" }],
      },
      "FR-1",
      { gate: "OPERATIONAL_AUTONOMOUS", approval: { state: "approved", by: 'a"><img>' } }
    ),
  });
  assert.ok(!/<script>x<\/script>/.test(html), "the injected requirement script tag must not appear raw");
  assert.ok(!/<script>d<\/script>/.test(html), "the injected criterion script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"), "the requirement text is escaped");
  assert.ok(html.includes("evil&quot;&gt;&lt;img&gt;"), "the non-goal is escaped");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const snap = { source: "fixture", card: deriveSpecCard(BLUEPRINT, "FR-1", { gate: "OPERATIONAL_AUTONOMOUS" }) };
  assert.equal(renderSurfaceHtml(snap), renderSurfaceHtml(snap));
  assert.equal(renderSpecCardText(snap), renderSpecCardText(snap));
  assert.equal(renderSurfaceText(snap), renderSpecCardText(snap), "surface text is the spec-card text");
  assert.equal(SPEC_CARD_ENGINE_VERSION, "1.0.0");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("spec-card-engine.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `surface imports ${imp}`);
  }
  // "spawn(" (the call), not the bare word — this surface legitimately says "lane may spawn".
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn(", "spawnSync", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `surface contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "surface must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (rendered page): no script/form/button/input/on*/href/anchor; states read-only", () => {
  const html = renderSurfaceHtml({
    source: "fixture",
    card: deriveSpecCard(BLUEPRINT, "FR-1", {
      gate: "OPERATIONAL_AUTONOMOUS",
      approval: { state: "approved", by: "founder", at: "t" },
    }),
  });
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link (<a href>)");
  assert.ok(!/<a[\s>]/i.test(html), "no anchor element at all");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("NO ACT EDGE (export scan): every exported function is read-only-named (no approve/spawn edge)", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|charge|pay|spend|refund|promote|demote|release|tag|cut|ship|reject|kill|freeze|defer|mintToken|token)(?![a-z])/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set([
    "deriveSpecCard", "deriveSpecCardView", "renderSpecCardHtml", "renderSpecCardText",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-SPEC-CARD-ENGINE-SELFTEST: PASS (${pass} checks)`);
