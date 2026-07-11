// FounderGate — VISUAL-REVIEW enforcement guard (Assembly Manual §23).
//
// THE VISUAL SELF-REVIEW LAW: before any founder witness gate / stranger session /
// gallery handoff, the CTO must screenshot every founder-facing screen at 1366x768
// AND 1440x900 (full + fold), LOOK, and record a one-line verdict per screen. This
// CI guard makes the *record* mandatory: it fails if the visual-review verdict is
// absent or does not cover all four screens at both viewports, or if its screenshots
// are missing on disk. (Mechanical enforcement of a human-judgement law — it proves
// the review artifact exists; the human "look" and the founder witness remain the
// real filters, per the law's honest-scope note.)

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const DIR = join(REPO, "docs", "assembly-evidence", "visual-review");
const VERDICT = join(DIR, "VISUAL_REVIEW.md");

const SCREENS = ["Truth Dashboard", "Preview Bay", "File Cabinet", "Project Guide"];
const VIEWPORTS = ["1366x768", "1440x900"]; // for screenshot filenames (ASCII x)
const VIEWPORT_RE = [/1366\s*[×x]\s*768/, /1440\s*[×x]\s*900/]; // in prose, × or x
const SHOTS = ["dashboard", "preview", "filecabinet", "guide"];

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== visual-review enforcement guard (Assembly Manual §23) ==");

check("the visual-review verdict file exists and is non-empty", () => {
  assert.ok(existsSync(VERDICT), "missing docs/assembly-evidence/visual-review/VISUAL_REVIEW.md (VISUAL SELF-REVIEW LAW)");
  assert.ok(readFileSync(VERDICT, "utf8").trim().length > 200, "verdict must be a real review, not a stub");
});

check("the verdict covers all four founder-facing screens", () => {
  const s = readFileSync(VERDICT, "utf8");
  for (const screen of SCREENS) assert.ok(s.includes(screen), `verdict must cover "${screen}"`);
});

check("the verdict records BOTH viewports and a PASS/verdict per screen", () => {
  const s = readFileSync(VERDICT, "utf8");
  for (const re of VIEWPORT_RE) assert.ok(re.test(s), `verdict must record the ${re} viewport`);
  const verdicts = (s.match(/\bPASS\b/g) || []).length;
  assert.ok(verdicts >= SCREENS.length, `expected a verdict line per screen (>=${SCREENS.length} PASS), found ${verdicts}`);
});

check("the referenced screenshots exist on disk (full-page, both viewports, all screens)", () => {
  for (const shot of SHOTS) for (const vp of VIEWPORTS) {
    const f = join(DIR, `${shot}-${vp}-full.png`);
    assert.ok(existsSync(f), `missing screenshot ${shot}-${vp}-full.png`);
  }
});

console.log(`\nV8-VISUAL-REVIEW-GUARD: PASS ${pass}`);
