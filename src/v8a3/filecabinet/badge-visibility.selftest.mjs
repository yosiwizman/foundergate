// FounderGate V8-A3 — File Cabinet badge-visibility / findability guard (D4).
//
// A real non-developer said blocked files were "very difficult to find" and there
// was "no visually see unknown block as requested". This guard is a STATIC ANALYSIS
// of the UI presentation layer (html/css/js only — never the enforcement in
// cabinet.mjs / tree.mjs) that fails if the fix ever regresses:
//   (a) the blocked classes (SECRET / UNKNOWN / PRODUCTION_DATA) map to a dedicated,
//       DISTINCT treatment separate from the safe classes — never shared styling;
//   (b) an icon/glyph lock marker is applied to blocked rows;
//   (c) the one-click "show blocked" filter control exists in the HTML and is wired
//       in the JS.
// Pure Node, zero-dependency. No network, no provider access.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "ui");
const html = readFileSync(join(UI, "filecabinet.html"), "utf8");
const css = readFileSync(join(UI, "filecabinet.css"), "utf8");
const js = readFileSync(join(UI, "filecabinet.js"), "utf8");

// The hidden/blocked classes vs the safe/viewable ones (must never share styling).
const BLOCKED = ["SECRET", "UNKNOWN", "PRODUCTION_DATA"];
const SAFE = ["PUBLIC_SAFE", "PROJECT_INTERNAL", "PRIVATE_FOUNDER_DATA", "DO_NOT_EXPORT"];

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

// (a) Blocked classes carry a dedicated `blocked: true` flag; safe classes are
//     explicitly `blocked: false`. A shared/mislabelled flag fails the build.
check("blocked classes are flagged blocked:true (distinct from safe)", () => {
  for (const cls of BLOCKED) {
    const re = new RegExp(`${cls}\\s*:\\s*\\{[^}]*\\bblocked\\s*:\\s*true\\b`);
    assert.match(js, re, `${cls} must be marked blocked:true in CLASS_INFO`);
  }
  for (const cls of SAFE) {
    const re = new RegExp(`${cls}\\s*:\\s*\\{[^}]*\\bblocked\\s*:\\s*false\\b`);
    assert.match(js, re, `${cls} must be marked blocked:false (safe) in CLASS_INFO`);
    const bad = new RegExp(`${cls}\\s*:\\s*\\{[^}]*\\bblocked\\s*:\\s*true\\b`);
    assert.doesNotMatch(js, bad, `${cls} is safe and must not be flagged blocked`);
  }
});

// (a) A dedicated, DISTINCT treatment for blocked rows + badges, separate from the
//     safe palette — using the CALM LOCK colour (purple), so blocked files are
//     spottable at a glance without being alarming.
check("blocked rows/badges have a dedicated, distinct, CALM lock treatment", () => {
  assert.match(css, /\.filerow\.blocked\s*\{/, ".filerow.blocked treatment must exist");
  assert.match(css, /\.badge\.blocked\s*\{/, ".badge.blocked treatment must exist");
  const badgeBlocked = css.match(/\.badge\.blocked\s*\{([^}]*)\}/);
  assert.ok(badgeBlocked, ".badge.blocked rule must be present");
  assert.match(badgeBlocked[1], /var\(--lock\)/, ".badge.blocked must use the calm lock colour");
  assert.doesNotMatch(badgeBlocked[1], /var\(--ok\)|var\(--accent\)/, ".badge.blocked must not reuse a safe colour");
  const rowBlocked = css.match(/\.filerow\.blocked\s*\{([^}]*)\}/);
  assert.match(rowBlocked[1], /var\(--lock\)/, ".filerow.blocked must use the calm lock colour");
});

// (a2) J4 (Run-4: "very red, very scary… I'm gonna destroy something") — routine
//      blocked/protected rows must be CALM: NO red danger treatment. Red is reserved
//      for a genuine problem only.
check("J4: routine blocked rows are CALM — no red danger colour (red = problem only)", () => {
  assert.doesNotMatch(css, /--blocked\s*:/, "the old red --blocked danger token must be gone (use the calm --lock)");
  const redHex = /#(?:c0362c|ff6b5e|d64545|e06a6a)\b/i;
  const redVar = /var\(--bad\)/;
  for (const label of ["filerow.blocked", "badge.blocked", "filter-btn", "viewer-blocked", "row-lock"]) {
    const m = css.match(new RegExp(`\\.${label.replace(".", "\\.")}\\s*\\{([^}]*)\\}`));
    if (!m) continue;
    assert.doesNotMatch(m[1], redHex, `.${label} must not use a red danger hex (calm lock only)`);
    assert.doesNotMatch(m[1], redVar, `.${label} must not use var(--bad) (red = genuine problem only)`);
  }
});

// (b) An icon/glyph lock marker is applied to blocked rows (and blocked badges).
check("a lock icon/glyph marker is applied to blocked rows", () => {
  assert.match(js, /row-lock/, "JS must add a row-lock glyph marker to blocked rows");
  assert.match(js, /LOCK_GLYPH\s*=\s*["'`]🔒/, "JS must define a lock glyph (🔒)");
  assert.match(js, /if\s*\(\s*blockedFile\s*\)[\s\S]{0,200}row-lock/, "the lock marker must be gated on the blocked check");
  assert.match(js, /const\s+blockedFile\s*=\s*isBlockedClass\(/, "blockedFile must derive from isBlockedClass");
  assert.match(css, /\.row-lock\s*\{/, ".row-lock must be styled");
});

// (c) A one-click, plain-English "show only blocked" filter control — in the HTML
//     and wired in the JS.
check("one-click show-blocked filter control exists and is wired", () => {
  assert.match(html, /id=["']show-blocked-btn["']/, "the filter button must exist in the HTML");
  const btn = html.match(/<button[^>]*id=["']show-blocked-btn["'][^>]*>([\s\S]*?)<\/button>/);
  assert.ok(btn, "show-blocked-btn must be a <button>");
  assert.match(btn[1].toLowerCase(), /blocked/, "the button label must mention 'blocked' in plain English");
  assert.match(js, /getElementById\(["']show-blocked-btn["']\)|\$\(["']show-blocked-btn["']\)/,
    "the filter button must be referenced in the JS");
  assert.match(js, /show-blocked-btn["']\)\.addEventListener/, "the filter button must be wired with a click handler");
  assert.match(js, /applyBlockedFilter\s*\(/, "an applyBlockedFilter routine must drive the filter");
  assert.match(js, /filter-blocked/, "the JS must toggle the filter-blocked state");
});

// UI language law — warm, plain English; never these scary words in the UI layer.
check("UI copy avoids the forbidden scary words", () => {
  for (const [label, text] of [["html", html], ["css", css], ["js", js]]) {
    assert.doesNotMatch(text, /\b(panic|fatal|abort)\b/i, `forbidden word found in filecabinet.${label}`);
  }
});

console.log(`\nV8A3-BADGE-VISIBILITY-SELFTEST: PASS (${passed} checks)`);
