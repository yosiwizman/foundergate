// FounderGate V8-B VB2 — ANTI-REPEAT ENGINE surface proof: the engine lifts a caught defect into a
// derived failure PATTERN and a declared regression CHECK (B6, "defect → pattern → regression
// conversion"); "never again" is EARNED only by a wired AND proven check and is NEVER asserted over
// an unwired or unproven one; a pattern is honest about being instance-only; redacted evidence never
// blocks the protection verdict; missing parts are said out loud; and the surface has grown NO act
// edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as surface from "./anti-repeat-engine.mjs";
import {
  deriveRegressionCheck, deriveAntiRepeatView, renderAntiRepeatText, renderAntiRepeatHtml,
  renderSurfaceHtml, renderSurfaceText, CONVERSION_STAGES, ANTI_REPEAT_LAW, ANTI_REPEAT_ENGINE_VERSION,
} from "./anti-repeat-engine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A representative founder-caught defect the engine reads: a real class of bug (two ports appearing
// to serve the same page), with a regression check that is wired AND proven.
const DEFECT = {
  defectId: "BUG-RUN4-PORTS",
  title: "Two ports appeared to serve the same page",
  caughtBy: "founder",
  caughtAt: "2026-07-10T00:00:00Z",
  area: "scripts/start-stranger-test.mjs",
  failureKind: "wrong-output",
  symptom: "The launcher printed 'ready' after any 200, so two apps looked identical on different ports.",
  evidence: "founder screenshot of :4500 and :4600 showing the same page",
  regressionCheck: {
    id: "CHK-LAUNCHER-HEALTH",
    text: "The launcher must verify each port serves its OWN app (identity marker), not merely return 200.",
    home: "src/tools/launcher-health.selftest.mjs",
    registered: true,
    reproducesDefect: true,
    by: "harness",
    at: "2026-07-10T01:00:00Z",
  },
};

console.log("== VB2 Anti-repeat Engine — surface ==");

check("the engine lifts a defect into a conversion — defect fields, derived pattern, declared check", () => {
  const conv = deriveRegressionCheck(DEFECT);
  const v = deriveAntiRepeatView({ source: "live", conversion: conv });
  const c = v.conversion;
  assert.equal(c.defectId, "BUG-RUN4-PORTS");
  assert.equal(c.caughtBy, "founder");
  assert.equal(c.area, "scripts/start-stranger-test.mjs");
  assert.equal(c.failureKind, "wrong-output");
  assert.ok(c.symptom.includes("printed 'ready'"), "symptom is carried verbatim");
  assert.match(c.pattern.signature, /^[0-9a-f]{8}$/, "a pattern signature is derived");
  assert.equal(c.pattern.generalized, true, "area + failure kind make the pattern generalized");
  assert.equal(c.check.id, "CHK-LAUNCHER-HEALTH");
});

check("THE CENTRAL HONESTY: 'never again' is EARNED — a wired AND proven check protects the defect", () => {
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(DEFECT) });
  assert.equal(v.wired, true);
  assert.equal(v.proven, true);
  assert.equal(v.neverAgain, true, "authored + wired + proven => protected");
  assert.ok(/wired and proven/i.test(v.neverAgainReason));
  const text = renderAntiRepeatText({ source: "live", conversion: v.conversion });
  assert.ok(/PROTECTED — never again/i.test(text));
});

check("a check that is AUTHORED but NOT WIRED is never shown as never-again (it does not run)", () => {
  const d = { ...DEFECT, regressionCheck: { ...DEFECT.regressionCheck, registered: false } };
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
  assert.equal(v.hasCheck, true);
  assert.equal(v.wired, false);
  assert.equal(v.neverAgain, false, "an unwired check protects nothing");
  assert.ok(/not wired into a running suite/i.test(v.neverAgainReason));
  assert.ok(v.warnings.some((w) => /does not actually run/i.test(w)));
});

check("'registered' with NO home suite is NOT wired — a home is required to actually run", () => {
  const d = { ...DEFECT, regressionCheck: { ...DEFECT.regressionCheck, home: "", registered: true } };
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
  assert.equal(v.wired, false, "no home => not wired even when 'registered' is claimed");
  assert.equal(v.neverAgain, false);
  const text = renderAntiRepeatText({ source: "live", conversion: v.conversion });
  assert.ok(/no home suite named/i.test(text));
});

check("a check that is WIRED but NOT PROVEN is never shown as never-again (may stay green on the bug)", () => {
  const d = { ...DEFECT, regressionCheck: { ...DEFECT.regressionCheck, reproducesDefect: false } };
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
  assert.equal(v.wired, true);
  assert.equal(v.proven, false);
  assert.equal(v.neverAgain, false, "wired but unproven is not never-again");
  assert.ok(/not proven to reproduce/i.test(v.neverAgainReason));
  assert.ok(v.warnings.some((w) => /no red→green evidence/i.test(w)));
});

check("NO regression check authored — the defect is honestly 'not converted', never invented", () => {
  const d = { ...DEFECT, regressionCheck: undefined };
  const v = deriveAntiRepeatView({ source: "fixture", conversion: deriveRegressionCheck(d) });
  assert.equal(v.hasCheck, false);
  assert.equal(v.neverAgain, false);
  assert.ok(/not converted and can recur/i.test(v.neverAgainReason));
  const text = renderAntiRepeatText({ source: "fixture", conversion: v.conversion });
  assert.ok(/no regression check authored/i.test(text));
  assert.ok(/NOT YET PROTECTED — can recur/i.test(text));
});

check("wired & proven are NEVER assumed — only an explicit true counts (falsey/other values do not)", () => {
  for (const val of [undefined, false, "true", "yes", 1, null]) {
    const d = { ...DEFECT, regressionCheck: { ...DEFECT.regressionCheck, registered: val, reproducesDefect: val } };
    const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
    assert.equal(v.wired, false, `registered=${JSON.stringify(val)} must not be wired`);
    assert.equal(v.proven, false, `reproducesDefect=${JSON.stringify(val)} must not be proven`);
    assert.equal(v.neverAgain, false);
  }
});

check("the PATTERN is honest — a bare symptom with no area/kind is 'exact instance only', and warns", () => {
  const d = { defectId: "BUG-X", title: "x", symptom: "it crashed once" }; // no area, no kind
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
  assert.equal(v.conversion.pattern.generalized, false);
  assert.ok(v.warnings.some((w) => /a variant of this bug would slip past/i.test(w)));
  const text = renderAntiRepeatText({ source: "live", conversion: v.conversion });
  assert.ok(/Exact instance only/i.test(text));
});

check("the pattern signature is DERIVED from the defect and STABLE for the same defect, differs across defects", () => {
  const a1 = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(DEFECT) }).conversion.pattern.signature;
  const a2 = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck({ ...DEFECT }) }).conversion.pattern.signature;
  assert.equal(a1, a2, "same defect => same signature (deterministic)");
  const b = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck({ ...DEFECT, area: "other/path.mjs" }) }).conversion.pattern.signature;
  assert.notEqual(a1, b, "a different area yields a different signature");
});

check("REDACTION: a SECRET-classed defect shows its evidence redacted, but its protection verdict still computes", () => {
  const d = {
    ...DEFECT,
    dataClass: "SECRET",
    symptom: "customer PII leaked into the log: jane@example.com",
    evidence: "raw log line with the email",
  };
  const v = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(d) });
  const text = renderAntiRepeatText({ source: "live", conversion: v.conversion });
  const html = renderSurfaceHtml({ source: "live", conversion: v.conversion });
  for (const secret of ["jane@example.com", "customer PII", "raw log line"]) {
    assert.ok(!text.includes(secret), `text leaked: ${secret}`);
    assert.ok(!html.includes(secret), `html leaked: ${secret}`);
  }
  assert.equal(v.conversion.displayable, false);
  // the protection verdict is INDEPENDENT of whether the evidence is displayable
  assert.equal(v.neverAgain, true, "a secret defect can still be protected");
  assert.ok(v.warnings.some((w) => /shown redacted/i.test(w)));
  assert.ok(v.conversion.pattern.signature, "a signature is still derived (a hash leaks no content)");
});

check("the conversion pipeline marks each stage present/absent from the conversion alone", () => {
  const full = deriveAntiRepeatView({ source: "live", conversion: deriveRegressionCheck(DEFECT) });
  const byKey = Object.fromEntries(full.pipeline.map((p) => [p.key, p.present]));
  assert.deepEqual(byKey, { defect: true, pattern: true, check: true, wired: true, proven: true });
  assert.equal(full.pipelineReadyCount, 5);
  assert.equal(full.pipelineTotal, CONVERSION_STAGES.length);
  const bare = deriveAntiRepeatView({ source: "fixture", conversion: deriveRegressionCheck({ defectId: "B", title: "t", symptom: "s" }) });
  const bareKeys = Object.fromEntries(bare.pipeline.map((p) => [p.key, p.present]));
  assert.deepEqual(bareKeys, { defect: true, pattern: false, check: false, wired: false, proven: false });
});

check("the Anti-repeat law is shown verbatim on the surface (never paraphrased)", () => {
  assert.ok(/never wrong the same way twice/i.test(ANTI_REPEAT_LAW));
  const text = renderAntiRepeatText({ source: "live", conversion: deriveRegressionCheck(DEFECT) });
  assert.ok(text.includes(ANTI_REPEAT_LAW), "the exact law text appears in the plain-text surface");
  const html = renderSurfaceHtml({ source: "live", conversion: deriveRegressionCheck(DEFECT) });
  assert.ok(html.includes(ANTI_REPEAT_LAW), "the exact law text appears in the page");
});

check("deriveRegressionCheck / deriveAntiRepeatView are PURE — they do not mutate their inputs", () => {
  const d = JSON.parse(JSON.stringify(DEFECT));
  const snap = JSON.stringify(d);
  const conv = deriveRegressionCheck(d);
  deriveAntiRepeatView({ source: "live", conversion: conv });
  assert.equal(JSON.stringify(d), snap, "the defect record was mutated");
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveAntiRepeatView(bad);
    assert.equal(v.neverAgain, false);
    assert.equal(v.hasCheck, false);
    assert.equal(v.source, "UNKNOWN");
    assert.equal(v.conversion.pattern.signature, null, "no defect => no signature");
  }
  // and the engine over an empty defect yields an honest empty conversion
  const empty = deriveRegressionCheck(null);
  assert.equal(empty.defectId, null);
  assert.equal(empty.check, null);
});

check("source truth-label is carried and never conflated (live vs fixture vs unknown)", () => {
  assert.equal(deriveAntiRepeatView({ source: "fixture", conversion: {} }).source, "fixture");
  assert.equal(deriveAntiRepeatView({ source: "live", conversion: {} }).source, "live");
  assert.equal(deriveAntiRepeatView({ source: "weird", conversion: {} }).source, "UNKNOWN");
  assert.equal(deriveAntiRepeatView({ conversion: {} }).source, "UNKNOWN");
});

check("a mock defect is carried as a truth-label out loud", () => {
  const conv = deriveRegressionCheck({ ...DEFECT, mock: true });
  assert.equal(conv.mock, true);
  const text = renderAntiRepeatText({ source: "fixture", conversion: conv });
  assert.ok(/MOCK/i.test(text));
  assert.ok(/mock/i.test(renderSurfaceHtml({ source: "fixture", conversion: conv })));
});

check("renderSurfaceHtml is a COMPLETE page embedding the defect, pattern, check, and pipeline", () => {
  const html = renderSurfaceHtml({ source: "fixture", conversion: deriveRegressionCheck(DEFECT) });
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("Anti-repeat"), "has the surface heading");
  assert.ok(html.includes("What went wrong"), "defect section");
  assert.ok(html.includes("The failure pattern"), "pattern section");
  assert.ok(html.includes("The regression check"), "check section");
  assert.ok(html.includes("pipeline"), "pipeline section");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
  // section open/close tags are balanced (composition emits no stray/unclosed <section>)
  assert.equal((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length, "balanced <section> tags");
});

check("HTML never shows an unprotected defect as protected (the seductive anti-repeat lie)", () => {
  const d = { ...DEFECT, regressionCheck: { ...DEFECT.regressionCheck, reproducesDefect: false } };
  const html = renderSurfaceHtml({ source: "fixture", conversion: deriveRegressionCheck(d) });
  assert.ok(html.includes("not yet protected"), "says not yet protected");
  // the VERDICT never asserts the earned outcome: the protected reason line must be absent
  assert.ok(!html.includes("caught automatically"), "must not claim never-again for an unproven check");
  assert.ok(html.includes("may stay green even if the bug returns"), "states why it is not protected");
});

check("content is injection-safe — a malicious symptom / check text / actor is escaped, not executed", () => {
  const html = renderSurfaceHtml({
    source: "fixture",
    conversion: deriveRegressionCheck({
      defectId: "BUG-X",
      title: "<b>t</b>",
      area: "a/b.mjs",
      failureKind: "crash",
      symptom: "<script>x</script>",
      regressionCheck: { id: "c", text: "<script>d</script>", home: "s.mjs", registered: true, reproducesDefect: true, by: 'a"><img>' },
    }),
  });
  assert.ok(!/<script>x<\/script>/.test(html), "the injected symptom script tag must not appear raw");
  assert.ok(!/<script>d<\/script>/.test(html), "the injected check text script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"), "the symptom is escaped");
  assert.ok(html.includes("a&quot;&gt;&lt;img&gt;"), "the actor is escaped");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const snap = { source: "fixture", conversion: deriveRegressionCheck(DEFECT) };
  assert.equal(renderSurfaceHtml(snap), renderSurfaceHtml(snap));
  assert.equal(renderAntiRepeatText(snap), renderAntiRepeatText(snap));
  assert.equal(renderSurfaceText(snap), renderAntiRepeatText(snap), "surface text is the anti-repeat text");
  assert.equal(ANTI_REPEAT_ENGINE_VERSION, "1.0.0");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("anti-repeat-engine.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `surface imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn(", "spawnSync", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `surface contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "surface must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (rendered page): no script/form/button/input/on*/href/anchor; states read-only", () => {
  const html = renderSurfaceHtml({ source: "fixture", conversion: deriveRegressionCheck(DEFECT) });
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link (<a href>)");
  assert.ok(!/<a[\s>]/i.test(html), "no anchor element at all");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("NO ACT EDGE (export scan): every exported function is read-only-named (no author/wire/run edge)", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|charge|pay|author|wire|register|convert|fix|patch|kill|freeze|mintToken|token)(?![a-z])/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set([
    "deriveRegressionCheck", "deriveAntiRepeatView", "renderAntiRepeatHtml", "renderAntiRepeatText",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-ANTI-REPEAT-ENGINE-SELFTEST: PASS (${pass} checks)`);
