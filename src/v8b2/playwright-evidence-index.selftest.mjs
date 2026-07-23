// FounderGate V8-B VB2 — PLAYWRIGHT EVIDENCE INDEX proof: the index is generalized (surface-
// agnostic), it normalizes verdicts honestly (never assumes PASS), it flags unsupported claims
// (PASS not backed by the core artifacts), the page is a complete read-only surface, and it has
// grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UNKNOWN } from "./cto-queue.mjs";
import * as index from "./playwright-evidence-index.mjs";
import {
  VERDICT, normalizeVerdict, normalizeBundle, indexDigest,
  renderDigestText, renderDigestHtml, renderBundleListHtml,
  renderSurfaceHtml, renderSurfaceText,
} from "./playwright-evidence-index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// A fully-backed bundle: verdict PASS with every core falsifiable artifact declared.
function backed(over = {}) {
  return {
    id: "foreground-founder-surface", surface: "phase7.1-safety-check",
    path: "docs/testing/evidence/foreground-founder-surface",
    state: "FOREGROUND_TEST_VERIFIED",
    screenshots: 11, video: true, trace: true, hashes: true, dom_assertions: 5, downloads: 1,
    ...over,
  };
}

console.log("== VB2 Playwright evidence index ==");

// ---- verdict normalization (surface-agnostic, honest) --------------------------------------

check("normalizeVerdict reads founder-surface state strings", () => {
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_VERIFIED" }), "PASS");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_FAILED" }), "FAIL");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_RUNNING" }), "RUNNING");
});

check("normalizeVerdict falls back to @playwright/test reporter stats", () => {
  assert.equal(normalizeVerdict({ passed: 20, failed: 0 }), "PASS");
  assert.equal(normalizeVerdict({ passed: 18, failed: 2 }), "FAIL");
  assert.equal(normalizeVerdict({ passed: 0, failed: 0 }), UNKNOWN, "0/0 is not a pass");
});

check("normalizeVerdict is UNKNOWN when nothing can be read — never assumes PASS (Law 54)", () => {
  assert.equal(normalizeVerdict({}), UNKNOWN);
  assert.equal(normalizeVerdict({ state: "totally-unrecognized-word" }), UNKNOWN);
  assert.equal(normalizeVerdict(null), UNKNOWN);
});

check("an unrecognized state does NOT block honest stats from deciding the verdict", () => {
  assert.equal(normalizeVerdict({ state: "weird", passed: 5, failed: 0 }), "PASS");
  assert.equal(normalizeVerdict({ state: "weird", failed: 3 }), "FAIL");
});

// ---- F-2 regression: a declared failure count dominates a green state string ----------------
// Independent-checker finding F-2: a recognized green state string ("PASSED", "VERIFIED",
// "SUCCESS", "GREEN") used to be returned BEFORE the reporter stats were read, so a bundle whose
// own stats said `failed: 5` indexed as a fully-backed PASS — a false green on the founder
// surface. The contradiction must now fail closed: the numbers that disprove the word win.

// The exact F-2 input: a green word contradicted by its own reporter stats, with every core
// artifact declared (so nothing but the verdict itself can catch the contradiction).
const F2_CONTRADICTION = Object.freeze({
  id: "f2-contradiction", surface: "playwright-test-reporter",
  state: "PASSED", passed: 0, failed: 5,
  screenshots: 3, trace: true, hashes: true, video: true,
});

check("F-2: a declared failed > 0 DOMINATES a recognized green state string (fail closed)", () => {
  assert.equal(normalizeVerdict({ state: "PASSED", passed: 0, failed: 5 }), "FAIL", "PASSED + failed:5 is a contradiction, not a pass");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_VERIFIED", failed: 99 }), "FAIL");
  assert.equal(normalizeVerdict({ state: "SUCCESS", failed: 1 }), "FAIL");
  assert.equal(normalizeVerdict({ state: "GREEN", failed: 2 }), "FAIL");
  assert.equal(normalizeVerdict({ state: "PASS", failed: 1 }), "FAIL");
  assert.equal(normalizeVerdict({ failed: 4 }), "FAIL", "stats-only failed > 0 stays FAIL");
});

check("F-2 preserves every non-contradictory verdict path", () => {
  assert.equal(normalizeVerdict({ state: "PASSED", passed: 5, failed: 0 }), "PASS", "a green state with failed:0 is still a pass");
  assert.equal(normalizeVerdict({ state: "PASSED" }), "PASS", "a green state with NO reporter stats keeps its documented behaviour");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_VERIFIED" }), "PASS");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_FAILED", failed: 0 }), "FAIL", "a recognized failure state stays FAIL");
  assert.equal(normalizeVerdict({ state: "FOREGROUND_TEST_RUNNING" }), "RUNNING", "running keeps its behaviour when nothing failed");
  assert.equal(normalizeVerdict({ state: "RUNNING", failed: 0 }), "RUNNING");
  assert.equal(normalizeVerdict({ state: "RUNNING", failed: 3 }), "FAIL", "a running bundle with real failures is not still merely running");
  assert.equal(normalizeVerdict({ state: "totally-unrecognized-word" }), UNKNOWN, "unknown state stays fail-closed");
});

check("F-2: normalizeBundle gives the contradiction NO supported, unflagged green", () => {
  const b = normalizeBundle(F2_CONTRADICTION);
  assert.equal(b.verdict, "FAIL", "the normalized bundle must not read as a pass");
  assert.notEqual(b.verdict, "PASS");
  assert.equal(b.unsupported_claim, false, "it claims no pass at all, so it is not an unsupported CLAIM");
  assert.ok(!(b.verdict === "PASS" && b.supported), "must never be a supported green");
});

check("F-2: indexDigest places the contradiction in FAIL, not PASS", () => {
  const d = indexDigest([F2_CONTRADICTION]);
  assert.equal(d.by_verdict.PASS, 0, "no bundle may be counted as passed");
  assert.equal(d.by_verdict.FAIL, 1);
  assert.equal(d.total, 1);
  const sum = VERDICT.reduce((n, v) => n + d.by_verdict[v], 0);
  assert.equal(sum, d.total, "buckets still sum to total");
});

check("F-2: founder-visible text counts the contradiction as Failed: 1 / Passed: 0", () => {
  const t = renderDigestText([F2_CONTRADICTION]);
  assert.ok(/Passed: 0/.test(t), "founder sees Passed: 0");
  assert.ok(/Failed: 1/.test(t), "founder sees Failed: 1");
  assert.ok(!/Passed: 1/.test(t), "the false green must not survive anywhere in the summary");
});

check("F-2: the failure is not silently omitted from the rendered conclusion", () => {
  const t = renderSurfaceText([F2_CONTRADICTION]);
  assert.ok(/\[Failed\] f2-contradiction/.test(t), "the per-bundle line states Failed out loud");
  assert.ok(!/\[Passed\] f2-contradiction/.test(t));
  assert.ok(/Failed: 1/.test(t) && /Passed: 0/.test(t), "the summary conclusion carries the failed count");
  // the bundle-list markup only (renderSurfaceHtml also inlines the stylesheet, which names every
  // verdict class regardless of content — the ROW is what states this bundle's verdict).
  const rows = renderBundleListHtml([F2_CONTRADICTION]);
  assert.ok(/fg-verdict-fail/.test(rows), "the row marks the bundle failed");
  assert.ok(!/fg-verdict-pass/.test(rows), "no pass chip is rendered for the contradiction");
  assert.ok(/>Failed</.test(rows), "the row's founder-visible label reads Failed");
});

// ---- F-A regression: token-safe state classification ----------------------------------------
// Independent-checker finding F-A (PRE-EXISTING in PR #182, material): the green test
// /VERIFIED|PASSED|\bPASS\b|SUCCESS|GREEN/ was an UNANCHORED SUBSTRING match evaluated before the
// failure test, so "UNVERIFIED", "NOT_VERIFIED", "NOT_PASSED", "UNSUCCESSFUL", "NOT_SUCCESS",
// "NOT_GREEN", "GREENISH" and "FAILED_BUT_PREVIOUSLY_PASSED" ALL normalized to PASS — the word
// "PASSED" simply lives inside "NOT_PASSED". "UNVERIFIED -> PASS" contradicts this module's own
// Law 54 contract; "FAILED_BUT_PREVIOUSLY_PASSED -> PASS" reads an explicit failure as a pass.
// Classification is now TOKEN-AWARE against an explicit vocabulary of complete state tokens.
// Every assertion below runs against the PRODUCTION EXPORT — there is no local re-implementation.

// The complete accepted green vocabulary. Nothing outside this list may read as a pass.
const F_A_GREEN_STATES = Object.freeze([
  "PASS", "PASSED", "VERIFIED", "SUCCESS", "GREEN", "FOREGROUND_TEST_VERIFIED",
]);

// Explicit negative / negated states. Each contains a green word as a SUBSTRING and each must
// still be a failure.
const F_A_NEGATIVE_STATES = Object.freeze([
  "UNVERIFIED", "NOT_VERIFIED", "NOT_PASSED", "UNSUCCESSFUL",
  "NOT_SUCCESS", "NOT_GREEN", "FAILED_BUT_PREVIOUSLY_PASSED",
]);

// Ambiguous non-states: not a recognized state at all. Fail closed to UNKNOWN — never a pass.
const F_A_AMBIGUOUS_STATES = Object.freeze([
  "GREENISH", "PASSING",
  "the reviewer said this looks like a pass to me",
  "please pass report",
  "",
]);

check("F-A: every legitimate green state token normalizes to PASS", () => {
  for (const s of F_A_GREEN_STATES) {
    assert.equal(normalizeVerdict({ state: s }), "PASS", `${s} must be PASS`);
    assert.equal(normalizeVerdict({ state: s.toLowerCase() }), "PASS", `${s} is case-insensitive`);
    assert.equal(normalizeVerdict({ state: s, failed: 0 }), "PASS", `${s} + failed:0 stays PASS`);
  }
});

check("F-A: negated/negative states MUST NOT pass — they are FAIL, not a substring green", () => {
  for (const s of F_A_NEGATIVE_STATES) {
    const v = normalizeVerdict({ state: s });
    assert.notEqual(v, "PASS", `${s} must never read as a pass (this was the F-A false green)`);
    assert.equal(v, "FAIL", `${s} is an explicit negative state -> FAIL`);
    assert.equal(normalizeVerdict({ state: s.toLowerCase() }), "FAIL", `${s} lowercase -> FAIL`);
    assert.equal(normalizeVerdict({ state: s, passed: 99, failed: 0 }), "FAIL",
      `${s} stays FAIL even beside flattering stats`);
  }
});

check("F-A: ambiguous non-states fail closed to UNKNOWN — never PASS (Law 54)", () => {
  for (const s of F_A_AMBIGUOUS_STATES) {
    const v = normalizeVerdict({ state: s });
    assert.notEqual(v, "PASS", `${JSON.stringify(s)} must never read as a pass`);
    assert.equal(v, UNKNOWN, `${JSON.stringify(s)} is not a state we can read -> UNKNOWN`);
  }
  assert.equal(normalizeVerdict({ state: "GREENISH", failed: 0 }), UNKNOWN,
    "an empty/ambiguous state with no usable statistics is UNKNOWN");
  assert.equal(normalizeVerdict({ state: "" }), UNKNOWN, "empty state, no stats -> UNKNOWN");
});

check("F-A: an ambiguous state still lets honest statistics decide (no regression)", () => {
  assert.equal(normalizeVerdict({ state: "GREENISH", passed: 7, failed: 0 }), "PASS",
    "stats, not the ambiguous word, are what make this a pass");
  assert.equal(normalizeVerdict({ state: "PASSING", failed: 2 }), "FAIL");
});

check("F-A: failure-stat precedence — a finite failed > 0 ALWAYS wins, for every state class", () => {
  for (const s of [...F_A_GREEN_STATES, ...F_A_AMBIGUOUS_STATES, "FOREGROUND_TEST_RUNNING", "RUNNING", "PENDING", "IN_PROGRESS", "weird"]) {
    assert.equal(normalizeVerdict({ state: s, failed: 1 }), "FAIL", `${JSON.stringify(s)} + failed:1 -> FAIL`);
    assert.equal(normalizeVerdict({ state: s, passed: 100, failed: 5 }), "FAIL", `${JSON.stringify(s)} + failed:5 -> FAIL`);
  }
  assert.equal(normalizeVerdict({ failed: 1 }), "FAIL", "stats-only failed:1 -> FAIL");
});

check("F-A: running states stay RUNNING unless a declared failure overrides them", () => {
  for (const s of ["RUNNING", "running", "FOREGROUND_TEST_RUNNING", "PENDING", "IN_PROGRESS", "IN-PROGRESS", "INPROGRESS"]) {
    assert.equal(normalizeVerdict({ state: s }), "RUNNING", `${s} -> RUNNING`);
    assert.equal(normalizeVerdict({ state: s, failed: 0 }), "RUNNING", `${s} + failed:0 stays RUNNING`);
    assert.equal(normalizeVerdict({ state: s, failed: 3 }), "FAIL", `${s} + failed:3 -> FAIL (failure is authoritative)`);
  }
});

check("F-A: recognized failure states remain FAIL", () => {
  for (const s of ["FAIL", "FAILED", "FAILURE", "ERROR", "ERRORED", "REFUSED", "RED", "FOREGROUND_TEST_FAILED"]) {
    assert.equal(normalizeVerdict({ state: s }), "FAIL", `${s} -> FAIL`);
    assert.equal(normalizeVerdict({ state: s, passed: 40, failed: 0 }), "FAIL", `${s} stays FAIL beside green stats`);
  }
});

check("F-A: a mixed state carrying both a failure and a green token reads as its failure half", () => {
  assert.equal(normalizeVerdict({ state: "PASSED_THEN_FAILED" }), "FAIL");
  assert.equal(normalizeVerdict({ state: "FAILED_BUT_PREVIOUSLY_PASSED" }), "FAIL");
  assert.equal(normalizeVerdict({ state: "TEST_VERIFIED_RUNNING" }), UNKNOWN,
    "an ambiguous mix of non-failure classes is unreadable, never a pass");
});

check("F-A: malformed / non-string state values are unreadable, never PASS", () => {
  for (const bad of [123, 0, null, undefined, true, false, {}, [], ["PASSED"], { state: "PASSED" }, NaN]) {
    assert.notEqual(normalizeVerdict({ state: bad }), "PASS", `state ${String(bad)} must not read as a pass`);
    assert.equal(normalizeVerdict({ state: bad }), UNKNOWN, `state ${String(bad)} -> UNKNOWN`);
  }
  const stringly = { toString() { return "PASSED"; } };
  assert.equal(normalizeVerdict({ state: stringly }), UNKNOWN, "an object that stringifies to PASSED is not a state string");
});

check("F-A: null / empty / non-object descriptors are UNKNOWN, never PASS", () => {
  assert.equal(normalizeVerdict(null), UNKNOWN);
  assert.equal(normalizeVerdict(undefined), UNKNOWN);
  assert.equal(normalizeVerdict({}), UNKNOWN);
  assert.equal(normalizeVerdict("PASSED"), UNKNOWN, "a bare string is not a descriptor");
  assert.equal(normalizeVerdict(0), UNKNOWN);
  assert.equal(normalizeVerdict([]), UNKNOWN);
  assert.equal(normalizeBundle(null).verdict, UNKNOWN);
  assert.equal(normalizeBundle(undefined).verdict, UNKNOWN);
  assert.equal(normalizeBundle({}).verdict, UNKNOWN);
});

check("F-A: NaN / Infinity / negative counts never manufacture a pass out of nothing", () => {
  // Stats alone: a non-finite or negative count is not a readable statistic, so there is nothing
  // to decide on and the honest answer is UNKNOWN.
  assert.equal(normalizeVerdict({ failed: NaN }), UNKNOWN);
  assert.equal(normalizeVerdict({ failed: Infinity }), UNKNOWN);
  assert.equal(normalizeVerdict({ failed: -Infinity }), UNKNOWN);
  assert.equal(normalizeVerdict({ failed: -1 }), UNKNOWN);
  assert.equal(normalizeVerdict({ passed: NaN, failed: 0 }), UNKNOWN);
  assert.equal(normalizeVerdict({ passed: Infinity, failed: 0 }), UNKNOWN, "an infinite passed count is not a readable statistic (Number.isFinite(Infinity) is false)");
  assert.equal(normalizeVerdict({ passed: -5, failed: 0 }), UNKNOWN, "a negative passed count is not > 0");
  assert.equal(normalizeVerdict({ passed: 0, failed: 0 }), UNKNOWN, "0/0 is not a pass");
  // A NON-FINITE `failed` is treated as ABSENT, so a green state still wins. This is the SEPARATE,
  // still-open pre-existing checker finding F-B, deliberately NOT repaired here (this correction is
  // scoped to F-A) and asserted so the residual is visible rather than hidden.
  assert.equal(normalizeVerdict({ state: "PASSED", failed: Infinity }), "PASS", "KNOWN RESIDUAL F-B — non-finite failed is read as absent");
  assert.equal(normalizeVerdict({ state: "PASSED", failed: NaN }), "PASS", "KNOWN RESIDUAL F-B");
  assert.equal(normalizeVerdict({ state: "PASSED", failed: -1 }), "PASS", "KNOWN RESIDUAL F-B — a negative failed is not a declared failure");
  // ...but a negated state is STILL not a pass under any of those garbage counts.
  for (const bad of [NaN, Infinity, -Infinity, -1, "5", true, null]) {
    assert.equal(normalizeVerdict({ state: "UNVERIFIED", failed: bad }), "FAIL", `UNVERIFIED + failed:${String(bad)} stays FAIL`);
    assert.equal(normalizeVerdict({ state: "NOT_PASSED", failed: bad }), "FAIL", `NOT_PASSED + failed:${String(bad)} stays FAIL`);
  }
});

check("F-A: classification is DETERMINISTIC across repeated identical input", () => {
  const all = [...F_A_GREEN_STATES, ...F_A_NEGATIVE_STATES, ...F_A_AMBIGUOUS_STATES];
  for (const s of all) {
    const d = { state: s, passed: 3, failed: 0 };
    const first = normalizeVerdict(d);
    for (let i = 0; i < 25; i++) assert.equal(normalizeVerdict(d), first, `${JSON.stringify(s)} must be stable`);
    assert.equal(normalizeVerdict({ state: s, passed: 3, failed: 0 }), first, "a fresh equal descriptor gives the same answer");
  }
});

check("F-A: classification does NOT mutate the descriptor (input-immutable)", () => {
  for (const s of [...F_A_GREEN_STATES, ...F_A_NEGATIVE_STATES, ...F_A_AMBIGUOUS_STATES]) {
    const d = { id: "x", surface: "s", state: s, passed: 2, failed: 0, screenshots: 1, trace: true, hashes: true };
    const before = JSON.stringify(d);
    const keysBefore = Object.keys(d).join(",");
    normalizeVerdict(d);
    normalizeBundle(d);
    indexDigest([d]);
    renderSurfaceText([d]);
    renderSurfaceHtml([d]);
    assert.equal(JSON.stringify(d), before, `descriptor mutated for state ${JSON.stringify(s)}`);
    assert.equal(Object.keys(d).join(","), keysBefore, "no key was added or removed");
  }
  const frozen = Object.freeze({ id: "f", surface: "s", state: "NOT_PASSED", failed: 0 });
  assert.equal(normalizeVerdict(frozen), "FAIL", "a frozen descriptor is classified without being written to");
});

check("F-A: normalizeBundle gives a negated state NO green and NO unsupported-claim flag", () => {
  for (const s of F_A_NEGATIVE_STATES) {
    const b = normalizeBundle({ id: `neg-${s}`, surface: "playwright-test-reporter", state: s, screenshots: 4, trace: true, hashes: true, video: true });
    assert.equal(b.verdict, "FAIL", `${s} bundle must be FAIL`);
    assert.notEqual(b.verdict, "PASS");
    assert.equal(b.unsupported_claim, false, "it claims no pass at all");
    assert.ok(!(b.verdict === "PASS" && b.supported), "must never be a supported green");
  }
});

check("F-A: founder digest counts every negated state as Failed, none as Passed", () => {
  const bundles = F_A_NEGATIVE_STATES.map((s, i) => ({ id: `neg-${i}`, surface: "s", state: s, screenshots: 2, trace: true, hashes: true }));
  const d = indexDigest(bundles);
  assert.equal(d.total, F_A_NEGATIVE_STATES.length);
  assert.equal(d.by_verdict.PASS, 0, "not one negated state may be counted as passed");
  assert.equal(d.by_verdict.FAIL, F_A_NEGATIVE_STATES.length);
  assert.equal(d.unsupported_claims, 0);
  const sum = VERDICT.reduce((n, v) => n + d.by_verdict[v], 0);
  assert.equal(sum, d.total, "buckets still sum to total");
});

check("F-A: founder digest counts every ambiguous state as Unknown, none as Passed", () => {
  const bundles = F_A_AMBIGUOUS_STATES.map((s, i) => ({ id: `amb-${i}`, surface: "s", state: s }));
  const d = indexDigest(bundles);
  assert.equal(d.by_verdict.PASS, 0, "an ambiguous word is never a pass");
  assert.equal(d.by_verdict[UNKNOWN], F_A_AMBIGUOUS_STATES.length);
  assert.equal(VERDICT.reduce((n, v) => n + d.by_verdict[v], 0), d.total);
});

check("F-A: DUPLICATE bundles are each counted, never collapsed or double-passed", () => {
  const one = Object.freeze({ id: "dupe", surface: "s", state: "NOT_VERIFIED", screenshots: 1, trace: true, hashes: true });
  const d = indexDigest([one, one, one]);
  assert.equal(d.total, 3, "three descriptors index as three bundles");
  assert.equal(d.by_verdict.FAIL, 3);
  assert.equal(d.by_verdict.PASS, 0);
  assert.equal(d.by_surface.s, 3);
  const green = indexDigest([backed({ id: "g" }), backed({ id: "g" })]);
  assert.equal(green.total, 2);
  assert.equal(green.by_verdict.PASS, 2);
  assert.equal(VERDICT.reduce((n, v) => n + d.by_verdict[v], 0), d.total);
});

check("F-A: the founder-visible TEXT never shows a negated state as passed", () => {
  const bundles = F_A_NEGATIVE_STATES.map((s, i) => ({ id: `neg-${i}`, surface: "s", state: s, screenshots: 1, trace: true, hashes: true }));
  const digest = renderDigestText(bundles);
  assert.ok(/Passed: 0/.test(digest), "founder sees Passed: 0");
  assert.ok(new RegExp(`Failed: ${F_A_NEGATIVE_STATES.length}`).test(digest), "founder sees every negated state counted as failed");
  assert.ok(!/UNSUPPORTED CLAIMS/.test(digest), "nothing claimed a pass, so nothing is an unsupported claim");
  const surface = renderSurfaceText(bundles);
  for (let i = 0; i < bundles.length; i++) {
    assert.ok(new RegExp(`\\[Failed\\] neg-${i}`).test(surface), `neg-${i} must read Failed out loud`);
    assert.ok(!new RegExp(`\\[Passed\\] neg-${i}`).test(surface), `neg-${i} must never read Passed`);
  }
});

check("F-A: the rendered BUNDLE MARKUP marks negated states failed and ambiguous ones unknown", () => {
  const negRows = renderBundleListHtml([{ id: "neg", surface: "s", state: "FAILED_BUT_PREVIOUSLY_PASSED", screenshots: 1, trace: true, hashes: true }]);
  assert.ok(/fg-verdict-fail/.test(negRows), "the row marks the bundle failed");
  assert.ok(!/fg-verdict-pass/.test(negRows), "no pass chip is rendered for a negated state");
  assert.ok(/>Failed</.test(negRows), "the founder-visible label reads Failed");
  const ambRows = renderBundleListHtml([{ id: "amb", surface: "s", state: "GREENISH" }]);
  assert.ok(/fg-verdict-unknown/.test(ambRows), "an ambiguous state renders as unknown");
  assert.ok(!/fg-verdict-pass/.test(ambRows), "no pass chip is rendered for an ambiguous state");
  assert.ok(/>Unknown state</.test(ambRows));
  const greenRows = renderBundleListHtml([backed({ id: "good" })]);
  assert.ok(/fg-verdict-pass/.test(greenRows), "a legitimate green state still renders as a pass");
});

check("F-A: the F-2 contradiction case is STILL covered and still fails closed", () => {
  assert.equal(normalizeVerdict(F2_CONTRADICTION), "FAIL", "F-2 must not regress under token-safe classification");
  assert.equal(normalizeBundle(F2_CONTRADICTION).verdict, "FAIL");
  assert.equal(indexDigest([F2_CONTRADICTION]).by_verdict.PASS, 0);
  assert.ok(/Failed: 1/.test(renderDigestText([F2_CONTRADICTION])));
  assert.equal(normalizeVerdict({ state: "PASSED", passed: 0, failed: 5 }), "FAIL");
});

check("F-A: NO loose substring green test survives in the module source", () => {
  const src = sourceOf("playwright-evidence-index.mjs");
  assert.ok(!/\/VERIFIED\|PASSED/.test(src), "the original unanchored green regex must be gone");
  assert.ok(!/\.test\(state\)/.test(src), "no regex is applied to the whole state string any more");
  assert.ok(!/state\.includes\(/.test(src), "no substring includes() classification");
  assert.ok(!/indexOf\(/.test(src), "no substring indexOf() classification");
  assert.ok(/STATE_TOKEN_CLASS/.test(src), "classification goes through an explicit token vocabulary");
});

// ---- bundle normalization + the unsupported-claim flag -------------------------------------

check("a PASS bundle with all core artifacts is supported and NOT an unsupported claim", () => {
  const b = normalizeBundle(backed());
  assert.equal(b.verdict, "PASS");
  assert.equal(b.supported, true);
  assert.equal(b.unsupported_claim, false);
});

check("a PASS bundle MISSING the trace is an UNSUPPORTED CLAIM (the false-green guard)", () => {
  const b = normalizeBundle(backed({ trace: false }));
  assert.equal(b.verdict, "PASS");
  assert.equal(b.supported, false);
  assert.equal(b.unsupported_claim, true, "a pass with no trace cannot be checked");
});

check("a PASS bundle missing screenshots OR hashes is also unsupported", () => {
  assert.equal(normalizeBundle(backed({ screenshots: 0 })).unsupported_claim, true);
  assert.equal(normalizeBundle(backed({ hashes: false })).unsupported_claim, true);
});

check("a FAILED bundle with no artifacts is NOT an unsupported claim — it claims no pass", () => {
  const b = normalizeBundle(backed({ state: "FOREGROUND_TEST_FAILED", screenshots: 0, trace: false, hashes: false }));
  assert.equal(b.verdict, "FAIL");
  assert.equal(b.supported, false);
  assert.equal(b.unsupported_claim, false, "only a claimed PASS can be an unsupported claim");
});

check("missing artifact fields normalize to none — never guessed present (Law 54)", () => {
  const b = normalizeBundle({ id: "bare", surface: "x", state: "running" });
  assert.equal(b.evidence.screenshots, 0);
  assert.equal(b.evidence.trace, false);
  assert.equal(b.evidence.video, false);
  assert.equal(b.evidence.hashes, false);
  assert.equal(b.evidence.dom_assertions, 0);
  assert.equal(b.evidence.downloads, 0);
});

check("garbage/negative counts and non-true booleans normalize honestly", () => {
  const b = normalizeBundle({ id: "junk", surface: "x", screenshots: -4, dom_assertions: "5", trace: "yes", hashes: 1 });
  assert.equal(b.evidence.screenshots, 0, "negative -> 0");
  assert.equal(b.evidence.dom_assertions, 0, "string -> 0");
  assert.equal(b.evidence.trace, false, "truthy-non-true -> false");
  assert.equal(b.evidence.hashes, false, "1 is not true");
});

check("absent id/surface become UNKNOWN, never blank-passed off as real", () => {
  const b = normalizeBundle({ state: "verified", screenshots: 1, trace: true, hashes: true });
  assert.equal(b.id, UNKNOWN);
  assert.equal(b.surface, UNKNOWN);
});

check("normalizeBundle is PURE — it does not mutate the descriptor", () => {
  const d = backed();
  const snap = JSON.stringify(d);
  normalizeBundle(d);
  assert.equal(JSON.stringify(d), snap);
});

// ---- digest across bundles (generalized, honest buckets) -----------------------------------

check("indexDigest counts the empty set as all-zero with every verdict bucket present", () => {
  const d = indexDigest([]);
  assert.equal(d.total, 0);
  assert.equal(d.supported, 0);
  assert.equal(d.unsupported_claims, 0);
  for (const v of VERDICT) assert.equal(d.by_verdict[v], 0, `verdict ${v} must be present and 0`);
});

check("indexDigest buckets sum to total (no bundle lost or double-counted)", () => {
  const set = [
    backed({ id: "a" }),
    backed({ id: "b", state: "FOREGROUND_TEST_FAILED" }),
    backed({ id: "c", state: "running" }),
    { id: "d", surface: "s", state: "???" }, // UNKNOWN verdict
  ];
  const d = indexDigest(set);
  assert.equal(d.total, 4);
  const sum = VERDICT.reduce((n, v) => n + d.by_verdict[v], 0);
  assert.equal(sum, d.total, "verdict buckets must sum to total");
  assert.equal(d.by_verdict.PASS, 1);
  assert.equal(d.by_verdict.FAIL, 1);
  assert.equal(d.by_verdict.RUNNING, 1);
  assert.equal(d.by_verdict[UNKNOWN], 1);
});

check("indexDigest is SURFACE-AGNOSTIC — it buckets by whatever surfaces appear, no hardcoding", () => {
  const d = indexDigest([
    backed({ id: "a", surface: "phase7.1-safety-check" }),
    backed({ id: "b", surface: "founder-url-drop-ui" }),
    backed({ id: "c", surface: "founder-url-drop-ui" }),
    backed({ id: "d", surface: "some-future-lane-surface" }),
  ]);
  assert.equal(d.by_surface["phase7.1-safety-check"], 1);
  assert.equal(d.by_surface["founder-url-drop-ui"], 2);
  assert.equal(d.by_surface["some-future-lane-surface"], 1);
  // first-appearance order is preserved (deterministic given caller order)
  assert.deepEqual(Object.keys(d.by_surface), ["phase7.1-safety-check", "founder-url-drop-ui", "some-future-lane-surface"]);
});

check("indexDigest surfaces unsupported claims as a headline with the offending ids", () => {
  const d = indexDigest([
    backed({ id: "good" }),
    backed({ id: "bad-1", trace: false }),
    backed({ id: "bad-2", screenshots: 0 }),
    backed({ id: "honest-fail", state: "FOREGROUND_TEST_FAILED", trace: false }),
  ]);
  assert.equal(d.unsupported_claims, 2);
  assert.deepEqual(d.unsupported_claim_ids, ["bad-1", "bad-2"]);
  assert.equal(d.supported, 1, "only the good bundle is backed");
  assert.equal(d.partial_evidence, 3);
});

check("indexDigest artifact_totals sum only DECLARED artifacts", () => {
  const d = indexDigest([backed({ id: "a", screenshots: 3, dom_assertions: 2, downloads: 1 }), backed({ id: "b", screenshots: 4, video: false, dom_assertions: 0, downloads: 0 })]);
  assert.equal(d.artifact_totals.screenshots, 7);
  assert.equal(d.artifact_totals.traces, 2);
  assert.equal(d.artifact_totals.videos, 1, "one bundle declared no video");
  assert.equal(d.artifact_totals.hashes, 2);
  assert.equal(d.artifact_totals.dom_assertions, 2);
  assert.equal(d.artifact_totals.downloads, 1);
});

check("indexDigest tolerates a non-array input as empty (never throws)", () => {
  assert.equal(indexDigest(undefined).total, 0);
  assert.equal(indexDigest(null).total, 0);
});

// ---- rendering: complete page, honest text, escaping, determinism --------------------------

check("renderDigestText names the unsupported claims out loud", () => {
  const t = renderDigestText([backed({ id: "good" }), backed({ id: "bad", trace: false })]);
  assert.ok(/Bundles indexed: 2/.test(t));
  assert.ok(/UNSUPPORTED CLAIMS/.test(t));
  assert.ok(/bad/.test(t));
});

check("renderSurfaceText lists each bundle and flags the unsupported one", () => {
  const t = renderSurfaceText([backed({ id: "good" }), backed({ id: "bad", trace: false })]);
  assert.ok(/good/.test(t) && /bad/.test(t));
  assert.ok(/UNSUPPORTED CLAIM/.test(t));
});

check("empty renders are honest, not blank", () => {
  assert.ok(/No Playwright evidence bundles indexed yet/.test(renderBundleListHtml([])));
  assert.ok(/none indexed yet/.test(renderSurfaceText([])));
});

check("renderSurfaceHtml is a COMPLETE page with the read-only claim stated", () => {
  const html = renderSurfaceHtml([backed()]);
  assert.ok(html.startsWith("<!doctype html>"), "is a full document");
  assert.ok(/<title>Playwright Evidence Index/.test(html));
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
  assert.ok(/Evidence summary/.test(html) && /Bundles/.test(html));
});

check("the surface escapes bundle content — content can't become markup", () => {
  const html = renderSurfaceHtml([backed({ id: '<img src=x onerror=alert(1)>', surface: '<b>x</b>' })]);
  assert.ok(html.includes("&lt;img"), "angle brackets escaped");
  assert.ok(!html.includes("<img src=x"), "raw markup must not appear");
});

check("rendering is DETERMINISTIC — same bundles in, byte-identical output (no clock/randomness)", () => {
  const set = [backed({ id: "a" }), backed({ id: "b", trace: false }), { id: "c", surface: "s" }];
  assert.equal(renderSurfaceHtml(set), renderSurfaceHtml(set));
  assert.equal(renderSurfaceText(set), renderSurfaceText(set));
  assert.equal(renderDigestHtml(set), renderDigestHtml(set));
});

// ---- no act edge (the invariant that keeps this a read-only surface) -----------------------

check("the rendered page carries NO action affordance (no script/form/button/input/on*/href)", () => {
  const html = renderSurfaceHtml([backed(), backed({ id: "bad", trace: false })]);
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("playwright-evidence-index.mjs");
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
  const names = Object.keys(index).filter((k) => typeof index[k] === "function");
  const allowed = new Set([
    "normalizeVerdict", "normalizeBundle", "indexDigest",
    "renderDigestText", "renderDigestHtml", "renderBundleListHtml",
    "renderSurfaceHtml", "renderSurfaceText",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on module: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `module export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-PLAYWRIGHT-EVIDENCE-INDEX-SELFTEST: PASS (${pass} checks)`);
