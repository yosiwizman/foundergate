// FounderGate — VISUAL-CAPTURE contract guard (Assembly Manual §23 + §27).
//
// The capture harness (visual-capture.mjs) needs a real browser, so it is not run in
// `npm test`. This pure-Node guard locks its CONTRACT in CI so the two Run-6 review
// defects can never silently return:
//   (1) VIEWPORT TRUTH — it pins deviceScaleFactor to 1, opens EXACT 1366×768 and
//       1440×900 viewports, and FAILS if the page's reported innerWidth/innerHeight ≠
//       the requested size.
//   (2) IN-EMBED CAPTURE — it opens the café's own url at the embed's fixed height and
//       asserts the primary action (Send) is inside the frame (clipped content fails).

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SRC = readFileSync(join(REPO, "src", "tools", "visual-capture.mjs"), "utf8");

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== visual-capture contract guard ==");

check("captures BOTH true viewports 1366×768 and 1440×900", () => {
  assert.ok(/\{\s*w:\s*1366,\s*h:\s*768\s*\}/.test(SRC), "must capture 1366×768");
  assert.ok(/\{\s*w:\s*1440,\s*h:\s*900\s*\}/.test(SRC), "must capture 1440×900");
});

check("(1) deviceScaleFactor is pinned to 1", () => {
  assert.ok(/deviceScaleFactor:\s*1/.test(SRC), "newPage must pin deviceScaleFactor: 1");
});

check("(1) VIEWPORT TRUTH — asserts reported innerWidth/innerHeight == requested, or fails", () => {
  assert.ok(/window\.innerWidth/.test(SRC) && /window\.innerHeight/.test(SRC), "must read the page's reported viewport");
  assert.ok(/rv\.w === w && rv\.h === h/.test(SRC), "must assert reported viewport equals the requested size");
  assert.ok(/viewport mismatch/i.test(SRC), "must fail loudly on a viewport mismatch");
});

check("(2) IN-EMBED CAPTURE — opens the café url at the embed height and measures the Send", () => {
  assert.ok(/api\/preview\/status/.test(SRC), "must read the embed (café) url from the preview status api");
  assert.ok(/EMBED_H/.test(SRC) && /#preview-frame/.test(SRC), "must derive the embed's fixed height from the real CSS (#preview-frame)");
  assert.ok(/#mock-send/.test(SRC), "must locate the café primary action (Send) inside the embed");
  assert.ok(/withinFrame/.test(SRC) && /CLIPPED/.test(SRC), "must assert the Send is within the frame and fail on a clip");
});

check("captures against a THROWAWAY fixture copy (never the committed fixture)", () => {
  assert.ok(/mkdtempSync/.test(SRC) && /cpSync\(/.test(SRC), "must copy the fixture to a temp dir");
  assert.ok(/FG_PROJECT_ROOT:\s*SESSION_ROOT/.test(SRC), "servers must point at the throwaway copy");
});

check("writes the screenshots the visual-review law requires (both viewports, all screens)", () => {
  assert.ok(/\$\{sc\.shot\}-\$\{tag\}-full\.png/.test(SRC), "must write <shot>-<vp>-full.png");
  assert.ok(/\$\{sc\.shot\}-\$\{tag\}-fold\.png/.test(SRC), "must write <shot>-<vp>-fold.png");
});

console.log(`\nV8-VISUAL-CAPTURE-CONTRACT: PASS ${pass}`);
