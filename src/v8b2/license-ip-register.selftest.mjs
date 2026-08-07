// FounderGate V8-B VB2 — LICENSE / IP REGISTER surface proof: the engine reads a caller-supplied
// register (the §6.11 fields) and derives, per entry and rolled up, whether recorded components clear a
// commercial/pilot claim (Law 66, C15). Clearance is EARNED only by a known-license, reviewed, APPROVED,
// commercial-allowed, non-high/unknown-risk entry — a SINGLE unknown/high-risk/unreviewed entry blocks
// the whole claim; an empty register is "unsubstantiated", never "clear"; unknown is never guessed
// toward permissive; redacted terms never block the verdict; missing fields are said out loud; and the
// surface has grown NO act edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as surface from "./license-ip-register.mjs";
import {
  deriveEntryVerdict, deriveRegisterView, renderRegisterText, renderRegisterHtml, renderSurfaceHtml,
  renderSurfaceText, ENTRY_STATUS, RISK_LEVELS, COMPONENT_KINDS, CLEARANCE, LICENSE_IP_REGISTER_LAW,
  LICENSE_IP_REGISTER_VERSION,
} from "./license-ip-register.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A representative CLEARED entry: a real permissive dependency, reviewed and APPROVED for commercial use.
const CLEARED = {
  package_name: "@playwright/test",
  source_repo_vendor: "npm (Microsoft)",
  version: "1.61.1",
  license: "Apache-2.0",
  commercial_use_allowed: true,
  copied_code_or_adapter_only: "subprocess",
  attribution_required: true,
  copyleft_risk: "none",
  redistribution_risk: "low",
  output_terms: "N/A — test tool, not shipped",
  model_provider_terms: "N/A",
  human_legal_review_required: false,
  status: "APPROVED",
  date_reviewed: "2026-07-18",
  reviewer_source: "founder + counsel checklist",
};

// A representative BLOCKING entry: a high-copyleft copied component that stops a commercial claim.
const BLOCKING = {
  package_name: "some-gpl-lib",
  source_repo_vendor: "github (vendor)",
  version: "3.0.0",
  license: "GPL-3.0",
  commercial_use_allowed: true,
  copied_code_or_adapter_only: "copied",
  attribution_required: true,
  copyleft_risk: "high",
  redistribution_risk: "high",
  human_legal_review_required: true,
  status: "BLOCKED",
  date_reviewed: "2026-07-18",
  reviewer_source: "founder",
};

console.log("== VB2 License / IP Register — surface ==");

check("the engine reads an entry into a normalized shape + clearance verdict (the §6.11 fields)", () => {
  const e = deriveEntryVerdict(CLEARED);
  assert.equal(e.packageName, "@playwright/test");
  assert.equal(e.version, "1.61.1");
  assert.equal(e.license, "Apache-2.0");
  assert.equal(e.licenseKnown, true);
  assert.equal(e.commercialUse, true);
  assert.equal(e.componentKind, "subprocess");
  assert.equal(e.copyleftRisk, "none");
  assert.equal(e.status, "APPROVED");
  assert.equal(e.cleared, true, "a known-license, reviewed, APPROVED, commercial entry is cleared");
  assert.equal(e.blockingReasons.length, 0);
});

check("THE CENTRAL HONESTY: a commercial claim is CLEAR only when EVERY entry is cleared", () => {
  const v = deriveRegisterView({ source: "live", register: { entries: [CLEARED] } });
  assert.equal(v.clearance, "clear");
  assert.equal(v.commercialClaimClear, true);
  const text = renderRegisterText({ source: "live", entries: [CLEARED] });
  assert.ok(/CLEAR — no license\/IP risk blocks/i.test(text));
});

check("a SINGLE blocking entry blocks the WHOLE commercial claim (unknown/high risk blocks — Law 66)", () => {
  const v = deriveRegisterView({ source: "live", register: { entries: [CLEARED, BLOCKING] } });
  assert.equal(v.total, 2);
  assert.equal(v.clearedCount, 1);
  assert.equal(v.blockingCount, 1);
  assert.equal(v.clearance, "blocked", "one blocking entry blocks the whole claim");
  assert.equal(v.commercialClaimClear, false);
  assert.ok(v.warnings.some((w) => /blocks a commercial\/pilot claim|block a commercial\/pilot claim/i.test(w)));
});

check("an UNKNOWN license is never guessed toward permissive — it blocks", () => {
  for (const lic of [undefined, "", "UNKNOWN", "unlicensed", "TBD", "N/A", "???"]) {
    const e = deriveEntryVerdict({ ...CLEARED, license: lic });
    assert.equal(e.licenseKnown, false, `license ${JSON.stringify(lic)} must be unknown`);
    assert.equal(e.cleared, false);
    assert.ok(e.blockingReasons.some((r) => /license is unknown/i.test(r)));
  }
});

check("commercial_use_allowed is tri-state — only explicit true clears; missing is unknown, blocks", () => {
  assert.equal(deriveEntryVerdict({ ...CLEARED, commercial_use_allowed: true }).commercialUse, true);
  const missing = deriveEntryVerdict({ ...CLEARED, commercial_use_allowed: undefined });
  assert.equal(missing.commercialUse, null);
  assert.equal(missing.cleared, false);
  assert.ok(missing.blockingReasons.some((r) => /not confirmed allowed/i.test(r)));
  const no = deriveEntryVerdict({ ...CLEARED, commercial_use_allowed: false });
  assert.equal(no.commercialUse, false);
  assert.ok(no.blockingReasons.some((r) => /NOT allowed/i.test(r)));
  // truthy-but-not-true never counts as allowed
  for (const val of ["true", 1, "yes"]) assert.equal(deriveEntryVerdict({ ...CLEARED, commercial_use_allowed: val }).commercialUse, null);
});

check("a missing/unrecognized RISK is 'unknown' (never 'none') and blocks — unknown risk blocks the claim", () => {
  const e = deriveEntryVerdict({ ...CLEARED, copyleft_risk: undefined, redistribution_risk: "weird" });
  assert.equal(e.copyleftRisk, "unknown");
  assert.equal(e.redistributionRisk, "unknown");
  assert.equal(e.cleared, false);
  assert.ok(e.blockingReasons.some((r) => /copyleft risk is unknown/i.test(r)));
  assert.ok(e.blockingReasons.some((r) => /redistribution risk is unknown/i.test(r)));
});

check("HIGH copyleft/redistribution risk blocks and flags human legal review", () => {
  const e = deriveEntryVerdict({ ...CLEARED, copyleft_risk: "high" });
  assert.equal(e.cleared, false);
  assert.equal(e.needsLegalReview, true);
  assert.ok(e.blockingReasons.some((r) => /copyleft risk is high/i.test(r)));
});

check("status is never assumed APPROVED — WARN/BLOCKED/UNKNOWN all block; missing status → UNKNOWN", () => {
  assert.equal(deriveEntryVerdict({ ...CLEARED, status: undefined }).status, "UNKNOWN");
  for (const st of ["WARN", "BLOCKED", "UNKNOWN", "weird", undefined]) {
    const e = deriveEntryVerdict({ ...CLEARED, status: st });
    assert.notEqual(e.status, "APPROVED");
    assert.equal(e.cleared, false, `status ${JSON.stringify(st)} must block`);
    assert.ok(e.blockingReasons.some((r) => /status is (WARN|BLOCKED|UNKNOWN)/i.test(r)));
  }
});

check("an entry with no review on record (missing reviewer_source / date_reviewed) is NOT cleared", () => {
  const noReviewer = deriveEntryVerdict({ ...CLEARED, reviewer_source: "" });
  assert.equal(noReviewer.reviewed, false);
  assert.equal(noReviewer.cleared, false);
  assert.ok(noReviewer.blockingReasons.some((r) => /not reviewed/i.test(r)));
  const noDate = deriveEntryVerdict({ ...CLEARED, date_reviewed: "" });
  assert.equal(noDate.reviewed, false);
  assert.equal(noDate.cleared, false);
});

check("an EMPTY register is 'unsubstantiated', NEVER 'clear' — nothing recorded clears no claim (Law 66)", () => {
  const v = deriveRegisterView({ source: "live", register: { entries: [] } });
  assert.equal(v.total, 0);
  assert.equal(v.clearance, "unsubstantiated");
  assert.equal(v.commercialClaimClear, false);
  assert.ok(v.warnings.some((w) => /empty register does not clear|UNREGISTERED/i.test(w)));
  const text = renderRegisterText({ source: "live", entries: [] });
  assert.ok(/UNSUBSTANTIATED/i.test(text));
  assert.ok(!/CLEAR — no license/i.test(text), "an empty register must not read as clear");
});

check("the register-level roll-up counts entries, cleared, blocking, legal-review, and by-status", () => {
  const v = deriveRegisterView({ source: "live", entries: [CLEARED, BLOCKING] });
  assert.equal(v.total, 2);
  assert.equal(v.clearedCount, 1);
  assert.equal(v.blockingCount, 1);
  assert.equal(v.legalReviewCount, 1);
  assert.deepEqual(v.byStatus, { APPROVED: 1, WARN: 0, BLOCKED: 1, UNKNOWN: 0 });
});

check("REDACTION: a SECRET-classed entry shows its terms redacted, but its clearance verdict still computes", () => {
  const e = {
    ...BLOCKING,
    dataClass: "SECRET",
    source_repo_vendor: "private-vendor Acme Corp confidential",
    output_terms: "proprietary NDA output clause: revenue-share 12% to acme@example.com",
    model_provider_terms: "confidential provider agreement ref ACME-9931",
  };
  const view = deriveRegisterView({ source: "live", entries: [e] });
  const text = renderRegisterText({ source: "live", entries: [e] });
  const html = renderSurfaceHtml({ source: "live", entries: [e] });
  for (const secret of ["acme@example.com", "revenue-share 12%", "ACME-9931", "Acme Corp confidential"]) {
    assert.ok(!text.includes(secret), `text leaked: ${secret}`);
    assert.ok(!html.includes(secret), `html leaked: ${secret}`);
  }
  assert.equal(view.entries[0].displayable, false);
  // the clearance verdict is INDEPENDENT of whether the terms are displayable
  assert.equal(view.entries[0].blocking, true, "a secret entry still gets a verdict");
  assert.ok(view.warnings.some((w) => /shown redacted/i.test(w)));
});

check("the License/IP Register law (Law 66) is shown verbatim on the surface (never paraphrased)", () => {
  assert.ok(/must enter the License\/IP Register before real use/i.test(LICENSE_IP_REGISTER_LAW));
  assert.ok(/Unknown license\/IP risk blocks commercial\/pilot claims/i.test(LICENSE_IP_REGISTER_LAW));
  const text = renderRegisterText({ source: "live", entries: [CLEARED] });
  assert.ok(text.includes(LICENSE_IP_REGISTER_LAW), "the exact law text appears in the plain-text surface");
  const html = renderSurfaceHtml({ source: "live", entries: [CLEARED] });
  assert.ok(html.includes(LICENSE_IP_REGISTER_LAW), "the exact law text appears in the page");
});

check("obligations (attribution / weak copyleft / model terms) are surfaced without blocking a clear entry", () => {
  const e = deriveEntryVerdict({ ...CLEARED, attribution_required: true, copyleft_risk: "low", redistribution_risk: "low" });
  assert.equal(e.cleared, true, "attribution + weak copyleft do not by themselves block");
  assert.ok(e.obligations.some((o) => /attribution required/i.test(o)));
  assert.ok(e.obligations.some((o) => /copyleft risk low/i.test(o)));
});

check("deriveEntryVerdict / deriveRegisterView are PURE — they do not mutate their inputs", () => {
  const entries = [JSON.parse(JSON.stringify(CLEARED)), JSON.parse(JSON.stringify(BLOCKING))];
  const snap = JSON.stringify(entries);
  deriveRegisterView({ source: "live", entries });
  deriveEntryVerdict(entries[0]);
  assert.equal(JSON.stringify(entries), snap, "the register entries were mutated");
});

check("the engine is idempotent — a normalized entry flows through unchanged in verdict", () => {
  const once = deriveEntryVerdict(CLEARED);
  const twice = deriveEntryVerdict(once);
  assert.equal(twice.cleared, once.cleared);
  assert.equal(twice.license, once.license);
  assert.equal(twice.status, once.status);
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveRegisterView(bad);
    assert.equal(v.total, 0);
    assert.equal(v.clearance, "unsubstantiated");
    assert.equal(v.commercialClaimClear, false);
    assert.equal(v.source, "UNKNOWN");
  }
  // and the engine over a non-object entry yields an honest, blocking verdict
  const empty = deriveEntryVerdict(null);
  assert.equal(empty.packageName, null);
  assert.equal(empty.cleared, false);
});

check("source truth-label is carried and never conflated (live vs fixture vs unknown)", () => {
  assert.equal(deriveRegisterView({ source: "fixture", entries: [] }).source, "fixture");
  assert.equal(deriveRegisterView({ source: "live", entries: [] }).source, "live");
  assert.equal(deriveRegisterView({ source: "weird", entries: [] }).source, "UNKNOWN");
  assert.equal(deriveRegisterView({ entries: [] }).source, "UNKNOWN");
});

check("snapshot shape is flexible — entries via register.entries, register[], or entries[]", () => {
  const a = deriveRegisterView({ entries: [CLEARED] }).total;
  const b = deriveRegisterView({ register: { entries: [CLEARED] } }).total;
  const c = deriveRegisterView({ register: [CLEARED] }).total;
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(c, 1);
});

check("renderSurfaceHtml is a COMPLETE page embedding the roll-up, entries, and law", () => {
  const html = renderSurfaceHtml({ source: "fixture", entries: [CLEARED, BLOCKING] });
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("License / IP register"), "has the surface heading");
  assert.ok(html.includes("Commercial / pilot claim"), "roll-up section");
  assert.ok(html.includes("Recorded components"), "entries section");
  assert.ok(html.includes("@playwright/test") && html.includes("some-gpl-lib"), "renders both entries");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
  assert.equal((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length, "balanced <section> tags");
});

check("HTML never shows a blocked/unsubstantiated register as clear (the seductive lie)", () => {
  const blocked = renderSurfaceHtml({ source: "fixture", entries: [BLOCKING] });
  assert.ok(/commercial\/pilot: blocked/i.test(blocked), "says blocked");
  assert.ok(!/CLEAR — no license\/IP risk blocks/i.test(blocked), "must not claim clear for a blocked register");
  const empty = renderSurfaceHtml({ source: "fixture", entries: [] });
  assert.ok(/unsubstantiated/i.test(empty), "empty says unsubstantiated");
  assert.ok(!/CLEAR — no license\/IP risk blocks/i.test(empty), "empty must not read as clear");
});

check("content is injection-safe — a malicious license / vendor / terms is escaped, not executed", () => {
  const html = renderSurfaceHtml({
    source: "fixture",
    entries: [
      {
        package_name: "<b>pkg</b>",
        license: "<script>x</script>",
        source_repo_vendor: 'v"><img>',
        commercial_use_allowed: true,
        copyleft_risk: "none",
        redistribution_risk: "none",
        status: "APPROVED",
        date_reviewed: "2026-01-01",
        reviewer_source: "<script>r</script>",
      },
    ],
  });
  assert.ok(!/<script>x<\/script>/.test(html), "the injected license script tag must not appear raw");
  assert.ok(!/<script>r<\/script>/.test(html), "the injected reviewer script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;x&lt;/script&gt;"), "the license is escaped");
  assert.ok(html.includes("v&quot;&gt;&lt;img&gt;"), "the vendor is escaped");
});

check("rendering is DETERMINISTIC — same snapshot in, byte-identical output (no clock/randomness)", () => {
  const snap = { source: "fixture", entries: [CLEARED, BLOCKING] };
  assert.equal(renderSurfaceHtml(snap), renderSurfaceHtml(snap));
  assert.equal(renderRegisterText(snap), renderRegisterText(snap));
  assert.equal(renderSurfaceText(snap), renderRegisterText(snap), "surface text is the register text");
  assert.equal(LICENSE_IP_REGISTER_VERSION, "1.0.0");
});

check("the §6.11 vocabularies are exported as the honest, closed enums", () => {
  assert.deepEqual([...ENTRY_STATUS], ["APPROVED", "WARN", "BLOCKED", "UNKNOWN"]);
  assert.deepEqual([...RISK_LEVELS], ["none", "low", "medium", "high", "unknown"]);
  assert.deepEqual([...COMPONENT_KINDS], ["adapter", "copied", "subprocess", "none"]);
  assert.deepEqual([...CLEARANCE], ["clear", "blocked", "unsubstantiated"]);
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("license-ip-register.mjs");
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
  const html = renderSurfaceHtml({ source: "fixture", entries: [CLEARED, BLOCKING] });
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link (<a href>)");
  assert.ok(!/<a[\s>]/i.test(html), "no anchor element at all");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("NO ACT EDGE (export scan): every exported function is read-only-named (no add/review/approve edge)", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|charge|pay|author|wire|register|review|add|advance|clear|block|charge|fix|patch|kill|freeze|mintToken|token)(?![a-z])/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set([
    "deriveEntryVerdict", "deriveRegisterView", "renderRegisterHtml", "renderRegisterText",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-LICENSE-IP-REGISTER-SELFTEST: PASS (${pass} checks)`);
