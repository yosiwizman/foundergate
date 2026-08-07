// FounderGate V8-B VB2 — EVIDENCE VIEWER proof: the viewer reads ONE bundle honestly. It decides
// file-level verifiability from the hash manifest (never trusts the bundle's own "verified" word
// over files that aren't hashed), flags a PASS that isn't self-verifying as an unsupported claim,
// never invents state, renders a complete read-only page that escapes bundle content, is
// deterministic, and has grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UNKNOWN } from "./cto-queue.mjs";
import * as viewer from "./evidence-viewer.mjs";
import {
  normalizeManifestEntry, normalizeView,
  renderViewText, renderViewHtml, renderViewSurfaceHtml,
} from "./evidence-viewer.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

const HASH_A = "e8d3bafc3160803d779b9c0cfc84286a097b0976689f091968300991abcc0bcf";
const HASH_B = "9f6b00fc37628a01353787396bdd4316f87180d63be961478110fe14350d10d0";

// A fully self-verifying PASS bundle: verdict PASS, and every listed file carries a real sha256.
function backed(over = {}) {
  return {
    id: "foreground-founder-surface-final",
    surface: "phase7.1-safety-check",
    path: "docs/testing/evidence/foreground-founder-surface-final",
    state: "FOREGROUND_TEST_VERIFIED",
    facts: { run_id: "sc-15f0cfc5", browser: "Google Chrome", headless: false, screenshots: 10 },
    manifest: [
      { path: "RESULT.json", sha256: HASH_B, bytes: 1409 },
      { path: "DOM_ACTIONS.jsonl", sha256: HASH_A, bytes: 179 },
    ],
    timeline: ["goto /", "open-existing-run sc-15f0cfc5", "click #pack-dl"],
    screenshots: ["01-before.png", "02-chrome.png"],
    counts: { console: 1, network: 15, page_errors: 0 },
    ...over,
  };
}

console.log("== VB2 Evidence viewer ==");

// ---- manifest entry: file-level verifiability (the viewer's unique honest check) -----------

check("a manifest entry with a valid sha256 is verifiable", () => {
  const m = normalizeManifestEntry({ path: "RESULT.json", sha256: HASH_B, bytes: 1409 });
  assert.equal(m.verifiable, true);
  assert.equal(m.sha256, HASH_B);
  assert.equal(m.bytes, 1409);
});

check("a file listed with NO hash is unverifiable — never assumed to match (Law 54)", () => {
  const m = normalizeManifestEntry({ path: "screenshot.png", bytes: 97536 });
  assert.equal(m.verifiable, false);
  assert.equal(m.sha256, null);
});

check("a garbage / short / non-hex hash does not pass as a real digest", () => {
  assert.equal(normalizeManifestEntry({ path: "x", sha256: "abc123" }).verifiable, false);
  assert.equal(normalizeManifestEntry({ path: "x", sha256: "z".repeat(64) }).verifiable, false, "non-hex");
  assert.equal(normalizeManifestEntry({ path: "x", sha256: HASH_A + "00" }).verifiable, false, "too long");
});

check("a hash is normalized to lower-case (recompute-comparable regardless of input case)", () => {
  const m = normalizeManifestEntry({ path: "x", sha256: HASH_A.toUpperCase() });
  assert.equal(m.sha256, HASH_A);
  assert.equal(m.verifiable, true);
});

check("a missing byte size is null (\"size unknown\"), never guessed to 0 (Law 54)", () => {
  assert.equal(normalizeManifestEntry({ path: "x", sha256: HASH_A }).bytes, null);
  assert.equal(normalizeManifestEntry({ path: "x", sha256: HASH_A, bytes: -5 }).bytes, null, "negative -> null");
  assert.equal(normalizeManifestEntry({ path: "x", sha256: HASH_A, bytes: "12" }).bytes, null, "string -> null");
});

check("an entry with no path is UNKNOWN, never blank-passed off as real", () => {
  assert.equal(normalizeManifestEntry({ sha256: HASH_A }).path, UNKNOWN);
});

// ---- bundle view: verdict + self-verifying + the unsupported-claim guard -------------------

check("a PASS bundle whose every listed file is hashed is self-verifying, not unsupported", () => {
  const v = normalizeView(backed());
  assert.equal(v.verdict, "PASS");
  assert.equal(v.self_verifying, true);
  assert.equal(v.unsupported_claim, false);
  assert.equal(v.verifiable_files, 2);
  assert.equal(v.unverifiable_files, 0);
});

check("a PASS bundle with ONE unhashed file is an UNSUPPORTED CLAIM (file-level false-green guard)", () => {
  const v = normalizeView(backed({
    manifest: [
      { path: "RESULT.json", sha256: HASH_B, bytes: 1409 },
      { path: "screenshot.png", bytes: 97536 }, // no hash
    ],
  }));
  assert.equal(v.verdict, "PASS");
  assert.equal(v.self_verifying, false);
  assert.equal(v.unsupported_claim, true, "a pass you cannot fully check is unsupported");
  assert.equal(v.unverifiable_files, 1);
});

check("a PASS bundle with an EMPTY manifest is an unsupported claim (nothing to check)", () => {
  const v = normalizeView(backed({ manifest: [] }));
  assert.equal(v.self_verifying, false);
  assert.equal(v.unsupported_claim, true);
  assert.equal(v.file_count, 0);
});

check("the bundle's own 'VERIFIED' fact does NOT override unhashed files", () => {
  // facts say verified, but the manifest is not fully hashed -> the viewer still flags it.
  const v = normalizeView(backed({
    facts: { foreground_state: "FOREGROUND_TEST_VERIFIED", completion_state: "COMPLETE_WITH_VERIFIED_EVIDENCE_PACK" },
    manifest: [{ path: "RESULT.json", bytes: 1409 }], // listed, no hash
  }));
  assert.equal(v.unsupported_claim, true, "self-reported words never beat a missing hash");
});

check("a FAILED bundle with unhashed files is NOT an unsupported claim — it claims no pass", () => {
  const v = normalizeView(backed({ state: "FOREGROUND_TEST_FAILED", manifest: [{ path: "x.png", bytes: 10 }] }));
  assert.equal(v.verdict, "FAIL");
  assert.equal(v.self_verifying, false);
  assert.equal(v.unsupported_claim, false, "only a claimed PASS can be an unsupported claim");
});

check("an unreadable verdict is UNKNOWN, never assumed PASS (Law 54)", () => {
  assert.equal(normalizeView({ id: "x", surface: "s" }).verdict, UNKNOWN);
  assert.equal(normalizeView(null).verdict, UNKNOWN);
});

check("absent id/surface become UNKNOWN; a non-array manifest/timeline is empty, never invented", () => {
  const v = normalizeView({ state: "verified", manifest: "nope", timeline: 5, screenshots: null });
  assert.equal(v.id, UNKNOWN);
  assert.equal(v.surface, UNKNOWN);
  assert.deepEqual(v.manifest, []);
  assert.deepEqual(v.timeline, []);
  assert.deepEqual(v.screenshots, []);
});

check("total_bytes sums declared sizes and says so when a size is unknown (never under-reports silently)", () => {
  const complete = normalizeView(backed());
  assert.equal(complete.total_bytes, 1409 + 179);
  assert.equal(complete.bytes_complete, true);
  const partial = normalizeView(backed({
    manifest: [{ path: "a", sha256: HASH_A, bytes: 100 }, { path: "b", sha256: HASH_B }],
  }));
  assert.equal(partial.total_bytes, 100, "only the known size is summed");
  assert.equal(partial.bytes_complete, false, "an unknown size flips the completeness flag");
});

check("facts accept an object OR an array of pairs; null/undefined values become an explicit dash", () => {
  const obj = normalizeView(backed({ facts: { a: 1, b: null } }));
  assert.deepEqual(obj.facts.map((f) => [f.key, f.value]), [["a", "1"], ["b", "—"]]);
  const arr = normalizeView(backed({ facts: [{ key: "x", value: "y" }, { key: "", value: "dropped" }] }));
  assert.deepEqual(arr.facts.map((f) => f.key), ["x"], "a keyless fact is dropped, not shown blank");
});

check("normalizeView is PURE — it does not mutate the descriptor", () => {
  const d = backed();
  const snap = JSON.stringify(d);
  normalizeView(d);
  assert.equal(JSON.stringify(d), snap);
});

// ---- rendering: complete page, honest text, escaping, determinism --------------------------

check("renderViewText states the verdict, the manifest, and the honest headline", () => {
  const t = renderViewText(backed());
  assert.ok(/Verdict: Passed/.test(t));
  assert.ok(/FILE MANIFEST \(2 file/.test(t));
  assert.ok(/Self-verifying/.test(t));
  assert.ok(new RegExp(HASH_B).test(t), "the full recomputable hash is present in text");
});

check("renderViewText names the unsupported claim out loud", () => {
  const t = renderViewText(backed({ manifest: [{ path: "RESULT.json", sha256: HASH_B }, { path: "s.png" }] }));
  assert.ok(/UNSUPPORTED CLAIM/.test(t));
  assert.ok(/NO HASH — unverifiable/.test(t));
});

check("renderViewSurfaceHtml is a COMPLETE page with the read-only claim stated", () => {
  const html = renderViewSurfaceHtml(backed());
  assert.ok(html.startsWith("<!doctype html>"), "is a full document");
  assert.ok(/<title>Evidence Viewer/.test(html));
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
  assert.ok(/File manifest/.test(html) && /Recorded facts/.test(html) && /What the run did/.test(html));
  assert.ok(/Can this bundle be trusted\?/.test(html), "the honesty banner is present");
});

check("the surface escapes bundle content — content can't become markup", () => {
  const html = renderViewSurfaceHtml(backed({
    id: '<img src=x onerror=alert(1)>',
    facts: { evil: '<script>alert(1)</script>' },
    manifest: [{ path: '<b>path</b>', sha256: HASH_A }],
    timeline: ['<i>step</i>'],
    screenshots: ['<svg onload=alert(1)>.png'],
  }));
  assert.ok(html.includes("&lt;img"), "id escaped");
  assert.ok(html.includes("&lt;script&gt;"), "fact value escaped");
  assert.ok(html.includes("&lt;b&gt;path"), "manifest path escaped");
  assert.ok(!html.includes("<img src=x"), "raw markup must not appear");
  assert.ok(!html.includes("<script>alert"), "no injected script tag");
});

check("empty renders are honest, not blank", () => {
  const t = renderViewText({ id: "bare", surface: "x" });
  assert.ok(/no files listed/i.test(t) || /No hash manifest/i.test(t));
  const html = renderViewSurfaceHtml({ id: "bare", surface: "x" });
  assert.ok(/carries no hash manifest/i.test(html));
});

check("rendering is DETERMINISTIC — same bundle in, byte-identical output (no clock/randomness)", () => {
  const b = backed();
  assert.equal(renderViewSurfaceHtml(b), renderViewSurfaceHtml(b));
  assert.equal(renderViewText(b), renderViewText(b));
  assert.equal(renderViewHtml(b), renderViewHtml(b));
});

// ---- no act edge (the invariant that keeps this a read-only surface) -----------------------

check("the rendered page carries NO action affordance (no script/form/button/input/on*/href)", () => {
  const html = renderViewSurfaceHtml(backed({ manifest: [{ path: "a", sha256: HASH_A }, { path: "b" }] }));
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("evidence-viewer.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `module imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "readFileSync", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `module contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "module must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|capture|record|mintToken|token)/i;
  const names = Object.keys(viewer).filter((k) => typeof viewer[k] === "function");
  const allowed = new Set([
    "normalizeManifestEntry", "normalizeView",
    "renderViewText", "renderViewHtml", "renderViewSurfaceHtml",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on module: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `module export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-EVIDENCE-VIEWER-SELFTEST: PASS (${pass} checks)`);
